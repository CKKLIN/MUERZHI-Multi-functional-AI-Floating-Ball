// AI 会话状态机 — 移植 electron/main/agent-state-machine.ts
// 状态优先级 error(4) > notification(3) > working(2) > thinking(1) > idle(0)；
// Stop 事件触发 2s done 闪烁；僵尸回收（idle 10min / 非 idle 5min 且 Claude 未运行）。

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

pub const SESSION_STALE_MS: u64 = 10 * 60 * 1000;
pub const WORKING_STALE_MS: u64 = 5 * 60 * 1000;
pub const DONE_DURATION_MS: u64 = 2000;
pub const TITLE_MAX_LEN: usize = 60;
const CLEANUP_INTERVAL_MS: u64 = 10_000;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentSession {
    pub session_id: String,
    pub agent_id: String,
    pub state: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_input: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub context_usage: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,
    pub updated_at: i64,
}

/// done 复位需要跨线程访问的共享状态（从 StateMachine 拆出，使复位任务能持有
/// **本实例**的状态而不是 global() —— isolated 单测才能真正验证复位行为）
#[derive(Clone)]
pub struct DoneResetHandles {
    pub sessions: Arc<Mutex<HashMap<String, AgentSession>>>,
    pub done_until: Arc<Mutex<Option<Instant>>>,
    pub done_epoch: Arc<Mutex<u64>>,
    pub current_global: Arc<Mutex<String>>,
}

pub struct StateMachine {
    sessions: Arc<Mutex<HashMap<String, AgentSession>>>,
    last_seen: Mutex<HashMap<String, Instant>>,
    /// done 闪烁到期时刻（None = 未激活）
    done_until: Arc<Mutex<Option<Instant>>>,
    /// done 复位计时器代号：任何新事件 +1，作废上一条 2s 复位计时
    done_epoch: Arc<Mutex<u64>>,
    current_global: Arc<Mutex<String>>,
    /// Claude 进程是否运行（P3 由 agent_bridge 注入；None = 未探测）
    claude_running: Mutex<Option<bool>>,
    cleanup_running: std::sync::atomic::AtomicBool,
}

impl StateMachine {
    /// 独立实例（仅供单测：共享 global() 会被并行用例相互污染）
    #[allow(dead_code)]
    pub fn new_isolated() -> StateMachine {
        StateMachine {
            sessions: Arc::new(Mutex::new(HashMap::new())),
            last_seen: Mutex::new(HashMap::new()),
            done_until: Arc::new(Mutex::new(None)),
            done_epoch: Arc::new(Mutex::new(0)),
            current_global: Arc::new(Mutex::new("idle".into())),
            claude_running: Mutex::new(None),
            cleanup_running: std::sync::atomic::AtomicBool::new(false),
        }
    }

