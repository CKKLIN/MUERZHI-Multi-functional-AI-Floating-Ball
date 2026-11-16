// Claude 会话标题读取 — 移植 electron/main/session-title.ts
// 优先读真实标题（nameSource != 'derived'），占位 slug 时提取 ~/.claude/projects/ transcript 首条用户 prompt（对齐 Gemini），同 sessionId 多份时择优；5s 缓存。

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::{Duration, Instant};

const SCAN_TTL_MS: u64 = 5_000;

#[derive(Debug, Clone)]
pub struct ClaudeSessionTitle {
    pub name: String,
    pub name_source: Option<String>,
    pub started_at: i64,
}

/// 从 Claude 项目会话 transcript (.jsonl) 中提取首条真实用户 prompt 作为会话标题（对齐 Gemini）
pub fn extract_prompt_from_transcript(path: &Path) -> Option<String> {
    use std::io::{BufRead, BufReader};
    let file = std::fs::File::open(path).ok()?;
    let reader = BufReader::new(file);
    for line in reader.lines().take(60) {
        let Ok(line) = line else { continue };
        if !line.contains("\"type\":\"user\"") && !line.contains("\"type\": \"user\"") {
            continue;
        }
        let Ok(v) = serde_json::from_str::<serde_json::Value>(&line) else {
            continue;
        };
        if v.get("type").and_then(|t| t.as_str()) != Some("user") {
            continue;
        }
        let content = v.get("message").and_then(|m| m.get("content"))?;
        let text = if let Some(s) = content.as_str() {
            s.to_string()
        } else if let Some(arr) = content.as_array() {
            arr.iter()
                .find_map(|item| {
                    if item.get("type").and_then(|t| t.as_str()) == Some("text") {
                        item.get("text").and_then(|t| t.as_str()).map(|s| s.to_string())
                    } else {
                        None
                    }
                })
                .unwrap_or_default()
        } else {
            continue;
        };
        let trimmed = text.trim();
        // 过滤 IDE 注入标签与打断提示
        if !trimmed.is_empty()
            && !trimmed.starts_with('<')
            && !trimmed.starts_with("[Request interrupted")
        {
            return crate::modules::agent::state_machine::StateMachine::normalize_title(Some(trimmed));
        }
    }
    None
}

/// 在 ~/.claude/projects/ 下查找指定 session_id 的 transcript 并提取首条用户 prompt
pub fn find_transcript_prompt(session_id: &str) -> Option<String> {
    if session_id.is_empty() {
        return None;
    }
    let home = std::env::var("USERPROFILE")
        .or_else(|_| std::env::var("HOME"))
        .unwrap_or_else(|_| ".".into());
    let projects_dir = PathBuf::from(home).join(".claude").join("projects");
    let Ok(entries) = std::fs::read_dir(&projects_dir) else {
        return None;
    };
    let target_file = format!("{session_id}.jsonl");
    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_dir() {
            let candidate = path.join(&target_file);
            if candidate.is_file() {
                if let Some(prompt) = extract_prompt_from_transcript(&candidate) {
                    return Some(prompt);
                }
            }
        }
    }
    None
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

        // 对 derived 占位 slug 的会话，尝试提取 transcript 首条真实 prompt 升级标题
        for (session_id, entry) in map.iter_mut() {
            if entry.name_source.as_deref() == Some("derived") {
                if let Some(prompt) = find_transcript_prompt(session_id) {
                    entry.name = prompt;
                    entry.name_source = Some("prompt".to_string());
                } else {
                    // 标记为已扫过，避免每 5 秒无休止遍历整个 projects 目录
                    entry.name_source = Some("derived_scanned".to_string());
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

        let cached = guard
            .as_ref()
            .and_then(|(m, _)| m.get(session_id))
            .cloned();

        if let Some(entry) = cached {
            if entry.name_source.as_deref() != Some("derived") {
                return Some(entry.name);
            }
            // 若仍然是占位 slug，实时查找 transcript
            if let Some(prompt) = find_transcript_prompt(session_id) {
                if let Some((m, _)) = guard.as_mut() {
                    m.insert(
                        session_id.to_string(),
                        ClaudeSessionTitle {
                            name: prompt.clone(),
                            name_source: Some("prompt".to_string()),
                            started_at: entry.started_at,
                        },
                    );
                }
                return Some(prompt);
            }
            return Some(entry.name);
        }

        // sessions 目录中无此 session_id，直接查 projects transcript
        if let Some(prompt) = find_transcript_prompt(session_id) {
            if let Some((m, _)) = guard.as_mut() {
                m.insert(
                    session_id.to_string(),
                    ClaudeSessionTitle {
                        name: prompt.clone(),
                        name_source: Some("prompt".to_string()),
                        started_at: 0,
                    },
                );
            }
            return Some(prompt);
        }

        None
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

    #[test]
    fn extracts_user_prompt_from_jsonl() {
        use std::io::Write;
        let dir = std::env::temp_dir().join(format!("muerzhi_test_prompt_{}", std::process::id()));
        let _ = std::fs::create_dir_all(&dir);
        let file_path = dir.join("test_session.jsonl");
        let mut f = std::fs::File::create(&file_path).unwrap();
        writeln!(f, r#"{{"type":"queue-operation","operation":"enqueue"}}"#).unwrap();
        writeln!(f, r#"{{"type":"user","message":{{"content":"<ide_opened_file>foo</ide_opened_file>"}}}}"#).unwrap();
        writeln!(f, r#"{{"type":"user","message":{{"content":[{{"type":"text","text":"打包这个项目"}}]}}}}"#).unwrap();
        drop(f);

        let prompt = extract_prompt_from_transcript(&file_path);
        assert_eq!(prompt, Some("打包这个项目".into()));

        let _ = std::fs::remove_dir_all(&dir);
    }
}
