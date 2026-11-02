use std::path::Path;

#[tauri::command]
pub fn find_sibling_episodes(file_path: String) -> Result<Vec<String>, String> {
    let path = Path::new(&file_path);
    let parent = match path.parent() {
        Some(p) => p,
        None => return Ok(Vec::new()),
    };

    let target_filename = match path.file_name().and_then(|n| n.to_str()) {
        Some(n) => n.to_lowercase(),
        None => return Ok(Vec::new()),
    };

    let valid_exts = ["mp4", "mkv", "webm", "avi", "mov", "ts", "m2ts"];

    let mut siblings: Vec<(String, String)> = Vec::new();
    if let Ok(entries) = std::fs::read_dir(parent) {
        for entry in entries.flatten() {
            let entry_path = entry.path();
            if entry_path.is_file() {
                if let Some(ext) = entry_path.extension().and_then(|e| e.to_str()) {
                    if valid_exts.contains(&ext.to_lowercase().as_str()) {
                        if let Some(name) = entry_path.file_name().and_then(|n| n.to_str()) {
                            siblings.push((name.to_string(), entry_path.to_string_lossy().to_string()));
                        }
                    }
                }
            }
        }
    }

    if siblings.len() <= 1 {
        return Ok(Vec::new());
    }

    let clean_base = target_filename
        .split(|c: char| c.is_ascii_digit())
        .next()
        .unwrap_or("")
        .trim();

    let mut matched: Vec<String> = siblings
        .into_iter()
        .filter(|(name, _)| {
            let lower = name.to_lowercase();
            if !clean_base.is_empty() && clean_base.len() >= 3 {
                lower.starts_with(clean_base)
            } else {
                true
            }
        })
        .map(|(_, full_path)| full_path)
        .collect();

    matched.sort();
    Ok(matched)
}

#[tauri::command]
pub fn copy_image_to_clipboard(file_path: String) -> Result<(), String> {
    let path = Path::new(&file_path);
    if !path.exists() {
        return Err("Screenshot file does not exist on disk".to_string());
    }

    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        let escaped_path = file_path.replace('\'', "''");
        let script = format!(
            "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Clipboard]::SetImage([System.Drawing.Image]::FromFile('{}'))",
            escaped_path
        );
        let status = std::process::Command::new("powershell")
            .args(["-NoProfile", "-NonInteractive", "-Command", &script])
            .creation_flags(CREATE_NO_WINDOW)
            .status()
            .map_err(|e| e.to_string())?;

        if status.success() {
            Ok(())
        } else {
            Err("PowerShell failed to copy image to clipboard".to_string())
        }
    }

    #[cfg(target_os = "macos")]
    {
        let escaped_path = file_path.replace('"', "\\\"");
        let script = format!(
            "set the clipboard to (read (POSIX file \"{}\") as JPEG picture)",
            escaped_path
        );
        let status = std::process::Command::new("osascript")
            .args(["-e", &script])
            .status()
            .map_err(|e| e.to_string())?;
        if status.success() {
            Ok(())
        } else {
            Err("AppleScript failed to copy image to clipboard".to_string())
        }
    }

    #[cfg(not(any(windows, target_os = "macos")))]
    {
        let status = std::process::Command::new("xclip")
            .args(["-selection", "clipboard", "-t", "image/png", "-i", &file_path])
            .status()
            .map_err(|e| e.to_string())?;
        if status.success() {
            Ok(())
        } else {
            Err("xclip failed to copy image to clipboard".to_string())
        }
    }
}
