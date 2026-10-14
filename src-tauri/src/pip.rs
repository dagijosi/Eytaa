use serde::{Deserialize, Serialize};
use tauri::{PhysicalPosition, PhysicalSize, WebviewWindow};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct WindowGeometry {
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
}

#[tauri::command]
pub async fn enter_pip(window: WebviewWindow) -> Result<WindowGeometry, String> {
    let monitor = window
        .current_monitor()
        .map_err(|e| e.to_string())?
        .or_else(|| window.primary_monitor().ok().flatten())
        .ok_or("No monitor detected")?;

    let outer_pos = window.outer_position().map_err(|e| e.to_string())?;
    let outer_size = window.outer_size().map_err(|e| e.to_string())?;
    let prev = WindowGeometry {
        x: outer_pos.x,
        y: outer_pos.y,
        width: outer_size.width,
        height: outer_size.height,
    };

    let scale_factor = monitor.scale_factor();
    let monitor_pos = monitor.position();
    let monitor_size = monitor.size();

    // PiP standard 16:9 compact size (420x236 logical pixels)
    let pip_w = (420.0 * scale_factor).round() as u32;
    let pip_h = (236.0 * scale_factor).round() as u32;
    let margin = (28.0 * scale_factor).round() as i32;

    let target_x = monitor_pos.x + (monitor_size.width as i32) - (pip_w as i32) - margin;
    let target_y = monitor_pos.y + (monitor_size.height as i32) - (pip_h as i32) - margin;

    window.set_always_on_top(true).map_err(|e| e.to_string())?;
    window
        .set_size(PhysicalSize::new(pip_w, pip_h))
        .map_err(|e| e.to_string())?;
    window
        .set_position(PhysicalPosition::new(target_x, target_y))
        .map_err(|e| e.to_string())?;

    Ok(prev)
}

#[tauri::command]
pub async fn exit_pip(
    window: WebviewWindow,
    restore: Option<WindowGeometry>,
    keep_always_on_top: bool,
) -> Result<(), String> {
    window
        .set_always_on_top(keep_always_on_top)
        .map_err(|e| e.to_string())?;
    if let Some(geom) = restore {
        window
            .set_size(PhysicalSize::new(geom.width, geom.height))
            .map_err(|e| e.to_string())?;
        window
            .set_position(PhysicalPosition::new(geom.x, geom.y))
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}
