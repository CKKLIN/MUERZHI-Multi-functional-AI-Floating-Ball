// P1 桥阶段的 stub 命令集：bridge.ts 已 invoke 这些名字，P2/P3/P4 逐步替换为真实现。
// 全部返回类型安全的安全值（false/空表/0），避免渲染层拿到 undefined 崩溃。
// 参数名保留 camelCase 是 Tauri invoke 的 JS→Rust 映射约定（bridge.ts 传 camelCase），
// 故整体抑制 snake_case 命名告警；P2+ 替换真实现时同样遵循。
#![allow(non_snake_case)]

use serde_json::{json, Value};
use tauri::Manager;

// ===== 录制/截图（P4 capture 迁移）=====
#[tauri::command]
pub fn get_default_save_dir(app: tauri::AppHandle) -> String {
    // 对齐 Electron：默认存系统「视频」目录
    if let Ok(dir) = app.path().video_dir() {
        return dir.to_string_lossy().to_string();
    }
    std::env::temp_dir().to_string_lossy().to_string()
}

#[tauri::command]
pub fn take_screenshot() -> String {
    String::new()
}

#[tauri::command]
pub fn select_region() -> Value {
    Value::Null
}

// ===== 文件 I/O（P1 即实装核心三件，其余 P3）=====
#[tauri::command]
pub fn file_exists(filePath: String) -> bool {
    std::path::Path::new(&filePath).exists()
}

#[tauri::command]
pub fn get_file_size(filePath: String) -> u64 {
    std::fs::metadata(&filePath).map(|m| m.len()).unwrap_or(0)
}

#[tauri::command]
pub fn delete_file(filePath: String) -> bool {
    match std::fs::remove_file(&filePath) {
        Ok(()) => true,
        Err(e) => {
            log::warn!("delete_file({filePath}) failed: {e}");
            false
        }
    }
}

// ===== FFmpeg 转换（P3 media 迁移）=====
fn convert_stub(output_path: String) -> Value {
    json!({ "success": false, "outputPath": output_path, "error": "转换功能迁移中（P3 阶段实现）" })
}

#[tauri::command]
pub fn convert_to_mp4(outputPath: String) -> Value {
    convert_stub(outputPath)
}

#[tauri::command]
pub fn crop_video(outputPath: String) -> Value {
    convert_stub(outputPath)
}

#[tauri::command]
pub fn convert_to_gif(outputPath: String) -> Value {
    convert_stub(outputPath)
}

#[tauri::command]
pub fn merge_multi_screen(outputPath: String) -> Value {
    convert_stub(outputPath)
}

// ===== 录制历史 =====
#[tauri::command]
pub fn load_recordings() -> Value {
    json!([])
}

#[tauri::command]
pub fn save_recordings(_recordings: Vec<Value>) -> bool {
    false
}

// ===== 窗口控制（P2 迁移，P0 先实装主窗口四件）=====
#[tauri::command]
pub fn minimize_window(window: tauri::Window) {
    let _ = window.minimize();
}

#[tauri::command]
pub fn show_window(window: tauri::Window) {
    let _ = window.show();
}

#[tauri::command]
pub fn maximize_window(window: tauri::Window) {
    if window.is_maximized().unwrap_or(false) {
        let _ = window.unmaximize();
    } else {
        let _ = window.maximize();
    }
}

#[tauri::command]
pub fn close_window(window: tauri::Window) {
    // 对齐 Electron 版：主窗口关闭只 hide 不销毁（托盘常驻）
    let _ = window.hide();
}

// ===== 屏幕信息（P2 迁移）=====
#[tauri::command]
pub fn get_screen_scale_factor() -> f64 {
    1.0
}

#[tauri::command]
pub fn get_screen_bounds() -> Value {
    json!({ "x": 0, "y": 0, "width": 0, "height": 0 })
}

#[tauri::command]
pub fn get_all_displays() -> Value {
    json!([])
}

// ===== 区域选择/悬浮岛/摄像头（P2 迁移）=====
#[tauri::command]
pub fn show_region_border() {}

#[tauri::command]
pub fn hide_region_border() {}

#[tauri::command]
pub fn hide_border_only() {}

#[tauri::command]
pub fn show_floating_island() {}

#[tauri::command]
pub fn hide_floating_island() {}

#[tauri::command]
pub fn show_ai_island() {}

#[tauri::command]
pub fn hide_ai_island() {}

#[tauri::command]
pub fn get_ai_island_settings() -> Value {
    json!({ "flat": false })
}

#[tauri::command]
pub fn set_ai_island_settings(_patch: Value) -> Value {
    json!({ "flat": false })
}

#[tauri::command]
pub fn hide_camera_preview() {}

#[tauri::command]
pub fn toggle_camera_preview(_show: bool) {}

