// Claude Code hooks 管理 — 移植 electron/main/claude-hook-manager.ts
// 向 ~/.claude/settings.json 注入 12 个事件的 hooks（PermissionRequest 走 http，其余走
// powershell 调 clawd-hook.js）；marker 识别靠命令串含 'clawd-hook.js' / url 含 '/permission'。
// 5 分钟健康看护（最多 3 次修复重试）。

use serde_json::{json, Value};
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};
use tauri::{AppHandle, Manager};

/// PermissionRequest 的 HTTP hook 超时（秒）：必须 > 卡片过期上限 1800s
pub const HOOK_HTTP_TIMEOUT_S: u64 = 1860;
const WATCH_INTERVAL_MS: u64 = 5 * 60 * 1000;
const MAX_REPAIR_RETRIES: u32 = 3;
/// 事件清单（12 个，与 TS 一致）
pub const HOOK_EVENTS: [&str; 12] = [
    "SessionStart",
    "SessionEnd",
    "UserPromptSubmit",
    "PreToolUse",
    "PostToolUse",
    "PostToolUseFailure",
    "Stop",
    "StopFailure",
    "ApiError",
    "Notification",
    "PermissionDenied",
    "PermissionRequest",
];

pub struct HookManager {
    pub watcher_running: AtomicBool,
    pub repair_failures: AtomicU32,
    pub manual_fix_required: AtomicBool,
}

impl HookManager {
    pub fn global() -> &'static HookManager {
        use std::sync::OnceLock;
        static S: OnceLock<HookManager> = OnceLock::new();
        S.get_or_init(|| HookManager {
            watcher_running: AtomicBool::new(false),
            repair_failures: AtomicU32::new(0),
            manual_fix_required: AtomicBool::new(false),
        })
    }
}

fn home_dir() -> PathBuf {
    std::env::var("USERPROFILE")
        .or_else(|_| std::env::var("HOME"))
        .unwrap_or_else(|_| ".".into())
        .into()
}

pub fn settings_path() -> PathBuf {
    home_dir().join(".claude").join("settings.json")
}

/// clawd-hook.js 路径：打包走 resources，dev 走项目 electron/main
pub fn hook_script_path(app: &AppHandle) -> PathBuf {
    if let Ok(res) = app.path().resource_dir() {
        let p = res.join("clawd-hook.js");
        if p.exists() {
            return p;
        }
    }
    // dev：src-tauri/target/debug → 上四级 = 项目根
    if let Ok(exe) = std::env::current_exe() {
        if let Some(root) = exe.ancestors().nth(4) {
            let p = root.join("electron").join("main").join("clawd-hook.js");
            if p.exists() {
                return p;
            }
        }
    }
    PathBuf::from("clawd-hook.js")
}

/// 探测 node 可执行文件（where node）
fn detect_node() -> String {
    use std::process::Command;
    if let Ok(out) = Command::new("where").arg("node").output() {
        let s = String::from_utf8_lossy(&out.stdout);
        if let Some(first) = s.lines().next() {
            let t = first.trim();
            if !t.is_empty() {
                return t.to_string();
            }
        }
    }
    "node".to_string()
}

fn read_settings() -> Value {
    let path = settings_path();
    match std::fs::read_to_string(&path) {
        Ok(text) => serde_json::from_str(&text).unwrap_or_else(|_| json!({})),
        Err(_) => json!({}),
    }
}

fn write_settings(v: &Value) -> bool {
    let path = settings_path();
    if let Some(parent) = path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    match serde_json::to_string_pretty(v) {
        Ok(text) => match std::fs::write(&path, text) {
            Ok(()) => true,
            Err(e) => {
                log::error!("write ~/.claude/settings.json failed: {e}");
                false
            }
        },
        Err(e) => {
            log::error!("serialize claude settings failed: {e}");
            false
        }
    }
}

