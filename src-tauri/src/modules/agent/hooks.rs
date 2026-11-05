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

/// clawd-hook.js 路径：打包走 resources（tauri.conf.json 映射到 exe 旁），dev 走仓库 src-tauri/resources
pub fn hook_script_path(app: &AppHandle) -> PathBuf {
    if let Ok(res) = app.path().resource_dir() {
        let p = res.join("clawd-hook.js");
        if p.exists() {
            return p;
        }
    }
    // dev：src-tauri/target/debug → 上四级 = 项目根（electron/ 目录已删除，真实文件在 src-tauri/resources）
    if let Ok(exe) = std::env::current_exe() {
        if let Some(root) = exe.ancestors().nth(4) {
            let p = root.join("src-tauri").join("resources").join("clawd-hook.js");
            if p.exists() {
                return p;
            }
        }
    }
    PathBuf::from("clawd-hook.js")
}

/// 去掉 Windows 扩展长度前缀（`\\?\D:\...` / `\\?\UNC\server\share`）。
///
/// 为什么必须去：`resource_dir()` 在 dev 态返回的路径带 `\\?\` 前缀，直接写进
/// settings.json 的 hook 命令后**脚本根本执行不了** —— node 自己也不认 `\\?\`
/// 开头的入口文件：`node "\\?\D:\...\clawd-hook.js"` 报 EISDIR / lstat 'D:'，
/// 命令行经 shell 转义后则报 Cannot find module。实测表现为「hooks 安装成功、
/// hook.log 从没生成过、日志里 0 条 /state 上报、悬浮岛永远是空闲」。
fn win_api_path(p: &std::path::Path) -> String {
    let s = p.to_string_lossy().to_string();
    if let Some(rest) = s.strip_prefix(r"\\?\UNC\") {
        return format!(r"\\{rest}");
    }
    if let Some(rest) = s.strip_prefix(r"\\?\") {
        return rest.to_string();
    }
    s
}

