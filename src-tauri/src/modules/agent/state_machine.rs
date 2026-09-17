// AI 会话状态机 — 移植 electron/main/agent-state-machine.ts
// 状态优先级 error(4) > notification(3) > working(2) > thinking(1) > idle(0)；
// Stop 事件触发 2s done 闪烁；僵尸回收（idle 10min / 非 idle 5min 且 Claude 未运行）。

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Mutex;
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

pub struct StateMachine {
    sessions: Mutex<HashMap<String, AgentSession>>,
    last_seen: Mutex<HashMap<String, Instant>>,
    /// done 闪烁到期时刻（None = 未激活）
    done_until: Mutex<Option<Instant>>,
    current_global: Mutex<String>,
    /// Claude 进程是否运行（P3 由 agent_bridge 注入；None = 未探测）
    claude_running: Mutex<Option<bool>>,
    cleanup_running: std::sync::atomic::AtomicBool,
}

impl StateMachine {
    /// 独立实例（仅供单测：共享 global() 会被并行用例相互污染）
    #[allow(dead_code)]
    pub fn new_isolated() -> StateMachine {
        StateMachine {
            sessions: Mutex::new(HashMap::new()),
            last_seen: Mutex::new(HashMap::new()),
            done_until: Mutex::new(None),
            current_global: Mutex::new("idle".into()),
            claude_running: Mutex::new(None),
            cleanup_running: std::sync::atomic::AtomicBool::new(false),
        }
    }

    pub fn global() -> &'static StateMachine {
        use std::sync::OnceLock;
        static S: OnceLock<StateMachine> = std::sync::OnceLock::new();
        S.get_or_init(|| StateMachine {
            sessions: Mutex::new(HashMap::new()),
            last_seen: Mutex::new(HashMap::new()),
            done_until: Mutex::new(None),
            current_global: Mutex::new("idle".into()),
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
    pub fn update_session(
        &self,
        session_id: &str,
        state: &str,
        event: &str,
        opts: SessionOpts,
    ) {
        if session_id.is_empty() {
            return;
        }
        // 任何新事件都结束 done 闪烁
        *self.done_until.lock().unwrap() = None;

        let now = crate::modules::todo::store::now_ms();
        {
            let mut sessions = self.sessions.lock().unwrap();
            let existing = sessions.get(session_id).cloned();
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
        self.last_seen.lock().unwrap().insert(session_id.to_string(), Instant::now());

        if state == "idle" && event == "Stop" {
            *self.done_until.lock().unwrap() = Some(Instant::now() + Duration::from_millis(DONE_DURATION_MS));
        }
        self.notify();
    }

    /// 展示态：所有会话优先级最高者；done 闪烁期间且最优为 idle 时返回 done
    pub fn resolve_display_state(&self) -> String {
        let sessions = self.sessions.lock().unwrap();
        let mut best = "idle".to_string();
        let mut best_p = 0;
        for s in sessions.values() {
            let p = Self::priority(&s.state);
            if p > best_p {
                best_p = p;
                best = s.state.clone();
            }
        }
        let done_active = self
            .done_until
            .lock()
            .unwrap()
            .map(|t| Instant::now() < t)
            .unwrap_or(false);
        if done_active && best == "idle" {
            return "done".into();
        }
        best
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
        if let Some(name) = crate::modules::agent::session_title::TitleCache::global().get(session_id) {
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
        let display = self.resolve_display_state();
        let mut cur = self.current_global.lock().unwrap();
        if *cur != display {
            *cur = display.clone();
        }
        drop(cur);
        let payload = serde_json::json!({
            "state": display,
            "sessions": self.sessions_snapshot(),
        });
        crate::modules::agent::bridge::broadcast_state(payload);
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
                if !StateMachine::global().cleanup_running.load(Ordering::SeqCst) {
                    break;
                }
                StateMachine::global().clean_stale_sessions();
            }
        });
    }

    pub fn stop_cleanup(&self) {
        self.cleanup_running.store(false, std::sync::atomic::Ordering::SeqCst);
        *self.done_until.lock().unwrap() = None;
    }

    /// 僵尸回收（对齐 cleanStaleSessions）
    pub fn clean_stale_sessions(&self) {
        let now = Instant::now();
        let claude = *self.claude_running.lock().unwrap();
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
                } else if claude == Some(false) && age > WORKING_STALE_MS {
                    to_idle.push(id.clone());
                } else if claude.is_none() && age > WORKING_STALE_MS {
                    to_idle.push(id.clone());
                }
                // claude == Some(true) → 长思考保护，绝不降级
            }
        }
        let had_changes = !to_idle.is_empty() || !to_remove.is_empty();
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
        assert_eq!(StateMachine::normalize_title(Some("a   b")), Some("a b".into()));
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
        assert_eq!(sm.resolve_display_state(), "done", "唯一会话 idle + Stop → done 闪烁");
        // 另一会话工作中：done 不显示
        sm.update_session("s2", "working", "PreToolUse", SessionOpts::default());
        assert_eq!(sm.resolve_display_state(), "working");
    }
}
