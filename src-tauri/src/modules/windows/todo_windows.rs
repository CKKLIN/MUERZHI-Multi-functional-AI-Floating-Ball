// 待办窗口族 — 移植 electron/main/{todo-sticky,todo-reminder-window}.ts + 散热面板
// 贴屏便签板（208×120 合并轮播）/ 到期提醒弹窗（300×150 右下角）/ 散热面板（224×100 球旁）
//
// ⚠️ 窗口创建命令必须 async（同步命令内 build() 与主线程死锁），见 region.rs::start_region_select

#![allow(dead_code, non_snake_case)]

use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager, WebviewUrl, WebviewWindowBuilder};

pub const BOARD_W: f64 = 208.0;
pub const BOARD_H: f64 = 120.0;
const REMINDER_W: f64 = 300.0;
const REMINDER_H: f64 = 150.0;
pub const PANEL_W: f64 = 224.0;
pub const PANEL_H: f64 = 100.0;
const GAP: f64 = 8.0;
const BALL_HALF: f64 = 33.0;
const RESULT_SHOW_MS: u64 = 3000;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StickyNote {
    pub id: String,
    #[serde(rename = "type")]
    pub kind: String,
    pub title: String,
    pub body: String,
    pub done: bool,
    pub priority: String,
}

/// 贴屏便签板状态（轮播索引由页面保留，Rust 侧只做窗口生命周期）
pub struct StickyState {
    pub move_timer_running: Mutex<bool>,
}

impl StickyState {
    pub fn global() -> &'static StickyState {
        use std::sync::OnceLock;
        static S: OnceLock<StickyState> = std::sync::OnceLock::new();
        S.get_or_init(|| StickyState {
            move_timer_running: Mutex::new(false),
        })
    }
}

/// 提醒队列（同屏只弹一个，关闭后弹下一条）
pub struct ReminderState {
    pub queue: Mutex<Vec<(String, String)>>,
}

impl ReminderState {
    pub fn global() -> &'static ReminderState {
        use std::sync::OnceLock;
        static S: OnceLock<ReminderState> = std::sync::OnceLock::new();
        S.get_or_init(|| ReminderState {
            queue: Mutex::new(Vec::new()),
        })
    }
}

/// 散热面板状态（上一帧载荷：建窗期间补发）
pub struct CoolingPanelState {
    pub last_payload: Mutex<Option<serde_json::Value>>,
}

impl CoolingPanelState {
    pub fn global() -> &'static CoolingPanelState {
        use std::sync::OnceLock;
        static S: OnceLock<CoolingPanelState> = std::sync::OnceLock::new();
        S.get_or_init(|| CoolingPanelState {
            last_payload: Mutex::new(None),
        })
    }
}

fn display_scale(app: &AppHandle) -> f64 {
    app.primary_monitor()
        .ok()
        .flatten()
        .map(|m| m.scale_factor())
        .unwrap_or(1.0)
}

fn work_area_physical(app: &AppHandle) -> (i32, i32, i32, i32) {
    app.primary_monitor()
        .ok()
        .flatten()
        .map(|m| {
            let wa = m.work_area();
            (
                wa.position.x,
                wa.position.y,
                wa.size.width as i32,
                wa.size.height as i32,
            )
        })
        .unwrap_or((0, 0, 1920, 1040))
}

fn window_url(path: &str) -> WebviewUrl {
    WebviewUrl::App(path.to_string().into())
}

// ===== 贴屏便签板 =====

/// 数据变更后同步便签板（notes 为空则拆窗，否则建窗/推数据）
pub fn sync_sticky_notes(app: &AppHandle, notes: Vec<StickyNote>) {
    if app.get_webview_window("todo-sticky").is_none() {
        if notes.is_empty() {
            return;
        }
        create_sticky_board(app);
        // 建窗后由页面 ready 事件推数据（此处也推一次兜底）
        push_sticky_notes(app, &notes, 0);
        return;
    }
    if notes.is_empty() {
        // 统一走 close_all_sticky_notes：拆窗前把当前位置落盘，下次贴屏在原位重现
        close_all_sticky_notes(app);
        return;
    }
    push_sticky_notes(app, &notes, 0);
}