/// 是否为自家 hook（新格式：命令含 clawd-hook.js 或 http url 含 /permission）
fn is_ours(hook: &Value) -> bool {
    if let Some(s) = hook.get("command").and_then(|v| v.as_str()) {
        if s.contains("clawd-hook.js") {
            return true;
        }
    }
    if let Some(u) = hook.get("url").and_then(|v| v.as_str()) {
        if u.contains("/permission") {
            return true;
        }
    }
    // 旧格式：name 前缀 erzhi-recording
    if let Some(n) = hook.get("name").and_then(|v| v.as_str()) {
        if n.starts_with("erzhi-recording") {
            return true;
        }
    }
    false
}

/// 移除旧/已存在的自家 hooks（保留用户其他 hook）
fn remove_old_hooks(settings: &mut Value) {
    let Some(hooks) = settings.get_mut("hooks") else { return };
    let Some(map) = hooks.as_object_mut() else { return };
    // 旧格式：hooks 为数组（元素含 name+events）
    for (_, v) in map.iter_mut() {
        if let Some(groups) = v.as_array_mut() {
            groups.retain(|g| {
                let ours = g
                    .get("hooks")
                    .and_then(|h| h.as_array())
                    .map(|arr| arr.iter().any(is_ours))
                    .unwrap_or(false);
                !ours
            });
        }
    }
    // 清掉空数组键
    map.retain(|_, v| !v.as_array().map(|a| a.is_empty()).unwrap_or(false));
    if map.is_empty() {
        if let Some(obj) = settings.as_object_mut() {
            obj.remove("hooks");
        }
    }
}

/// 校验 hook 形态是否符合预期（对齐 hasCorrectHooks）
fn has_correct_hooks(settings: &Value, port: Option<u16>) -> bool {
    let Some(hooks) = settings.get("hooks").and_then(|v| v.as_object()) else { return false };
    for event in HOOK_EVENTS {
        let Some(groups) = hooks.get(event).and_then(|v| v.as_array()) else { return false };
        let Some(first) = groups.first() else { return false };
        let Some(list) = first.get("hooks").and_then(|v| v.as_array()) else { return false };
        let Some(hook) = list.first() else { return false };
        if event == "PermissionRequest" {
            let ty = hook.get("type").and_then(|v| v.as_str()).unwrap_or("");
            let url = hook.get("url").and_then(|v| v.as_str()).unwrap_or("");
            let timeout = hook.get("timeout").and_then(|v| v.as_u64()).unwrap_or(0);
            if ty != "http" || !url.contains("/permission") || timeout < HOOK_HTTP_TIMEOUT_S {
                return false;
            }
            if let Some(p) = port {
                if !url.contains(&format!(":{p}/")) {
                    return false;
                }
            }
        } else {
            let ty = hook.get("type").and_then(|v| v.as_str()).unwrap_or("");
            let cmd = hook.get("command").and_then(|v| v.as_str()).unwrap_or("");
            let shell = hook.get("shell").and_then(|v| v.as_str()).unwrap_or("");
            if ty != "command" || !cmd.starts_with('&') || !cmd.contains("clawd-hook.js") || shell != "powershell" {
                return false;
            }
        }
    }
    true
}