    pub fn global() -> &'static StateMachine {
        use std::sync::OnceLock;
        static S: OnceLock<StateMachine> = OnceLock::new();
        S.get_or_init(|| StateMachine {
            sessions: Arc::new(Mutex::new(HashMap::new())),
            last_seen: Mutex::new(HashMap::new()),
            done_until: Arc::new(Mutex::new(None)),
            done_epoch: Arc::new(Mutex::new(0)),
            current_global: Arc::new(Mutex::new("idle".into())),
            claude_running: Mutex::new(None),
            cleanup_running: std::sync::atomic::AtomicBool::new(false),
        })
    }

    pub fn set_claude_running(&self, running: Option<bool>) {
        *self.claude_running.lock().unwrap() = running;
    }

    fn priority(state: &str) -> i32 {
        match state {
            "error" => 4,
            "notification" => 3,
            "working" => 2,
            "thinking" => 1,
            _ => 0,
        }
    }

    /// 归一化标题（对齐 normalizeTitle）：折叠空白 + trim + 空→None + 60 字符截断
    pub fn normalize_title(s: Option<&str>) -> Option<String> {
        let raw = s?;
        let collapsed = raw.split_whitespace().collect::<Vec<_>>().join(" ");
        if collapsed.is_empty() {
            return None;
        }
        if collapsed.chars().count() > TITLE_MAX_LEN {
            let head: String = collapsed.chars().take(TITLE_MAX_LEN - 1).collect();
            Some(format!("{head}…"))
        } else {
            Some(collapsed)
        }
    }

    /// 更新会话（对齐 updateSession）：先清 doneTimer，再合并字段；Stop 事件启动 2s 闪烁
    pub fn update_session(&self, session_id: &str, state: &str, event: &str, opts: SessionOpts) {
        if session_id.is_empty() {
            return;
        }
        // 任何新事件都结束 done 闪烁，并作废上一条 2s 复位计时（防旧计时器把已在工作的
        // 会话改回 idle）。Stop 事件会在末尾重新起一条。
        *self.done_until.lock().unwrap() = None;
        *self.done_epoch.lock().unwrap() += 1;

        let now = crate::modules::todo::store::now_ms();
        {
            let mut sessions = self.sessions.lock().unwrap();
            let existing = sessions.get(session_id).cloned();
            if existing.as_ref().map(|e| e.state.as_str()) != Some(state) {
                log::info!(
                    "[StateMachine] session={}（{}）: {} → {}（event={event}）",
                    crate::modules::agent::server::short_id(session_id),
                    existing
                        .as_ref()
                        .and_then(|e| e.title.clone())
                        .unwrap_or_else(|| "无标题".into()),
                    existing.as_ref().map(|e| e.state.as_str()).unwrap_or("new"),
                    state,
                );
            }
            let session = AgentSession {
                session_id: session_id.to_string(),
                agent_id: opts
                    .agent_id
                    .clone()
                    .or_else(|| existing.as_ref().map(|e| e.agent_id.clone()))
                    .unwrap_or_else(|| "claude-code".into()),
                state: state.to_string(),
                // 标题先到先得（不覆盖已有）
                title: existing
                    .as_ref()
                    .and_then(|e| e.title.clone())
                    .or_else(|| Self::normalize_title(opts.prompt.as_deref())),
                tool_name: opts
                    .tool_name
                    .clone()
                    .or_else(|| existing.as_ref().and_then(|e| e.tool_name.clone())),
                tool_input: opts
                    .tool_input
                    .clone()
                    .or_else(|| existing.as_ref().and_then(|e| e.tool_input.clone())),
                context_usage: opts
                    .context_usage
                    .clone()
                    .or_else(|| existing.as_ref().and_then(|e| e.context_usage.clone())),
                model: opts
                    .model
                    .clone()
                    .or_else(|| existing.as_ref().and_then(|e| e.model.clone())),
                updated_at: now,
            };
            sessions.insert(session_id.to_string(), session);
        }
        self.last_seen
            .lock()
            .unwrap()
            .insert(session_id.to_string(), Instant::now());

        if state == "idle" && event == "Stop" {
            *self.done_until.lock().unwrap() =
                Some(Instant::now() + Duration::from_millis(DONE_DURATION_MS));
            // 到期主动复位并广播：TS 版 doneTimer 回调里把会话置回 idle 再 notify()，
            // Rust 早先只让 resolve_display_state「查询时」判断 done_until，没有任何
            // 东西在到期时推送 → 岛闪一下「完成」就永远停在 done 态（最多 10min 后
            // 被僵尸清理循环顺手清掉才恢复 idle）。
            self.arm_done_reset(session_id.to_string());
        }
        self.notify();
    }

    /// 2s 后把该会话复位回 idle 并广播（对齐 TS doneTimer 回调）
    ///
    /// epoch 式失效：任何新事件（update_session 入口会把 done_until 清空、epoch +1）
    /// 都会作废本次计时——会话已回到工作中，不该再被旧计时器改回 idle。
    fn arm_done_reset(&self, session_id: String) {
        self.arm_done_reset_after(session_id, Duration::from_millis(DONE_DURATION_MS));
    }

    /// 与 arm_done_reset 同逻辑，延时可注入（单测用毫秒级跑完整复位路径）
    fn arm_done_reset_after(&self, session_id: String, delay: Duration) {
        // 捕获当前代号：update_session 入口已 +1 过（作废更早的计时），这里不再自增
        let h = self.done_handles();
        let epoch = *h.done_epoch.lock().unwrap();
        tauri::async_runtime::spawn(async move {
            tokio::time::sleep(delay).await;
            if *h.done_epoch.lock().unwrap() != epoch {
                return;
            }
            *h.done_until.lock().unwrap() = None;
            // 会话已被新事件接管（state 已非 idle）或已被清理 → 不复位、只清闪烁
            let should_reset = h
                .sessions
                .lock()
                .unwrap()
                .get(&session_id)
                .map(|s| s.state == "idle")
                .unwrap_or(false);
            if should_reset {
                if let Some(s) = h.sessions.lock().unwrap().get_mut(&session_id) {
                    s.updated_at = crate::modules::todo::store::now_ms();
                }
            }
            notify_via(&h);
        });
    }

    fn done_handles(&self) -> DoneResetHandles {
        DoneResetHandles {
            sessions: self.sessions.clone(),
            done_until: self.done_until.clone(),
            done_epoch: self.done_epoch.clone(),
            current_global: self.current_global.clone(),
        }
    }

    /// 展示态：所有会话优先级最高者；done 闪烁期间且最优为 idle 时返回 done
    pub fn resolve_display_state(&self) -> String {
        resolve_display_via(&self.sessions, &self.done_until)
    }

    pub fn sessions_snapshot(&self) -> Vec<AgentSession> {
        let sessions = self.sessions.lock().unwrap();
        let mut v: Vec<AgentSession> = sessions.values().cloned().collect();
        v.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));
        v
    }

    /// 清空某会话（会话结束）
    /// 会话标题来源优先级：Claude 官方 name 覆盖状态机 prompt 派生标题（对齐 agent-bridge）
    pub fn apply_claude_title(&self, session_id: &str) {
        if let Some(name) =
            crate::modules::agent::session_title::TitleCache::global().get(session_id)
        {
            let mut sessions = self.sessions.lock().unwrap();
            if let Some(s) = sessions.get_mut(session_id) {
                if s.title.as_deref() != Some(name.as_str()) {
                    s.title = Some(name);
                    drop(sessions);
                    self.notify();
                }
            }
        }
    }

    #[allow(dead_code)]
    pub fn remove_session(&self, session_id: &str) {
        self.sessions.lock().unwrap().remove(session_id);
        self.last_seen.lock().unwrap().remove(session_id);
        self.notify();
    }

    /// 广播状态变化到 AI 岛（渲染层经 listen('agent-state-update') 接收）
    fn notify(&self) {
        notify_via(&self.done_handles());
    }

    /// 启动僵尸回收循环（10s）
    pub fn start_cleanup(&self) {
        use std::sync::atomic::Ordering;
        if self.cleanup_running.swap(true, Ordering::SeqCst) {
            return;
        }
        tauri::async_runtime::spawn(async move {
            loop {
                tokio::time::sleep(Duration::from_millis(CLEANUP_INTERVAL_MS)).await;
                if !StateMachine::global()
                    .cleanup_running
                    .load(Ordering::SeqCst)
                {
                    break;
                }
                StateMachine::global().clean_stale_sessions();
            }
        });
    }

    pub fn stop_cleanup(&self) {
        self.cleanup_running
            .store(false, std::sync::atomic::Ordering::SeqCst);
        *self.done_until.lock().unwrap() = None;
    }

    /// 僵尸回收（对齐 cleanStaleSessions）
    ///
    /// 非 idle 会话只按 **last_seen（hook 事件活跃度）** 降级：hook 只有活着的 Claude
    /// 进程才会发，「最近还在发事件」本身就是存活的强信号，而进程探测并不可靠 ——
    /// probe_claude_process 只认 claude.exe，npm 安装的 CLI 是 node.exe（tasklist /V
    /// 拿不到它的命令行），探测恒 false。早先 `claude == Some(false) && age > 5min`
    /// 就降级，于是「正在长思考」（单个命令跑 >5min 无事件）的会话被误降级、岛提前熄灭。
    ///
    /// 现在 claude_running 仅作**加速回收**的旁证：明确探测到进程不在时把阈值减半
    /// （5min → 2.5min），探测不可信/未知时用标准 5min。
    pub fn clean_stale_sessions(&self) {
        let now = Instant::now();
        let claude = *self.claude_running.lock().unwrap();
        // 确认进程已退出 → 阈值减半尽快收尾；否则用标准阈值
        let working_limit = if claude == Some(false) {
            WORKING_STALE_MS / 2
        } else {
            WORKING_STALE_MS
        };
        let mut to_remove = Vec::new();
        let mut to_idle = Vec::new();
        {
            let sessions = self.sessions.lock().unwrap();
            let last_seen = self.last_seen.lock().unwrap();
            for (id, s) in sessions.iter() {
                let age = last_seen
                    .get(id)
                    .map(|t| now.duration_since(*t).as_millis() as u64)
                    .unwrap_or(0);
                if s.state == "idle" {
                    if age > SESSION_STALE_MS {
                        to_remove.push(id.clone());
                    }
                } else if age > working_limit {
                    to_idle.push(id.clone());
                }
            }
        }
        let had_changes = !to_idle.is_empty() || !to_remove.is_empty();
        if had_changes {
            log::info!(
                "[StateMachine] 僵尸回收：降级 {} 个（超时未活动），移除 {} 个",
                to_idle.len(),
                to_remove.len()
            );
        }
        for id in to_idle {
            if let Some(s) = self.sessions.lock().unwrap().get_mut(&id) {
                s.state = "idle".into();
                s.updated_at = crate::modules::todo::store::now_ms();
            }
        }
        for id in to_remove {
            self.sessions.lock().unwrap().remove(&id);
            self.last_seen.lock().unwrap().remove(&id);
        }
        if had_changes {
            self.notify();
        }
    }
}

