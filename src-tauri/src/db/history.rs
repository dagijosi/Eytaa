use rusqlite::params;
use serde::{Deserialize, Serialize};

use super::DbState;

#[derive(Debug, Serialize, Deserialize)]
pub struct HistoryItem {
    pub id: i64,
    pub file_path: String,
    pub title: Option<String>,
    pub last_played_at: String,
    pub duration: Option<f64>,
    pub position: Option<f64>,
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
