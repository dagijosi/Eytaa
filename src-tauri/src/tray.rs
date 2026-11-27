use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager,
};

const TRAY_ID: &str = "eytaa-tray";

pub fn create_tray(app: &AppHandle) -> Result<(), String> {
    if app.tray_by_id(TRAY_ID).is_some() {
        return Ok(());
    }

    let show_item = MenuItem::with_id(app, "tray-show", "Show EYTAA", true, None::<&str>)
        .map_err(|e| e.to_string())?;
    let play_pause_item =
        MenuItem::with_id(app, "tray-play-pause", "Play / Pause", true, None::<&str>)
            .map_err(|e| e.to_string())?;
    let quit_item =
        MenuItem::with_id(app, "tray-quit", "Quit EYTAA", true, None::<&str>)
            .map_err(|e| e.to_string())?;

    let menu = Menu::with_items(app, &[&show_item, &play_pause_item, &quit_item])
        .map_err(|e| e.to_string())?;

    let mut builder = TrayIconBuilder::with_id(TRAY_ID)
        .menu(&menu)
        .tooltip("EYTAA Media Player")
        .on_menu_event(|app, event| match event.id.as_ref() {
            "tray-show" => {
                if let Some(w) = app.get_webview_window("main") {
                    let _ = w.show();
                    let _ = w.unminimize();
                    let _ = w.set_focus();
                }
            }
            "tray-play-pause" => {
                let _ = app.emit("tray-toggle-playback", ());
            }
            "tray-quit" => {
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                if let Some(w) = app.get_webview_window("main") {
                    let _ = w.show();
                    let _ = w.unminimize();
                    let _ = w.set_focus();
                }
            }
        });

    if let Some(icon) = app.default_window_icon() {
        builder = builder.icon(icon.clone());
    }

    builder.build(app).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn set_tray_enabled(app: AppHandle, enabled: bool) -> Result<(), String> {
    if enabled {
        create_tray(&app)
    } else {
        let _ = app.remove_tray_by_id(TRAY_ID);
        Ok(())
    }
}
