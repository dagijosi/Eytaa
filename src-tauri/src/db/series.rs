use rusqlite::{params, OptionalExtension};
use serde::{Deserialize, Serialize};

use super::{DbState, LibraryItemDto};

#[tauri::command]
pub fn db_get_next_episode(
    state: tauri::State<'_, DbState>,
    series_name: String,
) -> Result<Option<LibraryItemDto>, String> {
    let conn = state.conn.lock().map_err(|_| "Database mutex poisoned")?;
    let key = crate::library::normalize_series_key(&series_name);
    let mut stmt = conn
        .prepare(
            "SELECT li.id, li.folder_path, li.file_path, li.file_name, li.title, li.media_type,
                    li.file_size, COALESCE(li.duration, rp.duration) as duration, li.last_modified, li.added_at,
                    (lf.file_path IS NOT NULL) as is_favorite,
                    rp.position as resume_position,
                    COALESCE(li.is_available, 1) as is_available,
                    li.quick_hash,
                    0 as is_duplicate,
                    li.category, li.series_name, li.season_number, li.episode_number, li.episode_title, li.year,
                    COALESCE(li.is_watched, 0) as is_watched,
                    COALESCE(li.manual_override, 0) as manual_override,
                    li.custom_poster,
                    li.series_key
             FROM library_items li
             LEFT JOIN library_favorites lf ON li.file_path = lf.file_path
             LEFT JOIN resume_positions rp ON li.file_path = rp.file_path
             WHERE li.series_key = ?1
               AND COALESCE(li.season_number, 1) <> 0
               AND COALESCE(li.is_watched, 0) = 0
               AND (rp.duration IS NULL OR rp.position IS NULL OR rp.position < rp.duration * 0.9)
             ORDER BY COALESCE(li.season_number, 1) ASC, COALESCE(li.episode_number, 1) ASC
             LIMIT 1",
        )
        .map_err(|e| e.to_string())?;

    let item = stmt
        .query_row(params![key], |row| {
            let file_size_i64: i64 = row.get(6)?;
            let last_mod_i64: i64 = row.get(8)?;
            let is_avail_i64: i64 = row.get(12)?;
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
                is_duplicate: false,
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
        .optional()
        .map_err(|e| e.to_string())?;

    Ok(item)
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SeriesOverviewDto {
    pub series_key: String,
    pub display_name: String,
    pub episode_count: i64,
    pub season_count: i64,
    pub watched_count: i64,
    pub next_season: Option<i64>,
    pub next_episode: Option<i64>,
    pub custom_poster: Option<String>,
}

#[tauri::command]
pub fn db_get_series_overview(
    state: tauri::State<'_, DbState>,
) -> Result<Vec<SeriesOverviewDto>, String> {
    let conn = state.conn.lock().map_err(|_| "Database mutex poisoned")?;

    let mut stmt = conn
        .prepare(
            "SELECT li.series_key,
                    COUNT(*) as episode_count,
                    COUNT(DISTINCT COALESCE(li.season_number,1)) as season_count,
                    SUM(COALESCE(li.is_watched,0)) as watched_count,
                    (SELECT li2.custom_poster
                     FROM library_items li2
                     WHERE li2.series_key = li.series_key
                       AND COALESCE(TRIM(li2.custom_poster),'') != ''
                     ORDER BY CASE WHEN COALESCE(li2.season_number,0) = 0 THEN 9999
                                   ELSE COALESCE(li2.season_number,0) END ASC,
                              COALESCE(li2.episode_number,0) ASC,
                              li2.title COLLATE NOCASE ASC
                     LIMIT 1) as custom_poster
             FROM library_items li
             WHERE COALESCE(li.series_key,'') != '' AND COALESCE(li.is_available, 1) = 1
             GROUP BY li.series_key",
        )
        .map_err(|e| e.to_string())?;
    let rows: Vec<(String, i64, i64, i64, Option<String>)> = stmt
        .query_map([], |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?, row.get(4)?)))
        .map_err(|e| e.to_string())?
        .filter_map(Result::ok)
        .collect();

    // Most common series_name variant per key becomes the display name
    let mut dn_stmt = conn
        .prepare(
            "SELECT series_key, series_name, COUNT(*) as cnt
             FROM library_items
             WHERE COALESCE(series_key,'') != '' AND series_name IS NOT NULL AND series_name != '' AND COALESCE(is_available, 1) = 1
             GROUP BY series_key, series_name",
        )
        .map_err(|e| e.to_string())?;
    let dn_rows: Vec<(String, String, i64)> = dn_stmt
        .query_map([], |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)))
        .map_err(|e| e.to_string())?
        .filter_map(Result::ok)
        .collect();

    let mut best: std::collections::HashMap<String, (String, i64)> = Default::default();
    for (k, name, cnt) in dn_rows {
        use std::collections::hash_map::Entry;
        match best.entry(k) {
            Entry::Occupied(mut e) => {
                let cur = e.get().clone();
                if cnt > cur.1 || (cnt == cur.1 && name.len() > cur.0.len()) {
                    e.insert((name, cnt));
                }
            }
            Entry::Vacant(v) => {
                v.insert((name, cnt));
            }
        }
    }

    // Next unwatched (non-specials) episode marker per key: season*10000 + episode
    let mut nx_stmt = conn
        .prepare(
            "SELECT series_key,
                    MIN(CASE WHEN COALESCE(is_watched,0)=0 AND COALESCE(season_number,1) <> 0
                        THEN COALESCE(season_number,1)*10000 + COALESCE(episode_number,0) END)
             FROM library_items
             WHERE COALESCE(series_key,'') != ''
             GROUP BY series_key",
        )
        .map_err(|e| e.to_string())?;
    let nx_rows: Vec<(String, Option<i64>)> = nx_stmt
        .query_map([], |row| Ok((row.get(0)?, row.get(1)?)))
        .map_err(|e| e.to_string())?
        .filter_map(Result::ok)
        .collect();
    let mut next_map: std::collections::HashMap<String, i64> = Default::default();
    for (k, m) in nx_rows {
        if let Some(marker) = m {
            next_map.insert(k, marker);
        }
    }

    let out: Vec<SeriesOverviewDto> = rows
        .into_iter()
        .map(|(key, ep_count, s_count, w_count, poster)| {
            let display_name = best
                .get(&key)
                .map(|(n, _)| n.clone())
                .unwrap_or_else(|| key.clone());
            let marker = next_map.get(&key).copied();
            SeriesOverviewDto {
                series_key: key,
                display_name,
                episode_count: ep_count,
                season_count: s_count,
                watched_count: w_count,
                next_season: marker.map(|m| m / 10000),
                next_episode: marker.map(|m| m % 10000),
                custom_poster: poster,
            }
        })
        .collect();

    Ok(out)
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SeriesMetadataDto {
    pub series_key: String,
    pub series_name: String,
    pub tmdb_id: Option<i64>,
    pub overview: Option<String>,
    pub tagline: Option<String>,
    pub rating: Option<f64>,
    pub vote_count: Option<i64>,
    pub genres: Option<String>,
    pub status: Option<String>,
    pub networks: Option<String>,
    pub first_air_date: Option<String>,
    pub last_air_date: Option<String>,
    pub backdrop_url: Option<String>,
    pub poster_url: Option<String>,
    pub created_by: Option<String>,
    pub content_rating: Option<String>,
}

