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
pub async fn write_file(data: Vec<u8>, filePath: String) -> Value {
    // 文件 IO 丢阻塞线程池：不占 async worker（渲染层写截图/导出都走这里）
    tokio::task::spawn_blocking(move || {
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
    })
    .await
    .unwrap_or_else(|e| json!({ "success": false, "filePath": "", "error": e.to_string() }))
}

/// 追加写（分块落盘）：摄像头/画笔这类持续录制的数据按 MediaRecorder 的 timeslice
/// 逐块追加，避免停止时一次性把几十 MB 数组过 IPC。
/// reset=true 时先清空（新一轮录制开始）。
#[tauri::command]
pub async fn append_file(filePath: String, data: Vec<u8>, reset: Option<bool>) -> Value {
    // 录制期间随 timeslice 高频调用（每秒一次），IO 放阻塞线程池，别跟 UI 抢线程
    let reset = reset.unwrap_or(false);
    tokio::task::spawn_blocking(move || append_bytes(&filePath, &data, reset))
        .await
        .unwrap_or_else(|e| json!({ "success": false, "error": e.to_string() }))
}

/// 追加写（二进制原始载荷版）：摄像头预览窗每秒落一块（~250KB），走 invoke 的
/// octet-stream 通道 —— 旧 append_file 传 JSON 数字数组，250KB 块 = 25 万元素的
/// JS 数组 + 全量 JSON 序列化，每秒一次，长录制 GC 压力显著。
/// 载荷布局：[u32 path_len LE][path utf8][1B reset][data…]
#[tauri::command]
pub async fn append_file_raw(request: tauri::ipc::Request<'_>) -> Result<Value, String> {
    // tauri 约束：async 命令带引用型输入（Request<'_>）必须返回 Result —— 恒走 Ok，
    // 业务失败用与 append_file 相同的 success/error JSON 形状表达
    let bytes: Vec<u8> = match request.body() {
        tauri::ipc::InvokeBody::Raw(b) => b.clone(),
        tauri::ipc::InvokeBody::Json(_) => {
            return Ok(json!({ "success": false, "error": "expected raw octet-stream body" }))
        }
    };
    if bytes.len() < 5 {
        return Ok(json!({ "success": false, "error": "payload too short" }));
    }
    let path_len = u32::from_le_bytes([bytes[0], bytes[1], bytes[2], bytes[3]]) as usize;
    let body_start = 4 + path_len;
    if body_start + 1 > bytes.len() {
        return Ok(json!({ "success": false, "error": "path length out of range" }));
    }
    let path = String::from_utf8_lossy(&bytes[4..body_start]).to_string();
    let reset = bytes[body_start] != 0;
    let data = bytes[body_start + 1..].to_vec();
    Ok(tokio::task::spawn_blocking(move || append_bytes(&path, &data, reset))
        .await
        .unwrap_or_else(|e| json!({ "success": false, "error": e.to_string() })))
}

/// append_file / append_file_raw 共用的落盘实现
fn append_bytes(path_str: &str, data: &[u8], reset: bool) -> Value {
    let path = std::path::Path::new(path_str);
    if let Some(parent) = path.parent() {
        if let Err(e) = fs::create_dir_all(parent) {
            return json!({ "success": false, "error": e.to_string() });
        }
    }
    let opened = if reset {
        fs::File::create(path)
    } else {
        fs::OpenOptions::new().create(true).append(true).open(path)
    };
    match opened.and_then(|mut f| f.write_all(data)) {
        Ok(()) => json!({ "success": true, "bytes": data.len() }),
        Err(e) => {
            log::error!("append_file({path_str}) failed: {e}");
            json!({ "success": false, "error": e.to_string() })
        }
    }
}

#[tauri::command]
pub async fn read_file(filePath: String) -> Result<Vec<u8>, String> {
    tokio::task::spawn_blocking(move || fs::read(&filePath).map_err(|e| e.to_string()))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
pub fn file_exists(filePath: String) -> bool {
    std::path::Path::new(&filePath).exists()
}

#[tauri::command]
pub fn delete_file(filePath: String) -> bool {
    log::info!("delete_file: {filePath}");
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

/// 最近一次 save_recordings 落盘时间（ms，graceful_quit 等渲染层历史写完用）。
static LAST_SAVE_MS: std::sync::atomic::AtomicI64 = std::sync::atomic::AtomicI64::new(0);

/// 渲染层最近一次持久化录制历史的时刻（graceful_quit 宽限窗口的观察点）
pub fn last_recordings_save_ms() -> i64 {
    LAST_SAVE_MS.load(std::sync::atomic::Ordering::SeqCst)
}

#[tauri::command]
pub async fn save_recordings(app: tauri::AppHandle, recordings: Vec<Value>) -> bool {
    log::info!(
        "save_recordings: {} 条历史 → {:?}",
        recordings.len(),
        recordings_path(&app)
    );
    let path = recordings_path(&app);
    // 全量 JSON 序列化 + 落盘（历史多时数 MB），放阻塞线程池
    tokio::task::spawn_blocking(move || {
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
            Ok(()) => {
                LAST_SAVE_MS.store(
                    crate::modules::todo::store::now_ms(),
                    std::sync::atomic::Ordering::SeqCst,
                );
                true
            }
            Err(e) => {
                log::error!("save_recordings failed: {e}");
                false
            }
        }
    })
    .await
    .unwrap_or(false)
}

#[tauri::command]
pub fn get_default_save_dir(app: tauri::AppHandle) -> String {
    // 对齐 Electron：默认存系统「视频」目录
    if let Ok(dir) = app.path().video_dir() {
        return dir.to_string_lossy().to_string();
    }
    std::env::temp_dir().to_string_lossy().to_string()
}

/// 为既有的 mp4 记录补抽首帧缩略图（历史上没存 thumbnail 的记录）。
/// 返回 base64 data URL；非 mp4 / 抽帧失败返回 null，列表落占位图标。
#[tauri::command]
pub async fn generate_thumbnail(app: tauri::AppHandle, filePath: String) -> Option<String> {
    if !filePath.to_lowercase().ends_with(".mp4") {
        return None;
    }
    crate::modules::media::ffmpeg::extract_first_frame(&app, &filePath).await
}
