use rusqlite::params;
use serde::{Deserialize, Serialize};

use super::DbState;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SavedPlaylistDto {
    pub id: i64,
    pub name: String,
    pub item_count: i64,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SavedPlaylistItemDto {
    pub id: i64,
    pub file_path: String,
    pub title: Option<String>,
    pub item_order: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PlaylistItemInput {
    pub file_path: String,
    pub title: Option<String>,
}

/// Creates a new named playlist, or replaces the contents of an existing one
/// when `playlist_id` is provided. Returns the resulting playlist id.
#[tauri::command]
pub fn db_save_playlist(
    state: tauri::State<'_, DbState>,
    name: String,
    items: Vec<PlaylistItemInput>,
    playlist_id: Option<i64>,
) -> Result<i64, String> {
    let conn = state
        .conn
        .lock()
        .map_err(|_| "Database mutex poisoned")?;
    let trimmed = name.trim();
    let name = if trimmed.is_empty() {
        "Untitled Playlist"
    } else {
        trimmed
    };

    let id = match playlist_id {
        Some(existing) => {
            conn.execute(
                "UPDATE playlists SET name = ?1 WHERE id = ?2",
                params![name, existing],
            )
            .map_err(|e| e.to_string())?;
            let _ = conn.execute(
                "DELETE FROM playlist_items WHERE playlist_id = ?1",
                params![existing],
            );
            existing
        }
        None => {
            conn.execute("INSERT INTO playlists (name) VALUES (?1)", params![name])
                .map_err(|e| e.to_string())?;
            conn.last_insert_rowid()
        }
    };

    for (idx, item) in items.iter().enumerate() {
        conn.execute(
            "INSERT INTO playlist_items (playlist_id, file_path, title, item_order)
             VALUES (?1, ?2, ?3, ?4)",
            params![id, item.file_path, item.title, idx as i64],
        )
        .map_err(|e| e.to_string())?;
    }

    Ok(id)
}

#[tauri::command]
pub fn db_get_playlists(
    state: tauri::State<'_, DbState>,
) -> Result<Vec<SavedPlaylistDto>, String> {
    let conn = state
        .conn
        .lock()
        .map_err(|_| "Database mutex poisoned")?;
    let mut stmt = conn
        .prepare(
            "SELECT p.id, p.name, COUNT(pi.id) AS item_count, p.created_at
             FROM playlists p
             LEFT JOIN playlist_items pi ON pi.playlist_id = p.id
             GROUP BY p.id
             ORDER BY p.created_at DESC, p.id DESC",
        )
        .map_err(|e| e.to_string())?;

    let playlists = stmt
        .query_map([], |row| {
            Ok(SavedPlaylistDto {
                id: row.get(0)?,
                name: row.get(1)?,
                item_count: row.get(2)?,
                created_at: row.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(Result::ok)
        .collect();

    Ok(playlists)
}

#[tauri::command]
pub fn db_get_playlist_items(
    state: tauri::State<'_, DbState>,
    playlist_id: i64,
) -> Result<Vec<SavedPlaylistItemDto>, String> {
    let conn = state
        .conn
        .lock()
        .map_err(|_| "Database mutex poisoned")?;
    let mut stmt = conn
        .prepare(
            "SELECT id, file_path, title, item_order
             FROM playlist_items
             WHERE playlist_id = ?1
             ORDER BY item_order ASC, id ASC",
        )
        .map_err(|e| e.to_string())?;

    let items = stmt
        .query_map(params![playlist_id], |row| {
            Ok(SavedPlaylistItemDto {
                id: row.get(0)?,
                file_path: row.get(1)?,
                title: row.get(2)?,
                item_order: row.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(Result::ok)
        .collect();

    Ok(items)
}

#[tauri::command]
pub fn db_delete_playlist(
    state: tauri::State<'_, DbState>,
    playlist_id: i64,
) -> Result<(), String> {
    let conn = state
        .conn
        .lock()
        .map_err(|_| "Database mutex poisoned")?;
    let _ = conn.execute(
        "DELETE FROM playlist_items WHERE playlist_id = ?1",
        params![playlist_id],
    );
    conn.execute(
        "DELETE FROM playlists WHERE id = ?1",
        params![playlist_id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}
