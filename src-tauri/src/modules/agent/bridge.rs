// Agent 子系统门面 — 移植 electron/main/agent-bridge.ts
// 编排：HTTP 服务启停 + 状态机 + hook 安装 + 状态广播 + Claude 运行探测。
// 卡片队列超时（cardExpireSeconds）来自 agent-settings.json（app_settings.rs 管理）。

use serde_json::{json, Value};
use tauri::{AppHandle, Manager};

/// 全局 AppHandle（setup 时注入；广播函数在无参上下文中取用）
static APP: std::sync::OnceLock<AppHandle> = std::sync::OnceLock::new();

pub fn set_app(app: AppHandle) {
    let _ = APP.set(app);
}

pub fn app() -> Option<AppHandle> {
    APP.get().cloned()
}

/// 广播会话状态到 AI 岛（对齐 webContents.send('agent-state-update')）
pub fn broadcast_state(payload: Value) {
    if let Some(app) = app() {
        crate::modules::windows::ai_island::push_state(&app, payload);
    }
}

/// 广播队首卡片（对齐 webContents.send('agent-card-update')）
/// 卡片到达时若 AI 岛不存在则自动创建（「按需懒创建」语义：审批卡必须可见才有意义）
pub fn notify_card_change(card: Value) {
    let Some(app) = app() else { return };
    if !card.is_null() && app.get_webview_window("ai-island").is_none() {
        crate::modules::windows::ai_island::show_island(&app);
    }
    crate::modules::windows::ai_island::push_card(&app, card);
}

/// Claude 进程探测（tasklist，结果缓存 30s）
pub struct ClaudeRunningCache {
    pub value: std::sync::Mutex<Option<(bool, std::time::Instant)>>,
}

impl ClaudeRunningCache {
    pub fn global() -> &'static ClaudeRunningCache {
        use std::sync::OnceLock;
        static S: OnceLock<ClaudeRunningCache> = OnceLock::new();
        S.get_or_init(|| ClaudeRunningCache { value: std::sync::Mutex::new(None) })
    }

    pub fn get(&self) -> bool {
        {
            let guard = self.value.lock().unwrap();
            if let Some((v, t)) = *guard {
                if t.elapsed().as_secs() < 30 {
                    return v;
                }
            }
        }
        let running = probe_claude_process();
        *self.value.lock().unwrap() = Some((running, std::time::Instant::now()));
        running
    }
}

fn probe_claude_process() -> bool {
    use std::process::Command;
    let out = Command::new("tasklist").args(["/NH", "/FI", "IMAGENAME eq claude.exe"]).output();
    match out {
        Ok(o) => String::from_utf8_lossy(&o.stdout).to_lowercase().contains("claude.exe"),
        Err(_) => false,
    }
}

/// 启动 agent 子系统（HTTP + 状态机清理循环 + hook 安装 + 运行态轮询）
pub async fn start(app: AppHandle) {
    set_app(app.clone());

    // 队首超时按设置初始化（enabled=false → 永不过期）
    let (enabled, seconds) = crate::modules::commands::app_settings::agent_card_expiry(&app);
    let ms = if enabled { seconds as u64 * 1000 } else { 0 };
    crate::modules::agent::server::AgentServer::global().set_head_timeout_ms(ms);

    crate::modules::agent::state_machine::StateMachine::global().start_cleanup();
    crate::modules::agent::server::start(app.clone()).await;

    match crate::modules::agent::hooks::install(&app) {
        Ok(()) => log::info!("Claude hooks installed"),
        Err(e) => log::error!("Claude hooks install failed: {e}"),
    }
    crate::modules::agent::hooks::start_watcher(app.clone());

    // 30s 刷新 Claude 运行态（供状态机僵尸回收判定）
    tauri::async_runtime::spawn(async move {
        loop {
            tokio::time::sleep(std::time::Duration::from_secs(30)).await;
            let running = ClaudeRunningCache::global().get();
            crate::modules::agent::state_machine::StateMachine::global().set_claude_running(Some(running));
        }
    });
}

/// 停止（before-quit）
pub fn stop() {
    crate::modules::agent::server::AgentServer::global().stop();
    crate::modules::agent::state_machine::StateMachine::global().stop_cleanup();
    crate::modules::agent::hooks::stop_watcher();
}

/// 状态查询（对齐 agent-get-status）
pub fn get_status() -> Value {
    let s = crate::modules::agent::server::AgentServer::global();
    let sm = crate::modules::agent::state_machine::StateMachine::global();
    json!({
        "serverRunning": s.running.load(std::sync::atomic::Ordering::SeqCst),
        "port": s.get_port(),
        "hookInstalled": crate::modules::agent::hooks::is_installed(),
        "displayState": sm.resolve_display_state(),
        "currentCard": s.head_payload(),
        "sessionCount": sm.sessions_snapshot().len(),
        "claudeRunning": ClaudeRunningCache::global().get(),
    })
}
