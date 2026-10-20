// 审批卡外部完成匹配 — 移植 electron/main/permission-match.ts
// 用于：用户在 Claude 原生界面处理了权限请求后，凭 PostToolUse/PermissionDenied 事件
// 精确关闭对应卡片（防「幽灵卡片」）。
// 匹配优先级：tool_use_id 精确 > 工具名 + 内容签名 > 同会话同名唯一

use serde_json::Value;
use std::collections::BTreeMap;

/// 卡片最小视图（队列中需匹配的字段）
#[derive(Debug, Clone)]
pub struct MatchableCard {
    pub kind: String, // "permission" | "question"
    pub session_id: String,
    pub tool_name: Option<String>,
    pub tool_input: Option<Value>,
    pub tool_use_id: Option<String>,
}

/// 稳定序列化（对象键字典序，数组保序）—— 抵消键序差异
pub fn permission_content_signature(v: &Value) -> String {
    match v {
        Value::Null => "null".to_string(),
        Value::Bool(b) => b.to_string(),
        Value::Number(n) => n.to_string(),
        Value::String(s) => serde_json::to_string(s).unwrap_or_else(|_| "\"\"".into()),
        Value::Array(arr) => {
            let parts: Vec<String> = arr.iter().map(permission_content_signature).collect();
            format!("[{}]", parts.join(","))
        }
        Value::Object(map) => {
            let sorted: BTreeMap<&String, &Value> = map.iter().collect();
            let parts: Vec<String> = sorted
                .iter()
                .map(|(k, v)| {
                    format!(
                        "{}:{}",
                        serde_json::to_string(k).unwrap_or_default(),
                        permission_content_signature(v)
                    )
                })
                .collect();
            format!("{{{}}}", parts.join(","))
        }
    }
}

#[derive(Debug, Clone, Default)]
pub struct CompletionEvent {
    pub tool_use_id: Option<String>,
    pub tool_name: Option<String>,
    pub tool_input: Option<Value>,
}

/// 找出应关闭的卡片下标（对齐 findPermissionToResolve）；无匹配返回 None
pub fn find_permission_to_resolve(
    cards: &[MatchableCard],
    session_id: &str,
    evt: &CompletionEvent,
) -> Option<usize> {
    let input_sig = evt
        .tool_name
        .as_deref()
        .filter(|s| !s.is_empty())
        .and_then(|_| evt.tool_input.as_ref())
        .map(permission_content_signature);

    // 同名候选（惰性对账兜底）
    let mut same_name_indices: Vec<usize> = Vec::new();

    for (i, c) in cards.iter().enumerate() {
        if c.kind != "permission" && c.kind != "question" {
            continue;
        }
        if c.session_id != session_id {
            continue;
        }
        // 1) tool_use_id 精确命中（优先于同轮其他卡）
        if let (Some(a), Some(b)) = (evt.tool_use_id.as_deref(), c.tool_use_id.as_deref()) {
            if !a.is_empty() && a == b {
                return Some(i);
            }
        }
        // 2) 工具名相等 + 内容签名相等
        let same_tool = match (evt.tool_name.as_deref(), c.tool_name.as_deref()) {
            (Some(a), Some(b)) => a == b,
            _ => false,
        };
        if same_tool {
            if let (Some(sig), Some(input)) = (input_sig.as_deref(), c.tool_input.as_ref()) {
                if permission_content_signature(input) == sig {
                    return Some(i);
                }
            }
            same_name_indices.push(i);
        }
    }
    // 3) 同 session + 同 toolName 恰好一张 → 命中；多张 → 不关（交给队首超时）
    if same_name_indices.len() == 1 {
        return Some(same_name_indices[0]);
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    fn card(id: &str, tool: &str, input: Value, use_id: Option<&str>) -> MatchableCard {
        MatchableCard {
            kind: "permission".into(),
            session_id: id.into(),
            tool_name: Some(tool.into()),
            tool_input: Some(input),
            tool_use_id: use_id.map(|s| s.to_string()),
        }
    }

    #[test]
    fn signature_is_key_order_insensitive() {
        let a: Value = serde_json::from_str(r#"{"a":1,"b":[2,3]}"#).unwrap();
        let b: Value = serde_json::from_str(r#"{"b":[2,3],"a":1}"#).unwrap();
        assert_eq!(
            permission_content_signature(&a),
            permission_content_signature(&b)
        );
    }

    #[test]
    fn matches_by_tool_use_id_first() {
        let cards = vec![
            card(
                "s1",
                "Bash",
                serde_json::json!({"command": "ls"}),
                Some("tu_1"),
            ),
            card(
                "s1",
                "Bash",
                serde_json::json!({"command": "pwd"}),
                Some("tu_2"),
            ),
        ];
        let evt = CompletionEvent {
            tool_use_id: Some("tu_2".into()),
            tool_name: Some("Bash".into()),
            tool_input: Some(serde_json::json!({"command": "pwd"})),
        };
        assert_eq!(find_permission_to_resolve(&cards, "s1", &evt), Some(1));
    }

    #[test]
    fn matches_by_tool_name_and_signature() {
        let cards = vec![
            card("s1", "Read", serde_json::json!({"file_path": "/a"}), None),
            card("s1", "Read", serde_json::json!({"file_path": "/b"}), None),
        ];
        let evt = CompletionEvent {
            tool_use_id: None,
            tool_name: Some("Read".into()),
            tool_input: Some(serde_json::json!({"file_path": "/b"})),
        };
        assert_eq!(find_permission_to_resolve(&cards, "s1", &evt), Some(1));
    }

    #[test]
    fn same_name_two_cards_without_signature_does_not_match() {
        let cards = vec![
            card("s1", "Bash", serde_json::json!({"command": "ls"}), None),
            card("s1", "Bash", serde_json::json!({"command": "pwd"}), None),
        ];
        let evt = CompletionEvent {
            tool_use_id: None,
            tool_name: Some("Bash".into()),
            tool_input: None,
        };
        assert_eq!(
            find_permission_to_resolve(&cards, "s1", &evt),
            None,
            "多张同名无签名 → 不关"
        );
    }

    #[test]
    fn same_name_single_card_matches_by_fallback() {
        let cards = vec![card(
            "s1",
            "Bash",
            serde_json::json!({"command": "ls"}),
            None,
        )];
        let evt = CompletionEvent {
            tool_use_id: None,
            tool_name: Some("Bash".into()),
            tool_input: None,
        };
        assert_eq!(find_permission_to_resolve(&cards, "s1", &evt), Some(0));
    }
}
