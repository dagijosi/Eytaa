// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// Instruct NVIDIA Optimus and AMD PowerXpress drivers on dual-GPU laptops to prefer
// the energy-efficient integrated GPU for video playback, saving 15W–25W on battery.
#[cfg(windows)]
#[no_mangle]
pub static NvOptimusEnablement: u32 = 0x00000000;

#[cfg(windows)]
#[no_mangle]
pub static AmdPowerXpressRequestHighPerformance: i32 = 0;

fn main() {
    eytaa_player_lib::run()
}
