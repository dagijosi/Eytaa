use rusqlite::params;
use serde::{Deserialize, Serialize};

use super::DbState;

#[derive(Debug, Serialize, Deserialize)]
struct BackupPayload {
    version: u32,
    exported_at: String,
    preferences: Vec<(String, String)>,
    favorites: Vec<(String, Option<String>, Option<String>)>,
    bookmarks: Vec<(String, f64, String)>,
    collections: Vec<(String, Option<String>, Vec<String>)>,
}

#[tauri::command]
pub fn db_export_backup(state: tauri::State<'_, DbState>) -> Result<String, String> {
    let conn = state.conn.lock().map_err(|_| "Database mutex poisoned")?;

    let preferences: Vec<(String, String)> = conn
        .prepare("SELECT key, value FROM user_preferences")
        .map_err(|e| e.to_string())?
        .query_map([], |r| Ok((r.get(0)?, r.get(1)?)))
        .map_err(|e| e.to_string())?
        .filter_map(Result::ok)
        .collect();

    let favorites: Vec<(String, Option<String>, Option<String>)> = conn
        .prepare("SELECT file_path, title, media_type FROM library_favorites")
        .map_err(|e| e.to_string())?
        .query_map([], |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)))
        .map_err(|e| e.to_string())?
        .filter_map(Result::ok)
        .collect();

    let bookmarks: Vec<(String, f64, String)> = conn
        .prepare("SELECT file_path, timestamp_seconds, label FROM bookmarks")
        .map_err(|e| e.to_string())?
        .query_map([], |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)))
        .map_err(|e| e.to_string())?
        .filter_map(Result::ok)
        .collect();

    let col_rows: Vec<(i64, String, Option<String>)> = conn
        .prepare("SELECT id, name, color FROM collections")
        .map_err(|e| e.to_string())?
        .query_map([], |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)))
        .map_err(|e| e.to_string())?
        .filter_map(Result::ok)
        .collect();

    let mut collections = Vec::with_capacity(col_rows.len());
    let mut item_stmt = conn
        .prepare("SELECT file_path FROM collection_items WHERE collection_id = ?1")
        .map_err(|e| e.to_string())?;
    for (cid, name, color) in col_rows {
        let items: Vec<String> = item_stmt
            .query_map(params![cid], |r| r.get(0))
            .map_err(|e| e.to_string())?
            .filter_map(Result::ok)
            .collect();
        collections.push((name, color, items));
    }

    let exported_at: String = conn
        .query_row("SELECT datetime('now')", [], |r| r.get(0))
        .unwrap_or_default();

    let payload = BackupPayload {
        version: 1,
        exported_at,
        preferences,
        favorites,
        bookmarks,
        collections,
    };

    serde_json::to_string_pretty(&payload).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn db_import_backup(state: tauri::State<'_, DbState>, json_data: String) -> Result<usize, String> {
    let payload: BackupPayload =
        serde_json::from_str(&json_data).map_err(|e| format!("Invalid backup JSON: {}", e))?;

    let mut conn = state.conn.lock().map_err(|_| "Database mutex poisoned")?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    let mut restored = 0usize;

    for (k, v) in payload.preferences {
        if tx
            .execute(
                "INSERT OR REPLACE INTO user_preferences (key, value) VALUES (?1, ?2)",
                params![k, v],
            )
            .is_ok()
        {
            restored += 1;
        }
    }

    for (fp, title, mt) in payload.favorites {
        if tx
            .execute(
                "INSERT OR IGNORE INTO library_favorites (file_path, title, media_type) VALUES (?1, ?2, ?3)",
                params![fp, title, mt],
            )
            .is_ok()
        {
            restored += 1;
        }
    }

    for (fp, ts, label) in payload.bookmarks {
        if tx
            .execute(
                "INSERT INTO bookmarks (file_path, timestamp_seconds, label)
                 SELECT ?1, ?2, ?3
                 WHERE NOT EXISTS (
                     SELECT 1 FROM bookmarks WHERE file_path = ?1 AND ABS(timestamp_seconds - ?2) < 0.5
                 )",
                params![fp, ts, label],
            )
            .is_ok()
        {
            restored += 1;
        }
    }

    for (name, color, items) in payload.collections {
        let _ = tx.execute(
            "INSERT OR IGNORE INTO collections (name, color) VALUES (?1, ?2)",
            params![name, color],
        );
        if let Ok(cid) = tx.query_row(
            "SELECT id FROM collections WHERE name = ?1",
            params![name],
            |r| r.get::<_, i64>(0),
        ) {
            for fp in items {
                let _ = tx.execute(
                    "INSERT OR IGNORE INTO collection_items (collection_id, file_path) VALUES (?1, ?2)",
                    params![cid, fp],
                );
            }
            restored += 1;
        }
    }

    tx.commit().map_err(|e| e.to_string())?;
    Ok(restored)
}
