use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use std::path::Path;

use super::DbState;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WatchReportSummary {
    pub total_movies_watched: i64,
    pub total_movie_duration_seconds: f64,
    pub total_series_count: i64,
    pub total_episodes_watched: i64,
    pub total_series_duration_seconds: f64,
    pub total_music_listened: i64,
    pub total_music_duration_seconds: f64,
    pub total_watch_time_seconds: f64,
    pub total_disk_space_reclaimed_bytes: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SeasonReportItem {
    pub season_number: i64,
    pub episodes_watched: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SeriesReportItem {
    pub series_key: String,
    pub series_name: String,
    pub custom_poster: Option<String>,
    pub sample_file_path: Option<String>,
    pub year: Option<String>,
    pub total_episodes_watched: i64,
    pub total_seasons_watched: i64,
    pub seasons_breakdown: Vec<SeasonReportItem>,
    pub last_watched_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ActivityTrendItem {
    pub period: String, // e.g. "2026-10" or "2026-10-25"
    pub movies_count: i64,
    pub episodes_count: i64,
    pub music_count: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WatchedArchiveItem {
    pub id: i64,
    pub media_key: String,
    pub file_path: Option<String>,
    pub file_name: Option<String>,
    pub title: String,
    pub media_type: String,
    pub category: String,
    pub series_name: Option<String>,
    pub series_key: Option<String>,
    pub season_number: Option<i64>,
    pub episode_number: Option<i64>,
    pub episode_title: Option<String>,
    pub year: Option<String>,
    pub duration: Option<f64>,
    pub file_size: Option<i64>,
    pub custom_poster: Option<String>,
    pub watched_at: String,
    pub watch_count: i64,
    pub is_still_on_disk: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FullWatchReport {
    pub summary: WatchReportSummary,
    pub series: Vec<SeriesReportItem>,
    pub recent_activity: Vec<ActivityTrendItem>,
}

/// Helper to safely move a file to the OS Recycle Bin on Windows
#[cfg(windows)]
pub fn move_file_to_trash(path: &Path) -> std::io::Result<()> {
    use std::os::windows::ffi::OsStrExt;

    let mut wide: Vec<u16> = path.as_os_str().encode_wide().collect();
    wide.push(0);
    wide.push(0); // SHFileOperationW requires double null termination

    #[repr(C)]
    #[allow(non_snake_case)]
    struct SHFILEOPSTRUCTW {
        hwnd: *mut std::ffi::c_void,
        wFunc: u32,
        pFrom: *const u16,
        pTo: *const u16,
        fFlags: u16,
        fAnyOperationsAborted: i32,
        hNameMappings: *mut std::ffi::c_void,
        lpszProgressTitle: *const u16,
    }

    const FO_DELETE: u32 = 0x0003;
    const FOF_ALLOWUNDO: u16 = 0x0040;
    const FOF_NOCONFIRMATION: u16 = 0x0010;
    const FOF_SILENT: u16 = 0x0004;

    #[link(name = "shell32")]
    extern "system" {
        fn SHFileOperationW(lpFileOp: *mut SHFILEOPSTRUCTW) -> i32;
    }

    let mut op = SHFILEOPSTRUCTW {
        hwnd: std::ptr::null_mut(),
        wFunc: FO_DELETE,
        pFrom: wide.as_ptr(),
        pTo: std::ptr::null(),
        fFlags: FOF_ALLOWUNDO | FOF_NOCONFIRMATION | FOF_SILENT,
        fAnyOperationsAborted: 0,
        hNameMappings: std::ptr::null_mut(),
        lpszProgressTitle: std::ptr::null(),
    };

    let res = unsafe { SHFileOperationW(&mut op) };
    if res == 0 && op.fAnyOperationsAborted == 0 {
        Ok(())
    } else {
        Err(std::io::Error::new(
            std::io::ErrorKind::Other,
            format!("SHFileOperationW failed with exit code: {}", res),
        ))
    }
}

#[cfg(not(windows))]
pub fn move_file_to_trash(path: &Path) -> std::io::Result<()> {
    // Fallback on non-windows: remove directly
    std::fs::remove_file(path)
}

/// Ensures watched_archive table and indexes exist
pub fn init_archive_schema(conn: &Connection) -> Result<(), rusqlite::Error> {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS watched_archive (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            media_key TEXT UNIQUE NOT NULL,
            file_path TEXT,
            file_name TEXT,
            title TEXT NOT NULL,
            media_type TEXT NOT NULL,
            category TEXT NOT NULL,
            series_name TEXT,
            series_key TEXT,
            season_number INTEGER,
            episode_number INTEGER,
            episode_title TEXT,
            year TEXT,
            duration REAL,
            file_size INTEGER,
            custom_poster TEXT,
            watched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            watch_count INTEGER DEFAULT 1
        );

        CREATE INDEX IF NOT EXISTS idx_watched_archive_cat ON watched_archive (category);
        CREATE INDEX IF NOT EXISTS idx_watched_archive_skey ON watched_archive (series_key);
        CREATE INDEX IF NOT EXISTS idx_watched_archive_date ON watched_archive (watched_at);
        CREATE INDEX IF NOT EXISTS idx_watched_archive_mkey ON watched_archive (media_key);
        ",
    )?;

    // Initial backfill of any existing watched items from library_items
    let _ = conn.execute(
        "INSERT OR IGNORE INTO watched_archive (
            media_key, file_path, file_name, title, media_type, category,
            series_name, series_key, season_number, episode_number, episode_title,
            year, duration, file_size, custom_poster, watched_at
        )
        SELECT 
            CASE 
                WHEN COALESCE(series_key, '') != '' AND season_number IS NOT NULL AND episode_number IS NOT NULL 
                    THEN series_key || ':s' || season_number || 'e' || episode_number
                WHEN COALESCE(quick_hash, '') != '' 
                    THEN quick_hash
                ELSE file_path
            END,
            file_path, file_name, title, media_type, COALESCE(category, 'movie'),
            series_name, series_key, season_number, episode_number, episode_title,
            year, duration, file_size, custom_poster, CURRENT_TIMESTAMP
        FROM library_items
        WHERE COALESCE(is_watched, 0) = 1",
        [],
    );

    Ok(())
}

/// Generate a unique persistent media key for archiving
pub fn make_media_key(
    series_key: Option<&str>,
    season_number: Option<i64>,
    episode_number: Option<i64>,
    quick_hash: Option<&str>,
    file_path: &str,
) -> String {
    if let (Some(sk), Some(s), Some(e)) = (series_key, season_number, episode_number) {
        if !sk.is_empty() {
            return format!("{}:s{:02}e{:02}", sk, s, e);
        }
    }
    if let Some(qh) = quick_hash {
        if !qh.is_empty() {
            return format!("hash:{}", qh);
        }
    }
    format!("path:{}", file_path)
}

/// Archive an item when marked watched
pub fn archive_watched_by_path(conn: &Connection, file_path: &str) -> Result<(), String> {
    let mut stmt = conn
        .prepare(
            "SELECT file_name, title, media_type, category, series_name, series_key,
                    season_number, episode_number, episode_title, year, duration,
                    file_size, custom_poster, quick_hash
             FROM library_items
             WHERE file_path = ?1",
        )
        .map_err(|e| e.to_string())?;

    let row = stmt
        .query_row(params![file_path], |r| {
            let file_size: Option<i64> = r.get(11)?;
            Ok((
                r.get::<_, Option<String>>(0)?,
                r.get::<_, String>(1)?,
                r.get::<_, String>(2)?,
                r.get::<_, Option<String>>(3)?,
                r.get::<_, Option<String>>(4)?,
                r.get::<_, Option<String>>(5)?,
                r.get::<_, Option<i64>>(6)?,
                r.get::<_, Option<i64>>(7)?,
                r.get::<_, Option<String>>(8)?,
                r.get::<_, Option<String>>(9)?,
                r.get::<_, Option<f64>>(10)?,
                file_size,
                r.get::<_, Option<String>>(12)?,
                r.get::<_, Option<String>>(13)?,
            ))
        })
        .optional()
        .map_err(|e| e.to_string())?;

    if let Some((
        file_name,
        title,
        media_type,
        category,
        series_name,
        series_key,
        season_number,
        episode_number,
        episode_title,
        year,
        duration,
        file_size,
        custom_poster,
        quick_hash,
    )) = row
    {
        let key = make_media_key(
            series_key.as_deref(),
            season_number,
            episode_number,
            quick_hash.as_deref(),
            file_path,
        );

        let cat = category.unwrap_or_else(|| {
            if series_key.is_some() || series_name.is_some() {
                "series".to_string()
            } else if media_type == "audio" {
                "music".to_string()
            } else {
                "movie".to_string()
            }
        });

        conn.execute(
            "INSERT INTO watched_archive (
                media_key, file_path, file_name, title, media_type, category,
                series_name, series_key, season_number, episode_number, episode_title,
                year, duration, file_size, custom_poster, watched_at, watch_count
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, CURRENT_TIMESTAMP, 1)
            ON CONFLICT(media_key) DO UPDATE SET
                watched_at = CURRENT_TIMESTAMP,
                watch_count = watched_archive.watch_count + 1,
                duration = COALESCE(excluded.duration, watched_archive.duration),
                file_size = COALESCE(excluded.file_size, watched_archive.file_size),
                custom_poster = COALESCE(excluded.custom_poster, watched_archive.custom_poster)",
            params![
                key,
                file_path,
                file_name,
                title,
                media_type,
                cat,
                series_name,
                series_key,
                season_number,
                episode_number,
                episode_title,
                year,
                duration,
                file_size,
                custom_poster
            ],
        )
        .map_err(|e| e.to_string())?;
    }

    Ok(())
}

/// Remove from archive if user explicitly toggled "unwatched"
pub fn unarchive_watched_by_path(conn: &Connection, file_path: &str) -> Result<(), String> {
    let mut stmt = conn
        .prepare("SELECT series_key, season_number, episode_number, quick_hash FROM library_items WHERE file_path = ?1")
        .map_err(|e| e.to_string())?;

    let row = stmt
        .query_row(params![file_path], |r| {
            Ok((
                r.get::<_, Option<String>>(0)?,
                r.get::<_, Option<i64>>(1)?,
                r.get::<_, Option<i64>>(2)?,
                r.get::<_, Option<String>>(3)?,
            ))
        })
        .optional()
        .map_err(|e| e.to_string())?;

    if let Some((s_key, s_num, e_num, q_hash)) = row {
        let key = make_media_key(s_key.as_deref(), s_num, e_num, q_hash.as_deref(), file_path);
        let _ = conn.execute("DELETE FROM watched_archive WHERE media_key = ?1", params![key]);
    }
    let _ = conn.execute("DELETE FROM watched_archive WHERE file_path = ?1", params![file_path]);

    Ok(())
}

/// Archive entire TV series or season when marked watched
pub fn archive_series_watched(
    conn: &Connection,
    series_key: &str,
    season_number: Option<i64>,
) -> Result<(), String> {
    let mut sql = String::from(
        "SELECT file_path FROM library_items WHERE series_key = ?1 ",
    );
    if let Some(s) = season_number {
        sql.push_str(&format!("AND season_number = {} ", s));
    }
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let paths: Vec<String> = stmt
        .query_map(params![series_key], |row| row.get(0))
        .map_err(|e| e.to_string())?
        .filter_map(Result::ok)
        .collect();

    for p in paths {
        let _ = archive_watched_by_path(conn, &p);
    }
    Ok(())
}

/// Unarchive entire TV series or season
pub fn unarchive_series_watched(
    conn: &Connection,
    series_key: &str,
    season_number: Option<i64>,
) -> Result<(), String> {
    if let Some(s) = season_number {
        conn.execute(
            "DELETE FROM watched_archive WHERE series_key = ?1 AND season_number = ?2",
            params![series_key, s],
        )
        .map_err(|e| e.to_string())?;
    } else {
        conn.execute(
            "DELETE FROM watched_archive WHERE series_key = ?1",
            params![series_key],
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Tauri command to delete a media file safely from within Eytaa
#[tauri::command]
pub fn db_delete_media_file(
    state: tauri::State<'_, DbState>,
    file_path: String,
    to_recycle_bin: bool,
    keep_in_archive: bool,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|_| "Database mutex poisoned")?;
    let path = Path::new(&file_path);

    // 1. If requested, preserve in watched archive before deleting the file
    if keep_in_archive {
        let _ = archive_watched_by_path(&conn, &file_path);
    }

    // 2. Perform actual file deletion if present on disk
    if path.exists() {
        if to_recycle_bin {
            move_file_to_trash(path).map_err(|e| format!("Failed to move file to Recycle Bin: {}", e))?;
        } else {
            std::fs::remove_file(path).map_err(|e| format!("Failed to permanently delete file: {}", e))?;
        }
    }

    // 3. Remove row from library_items and other local index tables
    let _ = conn.execute("DELETE FROM library_items WHERE file_path = ?1", params![file_path]);
    let _ = conn.execute("DELETE FROM resume_positions WHERE file_path = ?1", params![file_path]);
    let _ = conn.execute("DELETE FROM library_favorites WHERE file_path = ?1", params![file_path]);

    Ok(())
}

/// Tauri command to retrieve full watch report & statistics
#[tauri::command]
pub fn db_get_watch_report(state: tauri::State<'_, DbState>) -> Result<FullWatchReport, String> {
    let conn = state.conn.lock().map_err(|_| "Database mutex poisoned")?;

    // 1. Movies summary
    let (movies_count, movies_duration): (i64, f64) = conn
        .query_row(
            "SELECT COUNT(*), COALESCE(SUM(duration), 0.0) FROM watched_archive WHERE category = 'movie'",
            [],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )
        .unwrap_or((0, 0.0));

    // 2. Series summary
    let (series_count, episodes_count, series_duration): (i64, i64, f64) = conn
        .query_row(
            "SELECT COUNT(DISTINCT series_key), COUNT(*), COALESCE(SUM(duration), 0.0)
             FROM watched_archive
             WHERE category = 'series' OR COALESCE(series_key, '') != ''",
            [],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
        )
        .unwrap_or((0, 0, 0.0));

    // 3. Music summary
    let (music_count, music_duration): (i64, f64) = conn
        .query_row(
            "SELECT COUNT(*), COALESCE(SUM(duration), 0.0) FROM watched_archive WHERE category = 'music' OR media_type = 'audio'",
            [],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )
        .unwrap_or((0, 0.0));

    // 4. Disk space reclaimed (for files in watched_archive that are NO LONGER on disk)
    let mut stmt = conn
        .prepare("SELECT file_path, file_size FROM watched_archive WHERE file_path IS NOT NULL AND file_size > 0")
        .map_err(|e| e.to_string())?;

    let candidate_rows: Vec<(String, i64)> = stmt
        .query_map([], |r| Ok((r.get(0)?, r.get(1)?)))
        .map_err(|e| e.to_string())?
        .filter_map(Result::ok)
        .collect();

    let mut space_reclaimed: i64 = 0;
    for (p, sz) in candidate_rows {
        if !Path::new(&p).exists() {
            space_reclaimed += sz;
        }
    }

    let summary = WatchReportSummary {
        total_movies_watched: movies_count,
        total_movie_duration_seconds: movies_duration,
        total_series_count: series_count,
        total_episodes_watched: episodes_count,
        total_series_duration_seconds: series_duration,
        total_music_listened: music_count,
        total_music_duration_seconds: music_duration,
        total_watch_time_seconds: movies_duration + series_duration + music_duration,
        total_disk_space_reclaimed_bytes: space_reclaimed,
    };

    // 5. TV Series breakdown
    let mut s_stmt = conn
        .prepare(
            "SELECT series_key,
                    COALESCE(MAX(series_name), series_key) as name,
                    MAX(custom_poster) as poster,
                    COUNT(*) as ep_count,
                    COUNT(DISTINCT season_number) as season_count,
                    MAX(watched_at) as last_watched,
                    MAX(file_path) as sample_path,
                    MAX(year) as year
             FROM watched_archive
             WHERE COALESCE(series_key, '') != ''
             GROUP BY series_key
             ORDER BY MAX(watched_at) DESC",
        )
        .map_err(|e| e.to_string())?;

    let series_rows: Vec<(String, String, Option<String>, i64, i64, Option<String>, Option<String>, Option<String>)> = s_stmt
        .query_map([], |r| {
            Ok((
                r.get(0)?,
                r.get(1)?,
                r.get(2)?,
                r.get(3)?,
                r.get(4)?,
                r.get(5)?,
                r.get(6)?,
                r.get(7)?,
            ))
        })
        .map_err(|e| e.to_string())?
        .filter_map(Result::ok)
        .collect();

    let mut series_breakdown = Vec::new();
    for (s_key, s_name, s_poster, ep_count, season_count, last_watched, sample_path, year) in series_rows {
        let mut sea_stmt = conn
            .prepare(
                "SELECT COALESCE(season_number, 1) as s_num, COUNT(*) as c
                 FROM watched_archive
                 WHERE series_key = ?1
                 GROUP BY COALESCE(season_number, 1)
                 ORDER BY s_num ASC",
            )
            .map_err(|e| e.to_string())?;

        let seasons_data: Vec<SeasonReportItem> = sea_stmt
            .query_map(params![s_key], |r| {
                Ok(SeasonReportItem {
                    season_number: r.get(0)?,
                    episodes_watched: r.get(1)?,
                })
            })
            .map_err(|e| e.to_string())?
            .filter_map(Result::ok)
            .collect();

        series_breakdown.push(SeriesReportItem {
            series_key: s_key,
            series_name: s_name,
            custom_poster: s_poster,
            sample_file_path: sample_path,
            year,
            total_episodes_watched: ep_count,
            total_seasons_watched: season_count,
            seasons_breakdown: seasons_data,
            last_watched_at: last_watched,
        });
    }

    // 6. Recent activity (last 7 recorded dates)
    let mut act_stmt = conn
        .prepare(
            "SELECT substr(watched_at, 1, 10) as day,
                    SUM(CASE WHEN category = 'movie' THEN 1 ELSE 0 END) as m_cnt,
                    SUM(CASE WHEN category = 'series' OR COALESCE(series_key, '') != '' THEN 1 ELSE 0 END) as ep_cnt,
                    SUM(CASE WHEN category = 'music' OR media_type = 'audio' THEN 1 ELSE 0 END) as mus_cnt
             FROM watched_archive
             GROUP BY substr(watched_at, 1, 10)
             ORDER BY day DESC
             LIMIT 14",
        )
        .map_err(|e| e.to_string())?;

    let mut recent_activity: Vec<ActivityTrendItem> = act_stmt
        .query_map([], |r| {
            Ok(ActivityTrendItem {
                period: r.get(0)?,
                movies_count: r.get(1)?,
                episodes_count: r.get(2)?,
                music_count: r.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(Result::ok)
        .collect();
    recent_activity.reverse(); // chronological order for graphs

    Ok(FullWatchReport {
        summary,
        series: series_breakdown,
        recent_activity,
    })
}

/// Tauri command to list all items in the permanent watched archive
#[tauri::command]
pub fn db_get_watched_archive(
    state: tauri::State<'_, DbState>,
    category: Option<String>,
    search: Option<String>,
    limit: Option<i64>,
    offset: Option<i64>,
) -> Result<Vec<WatchedArchiveItem>, String> {
    let conn = state.conn.lock().map_err(|_| "Database mutex poisoned")?;

    let mut sql = String::from(
        "SELECT id, media_key, file_path, file_name, title, media_type, category,
                series_name, series_key, season_number, episode_number, episode_title,
                year, duration, file_size, custom_poster, watched_at, watch_count
         FROM watched_archive
         WHERE 1=1 ",
    );

    let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

    if let Some(cat) = category {
        if !cat.is_empty() && cat != "all" {
            sql.push_str("AND category = ? ");
            params_vec.push(Box::new(cat));
        }
    }

    if let Some(s) = search {
        let trimmed = s.trim();
        if !trimmed.is_empty() {
            sql.push_str("AND (title LIKE ? OR COALESCE(series_name, '') LIKE ? OR file_name LIKE ?) ");
            let pattern = format!("%{}%", trimmed);
            params_vec.push(Box::new(pattern.clone()));
            params_vec.push(Box::new(pattern.clone()));
            params_vec.push(Box::new(pattern));
        }
    }

    sql.push_str("ORDER BY watched_at DESC ");

    if let Some(lim) = limit {
        if lim > 0 {
            sql.push_str(&format!("LIMIT {} ", lim));
        }
    }

    if let Some(off) = offset {
        if off > 0 {
            sql.push_str(&format!("OFFSET {} ", off));
        }
    }

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let rusqlite_params: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|b| b.as_ref()).collect();

    let items = stmt
        .query_map(&rusqlite_params[..], |r| {
            let fp: Option<String> = r.get(2)?;
            let is_on_disk = fp.as_ref().map(|p| Path::new(p).exists()).unwrap_or(false);

            Ok(WatchedArchiveItem {
                id: r.get(0)?,
                media_key: r.get(1)?,
                file_path: fp,
                file_name: r.get(3)?,
                title: r.get(4)?,
                media_type: r.get(5)?,
                category: r.get(6)?,
                series_name: r.get(7)?,
                series_key: r.get(8)?,
                season_number: r.get(9)?,
                episode_number: r.get(10)?,
                episode_title: r.get(11)?,
                year: r.get(12)?,
                duration: r.get(13)?,
                file_size: r.get(14)?,
                custom_poster: r.get(15)?,
                watched_at: r.get(16)?,
                watch_count: r.get(17)?,
                is_still_on_disk: is_on_disk,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(Result::ok)
        .collect();

    Ok(items)
}

/// Tauri command to delete a record from the watch archive
#[tauri::command]
pub fn db_delete_archive_item(state: tauri::State<'_, DbState>, id: i64) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|_| "Database mutex poisoned")?;
    conn.execute("DELETE FROM watched_archive WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

