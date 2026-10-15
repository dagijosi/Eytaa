use serde::{Deserialize, Serialize};
use std::fs;
use std::io::{BufRead, BufReader, Write};
use std::path::{Path, PathBuf};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ScannedMediaItem {
    pub file_path: String,
    pub file_name: String,
    pub title: String,
    pub folder_path: String,
    pub media_type: String, // "video" | "audio"
    pub file_size: u64,
    pub last_modified: u64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PlaylistItemDto {
    pub id: String,
    pub file_path: String,
    pub title: String,
}

const SUPPORTED_VIDEO_EXTS: &[&str] = &[
    "mp4", "mkv", "webm", "avi", "mov", "wmv", "flv", "ts", "m2ts", "vob", "m4v",
];

const SUPPORTED_AUDIO_EXTS: &[&str] = &[
    "mp3", "flac", "wav", "m4a", "aac", "ogg", "opus", "alac", "wma",
];

fn is_supported_media(ext: &str) -> Option<&'static str> {
    if SUPPORTED_VIDEO_EXTS.contains(&ext) {
        Some("video")
    } else if SUPPORTED_AUDIO_EXTS.contains(&ext) {
        Some("audio")
    } else {
        None
    }
}

fn scan_directory_recursive(
    dir: &Path,
    results: &mut Vec<ScannedMediaItem>,
    folder_root: &str,
    max_depth: usize,
) {
    if max_depth == 0 || results.len() >= 5000 {
        return;
    }

    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            let file_type = match entry.file_type() {
                Ok(ft) => ft,
                Err(_) => continue,
            };

            // Skip symbolic links and NTFS directory junctions to prevent infinite loops
            if file_type.is_symlink() {
                continue;
            }

            let path = entry.path();
            if file_type.is_dir() {
                if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                    let name_lower = name.to_lowercase();
                    // Skip hidden, system, or dependency folders
                    if name.starts_with('.')
                        || name_lower == "node_modules"
                        || name_lower == "$recycle.bin"
                        || name_lower == "system volume information"
                        || name_lower == "appdata"
                        || name_lower == "windows"
                        || name_lower == ".git"
                    {
                        continue;
                    }
                }
                scan_directory_recursive(&path, results, folder_root, max_depth - 1);
            } else if file_type.is_file() {
                if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
                    let ext_lower = ext.to_lowercase();
                    if let Some(media_type) = is_supported_media(&ext_lower) {
                        let file_name = path
                            .file_name()
                            .and_then(|n| n.to_str())
                            .unwrap_or("")
                            .to_string();

                        let title = path
                            .file_stem()
                            .and_then(|s| s.to_str())
                            .unwrap_or(&file_name)
                            .to_string();

                        let metadata = fs::metadata(&path).ok();
                        let file_size = metadata.as_ref().map(|m| m.len()).unwrap_or(0);
                        let last_modified = metadata
                            .and_then(|m| m.modified().ok())
                            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                            .map(|d| d.as_secs())
                            .unwrap_or(0);

                        results.push(ScannedMediaItem {
                            file_path: path.to_string_lossy().to_string(),
                            file_name,
                            title,
                            folder_path: folder_root.to_string(),
                            media_type: media_type.to_string(),
                            file_size,
                            last_modified,
                        });
                    }
                }
            }
        }
    }
}

/// Recursively scans a chosen folder for video and audio files without blocking the runtime
#[tauri::command]
pub async fn scan_local_folder(folder_path: String) -> Result<Vec<ScannedMediaItem>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let root = Path::new(&folder_path);
        if !root.exists() || !root.is_dir() {
            return Err(format!("Directory does not exist: {}", folder_path));
        }

        let mut results = Vec::new();
        // Recursively scan up to 6 subfolder levels (prevents excessive disk recursion)
        scan_directory_recursive(root, &mut results, &folder_path, 6);
        // Sort naturally by file path
        results.sort_by(|a, b| a.file_path.cmp(&b.file_path));
        Ok(results)
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Exports a playlist to M3U8 or JSON file format
#[tauri::command]
pub fn export_playlist_to_file(
    file_path: String,
    format_type: String,
    items: Vec<PlaylistItemDto>,
) -> Result<(), String> {
    let path = Path::new(&file_path);
    let mut file = fs::File::create(path).map_err(|e| format!("Failed to create file: {}", e))?;

    if format_type.to_lowercase() == "json" || path.extension().and_then(|e| e.to_str()) == Some("json") {
        let json_str = serde_json::to_string_pretty(&items)
            .map_err(|e| format!("Serialization error: {}", e))?;
        file.write_all(json_str.as_bytes())
            .map_err(|e| format!("Write error: {}", e))?;
    } else {
        // Default to M3U8 format
        writeln!(file, "#EXTM3U").map_err(|e| e.to_string())?;
        for item in items {
            writeln!(file, "#EXTINF:-1,{}", item.title).map_err(|e| e.to_string())?;
            writeln!(file, "{}", item.file_path).map_err(|e| e.to_string())?;
        }
    }

    Ok(())
}

/// Imports a playlist from an M3U, M3U8, or JSON file
#[tauri::command]
pub fn import_playlist_from_file(file_path: String) -> Result<Vec<PlaylistItemDto>, String> {
    let path = Path::new(&file_path);
    if !path.exists() {
        return Err(format!("File not found: {}", file_path));
    }

    let parent_dir = path.parent().unwrap_or_else(|| Path::new(""));

    let is_json = path.extension().and_then(|e| e.to_str()) == Some("json");

    if is_json {
        let content = fs::read_to_string(path).map_err(|e| e.to_string())?;
        let parsed: Vec<PlaylistItemDto> = serde_json::from_str(&content)
            .map_err(|e| format!("Invalid playlist JSON: {}", e))?;
        return Ok(parsed);
    }

    // Parse M3U / M3U8 file
    let file = fs::File::open(path).map_err(|e| e.to_string())?;
    let reader = BufReader::new(file);

    let mut items = Vec::new();
    let mut current_title: Option<String> = None;

    for line in reader.lines().flatten() {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }

        if trimmed.starts_with("#EXTINF:") {
            if let Some(comma_idx) = trimmed.find(',') {
                let title = trimmed[comma_idx + 1..].trim().to_string();
                if !title.is_empty() {
                    current_title = Some(title);
                }
            }
        } else if !trimmed.starts_with('#') {
            // This is a media file path (either absolute or relative)
            let mut resolved_path = PathBuf::from(trimmed);
            if !resolved_path.is_absolute() {
                resolved_path = parent_dir.join(resolved_path);
            }

            let full_path_str = resolved_path.to_string_lossy().to_string();
            let title = current_title.take().unwrap_or_else(|| {
                resolved_path
                    .file_stem()
                    .and_then(|s| s.to_str())
                    .unwrap_or("Untitled")
                    .to_string()
            });

            items.push(PlaylistItemDto {
                id: format!("item_{}_{}", items.len(), std::time::SystemTime::now().elapsed().unwrap_or_default().as_millis()),
                file_path: full_path_str,
                title,
            });
        }
    }

    Ok(items)
}