/// 贴屏位置记忆：把便签板当前窗口位置（**物理**像素，outer_position）写进 todo-settings
/// 的 stickyBoardPos。关窗（取消贴屏/清空/退出）前调用 —— 「下次贴屏出现在上次关闭时的位置」。
fn save_sticky_position(app: &AppHandle) {
    let Some(win) = app.get_webview_window("todo-sticky") else {
        return;
    };
    let Ok(p) = win.outer_position() else {
        return;
    };
    crate::modules::todo::store::update_settings(
        app,
        &serde_json::json!({ "stickyBoardPos": { "x": p.x as f64, "y": p.y as f64 } }),
    );
}

/// 恢复上次关闭时的便签板位置：存的是物理像素，builder 的 position 吃逻辑坐标，
/// 用「左上角落在哪块屏」那块屏的缩放比换算（归属屏按整屏 bounds 找，压在任务栏上也算）。
/// 无记录 / 找不到所属屏（显示器被拔、分辨率改小）/ 可见面积不足（至少 48 物理像素
/// 落在该屏工作区内，不然板子基本被遮没）→ None，调用方落右下角默认。
fn restore_sticky_pos(app: &AppHandle) -> Option<(f64, f64)> {
    let pos = crate::modules::todo::store::load_settings(app).sticky_board_pos?;
    let (px, py) = (pos.x.round() as i32, pos.y.round() as i32);
    let monitors = app.available_monitors().ok()?;
    let primary = app.primary_monitor().ok().flatten();
    let m = monitors
        .iter()
        .find(|m| {
            let (mx, my) = (m.position().x, m.position().y);
            let (mw, mh) = (m.size().width as i32, m.size().height as i32);
            px >= mx && py >= my && px < mx + mw && py < my + mh
        })
        .or(primary.as_ref())?;
    let s = m.scale_factor();
    let bw = (BOARD_W * s).round() as i32;
    let bh = (BOARD_H * s).round() as i32;
    let wa = m.work_area();
    let overlap_w = (px + bw).min(wa.position.x + wa.size.width as i32) - px.max(wa.position.x);
    let overlap_h = (py + bh).min(wa.position.y + wa.size.height as i32) - py.max(wa.position.y);
    if overlap_w < 48 || overlap_h < 48 {
        return None;
    }
    Some((px as f64 / s, py as f64 / s))
}

fn create_sticky_board(app: &AppHandle) {
    let (ax, ay, aw, ah) = work_area_physical(app);
    let scale = display_scale(app);
    // 物理坐标 → 逻辑坐标给 builder（builder 吃逻辑单位），宽高不再除 scale：
    // BOARD_W/H 本来就是逻辑(CSS px)语义，除一次 = 二次换算，150% 屏上板子缩到 2/3
    // （208px 物理 ≈ 138 CSS px），页面被塞进过小视口整体显示过小（实测）。
    let dx = (ax as f64 + aw as f64 - BOARD_W * scale - 16.0 * scale) / scale;
    let dy = (ay as f64 + ah as f64 - BOARD_H * scale - 16.0 * scale) / scale;
    // 默认右下角；有上次关闭时的位置且仍可见就恢复原位
    let (x, y) = restore_sticky_pos(app).unwrap_or((dx, dy));
    match WebviewWindowBuilder::new(app, "todo-sticky", window_url("windows/todo-sticky.html"))
        .title("便签")
        .position(x.round(), y.round())
        .inner_size(BOARD_W, BOARD_H)
        .decorations(false)
        .transparent(true)
        .resizable(false)
        .maximizable(false)
        .minimizable(false)
        .skip_taskbar(true)
        .shadow(false)
        .always_on_top(true)
        .visible(false)
        .build()
    {
        Ok(win) => {
            let _ = win.show();
            log::info!("Sticky board shown");
        }
        Err(e) => log::error!("sticky board failed: {e}"),
    }
}