/// 展示态（基于共享状态，供 2s 复位任务脱离 &self 调用）
fn resolve_display_via(
    sessions: &Mutex<HashMap<String, AgentSession>>,
    done_until: &Mutex<Option<Instant>>,
) -> String {
    let sessions = sessions.lock().unwrap();
    let mut best = "idle".to_string();
    let mut best_p = 0;
    for s in sessions.values() {
        let p = StateMachine::priority(&s.state);
        if p > best_p {
            best_p = p;
            best = s.state.clone();
        }
    }
    let done_active = done_until
        .lock()
        .unwrap()
        .map(|t| Instant::now() < t)
        .unwrap_or(false);
    if done_active && best == "idle" {
        return "done".into();
    }
    best
}

/// 广播状态（基于共享状态，供 2s 复位任务脱离 &self 调用）
fn notify_via(h: &DoneResetHandles) {
    let display = resolve_display_via(&h.sessions, &h.done_until);
    {
        let mut cur = h.current_global.lock().unwrap();
        if *cur != display {
            *cur = display.clone();
        }
    }
    let sessions = h.sessions.lock().unwrap();
    let mut snapshot: Vec<AgentSession> = sessions.values().cloned().collect();
    drop(sessions);
    snapshot.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));
    crate::modules::agent::bridge::broadcast_state(serde_json::json!({
        "state": display,
        "sessions": snapshot,
    }));
}

