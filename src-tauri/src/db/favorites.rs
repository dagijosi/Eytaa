use rusqlite::params;
use serde::{Deserialize, Serialize};

use super::DbState;

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
