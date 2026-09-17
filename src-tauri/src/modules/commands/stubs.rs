// P2-P4 阶段待迁移命令的 stub 集合：P1 已实装的部分移入 files/screen/app_settings/windows。
// 全部返回类型安全的安全值（false/空表/0），避免渲染层拿到 undefined 崩溃。
// 参数名保留 camelCase 是 Tauri invoke 的 JS→Rust 映射约定（bridge.ts 传 camelCase），
// 故整体抑制 snake_case 命名告警；替换真实现时同样遵循。
#![allow(non_snake_case)]

use serde_json::{json, Value};
use tauri::Emitter;

// ===== 录制/截图（P4 capture 迁移）=====
#[tauri::command]
pub fn take_screenshot() -> Value {
    json!({ "success": false, "error": "截图功能迁移中（P4 阶段实现）" })
}

#[tauri::command]
pub fn select_region() -> Value {
    Value::Null
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

// ===== 窗口控制四件（主窗口内自操作，P1 即实装）=====
#[tauri::command]
pub fn minimize_window(window: tauri::Window) {
    let _ = window.minimize();
}

#[tauri::command]
pub fn show_window(window: tauri::Window) {
    let _ = window.show();
    let _ = window.set_focus();
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
pub fn close_window(window: tauri::Window, app: tauri::AppHandle) {
    // 对齐 Electron close-window：通知渲染层释放录制资源 → 隐藏（不销毁，托盘常驻）。
    // CloseRequested 拦截器也会触发同样逻辑，此处显式走一遍保证语义一致。
    if window.label() == "main" {
        let _ = app.emit("app-main-window-close", ());
        let _ = window.hide();
    } else {
        let _ = window.close();
    }
}

// ===== 区域选择/悬浮岛/摄像头（P2 迁移）=====
#[tauri::command]
pub fn update_audio_levels(_micLevel: f64, _sysLevel: f64) {}

// ===== 悬浮球（P2 已实装于 windows/floating_ball.rs）=====

// ===== Agent（P3 迁移；设置类已实装于 app_settings.rs）=====
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
