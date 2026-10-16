use serde::{Deserialize, Serialize};
use std::fs;
use std::io::{BufRead, BufReader, Read, Seek, SeekFrom, Write};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{AppHandle, Emitter};

pub static SCAN_CANCELLED: AtomicBool = AtomicBool::new(false);

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ScannedMediaItem {
    pub file_path: String,
    pub file_name: String,
    pub title: String,
    pub folder_path: String,
    pub media_type: String, // "video" | "audio"
    pub file_size: u64,
    pub last_modified: u64,
    pub quick_hash: Option<String>,
    pub category: Option<String>,
    pub series_name: Option<String>,
    pub season_number: Option<i64>,
    pub episode_number: Option<i64>,
    pub episode_title: Option<String>,
    pub year: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ScanProgressPayload {
    pub folder_path: String,
    pub current_directory: String,
    pub files_scanned: usize,
    pub total_found: usize,
    pub is_cancelled: bool,
    pub is_finished: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PlaylistItemDto {
    pub id: String,
    pub file_path: String,
    pub title: String,
}

const SUPPORTED_VIDEO_EXTS: &[&str] = &[
    "mp4", "mkv", "webm", "avi", "mov", "wmv", "flv", "ts", "m2ts", "vob", "m4v",
];

const SUPPORTED_AUDIO_EXTS: &[&str] = &[
    "mp3", "flac", "wav", "m4a", "aac", "ogg", "opus", "alac", "wma",
];

fn is_supported_media(ext: &str) -> Option<&'static str> {
    if SUPPORTED_VIDEO_EXTS.contains(&ext) {
        Some("video")
    } else if SUPPORTED_AUDIO_EXTS.contains(&ext) {
        Some("audio")
    } else {
        None
    }
}

/// Computes an ultra-fast non-blocking file fingerprint using size + first 8KB + last 8KB.
/// Takes < 0.1ms per file, enabling instant moved/renamed/duplicate detection.
pub fn compute_quick_hash(path: &Path, file_size: u64) -> Option<String> {
    let mut file = fs::File::open(path).ok()?;
    let mut hasher: u64 = 5381;
    hasher = ((hasher << 5).wrapping_add(hasher)).wrapping_add(file_size);

    let mut buf = [0u8; 8192];
    if let Ok(n) = file.read(&mut buf) {
        for &b in &buf[..n] {
            hasher = ((hasher << 5).wrapping_add(hasher)).wrapping_add(b as u64);
        }
    }
    if file_size > 16384 {
        if file.seek(SeekFrom::End(-8192)).is_ok() {
            if let Ok(n) = file.read(&mut buf) {
                for &b in &buf[..n] {
                    hasher = ((hasher << 5).wrapping_add(hasher)).wrapping_add(b as u64);
                }
            }
        }
    }
    Some(format!("{:016x}", hasher))
}

fn clean_word_delimiters(s: &str) -> String {
    let mut cleaned = String::with_capacity(s.len());
    let mut prev_is_space = false;
    for c in s.chars() {
        if c == '.' || c == '_' || c == '+' || c.is_whitespace() {
            if !prev_is_space && !cleaned.is_empty() {
                cleaned.push(' ');
                prev_is_space = true;
            }
        } else {
            cleaned.push(c);
            prev_is_space = false;
        }
    }
    cleaned.trim().to_string()
}

fn strip_scene_noise(s: &str) -> String {
    let noise_tags = [
        "2160p", "1080p", "720p", "480p", "4k", "uhd", "hdr", "hdr10", "dovi", "dv",
        "web-dl", "webrip", "bluray", "bdrip", "brrip", "dvdrip", "hdtv", "hevc",
        "x264", "x265", "h264", "h265", "10bit", "8bit", "aac", "ac3", "dts", "truehd",
        "atmos", "yify", "yts", "rarbg", "eztv", "repack", "proper", "remux", "flac"
    ];

    let words: Vec<&str> = s.split_whitespace().collect();
    let mut clean_words = Vec::new();
    for word in words {
        let lower = word.to_lowercase();
        if noise_tags.iter().any(|&tag| lower == tag || lower.starts_with(tag)) {
            break;
        }
        if word.starts_with('[') && word.ends_with(']') {
            continue;
        }
        clean_words.push(word);
    }
    clean_words.join(" ")
}

fn clean_series_name_and_extract_metadata(
    raw: &str,
) -> (String, Option<String>, Option<i64>) {
    let cleaned = strip_scene_noise(&clean_word_delimiters(raw));
    let words: Vec<&str> = cleaned.split_whitespace().collect();
    let mut year_opt: Option<String> = None;
    let mut season_opt: Option<i64> = None;
    let mut title_words: Vec<String> = Vec::new();

    let mut i = 0;
    while i < words.len() {
        let w = words[i];
        let lower = w.to_lowercase();

        // Check if word is season keyword e.g. "season", "series" followed by number, or "season1"
        if lower == "season" || lower == "series" || lower == "s" {
            if i + 1 < words.len() {
                let candidate: String = words[i + 1].chars().filter(|c| c.is_ascii_digit()).collect();
                if let Ok(s_num) = candidate.parse::<i64>() {
                    season_opt = Some(s_num);
                    i += 2;
                    continue;
                }
            }
        } else if lower.starts_with("season") || lower.starts_with("series") {
            let digits: String = w.chars().filter(|c| c.is_ascii_digit()).collect();
            if let Ok(s_num) = digits.parse::<i64>() {
                season_opt = Some(s_num);
                i += 1;
                continue;
            }
        }

        // Check if word is 4-digit release year e.g. "2024" or "(2024)" or "[2024]"
        let trimmed_num: String = w.chars().filter(|c| c.is_ascii_digit()).collect();
        if trimmed_num.len() == 4 {
            if let Ok(y_num) = trimmed_num.parse::<i64>() {
                if (1920..=2035).contains(&y_num) {
                    year_opt = Some(trimmed_num);
                    i += 1;
                    continue;
                }
            }
        }

        title_words.push(w.to_string());
        i += 1;
    }

    let mut final_title = title_words.join(" ");
    final_title = final_title
        .trim_matches(|c: char| c == '-' || c == ',' || c == ':' || c == '.' || c == '_' || c.is_whitespace())
        .to_string();

    (final_title, year_opt, season_opt)
}

fn extract_first_number(s: &str) -> Option<i64> {
    let mut in_num = false;
    let mut digits = String::new();
    for c in s.chars() {
        if c.is_ascii_digit() {
            in_num = true;
            digits.push(c);
        } else if in_num {
            break;
        }
    }
    digits.parse::<i64>().ok()
}

fn bracket_contains_episode_info(inner: &str) -> bool {
    let lower = inner.to_lowercase();
    let bytes = lower.as_bytes();
    let len = bytes.len();

    // Check SxxExx or Sxx-Exx or S1-E01
    for i in 0..len {
        if bytes[i] == b's' && i + 1 < len && bytes[i + 1].is_ascii_digit() {
            let mut k = i + 1;
            while k < len && bytes[k].is_ascii_digit() {
                k += 1;
            }
            while k < len && (bytes[k] == b'-' || bytes[k] == b'.' || bytes[k] == b'_' || bytes[k] == b' ') {
                k += 1;
            }
            if k < len && bytes[k] == b'e' && k + 1 < len && bytes[k + 1].is_ascii_digit() {
                return true;
            }
        }
        if bytes[i] == b'e' && i + 1 < len && bytes[i + 1].is_ascii_digit() {
            return true;
        }
        if bytes[i] == b'x' && i > 0 && i + 1 < len && bytes[i - 1].is_ascii_digit() && bytes[i + 1].is_ascii_digit() {
            return true;
        }
    }
    if lower.contains("episode") || lower.starts_with("ep") {
        return true;
    }
    false
}

fn strip_leading_brackets(mut s: &str) -> &str {
    s = s.trim();
    while s.starts_with('[') {
        if let Some(close) = s.find(']') {
            let inner = &s[1..close];
            if bracket_contains_episode_info(inner) {
                break;
            }
            s = s[close + 1..].trim();
        } else {
            break;
        }
    }
    s
}

fn extract_season_number_from_text(s: &str) -> Option<i64> {
    let lower = s.to_lowercase();
    if lower.starts_with("specials") {
        return Some(0);
    }
    if let Some(idx) = lower.find("season").or_else(|| lower.find("series")) {
        let after = &lower[idx..];
        if let Some(num) = extract_first_number(after) {
            return Some(num);
        }
    }
    if lower.starts_with('s') && lower.chars().nth(1).map_or(false, |c| c.is_ascii_digit()) {
        return extract_first_number(&lower);
    }
    None
}

fn is_tv_or_series_ancestor(path: &Path) -> bool {
    let tv_indicators = [
        "tv", "tv shows", "tv-shows", "tvshows", "tv series", "tv-series", "tvseries",
        "series", "shows", "anime", "cartoons", "cartoon", "kdrama", "k-drama", "serials", "dramas",
    ];
    let mut curr = path.parent();
    while let Some(dir) = curr {
        if let Some(name) = dir.file_name().and_then(|n| n.to_str()) {
            let lower = name.to_lowercase();
            if tv_indicators.iter().any(|&ind| lower == ind || lower.starts_with(ind)) {
                return true;
            }
        }
        curr = dir.parent();
    }
    false
}

pub fn parse_media_info(
    path: &Path,
    file_name: &str,
    media_type: &str,
) -> (
    String,
    Option<String>,
    Option<String>,
    Option<i64>,
    Option<i64>,
    Option<String>,
    Option<String>,
) {
    if media_type == "audio" {
        let stem = path.file_stem().and_then(|s| s.to_str()).unwrap_or(file_name);
        let cleaned = clean_word_delimiters(stem);
        let title = if let Some(idx) = cleaned.find(|c: char| !c.is_ascii_digit() && c != '.' && c != '-' && c != ' ') {
            cleaned[idx..].trim().to_string()
        } else {
            cleaned
        };
        let final_title = if title.is_empty() { file_name.to_string() } else { title };
        return (final_title, Some("music".to_string()), None, None, None, None, None);
    }

    let stem = path.file_stem().and_then(|s| s.to_str()).unwrap_or(file_name);
    let base = strip_leading_brackets(stem);
    let chars: Vec<char> = base.chars().collect();
    let len = chars.len();

    // 1. Check for SxxExx pattern (e.g. S01E02, s1e2, S01.E02, S01_E02, S01 - E02, [S1-E01] Show)
    let mut s_idx = None;
    for i in 0..len {
        let c = chars[i].to_ascii_lowercase();
        if c == 's' && i + 1 < len && chars[i + 1].is_ascii_digit() {
            let mut j = i + 1;
            while j < len && chars[j].is_ascii_digit() {
                j += 1;
            }
            let mut k = j;
            while k < len && (chars[k] == '.' || chars[k] == '_' || chars[k] == '-' || chars[k] == ' ') {
                k += 1;
            }
            if k < len && chars[k].to_ascii_lowercase() == 'e' && k + 1 < len && chars[k + 1].is_ascii_digit() {
                let season_digits: String = chars[i + 1..j].iter().collect();
                let mut m = k + 1;
                while m < len && chars[m].is_ascii_digit() {
                    m += 1;
                }
                let episode_digits: String = chars[k + 1..m].iter().collect();
                if let (Ok(s_num), Ok(e_num)) = (season_digits.parse::<i64>(), episode_digits.parse::<i64>()) {
                    s_idx = Some((i, m, s_num, e_num));
                    break;
                }
            }
        }
    }

    if let Some((start_pos, end_pos, season, episode)) = s_idx {
        let raw_show: String = chars[..start_pos].iter().collect();
        let raw_ep_title: String = if end_pos < len {
            chars[end_pos..].iter().collect()
        } else {
            String::new()
        };

        // When the SxxExx tag is at the beginning (e.g. "[S1-E01] EVILIVE"),
        // the series name is located AFTER the tag!
        let mut show_name = if start_pos <= 2 && raw_ep_title.trim().len() >= 2 {
            let cleaned_after = raw_ep_title.trim_start_matches(|c: char| {
                c == ']' || c == ')' || c == '-' || c == '_' || c == '.' || c == ' '
            });
            strip_scene_noise(&clean_word_delimiters(cleaned_after))
        } else {
            strip_scene_noise(&clean_word_delimiters(&raw_show))
        };

        if show_name.len() < 2 {
            if let Some(parent) = path.parent() {
                let p_name = parent.file_name().and_then(|n| n.to_str()).unwrap_or("");
                if let Some(gp) = parent.parent() {
                    let gp_name = gp.file_name().and_then(|n| n.to_str()).unwrap_or("");
                    show_name = strip_scene_noise(&clean_word_delimiters(if extract_season_number_from_text(p_name).is_some() { gp_name } else { p_name }));
                } else {
                    show_name = strip_scene_noise(&clean_word_delimiters(p_name));
                }
            }
        }
        if show_name.is_empty() {
            show_name = "Series".to_string();
        }

        let (cleaned_show, year_opt, extra_s) = clean_series_name_and_extract_metadata(&show_name);
        if !cleaned_show.is_empty() {
            show_name = cleaned_show;
        }
        let season = extra_s.unwrap_or(season);

        let ep_title_clean = if start_pos <= 2 {
            String::new()
        } else {
            strip_scene_noise(&clean_word_delimiters(&raw_ep_title))
        };
        let ep_title_opt = if ep_title_clean.is_empty() { None } else { Some(ep_title_clean) };

        let display_title = if let Some(ref ep_title) = ep_title_opt {
            format!("{} • S{:02}E{:02} - {}", show_name, season, episode, ep_title)
        } else {
            format!("{} • S{:02}E{:02}", show_name, season, episode)
        };

        return (
            display_title,
            Some("series".to_string()),
            Some(show_name),
            Some(season),
            Some(episode),
            ep_title_opt,
            year_opt,
        );
    }

    // 1b. Check for written Season and Episode: "Show Season 1 Episode 2" or "Godfather season 1, episode 2"
    let mut written_idx = None;
    let base_lower = base.to_lowercase();
    if let Some(s_pos) = base_lower.find("season").or_else(|| base_lower.find("series")) {
        let after_season = &base_lower[s_pos..];
        let after_chars: Vec<char> = after_season.chars().collect();
        let mut d_start = None;
        let mut d_end = None;
        for (idx, &ch) in after_chars.iter().enumerate() {
            if ch.is_ascii_digit() {
                if d_start.is_none() {
                    d_start = Some(idx);
                }
            } else if d_start.is_some() {
                d_end = Some(idx);
                break;
            }
        }
        if let (Some(ds), Some(de)) = (d_start, d_end.or(Some(after_chars.len()))) {
            let s_digits: String = after_chars[ds..de].iter().collect();
            if let Ok(s_num) = s_digits.parse::<i64>() {
                let after_s_num = &after_season[de..];
                if let Some(ep_rel) = after_s_num.find("episode").or_else(|| after_s_num.find("ep")) {
                    let ep_part = &after_s_num[ep_rel..];
                    let ep_chars: Vec<char> = ep_part.chars().collect();
                    let mut ed_start = None;
                    let mut ed_end = None;
                    for (idx, &ch) in ep_chars.iter().enumerate() {
                        if ch.is_ascii_digit() {
                            if ed_start.is_none() {
                                ed_start = Some(idx);
                            }
                        } else if ed_start.is_some() {
                            ed_end = Some(idx);
                            break;
                        }
                    }
                    if let (Some(eds), Some(ede)) = (ed_start, ed_end.or(Some(ep_chars.len()))) {
                        let ep_digits: String = ep_chars[eds..ede].iter().collect();
                        if let Ok(e_num) = ep_digits.parse::<i64>() {
                            let ep_end_global = s_pos + de + ep_rel + ede;
                            written_idx = Some((s_pos, ep_end_global, s_num, e_num));
                        }
                    }
                }
            }
        }
    }

    if let Some((start_pos, end_pos, season, episode)) = written_idx {
        let raw_show: String = chars[..start_pos].iter().collect();
        let raw_ep_title: String = if end_pos < len {
            chars[end_pos..].iter().collect()
        } else {
            String::new()
        };

        let (mut show_name, year_opt, _) = clean_series_name_and_extract_metadata(&raw_show);
        if show_name.len() < 2 {
            if let Some(parent) = path.parent() {
                let p_name = parent.file_name().and_then(|n| n.to_str()).unwrap_or("");
                let (p_clean, _, _) = clean_series_name_and_extract_metadata(p_name);
                show_name = p_clean;
            }
        }
        if show_name.is_empty() {
            show_name = "Series".to_string();
        }

        let ep_title_clean = strip_scene_noise(&clean_word_delimiters(&raw_ep_title));
        let ep_title_opt = if ep_title_clean.is_empty() { None } else { Some(ep_title_clean) };

        let display_title = if let Some(ref ep_title) = ep_title_opt {
            format!("{} • S{:02}E{:02} - {}", show_name, season, episode, ep_title)
        } else {
            format!("{} • S{:02}E{:02}", show_name, season, episode)
        };

        return (
            display_title,
            Some("series".to_string()),
            Some(show_name),
            Some(season),
            Some(episode),
            ep_title_opt,
            year_opt,
        );
    }

    // 2. Check for Season.Episode dot pattern (e.g. "Criminal Minds 1.01", "Show 2.14(@ Intermedia)")
    let mut dot_ep_idx = None;
    for i in 0..len {
        let left_bounded = i == 0 || chars[i - 1] == ' ' || chars[i - 1] == '.' || chars[i - 1] == '_' || chars[i - 1] == '-';
        if left_bounded && chars[i].is_ascii_digit() {
            let mut j = i;
            while j < len && chars[j].is_ascii_digit() {
                j += 1;
            }
            let s_len = j - i;
            if s_len >= 1 && s_len <= 2 && j < len && chars[j] == '.' {
                let ep_start = j + 1;
                let mut ep_end = ep_start;
                while ep_end < len && chars[ep_end].is_ascii_digit() {
                    ep_end += 1;
                }
                let ep_len = ep_end - ep_start;
                // Episode is exactly 2 digits (e.g. 01..99)
                if ep_len == 2 {
                    let right_bounded = ep_end == len
                        || chars[ep_end] == ' '
                        || chars[ep_end] == '('
                        || chars[ep_end] == '['
                        || chars[ep_end] == '-'
                        || chars[ep_end] == '_'
                        || chars[ep_end] == '.';
                    if right_bounded {
                        let s_str: String = chars[i..j].iter().collect();
                        let e_str: String = chars[ep_start..ep_end].iter().collect();
                        if let (Ok(s_num), Ok(e_num)) = (s_str.parse::<i64>(), e_str.parse::<i64>()) {
                            if s_num >= 1 && s_num <= 99 && e_num >= 1 && e_num <= 99 {
                                dot_ep_idx = Some((i, ep_end, s_num, e_num));
                                break;
                            }
                        }
                    }
                }
            }
        }
    }

    if let Some((start_pos, end_pos, season, episode)) = dot_ep_idx {
        let raw_show: String = chars[..start_pos].iter().collect();
        let raw_ep_title: String = if end_pos < len {
            chars[end_pos..].iter().collect()
        } else {
            String::new()
        };

        let (mut show_name, year_opt, _) = clean_series_name_and_extract_metadata(&raw_show);
        if show_name.len() < 2 {
            if let Some(parent) = path.parent() {
                let p_name = parent.file_name().and_then(|n| n.to_str()).unwrap_or("");
                if let Some(gp) = parent.parent() {
                    let gp_name = gp.file_name().and_then(|n| n.to_str()).unwrap_or("");
                    let (clean_p, _, _) = clean_series_name_and_extract_metadata(if extract_season_number_from_text(p_name).is_some() { gp_name } else { p_name });
                    show_name = clean_p;
                } else {
                    let (clean_p, _, _) = clean_series_name_and_extract_metadata(p_name);
                    show_name = clean_p;
                }
            }
        }
        if show_name.is_empty() {
            show_name = "Series".to_string();
        }

        let ep_title_clean = strip_scene_noise(&clean_word_delimiters(&raw_ep_title));
        let ep_title_opt = if ep_title_clean.is_empty() { None } else { Some(ep_title_clean) };

        let display_title = if let Some(ref ep_title) = ep_title_opt {
            format!("{} • S{:02}E{:02} - {}", show_name, season, episode, ep_title)
        } else {
            format!("{} • S{:02}E{:02}", show_name, season, episode)
        };

        return (
            display_title,
            Some("series".to_string()),
            Some(show_name),
            Some(season),
            Some(episode),
            ep_title_opt,
            year_opt,
        );
    }

    // 2. Check for 1x02 pattern (e.g. 1x02, 01x02, 1X05)
    let mut x_idx = None;
    for i in 1..len {
        let c = chars[i].to_ascii_lowercase();
        if c == 'x' && chars[i - 1].is_ascii_digit() && i + 1 < len && chars[i + 1].is_ascii_digit() {
            let mut start = i - 1;
            while start > 0 && chars[start - 1].is_ascii_digit() {
                start -= 1;
            }
            let mut end = i + 1;
            while end < len && chars[end].is_ascii_digit() {
                end += 1;
            }
            let season_str: String = chars[start..i].iter().collect();
            let ep_str: String = chars[i + 1..end].iter().collect();
            if let (Ok(s_num), Ok(e_num)) = (season_str.parse::<i64>(), ep_str.parse::<i64>()) {
                x_idx = Some((start, end, s_num, e_num));
                break;
            }
        }
    }

    if let Some((start_pos, end_pos, season, episode)) = x_idx {
        let raw_show: String = chars[..start_pos].iter().collect();
        let raw_ep_title: String = if end_pos < len {
            chars[end_pos..].iter().collect()
        } else {
            String::new()
        };

        let (mut show_name, year_opt, _) = clean_series_name_and_extract_metadata(&raw_show);
        if show_name.len() < 2 {
            if let Some(parent) = path.parent() {
                let (clean_p, _, _) = clean_series_name_and_extract_metadata(parent.file_name().and_then(|n| n.to_str()).unwrap_or("Series"));
                show_name = clean_p;
            }
        }
        if show_name.is_empty() {
            show_name = "Series".to_string();
        }

        let ep_title_clean = strip_scene_noise(&clean_word_delimiters(&raw_ep_title));
        let ep_title_opt = if ep_title_clean.is_empty() { None } else { Some(ep_title_clean.clone()) };

        let display_title = if let Some(ref ep_title) = ep_title_opt {
            format!("{} • S{:02}E{:02} - {}", show_name, season, episode, ep_title)
        } else {
            format!("{} • S{:02}E{:02}", show_name, season, episode)
        };

        return (
            display_title,
            Some("series".to_string()),
            Some(show_name),
            Some(season),
            Some(episode),
            ep_title_opt,
            year_opt,
        );
    }

    // 3. Check for Episode keywords e.g. E01, EP01, Ep.01, Ep 01, Episode 01
    let mut ep_only_idx = None;
    for i in 0..len {
        let c = chars[i].to_ascii_lowercase();
        let left_bounded = i == 0 || !chars[i - 1].is_ascii_alphanumeric();
        if left_bounded {
            let is_episode_word = i + 7 <= len && base[i..].to_lowercase().starts_with("episode");
            let is_ep = i + 2 <= len && chars[i].to_ascii_lowercase() == 'e' && chars[i + 1].to_ascii_lowercase() == 'p';
            let is_e = c == 'e';

            if is_episode_word || is_ep || is_e {
                let offset = if is_episode_word { 7 } else if is_ep { 2 } else { 1 };
                let mut k = i + offset;
                while k < len && (chars[k] == '.' || chars[k] == '_' || chars[k] == '-' || chars[k] == ' ') {
                    k += 1;
                }
                if k < len && chars[k].is_ascii_digit() {
                    let mut m = k;
                    while m < len && chars[m].is_ascii_digit() {
                        m += 1;
                    }
                    let digit_len = m - k;
                    let digits_str: String = chars[k..m].iter().collect();
                    if let Ok(e_num) = digits_str.parse::<i64>() {
                        if is_episode_word || is_ep || (digit_len <= 3 && (e_num < 1920 || e_num > 2035)) {
                            ep_only_idx = Some((i, m, e_num));
                            break;
                        }
                    }
                }
            }
        }
    }

    if let Some((start_pos, end_pos, episode)) = ep_only_idx {
        let raw_show: String = chars[..start_pos].iter().collect();
        let raw_ep_title: String = if end_pos < len {
            chars[end_pos..].iter().collect()
        } else {
            String::new()
        };

        let (cleaned_show, year_opt, extra_s) = clean_series_name_and_extract_metadata(&raw_show);
        let mut show_name = cleaned_show;
        let mut season_num = extra_s.unwrap_or(1);

        if let Some(parent) = path.parent() {
            let p_name = parent.file_name().and_then(|n| n.to_str()).unwrap_or("");
            if let Some(s) = extract_season_number_from_text(p_name) {
                if extra_s.is_none() {
                    season_num = s;
                }
                if show_name.len() < 2 {
                    if let Some(gp) = parent.parent() {
                        let (gp_clean, _, _) = clean_series_name_and_extract_metadata(gp.file_name().and_then(|n| n.to_str()).unwrap_or("Series"));
                        show_name = gp_clean;
                    }
                }
            } else if show_name.len() < 2 {
                let (p_clean, _, _) = clean_series_name_and_extract_metadata(p_name);
                show_name = p_clean;
            }
        }

        if show_name.is_empty() {
            show_name = "Series".to_string();
        }

        let ep_title_clean = strip_scene_noise(&clean_word_delimiters(&raw_ep_title));
        let ep_title_opt = if ep_title_clean.is_empty() { None } else { Some(ep_title_clean) };

        let display_title = if let Some(ref ep_title) = ep_title_opt {
            format!("{} • S{:02}E{:02} - {}", show_name, season_num, episode, ep_title)
        } else {
            format!("{} • S{:02}E{:02}", show_name, season_num, episode)
        };

        return (
            display_title,
            Some("series".to_string()),
            Some(show_name),
            Some(season_num),
            Some(episode),
            ep_title_opt,
            year_opt,
        );
    }

    // 4. Check for Anime / Dash episode pattern (e.g. "Show - 01", "Show - 28 (1080p)")
    if let Some(dash_idx) = base.find(" - ").or_else(|| base.find(" _ ")).or_else(|| base.find(".-.")) {
        let raw_show = &base[..dash_idx];
        let after_dash = base[dash_idx + 3..].trim();
        if let Some(ep_num) = extract_first_number(after_dash) {
            if ep_num < 1920 || ep_num > 2035 {
                let show_name = strip_scene_noise(&clean_word_delimiters(raw_show));
                if !show_name.is_empty() && show_name.len() >= 2 {
                    let clean_ep_title = strip_scene_noise(&clean_word_delimiters(after_dash));
                    return (
                        format!("{} • Ep {:02}", show_name, ep_num),
                        Some("series".to_string()),
                        Some(show_name),
                        Some(1),
                        Some(ep_num),
                        if clean_ep_title.is_empty() { None } else { Some(clean_ep_title) },
                        None,
                    );
                }
            }
        }
    }

    // 5. Check for Folder-based Season detection (e.g. Breaking Bad / Season 1 / 01.mkv or Show Season 1 / 01.mkv)
    if let Some(parent) = path.parent() {
        let p_name = parent.file_name().and_then(|n| n.to_str()).unwrap_or("");
        if let Some(season_num) = extract_season_number_from_text(p_name) {
            let series_name = if let Some(gp) = parent.parent() {
                let gp_name = gp.file_name().and_then(|n| n.to_str()).unwrap_or("");
                if !gp_name.is_empty() {
                    strip_scene_noise(&clean_word_delimiters(gp_name))
                } else {
                    strip_scene_noise(&clean_word_delimiters(p_name))
                }
            } else {
                strip_scene_noise(&clean_word_delimiters(p_name))
            };

            let ep = extract_first_number(base).unwrap_or(1);
            let clean_title = strip_scene_noise(&clean_word_delimiters(base));
            return (
                format!("{} • S{:02}E{:02} - {}", series_name, season_num, ep, clean_title),
                Some("series".to_string()),
                Some(series_name),
                Some(season_num),
                Some(ep),
                Some(clean_title),
                None,
            );
        }
    }

    // 6. Check if ancestor path explicitly indicates TV / Series / Anime
    if is_tv_or_series_ancestor(path) {
        if let Some(ep) = extract_first_number(base) {
            if ep < 1920 || ep > 2035 {
                let parent_name = path.parent().and_then(|p| p.file_name()).and_then(|n| n.to_str()).unwrap_or("Series");
                let show_name = strip_scene_noise(&clean_word_delimiters(parent_name));
                return (
                    format!("{} • Ep {:02}", show_name, ep),
                    Some("series".to_string()),
                    Some(show_name),
                    Some(1),
                    Some(ep),
                    None,
                    None,
                );
            }
        }
    }

    // 7. Check for pure numeric or leading numeric file (e.g. "01.mkv", "02.mp4", "1 - Pilot.mkv")
    let trimmed_base = base.trim_start();
    let starts_with_digit = trimmed_base.chars().next().map_or(false, |c| c.is_ascii_digit());
    if starts_with_digit {
        if let Some(ep) = extract_first_number(trimmed_base) {
            if ep < 1920 || ep > 2035 {
                let parent_name = path.parent().and_then(|p| p.file_name()).and_then(|n| n.to_str()).unwrap_or("Series");
                let show_name = strip_scene_noise(&clean_word_delimiters(parent_name));
                if !show_name.is_empty() {
                    let clean_title = strip_scene_noise(&clean_word_delimiters(trimmed_base));
                    return (
                        format!("{} • Ep {:02}", show_name, ep),
                        Some("series".to_string()),
                        Some(show_name),
                        Some(1),
                        Some(ep),
                        if clean_title.is_empty() { None } else { Some(clean_title) },
                        None,
                    );
                }
            }
        }
    }

    // 8. Check for 4-digit Movie Year e.g. (2023), .2023., [2023]
    for i in 0..len {
        if i + 4 <= len {
            let chunk: String = chars[i..i + 4].iter().collect();
            if let Ok(year_num) = chunk.parse::<i64>() {
                if (1920..=2035).contains(&year_num) {
                    let left_bounded = i == 0 || !chars[i - 1].is_ascii_alphanumeric();
                    let right_bounded = i + 4 == len || !chars[i + 4].is_ascii_alphanumeric();
                    if left_bounded && right_bounded {
                        let raw_title: String = chars[..i].iter().collect();
                        let clean_movie = strip_scene_noise(&clean_word_delimiters(&raw_title));
                        if !clean_movie.is_empty() {
                            return (
                                format!("{} ({})", clean_movie, chunk),
                                Some("movie".to_string()),
                                None,
                                None,
                                None,
                                None,
                                Some(chunk),
                            );
                        }
                    }
                }
            }
        }
    }

    // Fallback: general movie or video
    let clean_title = strip_scene_noise(&clean_word_delimiters(base));
    let final_title = if clean_title.is_empty() { file_name.to_string() } else { clean_title };
    (final_title, Some("movie".to_string()), None, None, None, None, None)
}

fn scan_directory_recursive(
    app: &Option<AppHandle>,
    dir: &Path,
    results: &mut Vec<ScannedMediaItem>,
    folder_root: &str,
    max_depth: usize,
    files_checked: &mut usize,
) {
    if max_depth == 0 || results.len() >= 50000 || SCAN_CANCELLED.load(Ordering::Relaxed) {
        return;
    }

    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            if SCAN_CANCELLED.load(Ordering::Relaxed) {
                return;
            }

            let file_type = match entry.file_type() {
                Ok(ft) => ft,
                Err(_) => continue,
            };

            // Skip symbolic links and junctions to avoid infinite loops
            if file_type.is_symlink() {
                continue;
            }

            let path = entry.path();
            if file_type.is_dir() {
                if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                    let name_lower = name.to_lowercase();
                    // Skip hidden, system, cache, or dependency folders
                    if name.starts_with('.')
                        || name_lower == "node_modules"
                        || name_lower == "$recycle.bin"
                        || name_lower == "system volume information"
                        || name_lower == "appdata"
                        || name_lower == "windows"
                        || name_lower == ".git"
                    {
                        continue;
                    }
                }

                // Throttle progress emissions
                if let Some(a) = app {
                    let _ = a.emit(
                        "library_scan_progress",
                        ScanProgressPayload {
                            folder_path: folder_root.to_string(),
                            current_directory: path.to_string_lossy().to_string(),
                            files_scanned: *files_checked,
                            total_found: results.len(),
                            is_cancelled: false,
                            is_finished: false,
                        },
                    );
                }

                scan_directory_recursive(
                    app,
                    &path,
                    results,
                    folder_root,
                    max_depth - 1,
                    files_checked,
                );
            } else if file_type.is_file() {
                *files_checked += 1;

                if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
                    let ext_lower = ext.to_lowercase();
                    if let Some(media_type) = is_supported_media(&ext_lower) {
                        let file_name = path
                            .file_name()
                            .and_then(|n| n.to_str())
                            .unwrap_or("")
                            .to_string();

                        let (title, category, series_name, season_number, episode_number, episode_title, year) =
                            parse_media_info(&path, &file_name, media_type);

                        let metadata = fs::metadata(&path).ok();
                        let file_size = metadata.as_ref().map(|m| m.len()).unwrap_or(0);
                        let last_modified = metadata
                            .and_then(|m| m.modified().ok())
                            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                            .map(|d| d.as_secs())
                            .unwrap_or(0);

                        let quick_hash = compute_quick_hash(&path, file_size);

                        results.push(ScannedMediaItem {
                            file_path: path.to_string_lossy().to_string(),
                            file_name,
                            title,
                            folder_path: folder_root.to_string(),
                            media_type: media_type.to_string(),
                            file_size,
                            last_modified,
                            quick_hash,
                            category,
                            series_name,
                            season_number,
                            episode_number,
                            episode_title,
                            year,
                        });

                        // Report progress periodically every 25 files
                        if results.len() % 25 == 0 {
                            if let Some(a) = app {
                                let _ = a.emit(
                                    "library_scan_progress",
                                    ScanProgressPayload {
                                        folder_path: folder_root.to_string(),
                                        current_directory: dir.to_string_lossy().to_string(),
                                        files_scanned: *files_checked,
                                        total_found: results.len(),
                                        is_cancelled: false,
                                        is_finished: false,
                                    },
                                );
                            }
                        }
                    }
                }
            }
        }
    }
}