#[derive(Default, Clone)]
pub struct SessionOpts {
    pub agent_id: Option<String>,
    pub tool_name: Option<String>,
    pub tool_input: Option<serde_json::Value>,
    pub context_usage: Option<serde_json::Value>,
    pub model: Option<String>,
    pub prompt: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn title_normalization() {
        assert_eq!(StateMachine::normalize_title(None), None);
        assert_eq!(StateMachine::normalize_title(Some("  ")), None);
        assert_eq!(
            StateMachine::normalize_title(Some("a   b")),
            Some("a b".into())
        );
        let long = "x".repeat(80);
        let t = StateMachine::normalize_title(Some(&long)).unwrap();
        assert_eq!(t.chars().count(), 60);
        assert!(t.ends_with('…'));
    }

    #[test]
    fn priority_ordering() {
        assert!(StateMachine::priority("error") > StateMachine::priority("notification"));
        assert!(StateMachine::priority("notification") > StateMachine::priority("working"));
        assert!(StateMachine::priority("working") > StateMachine::priority("thinking"));
        assert!(StateMachine::priority("thinking") > StateMachine::priority("idle"));
    }

    fn isolated() -> StateMachine {
        StateMachine::new_isolated()
    }

    #[test]
    fn display_state_picks_highest_priority_session() {
        let sm = isolated();
        sm.update_session("s1", "thinking", "UserPromptSubmit", SessionOpts::default());
        sm.update_session("s2", "working", "PreToolUse", SessionOpts::default());
        assert_eq!(sm.resolve_display_state(), "working");
        sm.update_session("s2", "idle", "PostToolUse", SessionOpts::default());
        assert_eq!(sm.resolve_display_state(), "thinking");
    }

