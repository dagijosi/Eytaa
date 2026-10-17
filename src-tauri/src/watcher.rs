//! Live library folder watcher.
//!
//! Uses the OS-native change notifications (via the `notify` crate) to detect
//! files added to, changed in, or removed from watched library folders. This is
//! event-driven: the operating system pushes events to us, so there is **no
//! polling** and the idle cost is effectively zero. Only the specific files that
//! actually change are parsed and written to the database — never the whole
//! library.

use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::mpsc::Receiver;
use std::sync::Mutex;
use std::time::{Duration, UNIX_EPOCH};

use notify::event::EventKind;
use notify::{Event, RecommendedWatcher, RecursiveMode, Watcher};
use rusqlite::Connection;
use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager};

use crate::db::{self, DbState};
use crate::library::{build_media_item, ScannedMediaItem};

/// How long to wait for a burst of filesystem events to settle before acting.
/// Downloads write in many chunks and often rename `.part` -> final file, so a
/// short quiet period avoids parsing half-written files.
const DEBOUNCE: Duration = Duration::from_millis(2500);

/// Extensions/name suffixes that indicate a file is still being written.
const TEMP_SUFFIXES: &[&str] = &[
    ".part",
    ".crdownload",
    ".tmp",
    ".temp",
    ".download",
    ".!ut",
    ".opdownload",
    ".partial",
    ".bak",
    ".swp",
];

/// Directories that should never be scanned or watched.
const IGNORED_DIRS: &[&str] = &[
    "system volume information",
    "$recycle.bin",
    "node_modules",
    ".git",
];

#[derive(Clone, Serialize)]
pub struct LibraryChangedPayload {
    pub saved: usize,
    pub removed: usize,
}

pub struct LibraryWatcher {
    watcher: Mutex<Option<RecommendedWatcher>>,
    watched: Mutex<HashSet<PathBuf>>,
}

impl LibraryWatcher {
    /// Starts the watcher and begins observing the given library roots.
    pub fn start(app: AppHandle, folders: Vec<String>) -> Self {
        let (tx, rx) = std::sync::mpsc::channel::<notify::Result<Event>>();

        let watcher = match RecommendedWatcher::new(
            move |res: notify::Result<Event>| {
                let _ = tx.send(res);
            },
            notify::Config::default(),
        ) {
            Ok(w) => Some(w),
            Err(e) => {
                eprintln!("[EYTAA] Failed to start library watcher: {}", e);
                None
            }
        };

        let this = Self {
            watcher: Mutex::new(watcher),
            watched: Mutex::new(HashSet::new()),
        };

        for folder in &folders {
            this.add_folder(folder);
        }

        let app_clone = app.clone();
        std::thread::spawn(move || run_worker(app_clone, rx));

        // `notify` cannot see files that appeared while the app was closed, so
        // reconcile each watched root once on startup.
        let app_catch_up = app.clone();
        std::thread::spawn(move || run_catch_up(app_catch_up, folders));

        this
    }

    /// Begins watching a folder recursively (no-op if it is already watched).
    pub fn add_folder(&self, folder: &str) {
        let path = PathBuf::from(folder);
        if !path.is_dir() {
            return;
        }

        let mut watched = match self.watched.lock() {
            Ok(w) => w,
            Err(_) => return,
        };
        if watched.contains(&path) {
            return;
        }

        let mut guard = match self.watcher.lock() {
            Ok(w) => w,
            Err(_) => return,
        };
        if let Some(watcher) = guard.as_mut() {
            if watcher.watch(&path, RecursiveMode::Recursive).is_ok() {
                watched.insert(path);
                println!("[EYTAA] Watching library folder: {}", folder);
            }
        }
    }

    /// Stops watching a folder.
    pub fn remove_folder(&self, folder: &str) {
        let path = PathBuf::from(folder);

        let mut watched = match self.watched.lock() {
            Ok(w) => w,
            Err(_) => return,
        };
        if !watched.remove(&path) {
            return;
        }

        let mut guard = match self.watcher.lock() {
            Ok(w) => w,
            Err(_) => return,
        };
        if let Some(watcher) = guard.as_mut() {
            let _ = watcher.unwatch(&path);
        }
    }
}

fn run_worker(app: AppHandle, rx: Receiver<notify::Result<Event>>) {
    let mut pending: HashSet<PathBuf> = HashSet::new();

    loop {
        // Wait for an event. Whenever one arrives we stay in the loop, which
        // effectively resets the debounce timer until the burst goes quiet.
        match rx.recv_timeout(DEBOUNCE) {
            Ok(Ok(event)) => {
                if !matches!(event.kind, EventKind::Access(_)) {
                    for path in event.paths {
                        if !is_ignored(&path) {
                            pending.insert(path);
                        }
                    }
                }
            }
            Ok(Err(_)) => {}
            Err(std::sync::mpsc::RecvTimeoutError::Timeout) => {
                if pending.is_empty() {
                    continue;
                }
                let batch: Vec<PathBuf> = pending.drain().collect();
                process_batch(&app, &batch);
            }
            Err(std::sync::mpsc::RecvTimeoutError::Disconnected) => break,
        }
    }
}

