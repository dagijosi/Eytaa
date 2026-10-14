use rusqlite::{params, Connection};
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

    let db_path: PathBuf = app_dir.join("vistara.db");
    // Migrate from previous db if it exists
    let old_db = app_dir.join("loomplayer.db");
    if old_db.exists() && !db_path.exists() {
        let _ = fs::copy(&old_db, &db_path);
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
        "#,
    )
    .map_err(|e| format!("Failed to initialize database schema: {}", e))?;

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
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|_| "Database mutex poisoned")?;
    conn.execute(
        "INSERT INTO resume_positions (file_path, position, updated_at) VALUES (?1, ?2, CURRENT_TIMESTAMP)
         ON CONFLICT(file_path) DO UPDATE SET position = excluded.position, updated_at = CURRENT_TIMESTAMP",
        params![file_path, position],
    )
    .map_err(|e| e.to_string())?;
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

