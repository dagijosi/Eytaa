use tauri::Manager;

mod db;
mod media;

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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[cfg(windows)]
    setup_dll_environment();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_libmpv::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
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
            db::db_get_preference,
            db::db_set_preference,
            db::db_get_resume_position,
            db::db_set_resume_position,
            db::db_add_history,
            db::db_get_recent_files,
            media::find_sibling_episodes,
            pip::enter_pip,
            pip::exit_pip,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Vistara application");
}