fn process_batch(app: &AppHandle, paths: &[PathBuf]) {
    let state = app.state::<DbState>();

    let roots = {
        let conn = match state.conn.lock() {
            Ok(c) => c,
            Err(_) => return,
        };
        db::list_library_folder_paths(&conn)
    };
    if roots.is_empty() {
        return;
    }

    let mut items = Vec::new();
    let mut missing: Vec<String> = Vec::new();

    for path in paths {
        if path.is_file() {
            if let Some(root) = folder_root_for(path, &roots) {
                if let Some(item) = build_media_item(path, &root) {
                    items.push(item);
                }
            }
        } else if !path.exists() {
            missing.push(path.to_string_lossy().to_string());
        }
    }

    let saved;
    let removed;
    {
        let mut conn = match state.conn.lock() {
            Ok(c) => c,
            Err(_) => return,
        };
        saved = if items.is_empty() {
            0
        } else {
            db::save_library_items(&mut conn, items).unwrap_or(0)
        };
        removed = missing
            .iter()
            .filter(|p| db::mark_item_missing(&conn, p) > 0)
            .count();
    }

    if saved > 0 || removed > 0 {
        println!(
            "[EYTAA] Library auto-updated: {} saved, {} removed",
            saved, removed
        );
        let _ = app.emit(
            "library_changed",
            LibraryChangedPayload { saved, removed },
        );
    }
}

/// Maximum directory depth the startup catch-up walks (mirrors the full scan).
const MAX_CATCH_UP_DEPTH: usize = 10;

/// Safety cap on how many files a single catch-up pass will add.
const MAX_CATCH_UP_FILES: usize = 50000;

/// One-shot startup reconciliation.
///
/// `notify` only reports changes that happen *after* watching begins, so files
/// added to (or removed from) a library folder while the app was closed produce
/// no events and would otherwise stay invisible forever. This walks each watched
/// root once, comparing against the database so unchanged files are never
/// re-hashed, and only reads the files that are new or changed. Runs on a
/// background thread and is a no-op when nothing changed.
fn run_catch_up(app: AppHandle, roots: Vec<String>) {
    if roots.is_empty() {
        return;
    }

    // Let the app finish starting up (and the window paint) before touching disk.
    std::thread::sleep(Duration::from_secs(3));

    let state = app.state::<DbState>();

    // 1. Snapshot what the database already knows (no disk I/O under the lock).
    let (known, stale) = {
        let conn = match state.conn.lock() {
            Ok(c) => c,
            Err(_) => return,
        };
        (load_known_files(&conn), collect_stale_paths(&conn, &roots))
    };

    // 2. Walk the filesystem without holding the database lock.
    let mut items: Vec<ScannedMediaItem> = Vec::new();
    for root in &roots {
        let path = Path::new(root);
        if path.is_dir() {
            collect_new_files(path, root, &known, &mut items, MAX_CATCH_UP_DEPTH);
        }
    }

    if items.is_empty() && stale.is_empty() {
        return;
    }

    // 3. Persist additions and flag vanished files as missing.
    let (saved, removed) = {
        let mut conn = match state.conn.lock() {
            Ok(c) => c,
            Err(_) => return,
        };
        let saved = if items.is_empty() {
            0
        } else {
            db::save_library_items(&mut conn, items).unwrap_or(0)
        };
        let mut removed = 0;
        for path in &stale {
            removed += db::mark_item_missing(&conn, path);
        }
        (saved, removed)
    };

    if saved > 0 || removed > 0 {
        println!(
            "[EYTAA] Library catch-up: {} added, {} missing",
            saved, removed
        );
        let _ = app.emit("library_changed", LibraryChangedPayload { saved, removed });
    }
}

/// Loads `file_path -> (size, mtime)` for every currently-available library item,
/// keyed case-insensitively. Missing items are omitted so that a reappearing file
/// is always reconsidered.
fn load_known_files(conn: &Connection) -> HashMap<String, (u64, u64)> {
    let mut map = HashMap::new();

    let mut stmt = match conn.prepare(
        "SELECT file_path, file_size, last_modified FROM library_items
          WHERE COALESCE(is_available, 1) = 1",
    ) {
        Ok(s) => s,
        Err(_) => return map,
    };

    if let Ok(rows) = stmt
        .query_map([], |row| {
            let path: String = row.get(0)?;
            let size: i64 = row.get(1)?;
            let mtime: i64 = row.get(2)?;
            Ok((path, size as u64, mtime as u64))
        })
        .map(|r| r.filter_map(Result::ok).collect::<Vec<(String, u64, u64)>>())
    {
        for (path, size, mtime) in rows {
            map.insert(path.to_lowercase(), (size, mtime));
        }
    }

    map
}

