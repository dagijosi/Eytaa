use rusqlite::params;
use serde::{Deserialize, Serialize};

use super::DbState;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BookmarkDto {
    pub id: i64,
    pub file_path: String,
    pub timestamp_seconds: f64,
    pub label: String,
    pub created_at: String,
}

#[tauri::command]
pub fn db_get_bookmarks(
    state: tauri::State<'_, DbState>,
    file_path: String,
) -> Result<Vec<BookmarkDto>, String> {
    let conn = state.conn.lock().map_err(|_| "Database mutex poisoned")?;
    let mut stmt = conn
        .prepare(
            "SELECT id, file_path, timestamp_seconds, label, created_at
             FROM bookmarks
             WHERE file_path = ?1
             ORDER BY timestamp_seconds ASC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![file_path], |row| {
            Ok(BookmarkDto {
                id: row.get(0)?,
                file_path: row.get(1)?,
                timestamp_seconds: row.get(2)?,
                label: row.get(3)?,
                created_at: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(Result::ok)
        .collect();

    Ok(rows)
}

#[tauri::command]
pub fn db_add_bookmark(
    state: tauri::State<'_, DbState>,
    file_path: String,
    timestamp_seconds: f64,
    label: String,
) -> Result<BookmarkDto, String> {
    let conn = state.conn.lock().map_err(|_| "Database mutex poisoned")?;
    let clean_label = if label.trim().is_empty() {
        "Scene Bookmark".to_string()
    } else {
        label.trim().to_string()
    };

    conn.execute(
        "INSERT INTO bookmarks (file_path, timestamp_seconds, label) VALUES (?1, ?2, ?3)",
        params![file_path, timestamp_seconds.max(0.0), clean_label],
    )
    .map_err(|e| e.to_string())?;

    let id = conn.last_insert_rowid();
    let created_at: String = conn
        .query_row(
            "SELECT created_at FROM bookmarks WHERE id = ?1",
            params![id],
            |r| r.get(0),
        )
        .unwrap_or_default();

    Ok(BookmarkDto {
        id,
        file_path,
        timestamp_seconds: timestamp_seconds.max(0.0),
        label: clean_label,
        created_at,
    })
}

#[tauri::command]
pub fn db_delete_bookmark(state: tauri::State<'_, DbState>, id: i64) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|_| "Database mutex poisoned")?;
    conn.execute("DELETE FROM bookmarks WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