#[tauri::command]
pub fn db_get_series_metadata(
    state: tauri::State<'_, DbState>,
    series_key: String,
) -> Result<Option<SeriesMetadataDto>, String> {
    let conn = state.conn.lock().map_err(|_| "Database mutex poisoned")?;
    let key = crate::library::normalize_series_key(&series_key);

    let mut stmt = conn
        .prepare(
            "SELECT series_key, series_name, tmdb_id, overview, tagline, rating, vote_count,
                    genres, status, networks, first_air_date, last_air_date,
                    backdrop_url, poster_url, created_by, content_rating
             FROM series_metadata
             WHERE series_key = ?1",
        )
        .map_err(|e| e.to_string())?;

    let item = stmt
        .query_row(params![key], |row| {
            Ok(SeriesMetadataDto {
                series_key: row.get(0)?,
                series_name: row.get(1)?,
                tmdb_id: row.get(2)?,
                overview: row.get(3)?,
                tagline: row.get(4)?,
                rating: row.get(5)?,
                vote_count: row.get(6)?,
                genres: row.get(7)?,
                status: row.get(8)?,
                networks: row.get(9)?,
                first_air_date: row.get(10)?,
                last_air_date: row.get(11)?,
                backdrop_url: row.get(12)?,
                poster_url: row.get(13)?,
                created_by: row.get(14)?,
                content_rating: row.get(15)?,
            })
        })
        .optional()
        .map_err(|e| e.to_string())?;

    Ok(item)
}

#[tauri::command]
pub fn db_save_series_metadata(
    state: tauri::State<'_, DbState>,
    metadata: SeriesMetadataDto,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|_| "Database mutex poisoned")?;
    let key = crate::library::normalize_series_key(&metadata.series_key);

    conn.execute(
        "INSERT INTO series_metadata (
            series_key, series_name, tmdb_id, overview, tagline, rating, vote_count,
            genres, status, networks, first_air_date, last_air_date,
            backdrop_url, poster_url, created_by, content_rating, updated_at
        ) VALUES (
            ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, CURRENT_TIMESTAMP
        )
        ON CONFLICT(series_key) DO UPDATE SET
            series_name = excluded.series_name,
            tmdb_id = COALESCE(excluded.tmdb_id, tmdb_id),
            overview = COALESCE(excluded.overview, overview),
            tagline = COALESCE(excluded.tagline, tagline),
            rating = COALESCE(excluded.rating, rating),
            vote_count = COALESCE(excluded.vote_count, vote_count),
            genres = COALESCE(excluded.genres, genres),
            status = COALESCE(excluded.status, status),
            networks = COALESCE(excluded.networks, networks),
            first_air_date = COALESCE(excluded.first_air_date, first_air_date),
            last_air_date = COALESCE(excluded.last_air_date, last_air_date),
            backdrop_url = COALESCE(excluded.backdrop_url, backdrop_url),
            poster_url = COALESCE(excluded.poster_url, poster_url),
            created_by = COALESCE(excluded.created_by, created_by),
            content_rating = COALESCE(excluded.content_rating, content_rating),
            updated_at = CURRENT_TIMESTAMP",
        params![
            key,
            metadata.series_name,
            metadata.tmdb_id,
            metadata.overview,
            metadata.tagline,
            metadata.rating,
            metadata.vote_count,
            metadata.genres,
            metadata.status,
            metadata.networks,
            metadata.first_air_date,
            metadata.last_air_date,
            metadata.backdrop_url,
            metadata.poster_url,
            metadata.created_by,
            metadata.content_rating,
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}
