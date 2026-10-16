use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{AppHandle, Manager};

pub struct DbState {
    pub conn: Mutex<Connection>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct HistoryItem {
    pub id: i64,
    pub file_path: String,
    pub title: Option<String>,
    pub last_played_at: String,
    pub duration: Option<f64>,
    pub position: Option<f64>,
}

pub fn init_db(app: &AppHandle) -> Result<DbState, String> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve app data directory: {}", e))?;

    if !app_dir.exists() {
        fs::create_dir_all(&app_dir)
            .map_err(|e| format!("Failed to create app data directory: {}", e))?;
    }

    let db_path: PathBuf = app_dir.join("eytaa.db");
    // Transparent migration from legacy databases if eytaa.db does not exist
    if !db_path.exists() {
        let vistara_db = app_dir.join("vistara.db");
        let loom_db = app_dir.join("loomplayer.db");
        if vistara_db.exists() {
            let _ = fs::copy(&vistara_db, &db_path);
        } else if loom_db.exists() {
            let _ = fs::copy(&loom_db, &db_path);
        }
    }

    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open SQLite database at {:?}: {}", db_path, e))?;

    conn.execute_batch(
        r#"
        CREATE TABLE IF NOT EXISTS user_preferences (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS playback_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            file_path TEXT NOT NULL,
            title TEXT,
            last_played_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            duration REAL,
            position REAL
        );

        CREATE TABLE IF NOT EXISTS resume_positions (
            file_path TEXT PRIMARY KEY,
            position REAL NOT NULL,
            duration REAL,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS playlists (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS playlist_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            playlist_id INTEGER NOT NULL,
            file_path TEXT NOT NULL,
            title TEXT,
            item_order INTEGER DEFAULT 0,
            FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS library_folders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            folder_path TEXT UNIQUE NOT NULL,
            added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_scanned_at DATETIME
        );

        CREATE TABLE IF NOT EXISTS library_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            folder_path TEXT NOT NULL,
            file_path TEXT UNIQUE NOT NULL,
            file_name TEXT NOT NULL,
            title TEXT NOT NULL,
            media_type TEXT NOT NULL,
            file_size INTEGER DEFAULT 0,
            duration REAL,
            last_modified INTEGER DEFAULT 0,
            added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            quick_hash TEXT,
            is_available INTEGER DEFAULT 1,
            missing_since DATETIME
        );

        CREATE TABLE IF NOT EXISTS library_favorites (
            file_path TEXT PRIMARY KEY,
            title TEXT,
            media_type TEXT,
            added_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- Performance Indexes for fast searching, filtering, and joins
        CREATE INDEX IF NOT EXISTS idx_library_items_folder ON library_items (folder_path);
        CREATE INDEX IF NOT EXISTS idx_library_items_type ON library_items (media_type);
        CREATE INDEX IF NOT EXISTS idx_library_items_title ON library_items (title COLLATE NOCASE);
        CREATE INDEX IF NOT EXISTS idx_library_items_path ON library_items (file_path);
        CREATE INDEX IF NOT EXISTS idx_library_favorites_path ON library_favorites (file_path);
        CREATE INDEX IF NOT EXISTS idx_resume_positions_path ON resume_positions (file_path);
        CREATE INDEX IF NOT EXISTS idx_playback_history_path ON playback_history (file_path);
        "#,
    )
    .map_err(|e| format!("Failed to initialize database schema: {}", e))?;

    // Schema migrations for backward compatibility (run before creating column indexes)
    let _ = conn.execute("ALTER TABLE resume_positions ADD COLUMN duration REAL", []);
    let _ = conn.execute("ALTER TABLE library_items ADD COLUMN quick_hash TEXT", []);
    let _ = conn.execute("ALTER TABLE library_items ADD COLUMN is_available INTEGER DEFAULT 1", []);
    let _ = conn.execute("ALTER TABLE library_items ADD COLUMN missing_since DATETIME", []);
    let _ = conn.execute("ALTER TABLE library_items ADD COLUMN category TEXT DEFAULT 'movie'", []);
    let _ = conn.execute("ALTER TABLE library_items ADD COLUMN series_name TEXT", []);
    let _ = conn.execute("ALTER TABLE library_items ADD COLUMN season_number INTEGER", []);
    let _ = conn.execute("ALTER TABLE library_items ADD COLUMN episode_number INTEGER", []);
    let _ = conn.execute("ALTER TABLE library_items ADD COLUMN episode_title TEXT", []);
    let _ = conn.execute("ALTER TABLE library_items ADD COLUMN year TEXT", []);
    let _ = conn.execute("ALTER TABLE library_items ADD COLUMN is_watched INTEGER DEFAULT 0", []);
    let _ = conn.execute("ALTER TABLE library_items ADD COLUMN manual_override INTEGER DEFAULT 0", []);
    let _ = conn.execute("ALTER TABLE library_items ADD COLUMN custom_poster TEXT", []);
    let _ = conn.execute("ALTER TABLE library_items ADD COLUMN series_key TEXT", []);
    let _ = conn.execute("CREATE INDEX IF NOT EXISTS idx_library_items_hash ON library_items (quick_hash)", []);
    let _ = conn.execute("CREATE INDEX IF NOT EXISTS idx_library_items_avail ON library_items (is_available)", []);
    let _ = conn.execute("CREATE INDEX IF NOT EXISTS idx_library_items_category ON library_items (category)", []);
    let _ = conn.execute("CREATE INDEX IF NOT EXISTS idx_library_items_series ON library_items (series_name COLLATE NOCASE)", []);
    let _ = conn.execute("CREATE INDEX IF NOT EXISTS idx_library_items_series_key ON library_items (series_key)", []);
    let _ = conn.execute("CREATE INDEX IF NOT EXISTS idx_library_items_watched ON library_items (is_watched)", []);

    // Re-parse the whole library only when the metadata parser version changes.
    // This keeps startup fast while still auto-healing libraries after upgrades.
    const PARSER_VERSION: i64 = 2;
    let stored_parser_version: Option<i64> = conn
        .query_row(
            "SELECT value FROM user_preferences WHERE key = 'parserVersion'",
            [],
            |row| row.get::<_, String>(0),
        )
        .ok()
        .and_then(|v| v.parse::<i64>().ok());

    // Transparently reclassify existing items in library where manual_override = 0
    if stored_parser_version != Some(PARSER_VERSION) {
        if let Ok(mut stmt) = conn.prepare("SELECT id, file_path, file_name, media_type FROM library_items WHERE COALESCE(manual_override, 0) = 0") {
        let rows: Vec<(i64, String, String, String)> = stmt
            .query_map([], |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)))
            .map(|r| r.filter_map(Result::ok).collect())
            .unwrap_or_default();

        for (id, file_path, file_name, media_type) in rows {
            let (title, category, series_name, season_num, ep_num, ep_title, year) =
                crate::library::parse_media_info(std::path::Path::new(&file_path), &file_name, &media_type);

            let series_key: Option<String> = series_name
                .as_deref()
                .map(crate::library::normalize_series_key)
                .filter(|k| !k.is_empty());

            let _ = conn.execute(
                "UPDATE library_items SET
                    title = ?1,
                    category = ?2,
                    series_name = ?3,
                    season_number = ?4,
                    episode_number = ?5,
                    episode_title = ?6,
                    year = ?7,
                    series_key = ?8
                 WHERE id = ?9",
                params![
                    title,
                    category.unwrap_or_else(|| "movie".to_string()),
                    series_name,
                    season_num,
                    ep_num,
                    ep_title,
                    year,
                    series_key,
                    id
                ],
            );
        }
        }