fn push_sticky_notes(app: &AppHandle, notes: &[StickyNote], idx: usize) {
    if let Some(win) = app.get_webview_window("todo-sticky") {
        let list = serde_json::to_string(notes).unwrap_or_else(|_| "[]".into());
        let _ = win.eval(&format!(
            "if (window.renderNotes) renderNotes({list}, {idx}); void 0;"
        ));
    }
}

/// 关闭全部贴屏便签（取消贴屏清空 / 退出清理，对齐 closeAllStickyNotes）。
/// 关窗前把当前位置落盘 —— 下次贴屏恢复到「上次关闭时的位置」。
pub fn close_all_sticky_notes(app: &AppHandle) {
    save_sticky_position(app);
    if let Some(win) = app.get_webview_window("todo-sticky") {
        let _ = win.close();
    }
}

// ===== 到期提醒弹窗 =====

/// 入队一条提醒（同屏只弹一个，关闭后弹下一条）
pub fn show_todo_reminder(app: &AppHandle, title: String, body: String) {
    ReminderState::global()
        .queue
        .lock()
        .unwrap()
        .push((title, body));
    pump_reminder(app);
}

fn pump_reminder(app: &AppHandle) {
    if app.get_webview_window("todo-reminder").is_some() {
        return; // 已有一个在显示
    }
    let next = ReminderState::global()
        .queue
        .lock()
        .unwrap()
        .first()
        .cloned();
    let Some((title, body)) = next else { return };
    ReminderState::global().queue.lock().unwrap().remove(0);
    open_reminder_popup(app, title, body);
}

fn open_reminder_popup(app: &AppHandle, title: String, body: String) {
    let (ax, ay, aw, ah) = work_area_physical(app);
    let scale = display_scale(app);
    // 同 create_sticky_board：物理坐标换算给 position，尺寸保持逻辑语义不除 scale
    let x = (ax as f64 + aw as f64 - REMINDER_W * scale - 16.0 * scale) / scale;
    let y = (ay as f64 + ah as f64 - REMINDER_H * scale - 16.0 * scale) / scale;
    match WebviewWindowBuilder::new(
        app,
        "todo-reminder",
        window_url("windows/todo-reminder.html"),
    )
    .title("提醒")
    .position(x.round(), y.round())
    .inner_size(REMINDER_W, REMINDER_H)
    .decorations(false)
    .transparent(true)
    .resizable(false)
    .maximizable(false)
    .minimizable(false)
    .skip_taskbar(true)
    .shadow(false)
    .always_on_top(true)
    .visible(false)
    .build()
    {
        Ok(win) => {
            // 注入提醒内容（页面 window.setReminder 用 textContent 渲染，无注入风险）
            let title_json = serde_json::to_string(&title).unwrap_or_default();
            let body_json = serde_json::to_string(&body).unwrap_or_default();
            let _ = win.eval(&format!(
                "if (window.setReminder) setReminder({title_json}, {body_json}); void 0;"
            ));
            let _ = win.show();
            log::info!("Todo reminder popup shown");
        }
        Err(e) => log::error!("todo reminder window failed: {e}"),
    }
}

/// 关闭提醒弹窗（触发 pump 下一条）
pub fn hide_todo_reminder(app: &AppHandle) {
    if let Some(win) = app.get_webview_window("todo-reminder") {
        let _ = win.close();
        pump_reminder(app);
    }
}

/// 清空队列 + 关闭当前弹窗（用户点「打开待办」）
pub fn clear_todo_reminder_queue(app: &AppHandle) {
    ReminderState::global().queue.lock().unwrap().clear();
    if let Some(win) = app.get_webview_window("todo-reminder") {
        let _ = win.close();
    }
}

// ===== 散热面板 =====

