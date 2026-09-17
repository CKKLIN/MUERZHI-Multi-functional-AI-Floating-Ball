// 待办数据层 — 移植 electron/main/{todo-store,todo-reminders,todo-text}.ts
// todo-notes.json 是唯一真相源（原子写：tmp + rename，失败回退直写）；
// todo-settings.json 普通写（对齐 TS 行为，非原子）。
// 全部写操作返回更新后的全量列表（渲染层镜像），ID 不存在时静默返回原列表且不写盘。

use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::AppHandle;

pub const PRIORITIES: [&str; 4] = ["low", "medium", "high", "urgent"];

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TodoItem {
    pub id: String,
    #[serde(rename = "type")]
    pub kind: String, // "todo" | "memo"
    pub title: String,
    pub content: String,
    pub priority: String,
    pub reminder: Option<String>,
    #[serde(default)]
    pub reminder_fired: bool,
    #[serde(default)]
    pub done: bool,
    #[serde(default)]
    pub pinned: bool,
    #[serde(default)]
    pub pin_x: Option<f64>,
    #[serde(default)]
    pub pin_y: Option<f64>,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TodoState {
    pub items: Vec<TodoItem>,
    pub meta: Meta,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Meta {
    #[serde(default = "default_schema_version")]
    pub schema_version: u32,
}

fn default_schema_version() -> u32 {
    1
}

impl Default for TodoState {
    fn default() -> Self {
        TodoState { items: Vec::new(), meta: Meta { schema_version: 1 } }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TodoSettings {
    #[serde(default = "default_true")]
    pub badge_visible: bool,
    #[serde(default = "default_true")]
    pub window_always_on_top: bool,
    #[serde(default)]
    pub sticky_board_pos: Option<Pos>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Pos {
    pub x: f64,
    pub y: f64,
}

fn default_true() -> bool {
    true
}

impl Default for TodoSettings {
    fn default() -> Self {
        TodoSettings { badge_visible: true, window_always_on_top: true, sticky_board_pos: None }
    }
}

fn notes_path(app: &AppHandle) -> PathBuf {
    crate::modules::settings::settings_file(app, "todo-notes.json")
}

fn settings_path(app: &AppHandle) -> PathBuf {
    crate::modules::settings::settings_file(app, "todo-settings.json")
}

fn now_ms() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

/// UUID v4（零依赖：时间戳 + 进程内计数 + 随机盐拼十六进制，够本地唯一）
fn new_id() -> String {
    use std::sync::atomic::{AtomicU64, Ordering};
    static COUNTER: AtomicU64 = AtomicU64::new(0);
    let n = COUNTER.fetch_add(1, Ordering::SeqCst);
    let t = now_ms() as u64;
    let salt = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.subsec_nanos() as u64)
        .unwrap_or(0);
    format!("{:08x}-{:04x}-4{:03x}-{:04x}-{:012x}", (t >> 32) as u32, t as u16, n & 0xfff, salt & 0xffff, ((t << 16) ^ salt) & 0xffffffffffff)
}

/// 读待办（文件缺失/损坏 → 空列表，全新数组）
pub fn load_items(app: &AppHandle) -> Vec<TodoItem> {
    match std::fs::read_to_string(notes_path(app)) {
        Ok(text) => match serde_json::from_str::<TodoState>(&text) {
            Ok(state) => state.items,
            Err(e) => {
                log::warn!("todo-notes.json parse failed: {e}");
                Vec::new()
            }
        },
        Err(_) => Vec::new(),
    }
}

/// 原子写：tmp + rename，失败回退直写（对齐 TS saveState）
fn save_items(app: &AppHandle, items: &[TodoItem]) -> bool {
    let path = notes_path(app);
    if let Some(parent) = path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    let state = TodoState { items: items.to_vec(), meta: Meta { schema_version: 1 } };
    let text = match serde_json::to_string_pretty(&state) {
        Ok(t) => t,
        Err(e) => {
            log::error!("todo store serialize failed: {e}");
            return false;
        }
    };
    let tmp = path.with_extension("json.tmp");
    let atomic = std::fs::write(&tmp, &text).and_then(|_| std::fs::rename(&tmp, &path));
    if atomic.is_ok() {
        return true;
    }
    // 回退：直写目标文件（Windows 下 rename 覆盖偶发失败）
    match std::fs::write(&path, &text) {
        Ok(()) => true,
        Err(e) => {
            log::error!("todo store save failed: {e}");
            false
        }
    }
}

pub fn load_settings(app: &AppHandle) -> TodoSettings {
    match std::fs::read_to_string(settings_path(app)) {
        Ok(text) => serde_json::from_str(&text).unwrap_or_else(|e| {
            log::warn!("todo-settings.json parse failed: {e}");
            TodoSettings::default()
        }),
        Err(_) => TodoSettings::default(),
    }
}

pub fn update_settings(app: &AppHandle, patch: &serde_json::Value) -> TodoSettings {
    let mut next = load_settings(app);
    if let Some(v) = patch.get("badgeVisible").and_then(|v| v.as_bool()) {
        next.badge_visible = v;
    }
    if let Some(v) = patch.get("windowAlwaysOnTop").and_then(|v| v.as_bool()) {
        next.window_always_on_top = v;
    }
    if let Some(pos) = patch.get("stickyBoardPos") {
        if pos.is_null() {
            next.sticky_board_pos = None;
        } else if let (Some(x), Some(y)) =
            (pos.get("x").and_then(|v| v.as_f64()), pos.get("y").and_then(|v| v.as_f64()))
        {
            next.sticky_board_pos = Some(Pos { x, y });
        }
    }
    let path = settings_path(app);
    if let Some(parent) = path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    if let Ok(text) = serde_json::to_string_pretty(&next) {
        let _ = std::fs::write(&path, text);
    }
    next
}

/// 未完成待办数（角标口径：type==='todo' && !done；memo 不计）
pub fn incomplete_todo_count(app: &AppHandle) -> usize {
    load_items(app).iter().filter(|i| i.kind == "todo" && !i.done).count()
}

/// 完成态待办自动取消贴屏（对齐 ensureDoneUnpins）
fn ensure_done_unpins(it: &mut TodoItem) {
    if it.kind == "todo" && it.done {
        it.pinned = false;
    }
}

fn persist(app: &AppHandle, items: Vec<TodoItem>) -> Vec<TodoItem> {
    save_items(app, &items);
    items
}

// ===== CRUD（对齐 todo-store.ts）=====

/// create：新条目 unshift 到数组头
pub fn create(app: &AppHandle, input: &serde_json::Value) -> Vec<TodoItem> {
    let mut items = load_items(app);
    let now = now_ms();
    let item = TodoItem {
        id: new_id(),
        kind: input.get("type").and_then(|v| v.as_str()).unwrap_or("todo").to_string(),
        title: input.get("title").and_then(|v| v.as_str()).unwrap_or("").to_string(),
        content: input.get("content").and_then(|v| v.as_str()).unwrap_or("").to_string(),
        priority: input
            .get("priority")
            .and_then(|v| v.as_str())
            .filter(|p| PRIORITIES.contains(p))
            .unwrap_or("medium")
            .to_string(),
        reminder: input.get("reminder").and_then(|v| v.as_str()).map(|s| s.to_string()),
        reminder_fired: false,
        done: input.get("done").and_then(|v| v.as_bool()).unwrap_or(false),
        pinned: false,
        pin_x: None,
        pin_y: None,
        created_at: now,
        updated_at: now,
    };
    items.insert(0, item);
    persist(app, items)
}

/// update：reminder 值变化则重置 reminderFired（改期后可再次触发）
pub fn update(app: &AppHandle, id: &str, patch: &serde_json::Value) -> Vec<TodoItem> {
    let mut items = load_items(app);
    let mut found = false;
    for it in items.iter_mut() {
        if it.id != id {
            continue;
        }
        found = true;
        if let Some(rem) = patch.get("reminder") {
            let new_val = rem.as_str().map(|s| s.to_string());
            if new_val != it.reminder {
                it.reminder_fired = false;
            }
            it.reminder = new_val;
        }
        if let Some(v) = patch.get("title").and_then(|v| v.as_str()) {
            it.title = v.to_string();
        }
        if let Some(v) = patch.get("content").and_then(|v| v.as_str()) {
            it.content = v.to_string();
        }
        if let Some(v) = patch.get("priority").and_then(|v| v.as_str()) {
            it.priority = v.to_string();
        }
        if let Some(v) = patch.get("done").and_then(|v| v.as_bool()) {
            it.done = v;
        }
        if let Some(v) = patch.get("pinned").and_then(|v| v.as_bool()) {
            it.pinned = v;
        }
        if let Some(v) = patch.get("reminderFired").and_then(|v| v.as_bool()) {
            it.reminder_fired = v;
        }
        if let Some(v) = patch.get("type").and_then(|v| v.as_str()) {
            it.kind = v.to_string();
        }
        it.updated_at = now_ms();
        ensure_done_unpins(it);
    }
    if !found {
        return items; // ID 不存在：静默返回原列表，不写盘
    }
    persist(app, items)
}

pub fn delete(app: &AppHandle, id: &str) -> Vec<TodoItem> {
    let mut items = load_items(app);
    items.retain(|i| i.id != id);
    persist(app, items)
}

/// toggleDone：仅 todo 翻转；memo 直接返回且不写盘
pub fn toggle_done(app: &AppHandle, id: &str) -> Vec<TodoItem> {
    let mut items = load_items(app);
    let mut changed = false;
    for it in items.iter_mut() {
        if it.id == id && it.kind == "todo" {
            it.done = !it.done;
            it.updated_at = now_ms();
            ensure_done_unpins(it);
            changed = true;
        }
    }
    if !changed {
        return items;
    }
    persist(app, items)
}

/// togglePin：新贴屏时待办自动回到未完成；取消贴屏保留坐标
pub fn toggle_pin(app: &AppHandle, id: &str) -> Vec<TodoItem> {
    toggle_pin_with_pos(app, id, None)
}

pub fn toggle_pin_with_pos(app: &AppHandle, id: &str, initial: Option<(f64, f64)>) -> Vec<TodoItem> {
    let mut items = load_items(app);
    for it in items.iter_mut() {
        if it.id != id {
            continue;
        }
        it.pinned = !it.pinned;
        if it.pinned {
            if let Some((x, y)) = initial {
                it.pin_x = Some(x.round());
                it.pin_y = Some(y.round());
            }
            if it.kind == "todo" && it.done {
                it.done = false;
            }
        }
        it.updated_at = now_ms();
    }
    persist(app, items)
}

/// 便签板 ✕：仅 todo → done=true + pinned=false
#[allow(dead_code)] // 便签板 ✕ 经事件转发调用（P3）
pub fn complete(app: &AppHandle, id: &str) -> Vec<TodoItem> {
    let mut items = load_items(app);
    for it in items.iter_mut() {
        if it.id == id && it.kind == "todo" {
            it.done = true;
            it.pinned = false;
            it.updated_at = now_ms();
        }
    }
    persist(app, items)
}

pub fn mark_reminder_fired(app: &AppHandle, id: &str) -> Vec<TodoItem> {
    let mut items = load_items(app);
    for it in items.iter_mut() {
        if it.id == id {
            it.reminder_fired = true;
            it.updated_at = now_ms();
        }
    }
    persist(app, items)
}

#[allow(dead_code)] // 贴屏便签拖动位置持久化（P3 事件接线）
pub fn save_pin_position(app: &AppHandle, id: &str, x: f64, y: f64) -> Vec<TodoItem> {
    let mut items = load_items(app);
    for it in items.iter_mut() {
        if it.id == id {
            it.pin_x = Some(x.round());
            it.pin_y = Some(y.round());
        }
    }
    persist(app, items)
}

// ===== 到期判定（对齐 todo-reminders.ts computeDueReminders）=====

/// 四个条件全满足才到期：有 reminder + 未触发 + 非「已完成待办」+ reminder <= now（字典序）
pub fn compute_due_reminders(items: &[TodoItem], now_iso: &str) -> Vec<TodoItem> {
    items
        .iter()
        .filter(|it| {
            it.reminder.as_deref().map(|r| !r.is_empty()).unwrap_or(false)
                && !it.reminder_fired
                && !(it.kind == "todo" && it.done)
                && it.reminder.as_deref().map(|r| r <= now_iso).unwrap_or(false)
        })
        .cloned()
        .collect()
}

/// 当前 UTC 时间的 ISO8601 字符串（与 JS toISOString 等长可比）
pub fn now_iso() -> String {
    let ms = now_ms();
    let secs = ms / 1000;
    let millis = ms % 1000;
    let days = secs / 86400;
    let rem = secs % 86400;
    let (h, mi, s) = (rem / 3600, (rem % 3600) / 60, rem % 60);
    // 民用日期换算（1970-01-01 起）
    let (y, m, d) = civil_from_days(days);
    format!("{y:04}-{m:02}-{d:02}T{h:02}:{mi:02}:{s:02}.{millis:03}Z")
}

/// days since epoch → 公历年月日（Howard Hinnant 算法）
fn civil_from_days(z: i64) -> (i64, u32, u32) {
    let z = z + 719468;
    let era = if z >= 0 { z } else { z - 146096 } / 146097;
    let doe = (z - era * 146097) as u64;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    let y = yoe as i64 + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = (doy - (153 * mp + 2) / 5 + 1) as u32;
    let m = if mp < 10 { mp + 3 } else { mp - 9 } as u32;
    (if m <= 2 { y + 1 } else { y }, m, d)
}

// ===== HTML 剥离与摘要（对齐 todo-text.ts stripHtml）=====

pub fn strip_html(html: &str) -> String {
    let mut s = html.to_string();
    // 1) <img alt="X"> → X（alt 空则 [图]）
    s = replace_img_alts(&s);
    // 2) <br> 系列 → 空格
    for pat in ["<br>", "<br/>", "<br />", "<BR>"] {
        s = s.replace(pat, " ");
    }
    // 3) 闭合块级标签 → 空格
    for pat in [
        "</p>", "</div>", "</h1>", "</h2>", "</h3>", "</h4>", "</h5>", "</h6>", "</li>",
        "</blockquote>", "</tr>",
    ] {
        s = s.replace(pat, " ");
    }
    // 4) 剩余标签删除
    s = strip_tags(&s);
    // 5) 实体
    for (from, to) in [
        ("&nbsp;", " "),
        ("&amp;", "&"),
        ("&lt;", "<"),
        ("&gt;", ">"),
        ("&quot;", "\""),
        ("&#39;", "'"),
    ] {
        s = s.replace(from, to);
    }
    // 6) 空白折叠 + trim
    collapse_ws(&s)
}

fn replace_img_alts(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    let bytes = s.as_bytes();
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'<' && s[i..].to_ascii_lowercase().starts_with("<img") {
            // 找标签结束
            if let Some(end_rel) = s[i..].find('>') {
                let tag = &s[i..i + end_rel + 1];
                let alt = extract_alt(tag);
                out.push_str(alt.as_deref().unwrap_or("[图]"));
                i += end_rel + 1;
                continue;
            }
        }
        let ch = s[i..].chars().next().unwrap();
        out.push(ch);
        i += ch.len_utf8();
    }
    out
}

fn extract_alt(tag: &str) -> Option<String> {
    let lower = tag.to_ascii_lowercase();
    let idx = lower.find("alt=")?;
    let rest = &tag[idx + 4..];
    let quote = rest.chars().next()?;
    if quote != '"' && quote != '\'' {
        return None;
    }
    let after = &rest[1..];
    let end = after.find(quote)?;
    let val = after[..end].trim();
    if val.is_empty() {
        None
    } else {
        Some(val.to_string())
    }
}

fn strip_tags(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    let mut in_tag = false;
    for ch in s.chars() {
        match ch {
            '<' => in_tag = true,
            '>' => in_tag = false,
            c if !in_tag => out.push(c),
            _ => {}
        }
    }
    out
}

fn collapse_ws(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    let mut prev_ws = false;
    for ch in s.chars() {
        if ch.is_whitespace() {
            if !prev_ws {
                out.push(' ');
            }
            prev_ws = true;
        } else {
            out.push(ch);
            prev_ws = false;
        }
    }
    out.trim().to_string()
}

// ===== tauri command（bridge.ts 的 todo* 系列）=====
// ⚠️ 写操作必须 async：after_todo_change 会建/拆贴屏便签窗口，
//    而同步命令跑在主线程，WebviewWindowBuilder::build() 与主线程互等会死锁（见 region.rs 注释）

#[tauri::command]
pub fn todo_get(app: AppHandle) -> Vec<TodoItem> {
    load_items(&app)
}

#[tauri::command]
pub async fn todo_create(app: AppHandle, input: serde_json::Value) -> Vec<TodoItem> {
    let items = create(&app, &input);
    crate::modules::windows::todo_windows::after_todo_change(&app);
    items
}

#[tauri::command]
pub async fn todo_update(app: AppHandle, id: String, patch: serde_json::Value) -> Vec<TodoItem> {
    let items = update(&app, &id, &patch);
    crate::modules::windows::todo_windows::after_todo_change(&app);
    items
}

#[tauri::command]
pub async fn todo_delete(app: AppHandle, id: String) -> Vec<TodoItem> {
    let items = delete(&app, &id);
    crate::modules::windows::todo_windows::after_todo_change(&app);
    items
}

#[tauri::command]
pub async fn todo_toggle_done(app: AppHandle, id: String) -> Vec<TodoItem> {
    let items = toggle_done(&app, &id);
    crate::modules::windows::todo_windows::after_todo_change(&app);
    items
}

#[tauri::command]
pub async fn todo_toggle_pin(app: AppHandle, id: String) -> Vec<TodoItem> {
    let items = toggle_pin(&app, &id);
    crate::modules::windows::todo_windows::after_todo_change(&app);
    items
}

#[tauri::command]
pub fn todo_get_settings(app: AppHandle) -> TodoSettings {
    load_settings(&app)
}

#[tauri::command]
pub async fn todo_set_settings(app: AppHandle, patch: serde_json::Value) -> TodoSettings {
    let next = update_settings(&app, &patch);
    crate::modules::windows::todo_windows::after_todo_change(&app);
    next
}

#[cfg(test)]
mod tests {
    use super::*;

    fn item(reminder: Option<&str>, fired: bool, kind: &str, done: bool) -> TodoItem {
        TodoItem {
            id: "x".into(),
            kind: kind.into(),
            title: String::new(),
            content: String::new(),
            priority: "medium".into(),
            reminder: reminder.map(|s| s.to_string()),
            reminder_fired: fired,
            done,
            pinned: false,
            pin_x: None,
            pin_y: None,
            created_at: 0,
            updated_at: 0,
        }
    }

    #[test]
    fn due_reminder_requires_all_four_conditions() {
        let now = "2026-09-17T12:00:00.000Z";
        // 到期（四条件全满足）
        assert_eq!(compute_due_reminders(&[item(Some("2026-09-17T11:00:00.000Z"), false, "todo", false)], now).len(), 1);
        // 边界：恰好等于 now 也触发（<= 语义）
        assert_eq!(compute_due_reminders(&[item(Some(now), false, "todo", false)], now).len(), 1);
        // 未到期
        assert_eq!(compute_due_reminders(&[item(Some("2026-09-17T13:00:00.000Z"), false, "todo", false)], now).len(), 0);
        // 已触发
        assert_eq!(compute_due_reminders(&[item(Some("2026-09-17T11:00:00.000Z"), true, "todo", false)], now).len(), 0);
        // 已完成的待办
        assert_eq!(compute_due_reminders(&[item(Some("2026-09-17T11:00:00.000Z"), false, "todo", true)], now).len(), 0);
        // 已完成的备忘：memo 无 done 语义，仍触发
        assert_eq!(compute_due_reminders(&[item(Some("2026-09-17T11:00:00.000Z"), false, "memo", true)], now).len(), 1);
        // 无 reminder
        assert_eq!(compute_due_reminders(&[item(None, false, "todo", false)], now).len(), 0);
    }

    #[test]
    fn strip_html_matches_ts_semantics() {
        assert_eq!(strip_html("<p>你好</p><p>世界</p>"), "你好 世界");
        assert_eq!(strip_html("a<br>b"), "a b");
        assert_eq!(strip_html("<img src=\"x\" alt=\"图片\">"), "图片");
        assert_eq!(strip_html("<img src=\"x\">"), "[图]");
        // 前导空格被末尾 trim 掉（与 TS stripHtml 一致）
        assert_eq!(strip_html("&nbsp;&amp;&lt;&gt;&quot;&#39;"), "&<>\"'");
        assert_eq!(strip_html("  a   b  "), "a b");
        assert_eq!(strip_html("<div><b>粗</b></div>"), "粗");
    }

    #[test]
    fn now_iso_is_well_formed() {
        let s = now_iso();
        assert_eq!(s.len(), 24, "格式应与 JS toISOString 等长: {s}");
        assert!(s.ends_with('Z'));
        assert_eq!(&s[4..5], "-");
        assert_eq!(&s[10..11], "T");
    }
}