use tauri::{Emitter, Manager};

mod db;
mod media;
mod library;
mod thumbnailer;

#[cfg(windows)]
fn setup_dll_environment() {
    use std::os::windows::ffi::OsStrExt;
    use std::path::PathBuf;

    let mut candidate_dirs: Vec<PathBuf> = Vec::new();

    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            candidate_dirs.push(exe_dir.to_path_buf());
            candidate_dirs.push(exe_dir.join("lib"));
            candidate_dirs.push(exe_dir.join("../../../src-tauri/lib"));
            candidate_dirs.push(exe_dir.join("../../src-tauri/lib"));
            candidate_dirs.push(exe_dir.join("../src-tauri/lib"));
        }
    }

    if let Ok(cwd) = std::env::current_dir() {
        candidate_dirs.push(cwd.join("src-tauri").join("lib"));
        candidate_dirs.push(cwd.join("lib"));
    }

    for dir in &candidate_dirs {
        if dir.exists() {
            let has_mpv = dir.join("libmpv-2.dll").exists();
            let has_wrapper = dir.join("libmpv-wrapper.dll").exists();

            if has_mpv || has_wrapper {
                if let Ok(canonical) = dir.canonicalize() {
                    if let Ok(exe_path) = std::env::current_exe() {
                        if let Some(exe_dir) = exe_path.parent() {
                            let target_wrapper = exe_dir.join("libmpv-wrapper.dll");
                            let source_wrapper = canonical.join("libmpv-wrapper.dll");
                            if source_wrapper.exists() && !target_wrapper.exists() {
                                let _ = std::fs::copy(&source_wrapper, &target_wrapper);
                            }

                            let target_mpv = exe_dir.join("libmpv-2.dll");
                            let source_mpv = canonical.join("libmpv-2.dll");
                            if source_mpv.exists() && !target_mpv.exists() {
                                if std::fs::hard_link(&source_mpv, &target_mpv).is_err() {
                                    let _ = std::fs::copy(&source_mpv, &target_mpv);
                                }
                            }
                        }
                    }

                    let wide_path: Vec<u16> = canonical
                        .as_os_str()
                        .encode_wide()
                        .chain(std::iter::once(0))
                        .collect();

                    unsafe {
                        windows_sys::Win32::System::LibraryLoader::SetDllDirectoryW(
                            wide_path.as_ptr(),
                        );
                    }
                    println!(
                        "[Vistara] Native DLL directory configured: {:?}",
                        canonical
                    );
                    break;
                }
            }
        }
    }
}

mod pip;

use std::sync::Mutex;

pub struct LaunchState {
    pub file_path: Mutex<Option<String>>,
}

fn extract_media_arg(args: &[String]) -> Option<String> {
    for arg in args.iter().skip(1) {
        if !arg.starts_with('-') && !arg.is_empty() {
            let cleaned = arg.trim_matches('"').trim_matches('\'').trim().to_string();
            if !cleaned.is_empty() {
                return Some(cleaned);
            }
        }
    }
    None
}

fn should_reuse_single_window() -> bool {
    if let Ok(app_data) = std::env::var("APPDATA") {
        let db_path = std::path::PathBuf::from(app_data)
            .join("com.dagi.eytaa")
            .join("vistara.db");
        if db_path.exists() {
            if let Ok(conn) = rusqlite::Connection::open(&db_path) {
                if let Ok(mut stmt) = conn.prepare("SELECT value FROM user_preferences WHERE key = 'reuseSingleWindow'") {
                    if let Ok(val) = stmt.query_row([], |row| row.get::<_, String>(0)) {
                        return val != "false";
                    }
                }
            }
        }
    }
    true // Clean Windows installations default to single-window media reuse
}

#[tauri::command]
fn get_launch_file(state: tauri::State<'_, LaunchState>) -> Option<String> {
    let mut file = state.file_path.lock().ok()?;
    file.take()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[cfg(windows)]
    setup_dll_environment();

    let initial_file = extract_media_arg(&std::env::args().collect::<Vec<_>>());

    let mut builder = tauri::Builder::default();

    if should_reuse_single_window() {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
            if let Some(file) = extract_media_arg(&args) {
                let _ = app.emit("open-file-requested", file);
            }
        }));
    }

    builder
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_libmpv::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(move |app| {
            app.manage(LaunchState {
                file_path: Mutex::new(initial_file),
            });

            if let Some(icon) = app.default_window_icon() {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.set_icon(icon.clone());
                }
            }
            let db_state = db::init_db(app.handle())
                .map_err(|e| Box::<dyn std::error::Error>::from(e))?;
            app.manage(db_state);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_launch_file,
            db::db_get_preference,
            db::db_set_preference,
            db::db_get_resume_position,
            db::db_set_resume_position,
            db::db_add_history,
            db::db_get_recent_files,
            db::db_delete_history,
            db::db_clear_history,
            db::db_add_library_folder,
            db::db_remove_library_folder,
            db::db_get_library_folders,
            db::db_save_library_items,
            db::db_get_library_items,
            db::db_toggle_favorite,
            db::db_get_favorites,
            db::db_is_favorite,
            db::db_get_unfinished_videos,
            media::find_sibling_episodes,
            library::scan_local_folder,
            library::export_playlist_to_file,
            library::import_playlist_from_file,
            thumbnailer::get_thumbnail,
            pip::enter_pip,
            pip::exit_pip,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Vistara application");
}
