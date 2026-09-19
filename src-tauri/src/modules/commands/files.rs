// 文件 I/O + 录制历史持久化 — 对齐 electron/main/ipc-handlers.ts
// read/write/delete/exists/size 返回结构与 Electron 版逐字段一致；
// recordings.json 存于 userData（Electron 兼容：同一目录同一文件名，数据连续）
// camelCase 参数名是 Tauri invoke 映射约定（bridge.ts 传 camelCase），抑制命名告警
#![allow(non_snake_case)]

use serde_json::{json, Value};
use std::fs;
use std::io::Write;
use std::path::PathBuf;
use tauri::Manager;

pub fn recordings_path(app: &tauri::AppHandle) -> PathBuf {
    app.path()
        .app_data_dir()
        .unwrap_or_else(|_| PathBuf::from("."))
        .join("recordings.json")
}

#[tauri::command]
pub fn write_file(data: Vec<u8>, filePath: String) -> Value {
    let path = std::path::Path::new(&filePath);
    if let Some(parent) = path.parent() {
        if let Err(e) = fs::create_dir_all(parent) {
            log::error!("write_file mkdir({:?}) failed: {e}", parent);
            return json!({ "success": false, "filePath": filePath, "error": e.to_string() });
        }
    }
    match fs::File::create(path).and_then(|mut f| f.write_all(&data)) {
        Ok(()) => json!({ "success": true, "filePath": filePath }),
        Err(e) => {
            log::error!("write_file({filePath}) failed: {e}");
            json!({ "success": false, "filePath": filePath, "error": e.to_string() })
        }
    }
}

/// 追加写（分块落盘）：摄像头/画笔这类持续录制的数据按 MediaRecorder 的 timeslice
/// 逐块追加，避免停止时一次性把几十 MB 数组过 IPC。
/// reset=true 时先清空（新一轮录制开始）。
#[tauri::command]
pub fn append_file(filePath: String, data: Vec<u8>, reset: Option<bool>) -> Value {
    let path = std::path::Path::new(&filePath);
    if let Some(parent) = path.parent() {
        if let Err(e) = fs::create_dir_all(parent) {
            return json!({ "success": false, "error": e.to_string() });
        }
    }
    let opened = if reset.unwrap_or(false) {
        fs::File::create(path)
    } else {
        fs::OpenOptions::new().create(true).append(true).open(path)
    };
    match opened.and_then(|mut f| f.write_all(&data)) {
        Ok(()) => json!({ "success": true, "bytes": data.len() }),
        Err(e) => {
            log::error!("append_file({filePath}) failed: {e}");
            json!({ "success": false, "error": e.to_string() })
        }
    }
}

#[tauri::command]
pub fn read_file(filePath: String) -> Result<Vec<u8>, String> {
    fs::read(&filePath).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn file_exists(filePath: String) -> bool {
    std::path::Path::new(&filePath).exists()
}

#[tauri::command]
pub fn delete_file(filePath: String) -> bool {
    match fs::remove_file(&filePath) {
        Ok(()) => true,
        Err(e) => {
            log::warn!("delete_file({filePath}) failed: {e}");
            false
        }
    }
}

#[tauri::command]
pub fn get_file_size(filePath: String) -> u64 {
    fs::metadata(&filePath).map(|m| m.len()).unwrap_or(0)
}

#[tauri::command]
pub fn load_recordings(app: tauri::AppHandle) -> Value {
    let path = recordings_path(&app);
    match fs::read_to_string(&path) {
        Ok(text) => serde_json::from_str(&text).unwrap_or_else(|e| {
            log::warn!("recordings.json parse failed: {e}");
            json!([])
        }),
        Err(_) => json!([]),
    }
}

#[tauri::command]
pub fn save_recordings(app: tauri::AppHandle, recordings: Vec<Value>) -> bool {
    let path = recordings_path(&app);
    if let Some(parent) = path.parent() {
        if let Err(e) = fs::create_dir_all(parent) {
            log::error!("save_recordings mkdir failed: {e}");
            return false;
        }
    }
    match serde_json::to_string(&recordings)
        .map_err(|e| e.to_string())
        .and_then(|s| fs::write(&path, s).map_err(|e| e.to_string()))
    {
        Ok(()) => true,
        Err(e) => {
            log::error!("save_recordings failed: {e}");
            false
        }
    }
}

#[tauri::command]
pub fn get_default_save_dir(app: tauri::AppHandle) -> String {
    // 对齐 Electron：默认存系统「视频」目录
    if let Ok(dir) = app.path().video_dir() {
        return dir.to_string_lossy().to_string();
    }
    std::env::temp_dir().to_string_lossy().to_string()
}
