// Claude 会话标题读取 — 移植 electron/main/session-title.ts
// 读 ~/.claude/sessions/*.json（{sessionId, name, nameSource, startedAt}），
// 同 sessionId 多份时优先「真实标题」（nameSource != 'derived'），其次 startedAt 较新；5s 缓存。

use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Mutex;
use std::time::{Duration, Instant};

const SCAN_TTL_MS: u64 = 5_000;

#[derive(Debug, Clone)]
pub struct ClaudeSessionTitle {
    pub name: String,
    pub name_source: Option<String>,
    pub started_at: i64,
}

pub struct TitleCache {
    cache: Mutex<Option<(HashMap<String, ClaudeSessionTitle>, Instant)>>,
}

impl TitleCache {
    pub fn global() -> &'static TitleCache {
        use std::sync::OnceLock;
        static S: OnceLock<TitleCache> = OnceLock::new();
        S.get_or_init(|| TitleCache {
            cache: Mutex::new(None),
        })
    }

    fn sessions_dir() -> PathBuf {
        let home = std::env::var("USERPROFILE")
            .or_else(|_| std::env::var("HOME"))
            .unwrap_or_else(|_| ".".into());
        PathBuf::from(home).join(".claude").join("sessions")
    }

    fn scan(&self) -> HashMap<String, ClaudeSessionTitle> {
        let mut map: HashMap<String, ClaudeSessionTitle> = HashMap::new();
        let dir = Self::sessions_dir();
        let Ok(entries) = std::fs::read_dir(&dir) else {
            return map;
        };
        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().and_then(|e| e.to_str()) != Some("json") {
                continue;
            }
            let Ok(text) = std::fs::read_to_string(&path) else {
                continue;
            };
            let Ok(v) = serde_json::from_str::<serde_json::Value>(&text) else {
                continue;
            };
            let session_id = v.get("sessionId").and_then(|x| x.as_str()).unwrap_or("");
            let name = v
                .get("name")
                .and_then(|x| x.as_str())
                .unwrap_or("")
                .trim()
                .to_string();
            if session_id.is_empty() || name.is_empty() {
                continue;
            }
            let name_source = v
                .get("nameSource")
                .and_then(|x| x.as_str())
                .map(|s| s.to_string());
            let started_at = v.get("startedAt").and_then(|x| x.as_i64()).unwrap_or(0);
            let entry_new = ClaudeSessionTitle {
                name,
                name_source,
                started_at,
            };
            match map.get(session_id) {
                Some(existing) => {
                    if better(&entry_new, existing) {
                        map.insert(session_id.to_string(), entry_new);
                    }
                }
                None => {
                    map.insert(session_id.to_string(), entry_new);
                }
            }
        }
        map
    }

    pub fn get(&self, session_id: &str) -> Option<String> {
        if session_id.is_empty() {
            return None;
        }
        let mut guard = self.cache.lock().unwrap();
        let stale = guard
            .as_ref()
            .map(|(_, t)| t.elapsed() > Duration::from_millis(SCAN_TTL_MS))
            .unwrap_or(true);
        if stale {
            let scanned = self.scan();
            *guard = Some((scanned, Instant::now()));
        }
        guard
            .as_ref()
            .and_then(|(m, _)| m.get(session_id))
            .map(|e| e.name.clone())
    }
}

/// 择优选：真实标题优先；同为真实/占位时取 startedAt 较大者（对齐 betterEntry）
fn better(a: &ClaudeSessionTitle, b: &ClaudeSessionTitle) -> bool {
    let a_real = a
        .name_source
        .as_deref()
        .map(|s| s != "derived")
        .unwrap_or(false);
    let b_real = b
        .name_source
        .as_deref()
        .map(|s| s != "derived")
        .unwrap_or(false);
    if a_real != b_real {
        return a_real;
    }
    a.started_at > b.started_at
}

#[cfg(test)]
mod tests {
    use super::*;

    fn t(name: &str, src: Option<&str>, at: i64) -> ClaudeSessionTitle {
        ClaudeSessionTitle {
            name: name.into(),
            name_source: src.map(|s| s.to_string()),
            started_at: at,
        }
    }

    #[test]
    fn prefers_real_title_over_derived() {
        let derived = t("derived-x", Some("derived"), 200);
        let real = t("真实标题", Some("user"), 100);
        assert!(better(&real, &derived), "真实标题优先，即便 startedAt 更旧");
        assert!(!better(&derived, &real));
    }

    #[test]
    fn falls_back_to_newer_started_at() {
        let older = t("a", Some("user"), 100);
        let newer = t("b", Some("user"), 200);
        assert!(better(&newer, &older));
        assert!(!better(&older, &newer));
    }
}
