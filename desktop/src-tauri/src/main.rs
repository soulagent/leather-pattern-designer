// Prevents an extra console window on Windows in release builds.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::Mutex;
use tauri::{Emitter, Manager};

// Holds the absolute path of the .lpd document passed on the command line (Windows file
// association / "Open with"). Read once by the frontend on startup via `take_launch_file`,
// which also hands back the file's contents so the app can load it AND remember where a plain
// Save should write back to.
struct LaunchFile(Mutex<Option<String>>);

// Return (and clear) the launch document as [path, contents], if the app was opened with a .lpd
// path that still reads successfully. None → normal launch (the frontend shows the welcome screen).
#[tauri::command]
fn take_launch_file(state: tauri::State<LaunchFile>) -> Option<(String, String)> {
    let path = state.0.lock().unwrap().take()?;
    let contents = std::fs::read_to_string(&path).ok()?;
    Some((path, contents))
}

// Read a .lpd chosen via the native Open dialog.
#[tauri::command]
fn read_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path).map_err(|e| e.to_string())
}

// Write the document straight back to disk (native Save / Save As) — no browser download.
#[tauri::command]
fn save_file(path: String, contents: String) -> Result<(), String> {
    std::fs::write(&path, contents).map_err(|e| e.to_string())
}

// Write raw bytes to disk (native PNG export — binary can't ride the String `save_file`).
#[tauri::command]
fn save_file_bytes(path: String, bytes: Vec<u8>) -> Result<(), String> {
    std::fs::write(&path, bytes).map_err(|e| e.to_string())
}

// First CLI argument that looks like a .lpd file → its path. The file association registers the
// open command as `"...exe" "%1"`, so the path arrives as argv[1].
fn launch_path() -> Option<String> {
    std::env::args()
        .skip(1)
        .find(|a| a.to_lowercase().ends_with(".lpd"))
}

fn main() {
    tauri::Builder::default()
        // Single-instance must be registered first. When a 2nd launch happens (e.g. double-clicking
        // another .lpd), this runs in the ALREADY-running app: focus our window and, if the new launch
        // passed a .lpd, read it and emit `open-lpd` so the frontend loads it into the existing window
        // instead of a 2nd window opening.
        .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            if let Some(win) = app.get_webview_window("main") {
                let _ = win.set_focus();
                if let Some(path) = argv.iter().find(|a| a.to_lowercase().ends_with(".lpd")) {
                    if let Ok(content) = std::fs::read_to_string(path) {
                        let _ = win.emit("open-lpd", (path.clone(), content));
                    }
                }
            }
        }))
        .plugin(tauri_plugin_dialog::init())
        // Auto-update: the updater checks the GitHub `latest.json` endpoint, downloads + installs a
        // newer signed build; the process plugin lets the frontend relaunch into it afterwards.
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .manage(LaunchFile(Mutex::new(launch_path())))
        .invoke_handler(tauri::generate_handler![take_launch_file, read_file, save_file, save_file_bytes])
        .run(tauri::generate_context!())
        .expect("error while running Leather Pattern Designer");
}
