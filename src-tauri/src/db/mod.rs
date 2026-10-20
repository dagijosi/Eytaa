use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{AppHandle, Manager};

mod favorites;
mod history;
mod library;
mod library_items;
mod playlists;
mod preferences;
mod series;

pub use favorites::*;
pub use history::*;
pub use library::*;
pub use library_items::*;
pub use playlists::*;
pub use preferences::*;
pub use series::*;

pub struct DbState {
    pub conn: Mutex<Connection>,
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

    // Enable WAL mode and busy timeout so multiple player processes can access the database concurrently
    let _ = conn.busy_timeout(std::time::Duration::from_secs(5));
    let _ = conn.pragma_update(None, "journal_mode", "WAL");
    let _ = conn.pragma_update(None, "synchronous", "NORMAL");

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