#[tauri::command]
pub fn set_island_state(_state: String) {}

#[tauri::command]
pub fn update_toolbar_state(_state: String) {}

#[tauri::command]
pub fn update_audio_levels(_micLevel: f64, _sysLevel: f64) {}

// ===== 悬浮球（P2 迁移）=====
#[tauri::command]
pub fn show_floating_ball() {}

#[tauri::command]
pub fn hide_floating_ball() {}

#[tauri::command]
pub fn toggle_floating_ball() {}

#[tauri::command]
pub fn get_floating_ball_settings(app: tauri::AppHandle) -> Value {
    let settings = crate::modules::settings::BallSettings::load(&app);
    serde_json::to_value(settings).unwrap_or(Value::Null)
}

#[tauri::command]
pub fn set_floating_ball_settings(_patch: Value) -> Value {
    Value::Null
}

#[tauri::command]
pub fn reset_floating_ball_position() {}

// ===== Agent（P3 迁移）=====
#[tauri::command]
pub fn agent_get_status() -> Value {
    Value::Null
}

#[tauri::command]
pub fn agent_install_hooks() -> Value {
    Value::Null
}

#[tauri::command]
pub fn agent_uninstall_hooks() -> Value {
    Value::Null
}

#[tauri::command]
pub fn agent_resolve_permission(_behavior: String) {}

#[tauri::command]
pub fn agent_dismiss_question() {}

#[tauri::command]
pub fn agent_submit_question(_sessionId: String, _answers: Value) {}

#[tauri::command]
pub fn agent_set_auto_allow(_enabled: bool) {}

#[tauri::command]
pub fn agent_get_auto_allow() -> bool {
    false
}

#[tauri::command]
pub fn agent_get_auto_allow_sessions() -> Value {
    json!([])
}

#[tauri::command]
pub fn agent_set_auto_allow_session(_sessionId: String, _enabled: bool) -> Value {
    json!([])
}

#[tauri::command]
pub fn agent_get_card_expiry() -> Value {
    json!({ "enabled": false, "seconds": 300 })
}

#[tauri::command]
pub fn agent_set_card_expiry(_enabled: bool, _seconds: u64) {}

// ===== 窗口拉起（P2 迁移）=====
#[tauri::command]
pub fn show_ai_window() {}

#[tauri::command]
pub fn show_settings_window() {}

#[tauri::command]
pub fn show_main_window() {}

// ===== 待办（P3 迁移）=====
#[tauri::command]
pub fn todo_get() -> Value {
    json!([])
}

#[tauri::command]
pub fn todo_create(_input: Value) -> Value {
    json!([])
}

#[tauri::command]
pub fn todo_update(_id: String, _patch: Value) -> Value {
    json!([])
}

#[tauri::command]
pub fn todo_delete(_id: String) -> Value {
    json!([])
}

#[tauri::command]
pub fn todo_toggle_done(_id: String) -> Value {
    json!([])
}

#[tauri::command]
pub fn todo_toggle_pin(_id: String) -> Value {
    json!([])
}

#[tauri::command]
pub fn todo_show_window() {}

#[tauri::command]
pub fn todo_close_window() {}

#[tauri::command]
pub fn todo_window_visible() -> bool {
    false
}

#[tauri::command]
pub fn todo_toggle_always_on_top() -> bool {
    false
}

#[tauri::command]
pub fn todo_get_settings() -> Value {
    json!({ "badgeVisible": true, "windowAlwaysOnTop": false, "stickyBoardPos": null })
}

#[tauri::command]
pub fn todo_set_settings(_patch: Value) -> Value {
    json!({ "badgeVisible": true, "windowAlwaysOnTop": false, "stickyBoardPos": null })
}

// ===== 文件读写（write_file/read_file 需要 serde 完整支持，P1 实装）=====
#[tauri::command]
pub fn write_file(data: Vec<u8>, filePath: String) -> Value {
    use std::io::Write;
    let path = std::path::Path::new(&filePath);
    if let Some(parent) = path.parent() {
        if let Err(e) = std::fs::create_dir_all(parent) {
            log::error!("write_file mkdir({:?}) failed: {e}", parent);
            return json!({ "success": false, "filePath": filePath, "error": e.to_string() });
        }
    }
    match std::fs::File::create(path).and_then(|mut f| f.write_all(&data)) {
        Ok(()) => json!({ "success": true, "filePath": filePath }),
        Err(e) => {
            log::error!("write_file({filePath}) failed: {e}");
            json!({ "success": false, "filePath": filePath, "error": e.to_string() })
        }
    }
}

#[tauri::command]
pub fn read_file(filePath: String) -> Result<Vec<u8>, String> {
    std::fs::read(&filePath).map_err(|e| e.to_string())
}
