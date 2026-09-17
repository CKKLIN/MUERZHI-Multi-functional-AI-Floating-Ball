// 应用设置命令 — 对齐 floating-ball.ts / agent-bridge.ts / ai-island.ts 的 IPC handler
// 三套设置文件（floating-ball/agent/ai-island）沿用 Electron 版文件名与 JSON 结构，
// dev 放项目根、打包放 userData（settings::settings_dir 统一管理）
// camelCase 参数名是 Tauri invoke 映射约定（bridge.ts 传 camelCase），抑制命名告警
#![allow(non_snake_case)]

use crate::modules::autostart;
use crate::modules::i18n::{I18n, Locale};
use crate::modules::settings::BallSettings;
use crate::modules::windows;
use serde_json::{json, Value};
use std::fs;
use tauri::{AppHandle, Emitter};

// ---------- floating-ball-settings ----------

#[tauri::command]
pub fn get_floating_ball_settings(app: AppHandle) -> Value {
    let settings = BallSettings::load(&app);
    serde_json::to_value(settings).unwrap_or(Value::Null)
}

#[tauri::command]
pub fn set_floating_ball_settings(app: AppHandle, patch: Value) -> Value {
    let current = BallSettings::load(&app);
    let locale_changed = patch.get("locale").is_some();
    let open_at_login_changed = patch.get("openAtLogin").is_some();

    let next = current.merged_with(&patch);
    if let Err(e) = next.save(&app) {
        log::error!("save floating-ball-settings failed: {e}");
    }

    // 副作用对齐 Electron set-floating-ball-settings handler：
    // openAtLogin → 系统自启；locale → i18n 切换 + 全窗口广播
    if open_at_login_changed {
        autostart::sync(&app, next.open_at_login);
    }
    if locale_changed {
        let locale = Locale::from_str_lossy(&next.locale);
        I18n::global().set_locale(locale);
        let _ = app.emit("app-locale-changed", json!({ "locale": next.locale }));
    }

    serde_json::to_value(next).unwrap_or(Value::Null)
}

#[tauri::command]
pub fn reset_floating_ball_position() {
    // P2 悬浮球窗口落地时实装（清 pos 文件 + 回主屏中心）
    log::info!("reset_floating_ball_position: P2 待实装");
}

// ---------- agent-settings ----------

#[derive(serde::Serialize, serde::Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct AgentSettings {
    #[serde(default)]
    auto_allow: bool,
    #[serde(default)]
    auto_allow_sessions: Vec<String>,
    #[serde(default = "default_card_expire_enabled")]
    card_expire_enabled: bool,
    #[serde(default = "default_card_expire_seconds")]
    card_expire_seconds: u64,
}

fn default_card_expire_enabled() -> bool {
    true
}
fn default_card_expire_seconds() -> u64 {
    300
}

impl Default for AgentSettings {
    fn default() -> Self {
        Self {
            auto_allow: false,
            auto_allow_sessions: vec![],
            card_expire_enabled: default_card_expire_enabled(),
            card_expire_seconds: default_card_expire_seconds(),
        }
    }
}

impl AgentSettings {
    fn load(app: &AppHandle) -> Self {
        let path = crate::modules::settings::settings_file(app, "agent-settings.json");
        fs::read_to_string(&path)
            .ok()
            .and_then(|t| serde_json::from_str(&t).ok())
            .unwrap_or_default()
    }
    fn save(&self, app: &AppHandle) {
        let path = crate::modules::settings::settings_file(app, "agent-settings.json");
        if let Some(parent) = path.parent() {
            let _ = fs::create_dir_all(parent);
        }
        if let Ok(s) = serde_json::to_string_pretty(self) {
            let _ = fs::write(&path, s);
        }
    }
}

#[tauri::command]
pub fn agent_get_auto_allow(app: AppHandle) -> bool {
    AgentSettings::load(&app).auto_allow
}