    #[test]
    fn stop_triggers_done_flash_only_when_all_idle() {
        let sm = isolated();
        sm.update_session("s1", "idle", "Stop", SessionOpts::default());
        assert_eq!(
            sm.resolve_display_state(),
            "done",
            "唯一会话 idle + Stop → done 闪烁"
        );
        // 另一会话工作中：done 不显示
        sm.update_session("s2", "working", "PreToolUse", SessionOpts::default());
        assert_eq!(sm.resolve_display_state(), "working");
    }

    #[test]
    fn done_reset_reverts_to_idle_after_flash() {
        let sm = isolated();
        sm.update_session("s1", "idle", "Stop", SessionOpts::default());
        assert_eq!(sm.resolve_display_state(), "done");
        // 30ms 复位（生产是 2s）——验证到期真的把 done 撤掉，而不是停在 done
        sm.arm_done_reset_after("s1".into(), Duration::from_millis(30));
        std::thread::sleep(Duration::from_millis(150));
        assert_eq!(
            sm.resolve_display_state(),
            "idle",
            "闪烁到期后应回落 idle"
        );
    }

    #[test]
    fn new_event_cancels_pending_done_reset() {
        let sm = isolated();
        sm.update_session("s1", "idle", "Stop", SessionOpts::default());
        sm.arm_done_reset_after("s1".into(), Duration::from_millis(30));
        // 期间会话重新工作：旧计时器必须作废，不能把 working 改回 idle
        sm.update_session("s1", "working", "PreToolUse", SessionOpts::default());
        std::thread::sleep(Duration::from_millis(150));
        assert_eq!(
            sm.resolve_display_state(),
            "working",
            "新事件应作废旧 done 复位计时"
        );
    }
}

/// 简易唯一 id（时间戳 + 随机盐十六进制），供转换注册表等非持久场景使用
#[allow(dead_code)]
pub fn new_uuid_like() -> String {
    use std::sync::atomic::{AtomicU64, Ordering};
    static SEQ: AtomicU64 = AtomicU64::new(0);
    let n = SEQ.fetch_add(1, Ordering::SeqCst);
    let ms = crate::modules::todo::store::now_ms() as u64;
    let salt = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.subsec_nanos() as u64)
        .unwrap_or(0);
    format!("{:x}-{:x}-{:x}", ms, n, salt)
}