/// 由球心推面板左上角（上方优先，放不下翻下方，水平夹回屏幕内）。
///
/// center 是**物理**坐标（ball_center_for_overlay 出自 outer_position/outer_size），
/// PANEL_W/BALL_HALF/GAP 是逻辑(CSS px)常量 —— 参与物理运算必须乘 scale，
/// 否则 150% 屏上面板偏移全按 2/3 算，盖不到球上方。
fn panel_origin(app: &AppHandle, center: (i32, i32)) -> (i32, i32) {
    let (ax, ay, aw, _ah) = work_area_physical(app);
    let s = display_scale(app);
    let pw = PANEL_W * s;
    let ph = PANEL_H * s;
    let half = BALL_HALF * s;
    let gap = GAP * s;
    let mut x = (center.0 as f64 - pw / 2.0).round() as i32;
    let mut y = (center.1 as f64 - half - gap - ph).round() as i32;
    if y < ay {
        y = (center.1 as f64 + half + gap).round() as i32;
    }
    x = x.clamp(ax, ax + aw - pw.round() as i32);
    (x, y)
}

/// 创建并显示散热面板（center 为 None 时放弃；已存在则复用刷状态）
pub fn show_cooling_overlay(app: &AppHandle, center: Option<(i32, i32)>) {
    if let Some(win) = app.get_webview_window("cooling-overlay") {
        if let Some(p) = CoolingPanelState::global()
            .last_payload
            .lock()
            .unwrap()
            .clone()
        {
            let _ = win.eval(&format!(
                "if (window.updateCooling) updateCooling({p}); void 0;"
            ));
        }
        return;
    }
    let Some(c) = center else { return };
    let scale = display_scale(app);
    let (px, py) = panel_origin(app, c);
    // panel_origin 算的是物理坐标；position 需要逻辑坐标，尺寸保持逻辑语义不除 scale
    //（同 create_sticky_board：除一次 = 二次换算，150% 屏上面板缩到 2/3，实测过小）
    match WebviewWindowBuilder::new(
        app,
        "cooling-overlay",
        window_url("windows/cooling-overlay.html"),
    )
    .title("散热")
    .position((px as f64 / scale).round(), (py as f64 / scale).round())
    .inner_size(PANEL_W, PANEL_H)
    .decorations(false)
    .transparent(true)
    .resizable(false)
    .maximizable(false)
    .minimizable(false)
    .skip_taskbar(true)
    .shadow(false)
    .always_on_top(true)
    // 不抢焦点：悬浮球不失焦（球 blur 会自动收起菜单/水滴）
    .focused(false)
    .visible(false)
    .build()
    {
        Ok(win) => {
            let _ = win.show();
            if let Some(p) = CoolingPanelState::global()
                .last_payload
                .lock()
                .unwrap()
                .clone()
            {
                let _ = win.eval(&format!(
                    "if (window.updateCooling) updateCooling({p}); void 0;"
                ));
            }
        }
        Err(e) => log::error!("cooling overlay failed: {e}"),
    }
}

/// 散热中拖动悬浮球时跟随（按新球心重算位置）
pub fn reposition_cooling_overlay(app: &AppHandle, center: Option<(i32, i32)>) {
    let (Some(win), Some(c)) = (app.get_webview_window("cooling-overlay"), center) else {
        return;
    };
    let (px, py) = panel_origin(app, c);
    // panel_origin 输出物理坐标，set_position(PhysicalPosition) 也吃物理坐标 ——
    // 之前这里再除一次 scale，150% 屏上面板跟着球跑会飞到屏幕左上方向（实测）
    let _ = win.set_position(tauri::PhysicalPosition::new(px, py));
}

