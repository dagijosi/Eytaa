use tauri::WebviewWindow;

#[cfg(windows)]
mod imp {
    use std::ffi::c_void;
    use tauri::WebviewWindow;

    #[repr(C)]
    struct Guid {
        data1: u32,
        data2: u16,
        data3: u16,
        data4: [u8; 8],
    }

    const CLSID_TASKBAR_LIST: Guid = Guid {
        data1: 0x56FDF344,
        data2: 0xFD6D,
        data3: 0x11D0,
        data4: [0x95, 0x8A, 0x00, 0x60, 0x97, 0xC9, 0xA0, 0x90],
    };

    const IID_ITASKBAR_LIST3: Guid = Guid {
        data1: 0xEA1AFB91,
        data2: 0x9E28,
        data3: 0x4B86,
        data4: [0x90, 0xE9, 0x9E, 0x9F, 0x8A, 0x5E, 0xEF, 0xAF],
    };

    const CLSCTX_INPROC_SERVER: u32 = 1;
    const COINIT_APARTMENTTHREADED: u32 = 0x2;

    const TBPF_NOPROGRESS: i32 = 0;
    const TBPF_NORMAL: i32 = 2;
    const TBPF_PAUSED: i32 = 8;

    #[repr(C)]
    struct ITaskbarList3Vtbl {
        // IUnknown
        query_interface: unsafe extern "system" fn(*mut c_void, *const Guid, *mut *mut c_void) -> i32,
        add_ref: unsafe extern "system" fn(*mut c_void) -> u32,
        release: unsafe extern "system" fn(*mut c_void) -> u32,
        // ITaskbarList
        hr_init: unsafe extern "system" fn(*mut c_void) -> i32,
        add_tab: unsafe extern "system" fn(*mut c_void, *mut c_void) -> i32,
        delete_tab: unsafe extern "system" fn(*mut c_void, *mut c_void) -> i32,
        activate_tab: unsafe extern "system" fn(*mut c_void, *mut c_void) -> i32,
        set_active_alt: unsafe extern "system" fn(*mut c_void, *mut c_void) -> i32,
        // ITaskbarList2
        mark_fullscreen_window: unsafe extern "system" fn(*mut c_void, *mut c_void, i32) -> i32,
        // ITaskbarList3
        set_progress_value: unsafe extern "system" fn(*mut c_void, *mut c_void, u64, u64) -> i32,
        set_progress_state: unsafe extern "system" fn(*mut c_void, *mut c_void, i32) -> i32,
    }

    #[repr(C)]
    struct ITaskbarList3 {
        vtbl: *const ITaskbarList3Vtbl,
    }

    #[link(name = "ole32")]
    extern "system" {
        fn CoInitializeEx(pvReserved: *mut c_void, dwCoInit: u32) -> i32;
        fn CoCreateInstance(
            rclsid: *const Guid,
            pUnkOuter: *mut c_void,
            dwClsContext: u32,
            riid: *const Guid,
            ppv: *mut *mut c_void,
        ) -> i32;
    }

    pub fn set_progress(window: &WebviewWindow, state: &str, progress: Option<f64>) -> Result<(), String> {
        let hwnd = window.hwnd().map_err(|e| e.to_string())?;
        let hwnd_ptr = hwnd.0 as *mut c_void;

        unsafe {
            let _ = CoInitializeEx(std::ptr::null_mut(), COINIT_APARTMENTTHREADED);
            let mut raw: *mut c_void = std::ptr::null_mut();
            let hr = CoCreateInstance(
                &CLSID_TASKBAR_LIST,
                std::ptr::null_mut(),
                CLSCTX_INPROC_SERVER,
                &IID_ITASKBAR_LIST3,
                &mut raw,
            );
            if hr < 0 || raw.is_null() {
                return Ok(());
            }

            let tb = raw as *mut ITaskbarList3;
            let vtbl = &*(*tb).vtbl;
            let _ = (vtbl.hr_init)(raw);

            let flag = match state {
                "playing" | "normal" => TBPF_NORMAL,
                "paused" => TBPF_PAUSED,
                _ => TBPF_NOPROGRESS,
            };
            let _ = (vtbl.set_progress_state)(raw, hwnd_ptr, flag);

            if flag != TBPF_NOPROGRESS {
                if let Some(p) = progress {
                    let clamped = p.clamp(0.0, 1.0);
                    let completed = (clamped * 1000.0).round() as u64;
                    let _ = (vtbl.set_progress_value)(raw, hwnd_ptr, completed, 1000);
                }
            }

            let _ = (vtbl.release)(raw);
        }

        Ok(())
    }
}

#[cfg(not(windows))]
mod imp {
    use tauri::WebviewWindow;

    pub fn set_progress(_window: &WebviewWindow, _state: &str, _progress: Option<f64>) -> Result<(), String> {
        Ok(())
    }
}

#[tauri::command]
pub fn set_taskbar_progress(
    window: WebviewWindow,
    state: String,
    progress: Option<f64>,
) -> Result<(), String> {
    imp::set_progress(&window, &state, progress)
}
