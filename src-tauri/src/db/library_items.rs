use rusqlite::params;

use super::{DbState, LibraryItemDto};

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
    limit: Option<i64>,
    offset: Option<i64>,
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
    sql.push_str("ORDER BY COALESCE(li.series_key, li.title) COLLATE NOCASE ASC, CASE WHEN COALESCE(li.season_number, 0) = 0 THEN 9999 ELSE COALESCE(li.season_number, 0) END ASC, COALESCE(li.episode_number, 0) ASC, li.title COLLATE NOCASE ASC ");

    if let Some(lim) = limit {
        if lim > 0 {
            sql.push_str(&format!(" LIMIT {}", lim));
        }
    }
    if let Some(off) = offset {
        if off > 0 {
            sql.push_str(&format!(" OFFSET {}", off));
        } else if off < 0 {
            sql.push_str(" OFFSET 0");
        }
    }

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