/// Returns the paths of available library items under `roots` that no longer
/// exist on disk. Roots that are not currently accessible (offline or
/// disconnected drives) are skipped so their files are never falsely removed.
fn collect_stale_paths(conn: &Connection, roots: &[String]) -> Vec<String> {
    let mut out = Vec::new();

    for root in roots {
        if !Path::new(root).is_dir() {
            continue;
        }

        let mut stmt = match conn.prepare(
            "SELECT file_path FROM library_items
              WHERE folder_path = ?1 AND COALESCE(is_available, 1) = 1",
        ) {
            Ok(s) => s,
            Err(_) => continue,
        };

        if let Ok(paths) = stmt
            .query_map(rusqlite::params![root], |row| row.get::<_, String>(0))
            .map(|r| r.filter_map(Result::ok).collect::<Vec<String>>())
        {
            for path in paths {
                if !Path::new(&path).exists() {
                    out.push(path);
                }
            }
        }
    }

    out
}

/// Recursively walks `dir`, building an item for every supported media file that
/// is absent from `known` or whose size/mtime has changed.
fn collect_new_files(
    dir: &Path,
    root: &str,
    known: &HashMap<String, (u64, u64)>,
    out: &mut Vec<ScannedMediaItem>,
    depth: usize,
) {
    if depth == 0 || out.len() >= MAX_CATCH_UP_FILES {
        return;
    }

    let entries = match fs::read_dir(dir) {
        Ok(e) => e,
        Err(_) => return,
    };

    for entry in entries.flatten() {
        let file_type = match entry.file_type() {
            Ok(ft) => ft,
            Err(_) => continue,
        };

        if file_type.is_symlink() {
            continue;
        }

        let path = entry.path();
        if file_type.is_dir() {
            if should_skip_dir(&path) {
                continue;
            }
            collect_new_files(&path, root, known, out, depth - 1);
        } else if file_type.is_file() {
            if is_ignored(&path) {
                continue;
            }

            let metadata = match fs::metadata(&path) {
                Ok(m) => m,
                Err(_) => continue,
            };
            let size = metadata.len();
            let mtime = metadata
                .modified()
                .ok()
                .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
                .map(|d| d.as_secs())
                .unwrap_or(0);

            let key = path.to_string_lossy().to_lowercase();
            if let Some(&(known_size, known_mtime)) = known.get(&key) {
                if known_size == size && known_mtime == mtime {
                    continue;
                }
            }

            if let Some(item) = build_media_item(&path, root) {
                out.push(item);
            }
        }
    }
}

/// Whether a directory should be skipped entirely during the catch-up walk.
fn should_skip_dir(path: &Path) -> bool {
    match path.file_name().and_then(|n| n.to_str()) {
        Some(name) => {
            let lower = name.to_lowercase();
            name.starts_with('.') || IGNORED_DIRS.contains(&lower.as_str())
        }
        None => true,
    }
}

/// Finds the registered library root that contains `path`, preferring the most
/// specific (longest) match, with a separator boundary check.
fn folder_root_for(path: &Path, roots: &[String]) -> Option<String> {
    let path_lower = path.to_string_lossy().to_lowercase();
    let mut best: Option<&String> = None;

    for root in roots {
        let root_lower = root.to_lowercase();
        if !path_lower.starts_with(&root_lower) {
            continue;
        }
        let rest = &path_lower[root_lower.len()..];
        let boundary_ok = rest.is_empty() || rest.starts_with('/') || rest.starts_with('\\');
        if boundary_ok && best.map_or(true, |b| root.len() > b.len()) {
            best = Some(root);
        }
    }

    best.cloned()
}

/// Whether a path is a temp/partial/junk file we should ignore entirely.
fn is_ignored(path: &Path) -> bool {
    let name = match path.file_name().and_then(|n| n.to_str()) {
        Some(n) => n.to_lowercase(),
        None => return true,
    };

    if name.starts_with('.') || name.starts_with("~$") {
        return true;
    }
    if TEMP_SUFFIXES.iter().any(|s| name.ends_with(s)) {
        return true;
    }

    for component in path.components() {
        if let std::path::Component::Normal(seg) = component {
            if let Some(s) = seg.to_str() {
                if IGNORED_DIRS.contains(&s.to_lowercase().as_str()) {
                    return true;
                }
            }
        }
    }

    false
}