/// 安装 hooks（幂等：已正确则 no-op）
pub fn install(app: &AppHandle) -> Result<(), String> {
    let mut settings = read_settings();
    let port = crate::modules::agent::server::AgentServer::global().get_port();
    if has_correct_hooks(&settings, port) {
        return Ok(());
    }
    remove_old_hooks(&mut settings);

    let node = detect_node();
    let script = hook_script_path(app);
    let script_str = script.to_string_lossy().to_string();
    let port = port.unwrap_or(crate::modules::agent::server::DEFAULT_PORT);

    let mut hooks_map = serde_json::Map::new();
    for event in HOOK_EVENTS {
        let hook = if event == "PermissionRequest" {
            json!({
                "type": "http",
                "url": format!("http://127.0.0.1:{port}/permission"),
                "timeout": HOOK_HTTP_TIMEOUT_S,
            })
        } else {
            json!({
                "type": "command",
                // powershell 调用形态：& "<node>" "<script>" <EventName>
                "command": format!("& \"{node}\" \"{script_str}\" {event}"),
                "shell": "powershell",
                "async": true,
                "timeout": 5,
            })
        };
        hooks_map.insert(
            event.to_string(),
            json!([{ "matcher": "", "hooks": [hook] }]),
        );
    }
    if let Some(obj) = settings.as_object_mut() {
        obj.insert("hooks".into(), Value::Object(hooks_map));
    }
    if write_settings(&settings) {
        Ok(())
    } else {
        Err("write settings failed".into())
    }
}

/// 卸载自家 hooks（按命令串 + url 双重识别，修正 TS 版漏删 http hook 的缺陷）
pub fn uninstall(_app: &AppHandle) -> Result<(), String> {
    let mut settings = read_settings();
    remove_old_hooks(&mut settings);
    if write_settings(&settings) {
        Ok(())
    } else {
        Err("write settings failed".into())
    }
}

/// 是否已安装（抽查 SessionStart 的命令串）
pub fn is_installed() -> bool {
    let settings = read_settings();
    let Some(groups) = settings.get("hooks").and_then(|h| h.get(HOOK_EVENTS[0])).and_then(|v| v.as_array()) else {
        return false;
    };
    groups
        .first()
        .and_then(|g| g.get("hooks"))
        .and_then(|h| h.as_array())
        .map(|arr| arr.iter().any(is_ours))
        .unwrap_or(false)
}

/// hook 健康检查（对齐 checkHealth）
pub fn check_health(app: &AppHandle) -> (bool, Vec<String>) {
    let mut issues = Vec::new();
    if read_settings().is_null() {
        issues.push("settings.json 不可读".into());
    }
    if !is_installed() {
        issues.push("hooks 未安装".into());
    }
    if !hook_script_path(app).exists() {
        issues.push("clawd-hook.js 不存在".into());
    }
    (issues.is_empty(), issues)
}

/// 5 分钟健康看护（首次立即检查）
pub fn start_watcher(app: AppHandle) {
    if HookManager::global().watcher_running.swap(true, Ordering::SeqCst) {
        return;
    }
    tauri::async_runtime::spawn(async move {
        loop {
            if !HookManager::global().watcher_running.load(Ordering::SeqCst) {
                break;
            }
            perform_health_check(&app);
            tokio::time::sleep(std::time::Duration::from_millis(WATCH_INTERVAL_MS)).await;
        }
    });
}

pub fn stop_watcher() {
    HookManager::global().watcher_running.store(false, Ordering::SeqCst);
}

fn perform_health_check(app: &AppHandle) {
    let hm = HookManager::global();
    let (healthy, issues) = check_health(app);
    if healthy {
        hm.repair_failures.store(0, Ordering::SeqCst);
        hm.manual_fix_required.store(false, Ordering::SeqCst);
        return;
    }
    log::warn!("hook health check failed: {issues:?}");
    if hm.manual_fix_required.load(Ordering::SeqCst) {
        return;
    }
    if hm.repair_failures.load(Ordering::SeqCst) >= MAX_REPAIR_RETRIES {
        hm.manual_fix_required.store(true, Ordering::SeqCst);
        log::error!("hook 修复失败 {MAX_REPAIR_RETRIES} 次，需手动处理");
        return;
    }
    if install(app).is_ok() {
        let (ok, _) = check_health(app);
        if ok {
            hm.repair_failures.store(0, Ordering::SeqCst);
        } else {
            hm.repair_failures.fetch_add(1, Ordering::SeqCst);
        }
    } else {
        hm.repair_failures.fetch_add(1, Ordering::SeqCst);
    }
}