#[tauri::command]
pub fn agent_set_auto_allow(app: AppHandle, enabled: bool) {
    let mut s = AgentSettings::load(&app);
    s.auto_allow = enabled;
    s.save(&app);
}

#[tauri::command]
pub fn agent_get_auto_allow_sessions(app: AppHandle) -> Vec<String> {
    AgentSettings::load(&app).auto_allow_sessions
}

#[tauri::command]
pub fn agent_set_auto_allow_session(app: AppHandle, sessionId: String, enabled: bool) -> Vec<String> {
    let mut s = AgentSettings::load(&app);
    if enabled {
        if !s.auto_allow_sessions.contains(&sessionId) {
            s.auto_allow_sessions.push(sessionId);
        }
    } else {
        s.auto_allow_sessions.retain(|id| id != &sessionId);
    }
    s.save(&app);
    s.auto_allow_sessions
}

#[tauri::command]
pub fn agent_get_card_expiry(app: AppHandle) -> Value {
    let s = AgentSettings::load(&app);
    json!({ "enabled": s.card_expire_enabled, "seconds": s.card_expire_seconds })
}

#[tauri::command]
pub fn agent_set_card_expiry(app: AppHandle, enabled: bool, seconds: u64) {
    let mut s = AgentSettings::load(&app);
    s.card_expire_enabled = enabled;
    // 对齐 agent-bridge.ts clamp [10, 1800]
    s.card_expire_seconds = seconds.clamp(10, 1800);
    s.save(&app);
    // server.restartHeadTimer() 的等价动作在 P3 agent-server 落地时接
}

// ---------- ai-island-settings ----------

#[derive(serde::Serialize, serde::Deserialize, Clone)]
struct AiIslandSettings {
    #[serde(default)]
    flat: bool,
}

impl Default for AiIslandSettings {
    fn default() -> Self {
        Self { flat: false }
    }
}

impl AiIslandSettings {
    fn load(app: &AppHandle) -> Self {
        let path = crate::modules::settings::settings_file(app, "ai-island-settings.json");
        fs::read_to_string(&path)
            .ok()
            .and_then(|t| serde_json::from_str(&t).ok())
            .unwrap_or_default()
    }
    fn save(&self, app: &AppHandle) {
        let path = crate::modules::settings::settings_file(app, "ai-island-settings.json");
        if let Some(parent) = path.parent() {
            let _ = fs::create_dir_all(parent);
        }
        if let Ok(s) = serde_json::to_string_pretty(self) {
            let _ = fs::write(&path, s);
        }
    }
}

#[tauri::command]
pub fn get_ai_island_settings(app: AppHandle) -> Value {
    let s = AiIslandSettings::load(&app);
    json!({ "flat": s.flat })
}

#[tauri::command]
pub fn set_ai_island_settings(app: AppHandle, patch: Value) -> Value {
    let mut s = AiIslandSettings::load(&app);
    if let Some(v) = patch.get("flat").and_then(|v| v.as_bool()) {
        s.flat = v;
        s.save(&app);
    }
    json!({ "flat": s.flat })
}

// ---------- 窗口控制（主窗口四件 + AI/设置窗口拉起）----------

#[tauri::command]
pub fn show_ai_window(app: AppHandle) {
    windows::open_or_focus(&app, "ai", "/ai");
}

#[tauri::command]
pub fn show_settings_window(app: AppHandle) {
    windows::open_or_focus(&app, "settings", "/settings");
}

#[tauri::command]
pub fn show_main_window(app: AppHandle) {
    use tauri::Manager;
    if let Some(win) = app.get_webview_window("main") {
        let _ = win.show();
        let _ = win.set_focus();
    }
}

// ---------- 托盘气泡通知（对齐 tray.displayBalloon）----------

#[tauri::command]
pub fn notify_conversion_start() {
    // P3：接 tauri-plugin-notification；P1 先日志占位
    log::info!("notify: 转换已开始");
}

#[tauri::command]
pub fn notify_conversion_done(filePath: String) {
    log::info!("notify: 转换完成 → {filePath}");
}