        let _ = conn.execute(
            "INSERT INTO user_preferences (key, value) VALUES ('parserVersion', ?1)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            params![PARSER_VERSION.to_string()],
        );
    }

    // Repair series rows with missing season/episode numbers (e.g. previously clobbered by
    // an incomplete metadata edit). Reparse only the numeric fields so any manual
    // series_name / title / poster customisation is preserved.
    if let Ok(mut stmt) = conn.prepare(
        "SELECT id, file_path, file_name, media_type FROM library_items
         WHERE category = 'series'
           AND (season_number IS NULL OR episode_number IS NULL)",
    ) {
        let rows: Vec<(i64, String, String, String)> = stmt
            .query_map([], |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)))
            .map(|r| r.filter_map(Result::ok).collect())
            .unwrap_or_default();

        for (id, file_path, file_name, media_type) in rows {
            let (_, _, _, season_num, ep_num, ep_title, year) =
                crate::library::parse_media_info(std::path::Path::new(&file_path), &file_name, &media_type);

            if season_num.is_none() || ep_num.is_none() {
                continue;
            }
            let _ = conn.execute(
                "UPDATE library_items SET
                    season_number = ?1,
                    episode_number = ?2,
                    episode_title = COALESCE(episode_title, ?3),
                    year = COALESCE(year, ?4)
                 WHERE id = ?5",
                params![season_num, ep_num, ep_title, year, id],
            );
        }
    }

    // Backfill series_key for manually overridden rows whose key is missing
    if let Ok(mut stmt) = conn.prepare(
        "SELECT id, series_name FROM library_items
         WHERE COALESCE(manual_override, 0) = 1
           AND COALESCE(series_key, '') = ''
           AND series_name IS NOT NULL AND series_name != ''",
    ) {
        let rows: Vec<(i64, String)> = stmt
            .query_map([], |row| Ok((row.get(0)?, row.get(1)?)))
            .map(|r| r.filter_map(Result::ok).collect())
            .unwrap_or_default();

        for (id, series_name) in rows {
            let key = crate::library::normalize_series_key(&series_name);
            let key_opt: Option<String> = if key.is_empty() { None } else { Some(key) };
            let _ = conn.execute(
                "UPDATE library_items SET series_key = ?1 WHERE id = ?2",
                params![key_opt, id],
            );
        }
    }

    Ok(DbState {
        conn: Mutex::new(conn),
    })
}