/// 推送状态到面板（phase==='done' 时启动 3s 自毁）
pub fn update_cooling_overlay(app: &AppHandle, payload: serde_json::Value) {
    *CoolingPanelState::global().last_payload.lock().unwrap() = Some(payload.clone());
    let Some(win) = app.get_webview_window("cooling-overlay") else {
        return;
    };
    let _ = win.eval(&format!(
        "if (window.updateCooling) updateCooling({payload}); void 0;"
    ));
    let is_done = payload.get("phase").and_then(|v| v.as_str()) == Some("done");
    if is_done {
        let app2 = app.clone();
        tauri::async_runtime::spawn(async move {
            tokio::time::sleep(std::time::Duration::from_millis(RESULT_SHOW_MS)).await;
            hide_cooling_overlay(&app2);
        });
    }
}

/// 散热中再次右键的轻提示：面板抖一下
pub fn shake_cooling_overlay(app: &AppHandle) {
    if let Some(win) = app.get_webview_window("cooling-overlay") {
        let _ = win.eval("if (window.shake) shake(); void 0;");
    }
}

/// 销毁面板（before-quit / 结果展示到期）
pub fn hide_cooling_overlay(app: &AppHandle) {
    *CoolingPanelState::global().last_payload.lock().unwrap() = None;
    if let Some(win) = app.get_webview_window("cooling-overlay") {
        let _ = win.close();
    }
}

// ===== tauri command（供 bridge / 渲染层调用）=====

#[tauri::command]
pub async fn close_sticky_notes(app: AppHandle) {
    close_all_sticky_notes(&app);
}

#[tauri::command]
pub fn hide_todo_reminder_cmd(app: AppHandle) {
    hide_todo_reminder(&app);
}

#[tauri::command]
pub fn clear_todo_reminder_queue_cmd(app: AppHandle) {
    clear_todo_reminder_queue(&app);
}

#[tauri::command]
pub fn hide_cooling_overlay_cmd(app: AppHandle) {
    hide_cooling_overlay(&app);
}

/// 便签板数据推送（P3 todo 数据层调用；渲染层列表来自 todo_store）
#[tauri::command]
pub async fn push_sticky_notes_cmd(app: AppHandle, notes: Vec<StickyNote>, index: Option<usize>) {
    let idx = index.unwrap_or(0);
    if app.get_webview_window("todo-sticky").is_none() {
        if notes.is_empty() {
            return;
        }
        create_sticky_board(&app);
    }
    if notes.is_empty() {
        close_all_sticky_notes(&app);
        return;
    }
    push_sticky_notes(&app, &notes, idx);
}

/// 贴屏便签「取消贴屏」（便签板 ✕）：落盘 pin=false 后重建便签板。
///
/// 之前只 `emit("todo-toggle-pin-request")` 转发，而没人监听 —— pin 不落盘，
/// 重启后贴纸又回来（实测）。这里直接走数据层，与渲染层 todoTogglePin 同一语义。
pub fn on_sticky_unpin(app: &AppHandle, id: &str) {
    log::info!("sticky unpin: {id}");
    crate::modules::todo::store::update(app, id, &serde_json::json!({ "pinned": false }));
    after_todo_change(app);
}

/// 贴屏便签「打开待办」：拉起待办窗口并聚焦该条
pub fn on_sticky_open(app: &AppHandle, id: &str) {
    log::info!("sticky open: {id}");
    // todo 窗口按需创建：便签打开入口在窗口从未开过时也要能建出
    super::open_or_focus(app, "todo", "/todo");
    let _ = app.emit("todo-focus-item", id);
}

/// 贴屏便签「已完成」（✓）：状态改 done 并从贴屏板移除（✕ 只取消贴屏，这条连状态一起改）。
///
/// 走 update 而不是 store::complete —— complete 只认 todo，pin 过的 memo 在板上同样出现、
/// 会被它静默忽略；update 两种类型都落盘。todo 的 done 本会被 ensure_done_unpins 自动拆 pin，
/// 显式带 pinned:false 让 memo 的观感一致：点 ✓ 这条就从板上关掉。
pub fn on_sticky_done(app: &AppHandle, id: &str) {
    log::info!("sticky done: {id}");
    crate::modules::todo::store::update(
        app,
        id,
        &serde_json::json!({ "done": true, "pinned": false }),
    );
    after_todo_change(app);
}