/// 探测 node 可执行文件（where node）
fn detect_node() -> String {
    use std::process::Command;
    let mut cmd = Command::new("where");
    cmd.arg("node");
    // 修复/安装集成时探测，控制台子进程不隐藏会闪窗
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x0800_0000);
    }
    if let Ok(out) = cmd.output() {
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
    let Some(hooks) = settings.get_mut("hooks") else {
        return;
    };
    let Some(map) = hooks.as_object_mut() else {
        return;
    };
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
///
/// 遍历事件下**所有** group/hook（TS 用 .some），自家 hook 不是第一个时同样算已安装。
fn has_correct_hooks(settings: &Value, port: Option<u16>) -> bool {
    let Some(hooks) = settings.get("hooks").and_then(|v| v.as_object()) else {
        return false;
    };
    for event in HOOK_EVENTS {
        let Some(groups) = hooks.get(event).and_then(|v| v.as_array()) else {
            return false;
        };
        let ok = groups.iter().any(|g| {
            let Some(list) = g.get("hooks").and_then(|v| v.as_array()) else {
                return false;
            };
            list.iter().any(|hook| {
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
                    true
                } else {
                    let ty = hook.get("type").and_then(|v| v.as_str()).unwrap_or("");
                    let cmd = hook.get("command").and_then(|v| v.as_str()).unwrap_or("");
                    let shell = hook.get("shell").and_then(|v| v.as_str()).unwrap_or("");
                    ty == "command"
                        && cmd.starts_with('&')
                        && cmd.contains("clawd-hook.js")
                        && shell == "powershell"
                        // 旧版把 resource_dir 的 `\\?\` 扩展长度前缀原样写进了命令
                        // （node 无法加载该路径 → hook 全静默失败）。带前缀的命令必须
                        // 判为「未正确安装」，否则 has_correct_hooks 通过、install 直接
                        // 早退，坏配置永远修不掉（老用户升级后依旧不工作）
                        && !cmd.contains(r"\\?\")
                }
            })
        });
        if !ok {
            return false;
        }
    }
    true
}

/// 安装 hooks（幂等：已正确则 no-op）
///
/// 端口必须来自**实际监听**的 server：端口漂移（60000 被占时服务顺延到 60001+）后，
/// 用 DEFAULT_PORT 兜底写出的 URL 是死的 —— Claude 每次审批都会 ECONNREFUSED。
/// server 未就绪时返回错误，由调用方（bridge::start / health 看护）稍后重试。
pub fn install(app: &AppHandle) -> Result<(), String> {
    let mut settings = read_settings();
    let port = crate::modules::agent::server::AgentServer::global()
        .get_port()
        .ok_or_else(|| "agent server 未监听，hooks 暂不安装（等就绪后重试）".to_string())?;
    if has_correct_hooks(&settings, Some(port)) {
        return Ok(());
    }
    remove_old_hooks(&mut settings);

    let node = detect_node();
    let script = hook_script_path(app);
    // 必须去 `\\?\` 前缀：带前缀的路径写进 hook 命令后 node 无法加载脚本，
    // 全部 12 个事件静默失败（见 win_api_path 注释）
    let script_str = win_api_path(&script).replace('\\', "/");

    // 逐事件键**追加**自家 group，不覆盖整个 hooks 表、也不覆盖同事件的用户 hook：
    // 早先 obj.insert("hooks", hooks_map) 会把用户在 SubagentStop/PreCompact 等未受管
    // 事件上配的 hook 全部抹掉（实测）；改成 insert(event,...) 也仍会清掉用户自己配在
    // PreToolUse 等受管同名事件上的 hook。remove_old_hooks 已先摘掉自家旧 group，
    // 剩下的都是用户的 —— 追加在末尾即可共存。
    let root = settings
        .as_object_mut()
        .ok_or_else(|| "claude settings 根节点不是对象".to_string())?;
    let hooks_entry = root
        .entry("hooks")
        .or_insert_with(|| Value::Object(serde_json::Map::new()));
    let Some(hooks_map) = hooks_entry.as_object_mut() else {
        return Err("claude settings.hooks 不是对象".into());
    };
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
        let group = json!({ "matcher": "", "hooks": [hook] });
        match hooks_map.get_mut(event) {
            Some(existing) => {
                if let Some(arr) = existing.as_array_mut() {
                    arr.push(group);
                } else {
                    // 形态异常（用户把该事件写成了非数组）：不冒险覆盖，退回整体替换
                    hooks_map.insert(event.to_string(), json!([group]));
                }
            }
            None => {
                hooks_map.insert(event.to_string(), json!([group]));
            }
        }
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
///
/// 遍历**所有** group：install 改成「追加自家 group 到末尾」后，用户自己配的 hook
/// 可能排在第一组，只查 groups.first() 会把已安装误报成未安装（进而触发无谓重装，
/// 重装又会再追加一组）。
pub fn is_installed() -> bool {
    is_installed_in(&read_settings())
}

// ===== Antigravity (Google DeepMind) Hooks 管理 =====

pub fn antigravity_config_dir() -> PathBuf {
    home_dir().join(".gemini").join("config")
}

pub fn antigravity_hooks_path() -> PathBuf {
    antigravity_config_dir().join("hooks.json")
}

pub fn antigravity_hook_script_path(app: &AppHandle) -> PathBuf {
    if let Ok(res) = app.path().resource_dir() {
        let p = res.join("antigravity-hook.js");
        if p.exists() {
            return p;
        }
    }
    if let Ok(exe) = std::env::current_exe() {
        if let Some(root) = exe.ancestors().nth(4) {
            let p = root.join("src-tauri").join("resources").join("antigravity-hook.js");
            if p.exists() {
                return p;
            }
        }
    }
    PathBuf::from("antigravity-hook.js")
}

pub fn is_antigravity_env_present() -> bool {
    antigravity_config_dir().exists() || home_dir().join(".gemini").exists()
}

pub fn is_antigravity_installed() -> bool {
    let path = antigravity_hooks_path();
    let Ok(text) = std::fs::read_to_string(&path) else {
        return false;
    };
    let Ok(v): Result<Value, _> = serde_json::from_str(&text) else {
        return false;
    };
    v.get("muerzhi-agent")
        .and_then(|h| h.get("enabled"))
        .and_then(|e| e.as_bool())
        .unwrap_or_else(|| v.get("muerzhi-agent").is_some())
}

pub fn install_antigravity(app: &AppHandle) -> Result<(), String> {
    let path = antigravity_hooks_path();
    let mut config: Value = match std::fs::read_to_string(&path) {
        Ok(text) => serde_json::from_str(&text).unwrap_or_else(|_| json!({})),
        Err(_) => json!({}),
    };
    let script = antigravity_hook_script_path(app);
    let script_str = win_api_path(&script).replace('\\', "/");
    let cmd_path = if script_str.contains(' ') {
        format!("\"{script_str}\"")
    } else {
        script_str
    };

    let hook_entry = json!({
        "enabled": true,
        "SessionStart": [
            {
                "type": "command",
                "command": format!("node {cmd_path} SessionStart"),
                "timeout": 10
            }
        ],
        "PreInvocation": [
            {
                "type": "command",
                "command": format!("node {cmd_path} PreInvocation"),
                "timeout": 10
            }
        ],
        "PreToolUse": [
            {
                "matcher": "*",
                "hooks": [
                    {
                        "type": "command",
                        "command": format!("node {cmd_path} PreToolUse"),
                        "timeout": 1860
                    }
                ]
            }
        ],
        "PostToolUse": [
            {
                "matcher": "*",
                "hooks": [
                    {
                        "type": "command",
                        "command": format!("node {cmd_path} PostToolUse"),
                        "timeout": 10
                    }
                ]
            }
        ],
        "PostInvocation": [
            {
                "type": "command",
                "command": format!("node {cmd_path} PostInvocation"),
                "timeout": 10
            }
        ],
        "Stop": [
            {
                "type": "command",
                "command": format!("node {cmd_path} Stop"),
                "timeout": 10
            }
        ]
    });

    if let Some(obj) = config.as_object_mut() {
        obj.insert("muerzhi-agent".to_string(), hook_entry);
    } else {
        let mut map = serde_json::Map::new();
        map.insert("muerzhi-agent".to_string(), hook_entry);
        config = Value::Object(map);
    }

    if let Some(parent) = path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    let text = serde_json::to_string_pretty(&config)
        .map_err(|e| format!("serialize hooks.json failed: {e}"))?;
    std::fs::write(&path, text)
        .map_err(|e| format!("write hooks.json failed: {e}"))?;
    log::info!("Antigravity hooks installed to {}", path.display());
    Ok(())
}

pub fn uninstall_antigravity() -> Result<(), String> {
    let path = antigravity_hooks_path();
    let Ok(text) = std::fs::read_to_string(&path) else {
        return Ok(());
    };
    let mut config: Value = serde_json::from_str(&text)
        .map_err(|e| format!("parse hooks.json failed: {e}"))?;
    if let Some(obj) = config.as_object_mut() {
        obj.remove("muerzhi-agent");
    }
    let text = serde_json::to_string_pretty(&config)
        .map_err(|e| format!("serialize hooks.json failed: {e}"))?;
    std::fs::write(&path, text)
        .map_err(|e| format!("write hooks.json failed: {e}"))?;
    log::info!("Antigravity hooks uninstalled from {}", path.display());
    Ok(())
}

/// is_installed 的已加载版本（check_health 复用同一份 settings，不再重复读盘）
fn is_installed_in(settings: &Value) -> bool {
    let Some(groups) = settings
        .get("hooks")
        .and_then(|h| h.get(HOOK_EVENTS[0]))
        .and_then(|v| v.as_array())
    else {
        return false;
    };
    groups.iter().any(|g| {
        g.get("hooks")
            .and_then(|h| h.as_array())
            .map(|arr| arr.iter().any(is_ours))
            .unwrap_or(false)
    })
}

/// hook 健康检查（对齐 checkHealth）
///
/// 端口一致性纳入检查：settings 里的 URL 必须与 server **实际监听**的端口一致 ——
/// 端口漂移后旧 URL 指向死端口，Claude 每次审批 ECONNREFUSED，但形态校验全过（实测）。
/// server 未监听时不判端口问题（bridge 启动竞态），交给下次看护周期。
pub fn check_health(app: &AppHandle) -> (bool, Vec<String>) {
    // 单次健康检查只读一遍 settings.json（原实现 read_settings×2 + is_installed 里再一次）
    let settings = read_settings();
    let mut issues = Vec::new();
    if settings.is_null() {
        issues.push("settings.json 不可读".into());
    }
    let port = crate::modules::agent::server::AgentServer::global().get_port();
    // has_correct_hooks 已覆盖「未安装」+「URL 端口与 server 实际监听不符」两类
    if port.is_some() && !has_correct_hooks(&settings, port) {
        issues.push(format!(
            "hooks 与 server 实际端口不一致（server={port:?}，需重装）"
        ));
    }
    if !is_installed_in(&settings) {
        issues.push("hooks 未安装".into());
    }
    if !hook_script_path(app).exists() {
        issues.push("clawd-hook.js 不存在".into());
    }
    (issues.is_empty(), issues)
}

/// 5 分钟健康看护（首次立即检查）
pub fn start_watcher(app: AppHandle) {
    if HookManager::global()
        .watcher_running
        .swap(true, Ordering::SeqCst)
    {
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
    HookManager::global()
        .watcher_running
        .store(false, Ordering::SeqCst);
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

#[cfg(test)]
mod tests {
    use super::*;

    /// 扩展长度前缀必须剥掉：node 不认 `\\?\` 开头的入口文件，原样写进 hook
    /// 命令会让 12 个事件全部静默失败（AI 助手完全不工作）。
    #[test]
    fn win_api_path_strips_extended_prefix() {
        let p = std::path::Path::new(r"\\?\D:\app\src-tauri\target\debug\clawd-hook.js");
        assert_eq!(win_api_path(p), r"D:\app\src-tauri\target\debug\clawd-hook.js");
        // UNC 形态还原成 \\server\share\...
        let u = std::path::Path::new(r"\\?\UNC\server\share\clawd-hook.js");
        assert_eq!(win_api_path(u), r"\\server\share\clawd-hook.js");
        // 普通路径原样返回
        let n = std::path::Path::new(r"C:\app\resources\clawd-hook.js");
        assert_eq!(win_api_path(n), r"C:\app\resources\clawd-hook.js");
    }

    /// 带 `\\?\` 的旧配置必须判为「未正确安装」——否则 has_correct_hooks 通过、
    /// install 早退，坏路径永远修不掉。
    #[test]
    fn has_correct_hooks_rejects_extended_prefix_command() {
        let build = |script: &str| {
            let mut hooks = serde_json::Map::new();
            for event in HOOK_EVENTS {
                let hook = if event == "PermissionRequest" {
                    json!({
                        "type": "http",
                        "url": "http://127.0.0.1:60000/permission",
                        "timeout": HOOK_HTTP_TIMEOUT_S,
                    })
                } else {
                    json!({
                        "type": "command",
                        "command": format!("& \"node.exe\" \"{script}\" {event}"),
                        "shell": "powershell",
                    })
                };
                hooks.insert(event.to_string(), json!([{ "matcher": "", "hooks": [hook] }]));
            }
            json!({ "hooks": hooks })
        };

        assert!(
            !has_correct_hooks(&build(r"\\?\D:\app\clawd-hook.js"), Some(60000)),
            "旧版写入的扩展长度前缀必须被识别为待修复"
        );
        assert!(has_correct_hooks(&build(r"D:\app\clawd-hook.js"), Some(60000)));
        // 端口漂移同样要判为待修复（原有行为，防回归）
        assert!(!has_correct_hooks(&build(r"D:\app\clawd-hook.js"), Some(60001)));
    }
    #[test]
    fn antigravity_hooks_path_in_gemini_config() {
        let p = antigravity_hooks_path();
        assert!(p.to_string_lossy().contains(".gemini"));
        assert!(p.to_string_lossy().ends_with("hooks.json"));
    }

    #[test]
    fn antigravity_env_detected() {
        assert!(is_antigravity_env_present());
    }
}