/// Recursively scans a chosen folder with cancellation support and live progress reporting
#[tauri::command]
pub async fn scan_local_folder(
    app: AppHandle,
    folder_path: String,
) -> Result<Vec<ScannedMediaItem>, String> {
    SCAN_CANCELLED.store(false, Ordering::Relaxed);
    let app_clone = app.clone();
    let folder_clone = folder_path.clone();

    tauri::async_runtime::spawn_blocking(move || {
        let root = Path::new(&folder_clone);
        if !root.exists() || !root.is_dir() {
            return Err(format!("Directory does not exist or drive is disconnected: {}", folder_clone));
        }

        let mut results = Vec::new();
        let mut files_checked = 0;
        let app_opt = Some(app_clone.clone());

        scan_directory_recursive(
            &app_opt,
            root,
            &mut results,
            &folder_clone,
            10, // Up to 10 folder levels deep
            &mut files_checked,
        );

        let cancelled = SCAN_CANCELLED.load(Ordering::Relaxed);

        // Emit final completion event
        let _ = app_clone.emit(
            "library_scan_progress",
            ScanProgressPayload {
                folder_path: folder_clone,
                current_directory: String::new(),
                files_scanned: files_checked,
                total_found: results.len(),
                is_cancelled: cancelled,
                is_finished: true,
            },
        );

        results.sort_by(|a, b| a.file_path.cmp(&b.file_path));
        Ok(results)
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Instantly cancels any active library scan across any thread
#[tauri::command]
pub fn cancel_library_scan() {
    SCAN_CANCELLED.store(true, Ordering::Relaxed);
}

/// Exports a playlist to M3U8 or JSON file format
#[tauri::command]
pub fn export_playlist_to_file(
    file_path: String,
    format_type: String,
    items: Vec<PlaylistItemDto>,
) -> Result<(), String> {
    let path = Path::new(&file_path);
    let mut file = fs::File::create(path).map_err(|e| format!("Failed to create file: {}", e))?;

    if format_type.to_lowercase() == "json" || path.extension().and_then(|e| e.to_str()) == Some("json") {
        let json_str = serde_json::to_string_pretty(&items)
            .map_err(|e| format!("Serialization error: {}", e))?;
        file.write_all(json_str.as_bytes())
            .map_err(|e| format!("Write error: {}", e))?;
    } else {
        // Default to M3U8 format
        writeln!(file, "#EXTM3U").map_err(|e| e.to_string())?;
        for item in items {
            writeln!(file, "#EXTINF:-1,{}", item.title).map_err(|e| e.to_string())?;
            writeln!(file, "{}", item.file_path).map_err(|e| e.to_string())?;
        }
    }

    Ok(())
}

/// Imports a playlist from an M3U, M3U8, or JSON file
#[tauri::command]
pub fn import_playlist_from_file(file_path: String) -> Result<Vec<PlaylistItemDto>, String> {
    let path = Path::new(&file_path);
    if !path.exists() {
        return Err(format!("File not found: {}", file_path));
    }

    let parent_dir = path.parent().unwrap_or_else(|| Path::new(""));
    let is_json = path.extension().and_then(|e| e.to_str()) == Some("json");

    if is_json {
        let content = fs::read_to_string(path).map_err(|e| e.to_string())?;
        let parsed: Vec<PlaylistItemDto> = serde_json::from_str(&content)
            .map_err(|e| format!("Invalid playlist JSON: {}", e))?;
        return Ok(parsed);
    }

    // Parse M3U / M3U8 file
    let file = fs::File::open(path).map_err(|e| e.to_string())?;
    let reader = BufReader::new(file);

    let mut items = Vec::new();
    let mut current_title: Option<String> = None;

    for line in reader.lines().flatten() {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }

        if trimmed.starts_with("#EXTINF:") {
            if let Some(comma_idx) = trimmed.find(',') {
                let title = trimmed[comma_idx + 1..].trim().to_string();
                if !title.is_empty() {
                    current_title = Some(title);
                }
            }
        } else if !trimmed.starts_with('#') {
            let mut resolved_path = PathBuf::from(trimmed);
            if !resolved_path.is_absolute() {
                resolved_path = parent_dir.join(resolved_path);
            }

            let full_path_str = resolved_path.to_string_lossy().to_string();
            let title = current_title.take().unwrap_or_else(|| {
                resolved_path
                    .file_stem()
                    .and_then(|s| s.to_str())
                    .unwrap_or("Untitled")
                    .to_string()
            });

            items.push(PlaylistItemDto {
                id: format!("item_{}_{}", items.len(), std::time::SystemTime::now().elapsed().unwrap_or_default().as_millis()),
                file_path: full_path_str,
                title,
            });
        }
    }

    Ok(items)
}