// ===== 数据变更后的统一副作用（对齐 ipc-handlers.ts 的 refreshTodoBadge + syncStickyNotes）=====

/// 待办数据变更后：刷新悬浮球角标 + 同步贴屏便签 + 广播全量列表（P3 todo 数据层调用）
///
/// todo-data-changed 是渲染层列表镜像的唯一来源（TodoApp 收到就把 store.items 整体换掉）：
/// 便签板 ✕ 取消贴屏这类「主进程侧改动」靠它同步贴屏按钮等状态；之前从没发过这个事件。
pub fn after_todo_change(app: &AppHandle) {
    // 一次数据变更只读一遍 todo-notes.json：角标统计 / 便签同步 / 事件广播共用同一份
    // （原实现三次全量读盘 + refresh_badge 里再读一次 settings）
    let items = crate::modules::todo::store::load_items(app);
    let count = items
        .iter()
        .filter(|i| i.kind == "todo" && !i.done)
        .count();
    let visible = crate::modules::todo::store::load_settings(app).badge_visible;
    let flash = TODO_BADGE_FLASH.load(std::sync::atomic::Ordering::SeqCst);
    if let Some(win) = app.get_webview_window("floating-ball") {
        let _ = win.eval(&format!(
            "if (window.updateBadge) updateBadge({count}, {flash}, {visible}); void 0;"
        ));
    }
    sync_sticky_from_items(app, &items);
    let _ = app.emit("todo-data-changed", items);
}

/// 角标：未完成待办数 + badgeVisible → 推给悬浮球（对齐 refreshTodoBadge）
pub fn refresh_badge(app: &AppHandle) {
    let count = crate::modules::todo::store::incomplete_todo_count(app);
    let visible = crate::modules::todo::store::load_settings(app).badge_visible;
    let flash = TODO_BADGE_FLASH.load(std::sync::atomic::Ordering::SeqCst);
    if let Some(win) = app.get_webview_window("floating-ball") {
        let _ = win.eval(&format!(
            "if (window.updateBadge) updateBadge({count}, {flash}, {visible}); void 0;"
        ));
    }
}

/// 到期闪烁标记（内存态，与 TS 一致：重启丢失）
pub static TODO_BADGE_FLASH: std::sync::atomic::AtomicBool =
    std::sync::atomic::AtomicBool::new(false);

/// 设置闪烁（scheduler 到期时置 true；打开待办窗口时熄灭）
pub fn set_badge_flash(app: &AppHandle, on: bool) {
    TODO_BADGE_FLASH.store(on, std::sync::atomic::Ordering::SeqCst);
    refresh_badge(app);
}

/// 按 store 数据重建贴屏便签（对齐 syncStickyNotes）
pub fn sync_sticky_from_store(app: &AppHandle) {
    let items = crate::modules::todo::store::load_items(app);
    sync_sticky_from_items(app, &items);
}

/// 用已加载的 items 同步便签（after_todo_change 复用，避免重复读盘）
pub fn sync_sticky_from_items(app: &AppHandle, items: &[crate::modules::todo::store::TodoItem]) {
    let notes: Vec<StickyNote> = items
        .iter()
        .filter(|i| i.pinned)
        .map(|it| {
            let txt = crate::modules::todo::store::strip_html(&it.content)
                .trim()
                .to_string();
            let memo_title = if it.kind == "memo" {
                crate::modules::todo::store::strip_html(&it.title)
                    .trim()
                    .to_string()
            } else {
                String::new()
            };
            let is_memo = !memo_title.is_empty();
            StickyNote {
                id: it.id.clone(),
                kind: it.kind.clone(),
                title: if is_memo {
                    memo_title.clone()
                } else {
                    txt.clone()
                },
                body: if is_memo { txt } else { String::new() },
                done: it.done,
                priority: it.priority.clone(),
            }
        })
        .collect();
    sync_sticky_notes(app, notes);
}
