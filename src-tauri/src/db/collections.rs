use rusqlite::params;
use serde::{Deserialize, Serialize};

use super::DbState;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CollectionDto {
    pub id: i64,
    pub name: String,
    pub color: Option<String>,
    pub item_count: usize,
    pub created_at: String,
}

#[tauri::command]
pub fn db_get_collections(state: tauri::State<'_, DbState>) -> Result<Vec<CollectionDto>, String> {
    let conn = state.conn.lock().map_err(|_| "Database mutex poisoned")?;
    let mut stmt = conn
        .prepare(
            "SELECT c.id, c.name, c.color, c.created_at, COUNT(ci.file_path) as cnt
             FROM collections c
             LEFT JOIN collection_items ci ON c.id = ci.collection_id
             GROUP BY c.id
             ORDER BY c.name COLLATE NOCASE ASC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            let cnt: i64 = row.get(4)?;
            Ok(CollectionDto {
                id: row.get(0)?,
                name: row.get(1)?,
                color: row.get(2)?,
                created_at: row.get(3)?,
                item_count: cnt.max(0) as usize,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(Result::ok)
        .collect();

    Ok(rows)
}

#[tauri::command]
pub fn db_create_collection(
    state: tauri::State<'_, DbState>,
    name: String,
    color: Option<String>,
) -> Result<CollectionDto, String> {
    let trimmed = name.trim().to_string();
    if trimmed.is_empty() {
        return Err("Collection name cannot be empty".to_string());
    }

    let conn = state.conn.lock().map_err(|_| "Database mutex poisoned")?;
    conn.execute(
        "INSERT INTO collections (name, color) VALUES (?1, ?2)",
        params![trimmed, color],
    )
    .map_err(|e| e.to_string())?;

    let id = conn.last_insert_rowid();
    let created_at: String = conn
        .query_row(
            "SELECT created_at FROM collections WHERE id = ?1",
            params![id],
            |r| r.get(0),
        )
        .unwrap_or_default();

    Ok(CollectionDto {
        id,
        name: trimmed,
        color,
        item_count: 0,
        created_at,
    })
}

#[tauri::command]
pub fn db_delete_collection(state: tauri::State<'_, DbState>, id: i64) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|_| "Database mutex poisoned")?;
    conn.execute("DELETE FROM collections WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn db_add_to_collection(
    state: tauri::State<'_, DbState>,
    collection_id: i64,
    file_paths: Vec<String>,
) -> Result<usize, String> {
    let mut conn = state.conn.lock().map_err(|_| "Database mutex poisoned")?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    let mut added = 0;
    {
        let mut stmt = tx
            .prepare("INSERT OR IGNORE INTO collection_items (collection_id, file_path) VALUES (?1, ?2)")
            .map_err(|e| e.to_string())?;
        for fp in file_paths {
            if let Ok(n) = stmt.execute(params![collection_id, fp]) {
                added += n;
            }
        }
    }
    tx.commit().map_err(|e| e.to_string())?;
    Ok(added)
}

#[tauri::command]
pub fn db_remove_from_collection(
    state: tauri::State<'_, DbState>,
    collection_id: i64,
    file_path: String,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|_| "Database mutex poisoned")?;
    conn.execute(
        "DELETE FROM collection_items WHERE collection_id = ?1 AND file_path = ?2",
        params![collection_id, file_path],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn db_get_collection_items(
    state: tauri::State<'_, DbState>,
    collection_id: i64,
) -> Result<Vec<String>, String> {
    let conn = state.conn.lock().map_err(|_| "Database mutex poisoned")?;
    let mut stmt = conn
        .prepare("SELECT file_path FROM collection_items WHERE collection_id = ?1 ORDER BY added_at DESC")
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![collection_id], |row| row.get(0))
        .map_err(|e| e.to_string())?
        .filter_map(Result::ok)
        .collect();

    Ok(rows)
}
