use base64::{engine::general_purpose, Engine as _};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::{Condvar, Mutex, OnceLock};
use std::time::{Duration, Instant};
use tauri::{AppHandle, Manager};

#[cfg(windows)]
use std::os::windows::process::CommandExt;

const CREATE_NO_WINDOW: u32 = 0x08000000;
const BELOW_NORMAL_PRIORITY_CLASS: u32 = 0x00004000;

/// Simple RAII counting semaphore using standard library primitives
struct ConcurrencyLimiter {
    permits: Mutex<usize>,
    cvar: Condvar,
}

impl ConcurrencyLimiter {
    fn new(permits: usize) -> Self {
        Self {
            permits: Mutex::new(permits),
            cvar: Condvar::new(),
        }
    }

    fn acquire(&self) -> PermitGuard<'_> {
        let mut count = self.permits.lock().unwrap();
        while *count == 0 {
            count = self.cvar.wait(count).unwrap();
        }
        *count -= 1;
        PermitGuard { limiter: self }
    }
}

struct PermitGuard<'a> {
    limiter: &'a ConcurrencyLimiter,
}

impl<'a> Drop for PermitGuard<'a> {
    fn drop(&mut self) {
        let mut count = self.limiter.permits.lock().unwrap();
        *count += 1;
        self.limiter.cvar.notify_one();
    }
}

/// Global limiter allowing at most 2 concurrent ffmpeg processes across the application
static FFMPEG_LIMITER: OnceLock<ConcurrencyLimiter> = OnceLock::new();

fn get_limiter() -> &'static ConcurrencyLimiter {
    FFMPEG_LIMITER.get_or_init(|| ConcurrencyLimiter::new(2))
}

/// Generates a simple hash string from a file path
fn hash_path(path: &str) -> String {
    let mut hash: u64 = 5381;
    for byte in path.bytes() {
        hash = ((hash << 5).wrapping_add(hash)).wrapping_add(byte as u64);
    }
    format!("{:016x}", hash)
}

/// Resolves or creates the thumbnail cache directory
fn get_thumbnail_cache_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    let thumb_dir = app_dir.join("thumbnails");
    if !thumb_dir.exists() {
        fs::create_dir_all(&thumb_dir)
            .map_err(|e| format!("Failed to create thumbnail dir: {}", e))?;
    }
    Ok(thumb_dir)
}

/// Runs an ffmpeg command with safe flags, disconnected stdin, and a timeout to avoid hangs
fn run_ffmpeg_with_timeout(mut cmd: std::process::Command, timeout_secs: u64) -> bool {
    #[cfg(windows)]
    cmd.creation_flags(CREATE_NO_WINDOW | BELOW_NORMAL_PRIORITY_CLASS);

    cmd.stdin(std::process::Stdio::null())
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null());

    let mut child = match cmd.spawn() {
        Ok(child) => child,
        Err(_) => return false,
    };

    let start = Instant::now();
    let max_dur = Duration::from_secs(timeout_secs);

    loop {
        match child.try_wait() {
            Ok(Some(status)) => return status.success(),
            Ok(None) => {
                if start.elapsed() >= max_dur {
                    let _ = child.kill();
                    let _ = child.wait();
                    return false;
                }
                std::thread::sleep(Duration::from_millis(50));
            }
            Err(_) => {
                let _ = child.kill();
                let _ = child.wait();
                return false;
            }
        }
    }
}

/// Generates or loads a cached thumbnail for a given video/audio file
pub fn generate_or_load_thumbnail(app: &AppHandle, file_path: &str) -> Result<Option<String>, String> {
    let path = Path::new(file_path);
    if !path.exists() {
        return Ok(None);
    }

    let cache_dir = get_thumbnail_cache_dir(app)?;
    let file_hash = hash_path(file_path);
    let output_thumb = cache_dir.join(format!("{}.jpg", file_hash));
    let failed_marker = cache_dir.join(format!("{}.no_thumb", file_hash));

    // Fast path: If previously failed/no artwork, return immediately
    if failed_marker.exists() {
        return Ok(None);
    }

    // Fast path: Return cached image if exists and valid without waiting for semaphore
    if output_thumb.exists() {
        if let Ok(metadata) = fs::metadata(&output_thumb) {
            if metadata.len() > 0 {
                if let Ok(bytes) = fs::read(&output_thumb) {
                    let b64 = general_purpose::STANDARD.encode(&bytes);
                    return Ok(Some(format!("data:image/jpeg;base64,{}", b64)));
                }
            }
        }
    }

    // Acquire permit from limiter so at most 2 ffmpeg processes run concurrently
    let _guard = get_limiter().acquire();

    // Re-check cache in case another task finished generating it while we were waiting
    if output_thumb.exists() {
        if let Ok(metadata) = fs::metadata(&output_thumb) {
            if metadata.len() > 0 {
                if let Ok(bytes) = fs::read(&output_thumb) {
                    let b64 = general_purpose::STANDARD.encode(&bytes);
                    return Ok(Some(format!("data:image/jpeg;base64,{}", b64)));
                }
            }
        }
    }

    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .map(|s| s.to_lowercase())
        .unwrap_or_default();

    let is_audio = matches!(
        ext.as_str(),
        "mp3" | "flac" | "wav" | "m4a" | "aac" | "ogg" | "opus" | "alac" | "wma"
    );

    let output_path_str = output_thumb.to_string_lossy().to_string();

    let success = if is_audio {
        let mut cmd = std::process::Command::new("ffmpeg");
        cmd.arg("-nostdin")
            .arg("-loglevel")
            .arg("error")
            .arg("-i")
            .arg(file_path)
            .arg("-an")
            .arg("-vcodec")
            .arg("copy")
            .arg(&output_path_str)
            .arg("-y");

        run_ffmpeg_with_timeout(cmd, 3)
    } else {
        let try_seek = |seek_pos: &str| -> bool {
            let mut cmd = std::process::Command::new("ffmpeg");
            cmd.arg("-nostdin")
                .arg("-loglevel")
                .arg("error")
                .arg("-ss")
                .arg(seek_pos)
                .arg("-i")
                .arg(file_path)
                .arg("-vframes")
                .arg("1")
                .arg("-vf")
                .arg("scale=360:-1")
                .arg("-q:v")
                .arg("3")
                .arg(&output_path_str)
                .arg("-y");

            run_ffmpeg_with_timeout(cmd, 4)
        };

        if try_seek("00:00:10") {
            true
        } else {
            try_seek("00:00:01")
        }
    };

    if success && output_thumb.exists() {
        if let Ok(bytes) = fs::read(&output_thumb) {
            if !bytes.is_empty() {
                let b64 = general_purpose::STANDARD.encode(&bytes);
                return Ok(Some(format!("data:image/jpeg;base64,{}", b64)));
            }
        }
    }

    // Write negative cache marker so future loads don't spawn ffmpeg again
    let _ = fs::write(&failed_marker, b"");
    Ok(None)
}

#[tauri::command]
pub async fn get_thumbnail(app: AppHandle, file_path: String) -> Result<Option<String>, String> {
    tauri::async_runtime::spawn_blocking(move || generate_or_load_thumbnail(&app, &file_path))
        .await
        .map_err(|e| e.to_string())?
}
