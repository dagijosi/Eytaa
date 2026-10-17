use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use tauri::Manager;

use super::DbState;

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

#[tauri::command]
pub fn db_add_library_folder(
    app: tauri::AppHandle,
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
    drop(conn);

    // Begin watching the folder live so newly downloaded files appear without a rescan.
    if let Some(watcher) = app.try_state::<crate::watcher::LibraryWatcher>() {
        watcher.add_folder(&folder_path);
    }

    Ok(id)
}

#[tauri::command]
pub fn db_remove_library_folder(
    app: tauri::AppHandle,
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
    drop(conn);

    if let Some(watcher) = app.try_state::<crate::watcher::LibraryWatcher>() {
        watcher.remove_folder(&folder_path);
    }
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
    save_library_items(&mut conn, items)
}

/// Inserts or updates library items in a single transaction. Shared by the
/// `db_save_library_items` command (full scans) and the live filesystem watcher
/// (incremental single-file updates).
pub fn save_library_items(
    conn: &mut Connection,
    items: Vec<crate::library::ScannedMediaItem>,
) -> Result<usize, String> {
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

/// Returns the raw folder paths registered as library roots.
pub fn list_library_folder_paths(conn: &Connection) -> Vec<String> {
    let mut out = Vec::new();
    if let Ok(mut stmt) = conn.prepare("SELECT folder_path FROM library_folders") {
        if let Ok(rows) = stmt.query_map([], |row| row.get::<_, String>(0)) {
            for row in rows.flatten() {
                out.push(row);
            }
        }
    }
    out
}

/// Flags a single library item as unavailable (used when a watched folder loses
/// a file). Returns the number of rows affected.
pub fn mark_item_missing(conn: &Connection, file_path: &str) -> usize {
    conn.execute(
        "UPDATE library_items
            SET is_available = 0,
                missing_since = COALESCE(missing_since, CURRENT_TIMESTAMP)
          WHERE file_path = ?1",
        params![file_path],
    )
    .unwrap_or(0)
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
