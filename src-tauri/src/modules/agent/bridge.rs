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
///
/// 按 Electron 原版（ipc-handlers.ts 的 setStateListener）：**非 idle 或有活跃会话时
/// 按需创建 AI 岛**，只有完全空闲且无会话才不建 —— 避免常驻一个透明 always-on-top
/// 渲染进程。
///
/// ⚠️ Rust 迁移时这行判断整个丢了：状态广播在岛不存在时被 push_state 静默丢弃，只有
/// 审批卡那条通道有懒创建。于是 Claude Code 一开始干活（thinking/working 状态持续上报）
/// 岛却不出现，要等第一张审批卡才被拉出来（实测「应用启动后终端已在用 Claude Code，
/// 悬浮岛要晚一点才出现」）—— 状态胶囊是岛的主角色，这个行为是回归。
pub fn broadcast_state(payload: Value) {
    let Some(app) = app() else { return };
    // payload 形状：{ state: string, sessions: [...] }（state_machine::notify_via 构造）
    let has_activity = payload
        .get("state")
        .and_then(|v| v.as_str())
        .map(|s| s != "idle")
        .unwrap_or(false)
        || payload
            .get("sessions")
            .and_then(|v| v.as_array())
            .map(|a| !a.is_empty())
            .unwrap_or(false);
    if has_activity && app.get_webview_window("ai-island").is_none() {
        crate::modules::windows::ai_island::show_island(&app);
    }
    crate::modules::windows::ai_island::push_state(&app, payload);
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
        S.get_or_init(|| ClaudeRunningCache {
            value: std::sync::Mutex::new(None),
        })
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

/// 探测 Claude 进程是否在跑（**辅助信号，不作权威**）
///
/// 只认 claude.exe：npm 安装的 CLI（`npm i -g @anthropic-ai/claude-code`）起的是
/// node.exe，tasklist /V 拿不到它的命令行（最后一列是窗口标题，控制台进程为空），
/// 所以对 npm 用户恒返回 false。状态机已不把它当权威判据（见 clean_stale_sessions：
/// 降级以 hook 事件活跃度为准，这里只用来把回收阈值从 5min 缩到 2.5min），故不必
/// 在这里为 node.exe 做不可靠的字符串匹配 —— 那会把 VSCode 等任意 node 进程
/// 误判成 Claude 在跑。
fn probe_claude_process() -> bool {
    use std::process::Command;
    let mut cmd = Command::new("tasklist");
    cmd.args(["/NH", "/FI", "IMAGENAME eq claude.exe"]);
    // GUI 主程序起控制台子进程会闪一个 cmd 窗口（启动一次 + 30s 轮询一次），
    // 必须 CREATE_NO_WINDOW 隐藏 —— 与 cooling/ps.rs、ffmpeg.rs 同款
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x0800_0000);
    }
    match cmd.output() {
        Ok(o) => String::from_utf8_lossy(&o.stdout)
            .to_lowercase()
            .contains("claude.exe"),
        Err(_) => false,
    }
}

/// 30s 运行态轮询循环的退出标志（bridge::stop 时置位——原实现 spawn 出去就收不回来，
/// 只能靠进程退出结束）
static POLLING_STOP: std::sync::atomic::AtomicBool = std::sync::atomic::AtomicBool::new(false);

/// 启动 agent 子系统（HTTP + 状态机清理循环 + hook 安装 + 运行态轮询）
pub async fn start(app: AppHandle) {
    set_app(app.clone());
    POLLING_STOP.store(false, std::sync::atomic::Ordering::SeqCst);

    // 队首超时按设置初始化（enabled=false → 永不过期）
    let (enabled, seconds) = crate::modules::commands::app_settings::agent_card_expiry(&app);
    let ms = if enabled { seconds as u64 * 1000 } else { 0 };
    crate::modules::agent::server::AgentServer::global().set_head_timeout_ms(ms);

    crate::modules::agent::state_machine::StateMachine::global().start_cleanup();
    // server 先绑端口（bind 成功才有 runtime.json 与 get_port），hooks 随后按**实际端口**安装。
    // 顺序反了 install 会拿到 DEFAULT_PORT 兜底值，端口漂移（60000 被占）时 URL 全部指错。
    crate::modules::agent::server::start(app.clone()).await;
    if crate::modules::agent::server::AgentServer::global()
        .get_port()
        .is_none()
    {
        log::error!("[AgentBridge] server 启动后仍无监听端口，跳过 hooks 安装（等待健康看护重试）");
    } else {
        match crate::modules::agent::hooks::install(&app) {
            Ok(()) => log::info!(
                "Claude hooks installed（permission → 127.0.0.1:{:?}）",
                crate::modules::agent::server::AgentServer::global().get_port()
            ),
            Err(e) => log::error!("Claude hooks install failed: {e}"),
        }
    }
    crate::modules::agent::hooks::start_watcher(app.clone());

    // 立即探测一次 Claude 运行态，再进入 30s 轮询（供状态机僵尸回收判定）。
    // 少了这次立即探测：应用启动后前 30s claude_running 恒为 None，设置面板的
    // 「Claude Code 正在运行」要等一轮才准。
    let running = ClaudeRunningCache::global().get();
    crate::modules::agent::state_machine::StateMachine::global()
        .set_claude_running(Some(running));

    tauri::async_runtime::spawn(async move {
        loop {
            tokio::time::sleep(std::time::Duration::from_secs(30)).await;
            if POLLING_STOP.load(std::sync::atomic::Ordering::SeqCst) {
                break;
            }
            // tasklist 子进程同步等待（几十~几百 ms），丢阻塞线程池别占 async worker
            let running =
                tokio::task::spawn_blocking(|| ClaudeRunningCache::global().get())
                    .await
                    .unwrap_or(false);
            crate::modules::agent::state_machine::StateMachine::global()
                .set_claude_running(Some(running));
        }
    });
}

/// 停止（before-quit）
pub fn stop() {
    POLLING_STOP.store(true, std::sync::atomic::Ordering::SeqCst);
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
