use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct PowerStatus {
    pub on_battery: bool,
    pub battery_percent: Option<u8>,
    pub power_saver: bool,
}

#[cfg(windows)]
mod imp {
    use super::PowerStatus;
    use std::sync::atomic::{AtomicBool, Ordering};

    #[repr(C)]
    struct SystemPowerStatus {
        ac_line_status: u8,
        battery_flag: u8,
        battery_life_percent: u8,
        system_status_flag: u8,
        battery_life_time: u32,
        battery_full_life_time: u32,
    }

    const ES_SYSTEM_REQUIRED: u32 = 0x00000001;
    const ES_DISPLAY_REQUIRED: u32 = 0x00000002;
    const ES_CONTINUOUS: u32 = 0x80000000;

    extern "system" {
        fn GetSystemPowerStatus(lpSystemPowerStatus: *mut SystemPowerStatus) -> i32;
        fn SetThreadExecutionState(esFlags: u32) -> u32;
    }

    static WAKE_LOCK_ACTIVE: AtomicBool = AtomicBool::new(false);

    pub fn get_power_status() -> PowerStatus {
        let mut status = SystemPowerStatus {
            ac_line_status: 255,
            battery_flag: 0,
            battery_life_percent: 255,
            system_status_flag: 0,
            battery_life_time: 0,
            battery_full_life_time: 0,
        };
        let ok = unsafe { GetSystemPowerStatus(&mut status) };
        if ok == 0 {
            return PowerStatus {
                on_battery: false,
                battery_percent: None,
                power_saver: false,
            };
        }
        PowerStatus {
            on_battery: status.ac_line_status == 0,
            battery_percent: if status.battery_life_percent <= 100 {
                Some(status.battery_life_percent)
            } else {
                None
            },
            power_saver: status.system_status_flag == 1,
        }
    }

    pub fn set_playback_wake_lock(active: bool) -> Result<(), String> {
        let prev = WAKE_LOCK_ACTIVE.swap(active, Ordering::SeqCst);
        if prev == active {
            return Ok(());
        }
        let flags = if active {
            ES_CONTINUOUS | ES_DISPLAY_REQUIRED | ES_SYSTEM_REQUIRED
        } else {
            ES_CONTINUOUS
        };
        unsafe {
            SetThreadExecutionState(flags);
        }
        Ok(())
    }
}

#[cfg(target_os = "macos")]
mod imp {
    use super::PowerStatus;
    use std::process::{Child, Command};
    use std::sync::Mutex;

    static CAFFEINATE: Mutex<Option<Child>> = Mutex::new(None);

    pub fn get_power_status() -> PowerStatus {
        if let Ok(out) = Command::new("pmset").args(["-g", "batt"]).output() {
            let text = String::from_utf8_lossy(&out.stdout);
            let on_battery = text.contains("Battery Power");
            return PowerStatus {
                on_battery,
                battery_percent: None,
                power_saver: false,
            };
        }
        PowerStatus {
            on_battery: false,
            battery_percent: None,
            power_saver: false,
        }
    }

    pub fn set_playback_wake_lock(active: bool) -> Result<(), String> {
        let mut guard = CAFFEINATE.lock().unwrap_or_else(|e| e.into_inner());
        if active {
            if guard.is_none() {
                let pid = std::process::id().to_string();
                if let Ok(child) = Command::new("caffeinate")
                    .args(["-d", "-i", "-w", &pid])
                    .spawn()
                {
                    *guard = Some(child);
                }
            }
        } else if let Some(mut child) = guard.take() {
            let _ = child.kill();
            let _ = child.wait();
        }
        Ok(())
    }
}

#[cfg(all(not(windows), not(target_os = "macos")))]
mod imp {
    use super::PowerStatus;

    pub fn get_power_status() -> PowerStatus {
        if let Ok(entries) = std::fs::read_dir("/sys/class/power_supply") {
            for entry in entries.flatten() {
                let name = entry.file_name().to_string_lossy().to_string();
                if name.starts_with("BAT") {
                    if let Ok(status) = std::fs::read_to_string(entry.path().join("status")) {
                        let on_battery = status.trim().eq_ignore_ascii_case("Discharging");
                        let cap = std::fs::read_to_string(entry.path().join("capacity"))
                            .ok()
                            .and_then(|s| s.trim().parse::<u8>().ok());
                        return PowerStatus {
                            on_battery,
                            battery_percent: cap,
                            power_saver: false,
                        };
                    }
                }
            }
        }
        PowerStatus {
            on_battery: false,
            battery_percent: None,
            power_saver: false,
        }
    }

    pub fn set_playback_wake_lock(_active: bool) -> Result<(), String> {
        Ok(())
    }
}

#[tauri::command]
pub fn get_power_status() -> PowerStatus {
    imp::get_power_status()
}

#[tauri::command]
pub fn set_playback_wake_lock(active: bool) -> Result<(), String> {
    imp::set_playback_wake_lock(active)
}