#[tauri::command]
pub fn db_get_preference(
    state: tauri::State<'_, DbState>,
    key: String,
) -> Result<Option<String>, String> {
    let conn = state.conn.lock().map_err(|_| "Database mutex poisoned")?;
    let mut stmt = conn
        .prepare("SELECT value FROM user_preferences WHERE key = ?1")
        .map_err(|e| e.to_string())?;

    let mut rows = stmt.query(params![key]).map_err(|e| e.to_string())?;
    if let Some(row) = rows.next().map_err(|e| e.to_string())? {
        let val: String = row.get(0).map_err(|e| e.to_string())?;
        Ok(Some(val))
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub fn db_set_preference(
    state: tauri::State<'_, DbState>,
    key: String,
    value: String,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|_| "Database mutex poisoned")?;
    conn.execute(
        "INSERT INTO user_preferences (key, value) VALUES (?1, ?2)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        params![key, value],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn db_get_resume_position(
    state: tauri::State<'_, DbState>,
    file_path: String,
) -> Result<Option<f64>, String> {
    let conn = state.conn.lock().map_err(|_| "Database mutex poisoned")?;
    let mut stmt = conn
        .prepare("SELECT position FROM resume_positions WHERE file_path = ?1")
        .map_err(|e| e.to_string())?;

    let mut rows = stmt.query(params![file_path]).map_err(|e| e.to_string())?;
    if let Some(row) = rows.next().map_err(|e| e.to_string())? {
        let pos: f64 = row.get(0).map_err(|e| e.to_string())?;
        Ok(Some(pos))
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub fn db_set_resume_position(
    state: tauri::State<'_, DbState>,
    file_path: String,
    position: f64,
    duration: Option<f64>,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|_| "Database mutex poisoned")?;

    // If near completion (>92% watched or within 20s of end for videos > 60s), remove from resume_positions and mark watched
    if let Some(dur) = duration {
        if dur > 60.0 && (position >= dur * 0.92 || position >= dur - 20.0) {
            let _ = conn.execute("DELETE FROM resume_positions WHERE file_path = ?1", params![file_path]);
            let _ = conn.execute("UPDATE library_items SET is_watched = 1 WHERE file_path = ?1", params![file_path]);
            return Ok(());
        }
    }

    conn.execute(
        "INSERT INTO resume_positions (file_path, position, duration, updated_at) VALUES (?1, ?2, ?3, CURRENT_TIMESTAMP)
         ON CONFLICT(file_path) DO UPDATE SET
            position = excluded.position,
            duration = COALESCE(excluded.duration, resume_positions.duration),
            updated_at = CURRENT_TIMESTAMP",
        params![file_path, position, duration],
    )
    .map_err(|e| e.to_string())?;

    // Update library_items duration so the library knows the total duration
    if let Some(dur) = duration {
        if dur > 0.0 {
            let _ = conn.execute(
                "UPDATE library_items SET duration = ?1 WHERE file_path = ?2 AND (duration IS NULL OR duration <= 0)",
                params![dur, file_path],
            );
            let _ = conn.execute(
                "UPDATE playback_history SET duration = ?1 WHERE file_path = ?2 AND (duration IS NULL OR duration <= 0)",
                params![dur, file_path],
            );
        }
    }

    Ok(())
}

#[tauri::command]
pub fn db_add_history(
    state: tauri::State<'_, DbState>,
    file_path: String,
    title: Option<String>,
    duration: Option<f64>,
    position: Option<f64>,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|_| "Database mutex poisoned")?;
    // Remove previous entries for the exact same file path so history never duplicates
    let _ = conn.execute(
        "DELETE FROM playback_history WHERE file_path = ?1",
        params![file_path],
    );
    conn.execute(
        "INSERT INTO playback_history (file_path, title, duration, position, last_played_at)
         VALUES (?1, ?2, ?3, ?4, CURRENT_TIMESTAMP)",
        params![file_path, title, duration, position],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn db_get_recent_files(
    state: tauri::State<'_, DbState>,
    limit: Option<u32>,
) -> Result<Vec<HistoryItem>, String> {
    let conn = state.conn.lock().map_err(|_| "Database mutex poisoned")?;
    let limit = limit.unwrap_or(20);
    let mut stmt = conn
        .prepare(
            "SELECT id, file_path, title, MAX(last_played_at) as last_played_at, duration, position
             FROM playback_history
             GROUP BY file_path
             ORDER BY last_played_at DESC
             LIMIT ?1",
        )
        .map_err(|e| e.to_string())?;

    let history = stmt
        .query_map(params![limit], |row| {
            Ok(HistoryItem {
                id: row.get(0)?,
                file_path: row.get(1)?,
                title: row.get(2)?,
                last_played_at: row.get(3)?,
                duration: row.get(4)?,
                position: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(Result::ok)
        .collect();

    Ok(history)
}

#[tauri::command]
pub fn db_delete_history(
    state: tauri::State<'_, DbState>,
    file_path: String,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|_| "Database mutex poisoned")?;
    let _ = conn.execute(
        "DELETE FROM playback_history WHERE file_path = ?1",
        params![file_path],
    );
    let _ = conn.execute(
        "DELETE FROM resume_positions WHERE file_path = ?1",
        params![file_path],
    );
    Ok(())
}

#[tauri::command]
pub fn db_clear_history(state: tauri::State<'_, DbState>) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|_| "Database mutex poisoned")?;
    let _ = conn.execute("DELETE FROM playback_history", []);
    let _ = conn.execute("DELETE FROM resume_positions", []);
    Ok(())
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LibraryFolderDto {
    pub id: i64,
    pub folder_path: String,
    pub added_at: String,
    pub last_scanned_at: Option<String>,
    pub is_accessible: bool,
    pub item_count: usize,
    pub available_count: usize,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LibraryItemDto {
    pub id: i64,
    pub folder_path: String,
    pub file_path: String,
    pub file_name: String,
    pub title: String,
    pub media_type: String,
    pub file_size: u64,
    pub duration: Option<f64>,
    pub last_modified: u64,
    pub added_at: String,
    pub is_favorite: bool,
    pub resume_position: Option<f64>,
    pub is_available: bool,
    pub is_duplicate: bool,
    pub quick_hash: Option<String>,
    pub category: Option<String>,
    pub series_name: Option<String>,
    pub season_number: Option<i64>,
    pub episode_number: Option<i64>,
    pub episode_title: Option<String>,
    pub year: Option<String>,
    pub is_watched: bool,
    pub manual_override: bool,
    pub custom_poster: Option<String>,
    pub series_key: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FavoriteItemDto {
    pub file_path: String,
    pub title: Option<String>,
    pub media_type: Option<String>,
    pub added_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UnfinishedVideoDto {
    pub file_path: String,
    pub title: String,
    pub duration: Option<f64>,
    pub position: f64,
    pub updated_at: String,
    pub progress_percent: f64,
    pub media_type: String,
}

#[tauri::command]
pub fn db_add_library_folder(
    state: tauri::State<'_, DbState>,
    folder_path: String,
) -> Result<i64, String> {
    let conn = state.conn.lock().map_err(|_| "Database mutex poisoned")?;
    conn.execute(
        "INSERT INTO library_folders (folder_path, added_at, last_scanned_at)
         VALUES (?1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON CONFLICT(folder_path) DO UPDATE SET last_scanned_at = CURRENT_TIMESTAMP",
        params![folder_path],
    )
    .map_err(|e| e.to_string())?;

    let id = conn.last_insert_rowid();
    Ok(id)
}

#[tauri::command]
pub fn db_remove_library_folder(
    state: tauri::State<'_, DbState>,
    folder_path: String,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|_| "Database mutex poisoned")?;
    let _ = conn.execute(
        "DELETE FROM library_folders WHERE folder_path = ?1",
        params![folder_path],
    );
    let _ = conn.execute(
        "DELETE FROM library_items WHERE folder_path = ?1",
        params![folder_path],
    );
    Ok(())
}

#[tauri::command]
pub fn db_get_library_folders(
    state: tauri::State<'_, DbState>,
) -> Result<Vec<LibraryFolderDto>, String> {
    let conn = state.conn.lock().map_err(|_| "Database mutex poisoned")?;
    let mut stmt = conn
        .prepare(
            "SELECT lf.id, lf.folder_path, lf.added_at, lf.last_scanned_at,
                    COUNT(li.id) as item_count,
                    COALESCE(SUM(CASE WHEN COALESCE(li.is_available, 1) = 1 THEN 1 ELSE 0 END), 0) as available_count
             FROM library_folders lf
             LEFT JOIN library_items li ON lf.folder_path = li.folder_path
             GROUP BY lf.id
             ORDER BY lf.added_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            let folder_path: String = row.get(1)?;
            let is_accessible = std::path::Path::new(&folder_path).exists();
            let item_count: i64 = row.get(4)?;
            let available_count: i64 = row.get(5)?;
            Ok(LibraryFolderDto {
                id: row.get(0)?,
                folder_path,
                added_at: row.get(2)?,
                last_scanned_at: row.get(3)?,
                is_accessible,
                item_count: item_count as usize,
                available_count: available_count as usize,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(Result::ok)
        .collect();

    Ok(rows)
}

#[tauri::command]
pub fn db_save_library_items(
    state: tauri::State<'_, DbState>,
    items: Vec<crate::library::ScannedMediaItem>,
) -> Result<usize, String> {
    let mut conn = state.conn.lock().map_err(|_| "Database mutex poisoned")?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    let mut count = 0;
    {
        let mut check_path_stmt = tx
            .prepare("SELECT id, file_size, last_modified, COALESCE(manual_override, 0) FROM library_items WHERE file_path = ?1")
            .map_err(|e| e.to_string())?;

        let mut check_hash_stmt = tx
            .prepare("SELECT id, file_path FROM library_items WHERE quick_hash = ?1 AND quick_hash IS NOT NULL AND quick_hash != ''")
            .map_err(|e| e.to_string())?;

        let mut touch_unchanged_stmt = tx
            .prepare("UPDATE library_items SET is_available = 1, missing_since = NULL WHERE id = ?1")
            .map_err(|e| e.to_string())?;

        let mut update_modified_stmt = tx
            .prepare(
                "UPDATE library_items SET
                    title = ?1,
                    category = ?2,
                    series_name = ?3,
                    season_number = ?4,
                    episode_number = ?5,
                    episode_title = ?6,
                    year = ?7,
                    file_size = ?8,
                    last_modified = ?9,
                    quick_hash = ?10,
                    series_key = ?11,
                    is_available = 1,
                    missing_since = NULL
                 WHERE id = ?12",
            )
            .map_err(|e| e.to_string())?;

        let mut update_file_stats_only_stmt = tx
            .prepare(
                "UPDATE library_items SET
                    file_size = ?1,
                    last_modified = ?2,
                    quick_hash = ?3,
                    is_available = 1,
                    missing_since = NULL
                 WHERE id = ?4",
            )
            .map_err(|e| e.to_string())?;

        let mut migrate_moved_stmt = tx
            .prepare(
                "UPDATE library_items SET
                    file_path = ?1,
                    folder_path = ?2,
                    file_name = ?3,
                    title = CASE WHEN manual_override = 1 THEN title ELSE ?4 END,
                    category = CASE WHEN manual_override = 1 THEN category ELSE ?5 END,
                    series_name = CASE WHEN manual_override = 1 THEN series_name ELSE ?6 END,
                    season_number = CASE WHEN manual_override = 1 THEN season_number ELSE ?7 END,
                    episode_number = CASE WHEN manual_override = 1 THEN episode_number ELSE ?8 END,
                    episode_title = CASE WHEN manual_override = 1 THEN episode_title ELSE ?9 END,
                    year = CASE WHEN manual_override = 1 THEN year ELSE ?10 END,
                    series_key = CASE WHEN manual_override = 1 THEN series_key ELSE ?11 END,
                    file_size = ?12,
                    last_modified = ?13,
                    is_available = 1,
                    missing_since = NULL
                 WHERE id = ?14",
            )
            .map_err(|e| e.to_string())?;

        let mut migrate_resume_stmt = tx
            .prepare("UPDATE resume_positions SET file_path = ?1 WHERE file_path = ?2")
            .map_err(|e| e.to_string())?;

        let mut migrate_fav_stmt = tx
            .prepare("UPDATE library_favorites SET file_path = ?1 WHERE file_path = ?2")
            .map_err(|e| e.to_string())?;

        let mut migrate_history_stmt = tx
            .prepare("UPDATE playback_history SET file_path = ?1 WHERE file_path = ?2")
            .map_err(|e| e.to_string())?;

        let mut insert_new_stmt = tx
            .prepare(
                "INSERT INTO library_items (
                    folder_path, file_path, file_name, title, media_type, file_size, last_modified, quick_hash, is_available,
                    category, series_name, series_key, season_number, episode_number, episode_title, year, is_watched, manual_override
                )
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 1, ?9, ?10, ?11, ?12, ?13, ?14, ?15, 0, 0)",
            )
            .map_err(|e| e.to_string())?;

        for item in items {
            // 1. Check if the exact path exists
            let existing_by_path = check_path_stmt
                .query_row(params![item.file_path], |row| {
                    Ok((
                        row.get::<_, i64>(0)?,
                        row.get::<_, i64>(1)? as u64,
                        row.get::<_, i64>(2)? as u64,
                        row.get::<_, i64>(3)? == 1,
                    ))
                })
                .optional()
                .map_err(|e| e.to_string())?;

            let cat_str = item.category.as_deref().unwrap_or("movie");
            let s_name = item.series_name.as_deref();
            let s_key: Option<String> = item.series_name.as_deref().and_then(|n| {
                let k = crate::library::normalize_series_key(n);
                if k.is_empty() {
                    None
                } else {
                    Some(k)
                }
            });
            let ep_title = item.episode_title.as_deref();
            let yr = item.year.as_deref();

            if let Some((id, old_size, old_mtime, is_manual)) = existing_by_path {
                if is_manual {
                    if old_size == item.file_size && old_mtime == item.last_modified {
                        let _ = touch_unchanged_stmt.execute(params![id]);
                    } else {
                        let _ = update_file_stats_only_stmt.execute(params![
                            item.file_size as i64,
                            item.last_modified as i64,
                            item.quick_hash,
                            id
                        ]);
                    }
                } else {
                    // Transparently update metadata using latest media classification rules
                    let _ = update_modified_stmt.execute(params![
                        item.title,
                        cat_str,
                        s_name,
                        item.season_number,
                        item.episode_number,
                        ep_title,
                        yr,
                        item.file_size as i64,
                        item.last_modified as i64,
                        item.quick_hash,
                        s_key,
                        id
                    ]);
                }
                count += 1;
                continue;
            }

            // 2. Path not in DB: check if a file with same quick_hash was moved or renamed
            let mut found_moved = false;
            if let Some(ref hash) = item.quick_hash {
                let existing_by_hash = check_hash_stmt
                    .query_row(params![hash], |row| {
                        Ok((row.get::<_, i64>(0)?, row.get::<_, String>(1)?))
                    })
                    .optional()
                    .map_err(|e| e.to_string())?;

                if let Some((old_id, old_path)) = existing_by_hash {
                    if !std::path::Path::new(&old_path).exists() {
                        let _ = migrate_moved_stmt.execute(params![
                            item.file_path,
                            item.folder_path,
                            item.file_name,
                            item.title,
                            cat_str,
                            s_name,
                            item.season_number,
                            item.episode_number,
                            ep_title,
                            yr,
                            s_key,
                            item.file_size as i64,
                            item.last_modified as i64,
                            old_id
                        ]);
                        let _ = migrate_resume_stmt.execute(params![item.file_path, old_path]);
                        let _ = migrate_fav_stmt.execute(params![item.file_path, old_path]);
                        let _ = migrate_history_stmt.execute(params![item.file_path, old_path]);
                        found_moved = true;
                        count += 1;
                    }
                }
            }

            // 3. Completely new item
            if !found_moved {
                if insert_new_stmt
                    .execute(params![
                        item.folder_path,
                        item.file_path,
                        item.file_name,
                        item.title,
                        item.media_type,
                        item.file_size as i64,
                        item.last_modified as i64,
                        item.quick_hash,
                        cat_str,
                        s_name,
                        s_key,
                        item.season_number,
                        item.episode_number,
                        ep_title,
                        yr,
                    ])
                    .is_ok()
                {
                    count += 1;
                }
            }
        }
    }

    tx.commit().map_err(|e| e.to_string())?;
    Ok(count)
}

#[tauri::command]
pub fn db_reconcile_missing_items(
    state: tauri::State<'_, DbState>,
    folder_path: String,
    scanned_paths: Vec<String>,
) -> Result<usize, String> {
    if !std::path::Path::new(&folder_path).exists() {
        // Removable drive or external folder is offline: NEVER mark files as missing!
        return Ok(0);
    }

    let mut conn = state.conn.lock().map_err(|_| "Database mutex poisoned")?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    let mut missing_count = 0;
    {
        let mut stmt = tx
            .prepare("SELECT id, file_path FROM library_items WHERE folder_path = ?1")
            .map_err(|e| e.to_string())?;

        let items: Vec<(i64, String)> = stmt
            .query_map(params![folder_path], |row| Ok((row.get(0)?, row.get(1)?)))
            .map_err(|e| e.to_string())?
            .filter_map(Result::ok)
            .collect();

        let scanned_set: std::collections::HashSet<String> = scanned_paths.into_iter().collect();

        let mut mark_stmt = tx
            .prepare("UPDATE library_items SET is_available = 0, missing_since = CURRENT_TIMESTAMP WHERE id = ?1")
            .map_err(|e| e.to_string())?;

        for (id, path) in items {
            if !scanned_set.contains(&path) && !std::path::Path::new(&path).exists() {
                let _ = mark_stmt.execute(params![id]);
                missing_count += 1;
            }
        }
    }

    tx.commit().map_err(|e| e.to_string())?;
    Ok(missing_count)
}

#[tauri::command]
pub fn db_clean_missing_items(state: tauri::State<'_, DbState>) -> Result<usize, String> {
    let conn = state.conn.lock().map_err(|_| "Database mutex poisoned")?;
    let count = conn
        .execute("DELETE FROM library_items WHERE is_available = 0", [])
        .map_err(|e| e.to_string())?;
    Ok(count)
}

#[tauri::command]
pub fn db_get_library_items(
    state: tauri::State<'_, DbState>,
    folder: Option<String>,
    media_type: Option<String>,
    search: Option<String>,
    duplicates_only: Option<bool>,
    available_only: Option<bool>,
    category: Option<String>,
    series_name: Option<String>,
    watch_status: Option<String>,
) -> Result<Vec<LibraryItemDto>, String> {
    let conn = state.conn.lock().map_err(|_| "Database mutex poisoned")?;

    let mut sql = String::from(
        "SELECT li.id, li.folder_path, li.file_path, li.file_name, li.title, li.media_type,
                li.file_size, COALESCE(li.duration, rp.duration) as duration, li.last_modified, li.added_at,
                (lf.file_path IS NOT NULL) as is_favorite,
                rp.position as resume_position,
                COALESCE(li.is_available, 1) as is_available,
                li.quick_hash,
                (SELECT COUNT(*) FROM library_items dup WHERE dup.quick_hash = li.quick_hash AND dup.quick_hash IS NOT NULL AND dup.quick_hash != '') > 1 as is_duplicate,
                li.category, li.series_name, li.season_number, li.episode_number, li.episode_title, li.year,
                COALESCE(li.is_watched, 0) as is_watched,
                COALESCE(li.manual_override, 0) as manual_override,
                li.custom_poster,
                li.series_key
         FROM library_items li
         LEFT JOIN library_favorites lf ON li.file_path = lf.file_path
         LEFT JOIN resume_positions rp ON li.file_path = rp.file_path
         WHERE 1=1 ",
    );

    let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

    if let Some(f) = folder {
        if !f.is_empty() {
            sql.push_str("AND li.folder_path = ? ");
            params_vec.push(Box::new(f));
        }
    }

    if let Some(mt) = media_type {
        if !mt.is_empty() && mt != "all" {
            sql.push_str("AND li.media_type = ? ");
            params_vec.push(Box::new(mt));
        }
    }

    if let Some(cat) = category {
        if !cat.is_empty() && cat != "all" {
            sql.push_str("AND li.category = ? ");
            params_vec.push(Box::new(cat));
        }
    }

    if let Some(series) = series_name {
        if !series.is_empty() {
            let key = crate::library::normalize_series_key(&series);
            if !key.is_empty() {
                sql.push_str("AND li.series_key = ? ");
                params_vec.push(Box::new(key));
            } else {
                sql.push_str("AND li.series_name = ? ");
                params_vec.push(Box::new(series));
            }
        }
    }

    if let Some(status) = watch_status {
        match status.as_str() {
            "unwatched" => {
                sql.push_str("AND COALESCE(li.is_watched, 0) = 0 AND (rp.position IS NULL OR rp.position < 10) ");
            }
            "partially_watched" => {
                sql.push_str("AND COALESCE(li.is_watched, 0) = 0 AND rp.position >= 10 AND (rp.duration IS NULL OR rp.position < rp.duration * 0.9) ");
            }
            "watched" => {
                sql.push_str("AND (COALESCE(li.is_watched, 0) = 1 OR (rp.duration IS NOT NULL AND rp.position >= rp.duration * 0.9)) ");
            }
            _ => {}
        }
    }

    if let Some(s) = search {
        let trimmed = s.trim();
        if !trimmed.is_empty() {
            sql.push_str("AND (li.title LIKE ? OR li.file_name LIKE ? OR li.series_name LIKE ? OR COALESCE(li.series_key, '') LIKE ?) ");
            let pattern = format!("%{}%", trimmed);
            params_vec.push(Box::new(pattern.clone()));
            params_vec.push(Box::new(pattern.clone()));
            params_vec.push(Box::new(pattern));
            let norm = crate::library::normalize_series_key(trimmed);
            let norm_pattern = format!("%{}%", norm);
            params_vec.push(Box::new(norm_pattern));
        }
    }

    if duplicates_only == Some(true) {
        sql.push_str("AND (SELECT COUNT(*) FROM library_items dup WHERE dup.quick_hash = li.quick_hash AND dup.quick_hash IS NOT NULL AND dup.quick_hash != '') > 1 ");
    }

    if available_only == Some(true) {
        sql.push_str("AND COALESCE(li.is_available, 1) = 1 ");
    }

    // Specials (season 0) sort last within a series; otherwise by season then episode
    sql.push_str("ORDER BY COALESCE(li.series_key, li.title) COLLATE NOCASE ASC, CASE WHEN COALESCE(li.season_number, 0) = 0 THEN 9999 ELSE COALESCE(li.season_number, 0) END ASC, COALESCE(li.episode_number, 0) ASC, li.title COLLATE NOCASE ASC");

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;

    let rusqlite_params: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|b| b.as_ref()).collect();

    let items = stmt
        .query_map(&rusqlite_params[..], |row| {
            let file_size_i64: i64 = row.get(6)?;
            let last_mod_i64: i64 = row.get(8)?;
            let is_avail_i64: i64 = row.get(12)?;
            let is_dup_i64: i64 = row.get(14)?;
            let is_watched_i64: i64 = row.get(21)?;
            let manual_i64: i64 = row.get(22)?;
            Ok(LibraryItemDto {
                id: row.get(0)?,
                folder_path: row.get(1)?,
                file_path: row.get(2)?,
                file_name: row.get(3)?,
                title: row.get(4)?,
                media_type: row.get(5)?,
                file_size: file_size_i64 as u64,
                duration: row.get(7)?,
                last_modified: last_mod_i64 as u64,
                added_at: row.get(9)?,
                is_favorite: row.get(10)?,
                resume_position: row.get(11)?,
                is_available: is_avail_i64 == 1,
                quick_hash: row.get(13)?,
                is_duplicate: is_dup_i64 > 0,
                category: row.get(15)?,
                series_name: row.get(16)?,
                season_number: row.get(17)?,
                episode_number: row.get(18)?,
                episode_title: row.get(19)?,
                year: row.get(20)?,
                is_watched: is_watched_i64 == 1,
                manual_override: manual_i64 == 1,
                custom_poster: row.get(23)?,
                series_key: row.get(24)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(Result::ok)
        .collect();

    Ok(items)
}

#[tauri::command]
pub fn db_update_media_metadata(
    state: tauri::State<'_, DbState>,
    file_path: String,
    title: String,
    category: Option<String>,
    series_name: Option<String>,
    season_number: Option<i64>,
    episode_number: Option<i64>,
    episode_title: Option<String>,
    year: Option<String>,
    custom_poster: Option<String>,
    apply_to_series: Option<bool>,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|_| "Database mutex poisoned")?;
    let series_key: Option<String> = series_name
        .as_deref()
        .map(crate::library::normalize_series_key)
        .filter(|k| !k.is_empty());
    conn.execute(
        "UPDATE library_items SET
            title = ?1,
            category = ?2,
            series_name = COALESCE(?3, series_name),
            series_key = COALESCE(?4, series_key),
            season_number = COALESCE(?5, season_number),
            episode_number = COALESCE(?6, episode_number),
            episode_title = COALESCE(?7, episode_title),
            year = COALESCE(?8, year),
            custom_poster = ?9,
            manual_override = 1
         WHERE file_path = ?10",
        params![
            title,
            category.unwrap_or_else(|| "movie".to_string()),
            series_name,
            series_key,
            season_number,
            episode_number,
            episode_title,
            year,
            custom_poster,
            file_path
        ],
    )
    .map_err(|e| e.to_string())?;

    // If requested, also apply the custom artwork to all episodes of this TV series
    if apply_to_series.unwrap_or(false) {
        if let Some(ref key) = series_key {
            let _ = conn.execute(
                "UPDATE library_items SET custom_poster = ?1 WHERE series_key = ?2",
                params![custom_poster, key],
            );
        } else if let Some(ref s_name) = series_name {
            if !s_name.trim().is_empty() {
                let _ = conn.execute(
                    "UPDATE library_items SET custom_poster = ?1 WHERE series_name = ?2",
                    params![custom_poster, s_name],
                );
            }
        }
    }

    // Also update history table title if exists
    let _ = conn.execute(
        "UPDATE playback_history SET title = ?1 WHERE file_path = ?2",
        params![title, file_path],
    );

    Ok(())
}

#[tauri::command]
pub fn db_set_watched_status(
    state: tauri::State<'_, DbState>,
    file_path: String,
    is_watched: bool,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|_| "Database mutex poisoned")?;
    let watched_int = if is_watched { 1 } else { 0 };

    conn.execute(
        "UPDATE library_items SET is_watched = ?1 WHERE file_path = ?2",
        params![watched_int, file_path],
    )
    .map_err(|e| e.to_string())?;

    if is_watched {
        let _ = conn.execute("DELETE FROM resume_positions WHERE file_path = ?1", params![file_path]);
    }

    Ok(())
}

#[tauri::command]
pub fn db_set_series_watched_status(
    state: tauri::State<'_, DbState>,
    series_name: String,
    season_number: Option<i64>,
    is_watched: bool,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|_| "Database mutex poisoned")?;
    let watched_int = if is_watched { 1 } else { 0 };
    let key = crate::library::normalize_series_key(&series_name);

    if let Some(season) = season_number {
        conn.execute(
            "UPDATE library_items SET is_watched = ?1 WHERE series_key = ?2 AND season_number = ?3",
            params![watched_int, key, season],
        )
        .map_err(|e| e.to_string())?;

        if is_watched {
            let _ = conn.execute(
                "DELETE FROM resume_positions WHERE file_path IN (
                    SELECT file_path FROM library_items WHERE series_key = ?1 AND season_number = ?2
                )",
                params![key, season],
            );
        }
    } else {
        conn.execute(
            "UPDATE library_items SET is_watched = ?1 WHERE series_key = ?2",
            params![watched_int, key],
        )
        .map_err(|e| e.to_string())?;

        if is_watched {
            let _ = conn.execute(
                "DELETE FROM resume_positions WHERE file_path IN (
                    SELECT file_path FROM library_items WHERE series_key = ?1
                )",
                params![key],
            );
        }
    }

    Ok(())
}

#[tauri::command]
pub fn db_get_next_episode(
    state: tauri::State<'_, DbState>,
    series_name: String,
) -> Result<Option<LibraryItemDto>, String> {
    let conn = state.conn.lock().map_err(|_| "Database mutex poisoned")?;
    let key = crate::library::normalize_series_key(&series_name);
    let mut stmt = conn
        .prepare(
            "SELECT li.id, li.folder_path, li.file_path, li.file_name, li.title, li.media_type,
                    li.file_size, COALESCE(li.duration, rp.duration) as duration, li.last_modified, li.added_at,
                    (lf.file_path IS NOT NULL) as is_favorite,
                    rp.position as resume_position,
                    COALESCE(li.is_available, 1) as is_available,
                    li.quick_hash,
                    0 as is_duplicate,
                    li.category, li.series_name, li.season_number, li.episode_number, li.episode_title, li.year,
                    COALESCE(li.is_watched, 0) as is_watched,
                    COALESCE(li.manual_override, 0) as manual_override,
                    li.custom_poster,
                    li.series_key
             FROM library_items li
             LEFT JOIN library_favorites lf ON li.file_path = lf.file_path
             LEFT JOIN resume_positions rp ON li.file_path = rp.file_path
             WHERE li.series_key = ?1
               AND COALESCE(li.season_number, 1) <> 0
               AND COALESCE(li.is_watched, 0) = 0
               AND (rp.duration IS NULL OR rp.position IS NULL OR rp.position < rp.duration * 0.9)
             ORDER BY COALESCE(li.season_number, 1) ASC, COALESCE(li.episode_number, 1) ASC
             LIMIT 1",
        )
        .map_err(|e| e.to_string())?;

    let item = stmt
        .query_row(params![key], |row| {
            let file_size_i64: i64 = row.get(6)?;
            let last_mod_i64: i64 = row.get(8)?;
            let is_avail_i64: i64 = row.get(12)?;
            let is_watched_i64: i64 = row.get(21)?;
            let manual_i64: i64 = row.get(22)?;
            Ok(LibraryItemDto {
                id: row.get(0)?,
                folder_path: row.get(1)?,
                file_path: row.get(2)?,
                file_name: row.get(3)?,
                title: row.get(4)?,
                media_type: row.get(5)?,
                file_size: file_size_i64 as u64,
                duration: row.get(7)?,
                last_modified: last_mod_i64 as u64,
                added_at: row.get(9)?,
                is_favorite: row.get(10)?,
                resume_position: row.get(11)?,
                is_available: is_avail_i64 == 1,
                quick_hash: row.get(13)?,
                is_duplicate: false,
                category: row.get(15)?,
                series_name: row.get(16)?,
                season_number: row.get(17)?,
                episode_number: row.get(18)?,
                episode_title: row.get(19)?,
                year: row.get(20)?,
                is_watched: is_watched_i64 == 1,
                manual_override: manual_i64 == 1,
                custom_poster: row.get(23)?,
                series_key: row.get(24)?,
            })
        })
        .optional()
        .map_err(|e| e.to_string())?;

    Ok(item)
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SeriesOverviewDto {
    pub series_key: String,
    pub display_name: String,
    pub episode_count: i64,
    pub season_count: i64,
    pub watched_count: i64,
    pub next_season: Option<i64>,
    pub next_episode: Option<i64>,
    pub custom_poster: Option<String>,
}

#[tauri::command]
pub fn db_get_series_overview(
    state: tauri::State<'_, DbState>,
) -> Result<Vec<SeriesOverviewDto>, String> {
    let conn = state.conn.lock().map_err(|_| "Database mutex poisoned")?;

    let mut stmt = conn
        .prepare(
            "SELECT series_key,
                    COUNT(*) as episode_count,
                    COUNT(DISTINCT COALESCE(season_number,1)) as season_count,
                    SUM(COALESCE(is_watched,0)) as watched_count,
                    MAX(custom_poster) as custom_poster
             FROM library_items
             WHERE COALESCE(series_key,'') != ''
             GROUP BY series_key",
        )
        .map_err(|e| e.to_string())?;
    let rows: Vec<(String, i64, i64, i64, Option<String>)> = stmt
        .query_map([], |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?, row.get(4)?)))
        .map_err(|e| e.to_string())?
        .filter_map(Result::ok)
        .collect();

    // Most common series_name variant per key becomes the display name
    let mut dn_stmt = conn
        .prepare(
            "SELECT series_key, series_name, COUNT(*) as cnt
             FROM library_items
             WHERE COALESCE(series_key,'') != '' AND series_name IS NOT NULL AND series_name != ''
             GROUP BY series_key, series_name",
        )
        .map_err(|e| e.to_string())?;
    let dn_rows: Vec<(String, String, i64)> = dn_stmt
        .query_map([], |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)))
        .map_err(|e| e.to_string())?
        .filter_map(Result::ok)
        .collect();

    let mut best: std::collections::HashMap<String, (String, i64)> = Default::default();
    for (k, name, cnt) in dn_rows {
        use std::collections::hash_map::Entry;
        match best.entry(k) {
            Entry::Occupied(mut e) => {
                let cur = e.get().clone();
                if cnt > cur.1 || (cnt == cur.1 && name.len() > cur.0.len()) {
                    e.insert((name, cnt));
                }
            }
            Entry::Vacant(v) => {
                v.insert((name, cnt));
            }
        }
    }

    // Next unwatched (non-specials) episode marker per key: season*10000 + episode
    let mut nx_stmt = conn
        .prepare(
            "SELECT series_key,
                    MIN(CASE WHEN COALESCE(is_watched,0)=0 AND COALESCE(season_number,1) <> 0
                        THEN COALESCE(season_number,1)*10000 + COALESCE(episode_number,0) END)
             FROM library_items
             WHERE COALESCE(series_key,'') != ''
             GROUP BY series_key",
        )
        .map_err(|e| e.to_string())?;
    let nx_rows: Vec<(String, Option<i64>)> = nx_stmt
        .query_map([], |row| Ok((row.get(0)?, row.get(1)?)))
        .map_err(|e| e.to_string())?
        .filter_map(Result::ok)
        .collect();
    let mut next_map: std::collections::HashMap<String, i64> = Default::default();
    for (k, m) in nx_rows {
        if let Some(marker) = m {
            next_map.insert(k, marker);
        }
    }

    let out: Vec<SeriesOverviewDto> = rows
        .into_iter()
        .map(|(key, ep_count, s_count, w_count, poster)| {
            let display_name = best
                .get(&key)
                .map(|(n, _)| n.clone())
                .unwrap_or_else(|| key.clone());
            let marker = next_map.get(&key).copied();
            SeriesOverviewDto {
                series_key: key,
                display_name,
                episode_count: ep_count,
                season_count: s_count,
                watched_count: w_count,
                next_season: marker.map(|m| m / 10000),
                next_episode: marker.map(|m| m % 10000),
                custom_poster: poster,
            }
        })
        .collect();

    Ok(out)
}

#[tauri::command]
pub fn db_toggle_favorite(
    state: tauri::State<'_, DbState>,
    file_path: String,
    title: Option<String>,
    media_type: Option<String>,
) -> Result<bool, String> {
    let conn = state.conn.lock().map_err(|_| "Database mutex poisoned")?;

    let mut stmt = conn
        .prepare("SELECT 1 FROM library_favorites WHERE file_path = ?1")
        .map_err(|e| e.to_string())?;

    let exists = stmt.exists(params![file_path]).map_err(|e| e.to_string())?;

    if exists {
        conn.execute(
            "DELETE FROM library_favorites WHERE file_path = ?1",
            params![file_path],
        )
        .map_err(|e| e.to_string())?;
        Ok(false)
    } else {
        conn.execute(
            "INSERT INTO library_favorites (file_path, title, media_type, added_at) VALUES (?1, ?2, ?3, CURRENT_TIMESTAMP)",
            params![file_path, title, media_type.unwrap_or_else(|| "video".to_string())],
        )
        .map_err(|e| e.to_string())?;
        Ok(true)
    }
}

#[tauri::command]
pub fn db_get_favorites(
    state: tauri::State<'_, DbState>,
) -> Result<Vec<FavoriteItemDto>, String> {
    let conn = state.conn.lock().map_err(|_| "Database mutex poisoned")?;
    let mut stmt = conn
        .prepare("SELECT file_path, title, media_type, added_at FROM library_favorites ORDER BY added_at DESC")
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(FavoriteItemDto {
                file_path: row.get(0)?,
                title: row.get(1)?,
                media_type: row.get(2)?,
                added_at: row.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(Result::ok)
        .collect();

    Ok(rows)
}

#[tauri::command]
pub fn db_is_favorite(
    state: tauri::State<'_, DbState>,
    file_path: String,
) -> Result<bool, String> {
    let conn = state.conn.lock().map_err(|_| "Database mutex poisoned")?;
    let mut stmt = conn
        .prepare("SELECT 1 FROM library_favorites WHERE file_path = ?1")
        .map_err(|e| e.to_string())?;
    let exists = stmt.exists(params![file_path]).map_err(|e| e.to_string())?;
    Ok(exists)
}

#[tauri::command]
pub fn db_get_unfinished_videos(
    state: tauri::State<'_, DbState>,
) -> Result<Vec<UnfinishedVideoDto>, String> {
    let conn = state.conn.lock().map_err(|_| "Database mutex poisoned")?;
    let mut stmt = conn
        .prepare(
            "SELECT r.file_path,
                    COALESCE(h.title, li.title, r.file_path) as title,
                    COALESCE(r.duration, h.duration, li.duration) as duration,
                    r.position,
                    r.updated_at,
                    COALESCE(li.media_type, 'video') as media_type
             FROM resume_positions r
             LEFT JOIN playback_history h ON r.file_path = h.file_path
             LEFT JOIN library_items li ON r.file_path = li.file_path
             WHERE r.position >= 10
             ORDER BY r.updated_at DESC
             LIMIT 30",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            let file_path: String = row.get(0)?;
            let title: String = row.get(1)?;
            let duration: Option<f64> = row.get(2)?;
            let position: f64 = row.get(3)?;
            let updated_at: String = row.get(4)?;
            let media_type: String = row.get(5)?;

            let percent = if let Some(dur) = duration {
                if dur > 0.0 {
                    ((position / dur) * 100.0).clamp(0.0, 100.0)
                } else {
                    0.0
                }
            } else {
                0.0
            };

            Ok(UnfinishedVideoDto {
                file_path,
                title,
                duration,
                position,
                updated_at,
                progress_percent: percent,
                media_type,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(Result::ok)
        // Filter out videos that are effectively finished (>92% watched)
        .filter(|item| item.progress_percent < 92.0)
        .collect();

    Ok(rows)
}

#[tauri::command]
pub fn db_reclassify_all_media(state: tauri::State<'_, DbState>) -> Result<usize, String> {
    let conn = state.conn.lock().map_err(|_| "Database mutex poisoned")?;
    let mut stmt = conn
        .prepare("SELECT id, file_path, file_name, media_type FROM library_items WHERE COALESCE(manual_override, 0) = 0")
        .map_err(|e| e.to_string())?;

    let rows: Vec<(i64, String, String, String)> = stmt
        .query_map([], |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)))
        .map_err(|e| e.to_string())?
        .filter_map(Result::ok)
        .collect();

    let mut count = 0;
    for (id, file_path, file_name, media_type) in rows {
        let (title, category, series_name, season_num, ep_num, ep_title, year) =
            crate::library::parse_media_info(std::path::Path::new(&file_path), &file_name, &media_type);

        let series_key: Option<String> = series_name
            .as_deref()
            .map(crate::library::normalize_series_key)
            .filter(|k| !k.is_empty());

        let res = conn.execute(
            "UPDATE library_items SET
                title = ?1,
                category = ?2,
                series_name = ?3,
                season_number = ?4,
                episode_number = ?5,
                episode_title = ?6,
                year = ?7,
                series_key = ?8
             WHERE id = ?9",
            params![
                title,
                category.unwrap_or_else(|| "movie".to_string()),
                series_name,
                season_num,
                ep_num,
                ep_title,
                year,
                series_key,
                id
            ],
        );
        if res.is_ok() {
            count += 1;
        }
    }

    Ok(count)
}



