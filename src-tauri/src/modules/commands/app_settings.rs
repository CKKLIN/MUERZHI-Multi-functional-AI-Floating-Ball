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
    log::info!("set_floating_ball_settings: {patch}（openAtLogin={open_at_login_changed}, locale={locale_changed}）");

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
// reset_floating_ball_position 已实装于 windows/floating_ball.rs（P2）

// ---------- agent-settings ----------

#[derive(serde::Serialize, serde::Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AgentSettings {
    #[serde(default)]
    pub auto_allow: bool,
    #[serde(default)]
    pub auto_allow_sessions: Vec<String>,
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

/// 供 agent/server 的自动审批判定用（push_card 没有 AppHandle 参数）：
/// 返回全局开关 + 会话白名单快照
pub fn agent_auto_allow_snapshot(app: &AppHandle) -> AgentSettings {
    AgentSettings::load(app)
}

#[tauri::command]
pub fn agent_set_auto_allow(app: AppHandle, enabled: bool) {
    log::info!("agent_set_auto_allow: {enabled}");
    let mut s = AgentSettings::load(&app);
    s.auto_allow = enabled;
    s.save(&app);
}

#[tauri::command]
pub fn agent_get_auto_allow_sessions(app: AppHandle) -> Vec<String> {
    AgentSettings::load(&app).auto_allow_sessions
}

#[tauri::command]
pub fn agent_set_auto_allow_session(
    app: AppHandle,
    sessionId: String,
    enabled: bool,
) -> Vec<String> {
    log::info!("agent_set_auto_allow_session: {sessionId} → {enabled}");
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

/// 供 agent 模块读取卡片过期设置（enabled, seconds）
pub fn agent_card_expiry(app: &AppHandle) -> (bool, u64) {
    let s = AgentSettings::load(app);
    (s.card_expire_enabled, s.card_expire_seconds)
}

#[tauri::command]
pub fn agent_get_card_expiry(app: AppHandle) -> Value {
    let s = AgentSettings::load(&app);
    json!({ "enabled": s.card_expire_enabled, "seconds": s.card_expire_seconds })
}

#[tauri::command]
pub fn agent_set_card_expiry(app: AppHandle, enabled: bool, seconds: u64) {
    log::info!("agent_set_card_expiry: enabled={enabled}, seconds={seconds}");
    let mut s = AgentSettings::load(&app);
    s.card_expire_enabled = enabled;
    // 对齐 agent-bridge.ts clamp [10, 1800]
    s.card_expire_seconds = seconds.clamp(10, 1800);
    s.save(&app);
    // 落盘后立即作用到运行中的队首计时器（对齐 agent-bridge.ts 的 server.restartHeadTimer()）。
    // 只落盘不重启计时 → 设置改了不生效，必须重启整个应用才对得上（实测确认过这个现象）。
    // enabled=false → ms=0 表示永不过期，与 bridge::start 的折算口径一致。
    let ms = if s.card_expire_enabled {
        s.card_expire_seconds * 1000
    } else {
        0
    };
    crate::modules::agent::server::AgentServer::global().set_head_timeout_ms(ms);
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

/// flat 的内存缓存（0=未加载 1=false 2=true）：resize_ai_island 在**每次 agent 状态
/// 广播**都会调用（hook 事件 → notify → applyState → resizeIsland），原实现每次
/// 都读盘 + 反序列化 —— 每次工具调用两次事件就是两次读盘。
static AI_ISLAND_FLAT_CACHE: std::sync::atomic::AtomicU8 = std::sync::atomic::AtomicU8::new(0);

/// 供窗口模块读取横条态（避免各自解析文件；首次读盘后走内存缓存）
pub fn ai_island_flat(app: &AppHandle) -> bool {
    use std::sync::atomic::Ordering;
    match AI_ISLAND_FLAT_CACHE.load(Ordering::SeqCst) {
        1 => false,
        2 => true,
        _ => {
            let v = AiIslandSettings::load(app).flat;
            AI_ISLAND_FLAT_CACHE.store(if v { 2 } else { 1 }, Ordering::SeqCst);
            v
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
        log::info!("set_ai_island_settings: flat={v}");
        s.flat = v;
        s.save(&app);
        // 同步内存缓存（resize_ai_island 的热点读走缓存，不再读盘）
        AI_ISLAND_FLAT_CACHE.store(if v { 2 } else { 1 }, std::sync::atomic::Ordering::SeqCst);
        // 作用到活动岛（对齐 applyAiIslandSettings）
        crate::modules::windows::ai_island::push_flat(&app, v);
    }
    json!({ "flat": s.flat })
}

// ---------- 窗口控制（主窗口四件 + AI/设置窗口拉起）----------

#[tauri::command]
pub fn show_ai_window(app: AppHandle) {
    log::info!("show_ai_window");
    windows::open_or_focus(&app, "ai", "/ai");
}

#[tauri::command]
pub fn show_settings_window(app: AppHandle) {
    log::info!("show_settings_window");
    windows::open_or_focus(&app, "settings", "/settings");
}

#[tauri::command]
pub fn show_main_window(app: AppHandle) {
    log::info!("show_main_window");
    // 立即显示；页面加载期由 index.html 的加载占位兜底（见 windows::show_main_window 文档）
    windows::show_main_window(&app);
}

// ---------- 托盘气泡通知（对齐 tray.displayBalloon）----------
//
// Electron 用 tray.displayBalloon（Windows 气泡）；Tauri 的 tray-icon 无此 API，
// 改用 tauri-plugin-notification 的系统通知（同一视觉位置，且不依赖托盘存在）。

/// 发一条系统通知；通知权限未授予或平台不支持时只记日志，不打断调用方流程
pub fn balloon(title: &str, body: &str) {
    use tauri_plugin_notification::NotificationExt;
    let app = crate::APP_HANDLE.get().cloned();
    let Some(app) = app else {
        log::info!("notify: {title} — {body}");
        return;
    };
    match app.notification().builder().title(title).body(body).show() {
        Ok(()) => log::info!("notify: {title} — {body}"),
        Err(e) => log::warn!("通知发送失败（{e}）：{title} — {body}"),
    }
}

#[tauri::command]
pub fn notify_conversion_start() {
    log::info!("notify_conversion_start");
    balloon("二支录制", "视频转换中…");
}

#[tauri::command]
pub fn notify_conversion_done(filePath: String) {
    log::info!("notify_conversion_done: {filePath}");
    balloon("二支录制", &format!("转换完成：{filePath}"));
}
