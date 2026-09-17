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
        S.get_or_init(|| StickyState { move_timer_running: Mutex::new(false) })
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
        S.get_or_init(|| ReminderState { queue: Mutex::new(Vec::new()) })
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
        S.get_or_init(|| CoolingPanelState { last_payload: Mutex::new(None) })
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
            (wa.position.x, wa.position.y, wa.size.width as i32, wa.size.height as i32)
        })
        .unwrap_or((0, 0, 1920, 1040))
}

fn window_url(path: &str) -> WebviewUrl {
    WebviewUrl::App(path.to_string().into())
}

// ===== 贴屏便签板 =====

/// 数据变更后同步便签板（notes 为空则拆窗，否则建窗/推数据）
pub fn sync_sticky_notes(app: &AppHandle, notes: Vec<StickyNote>) {
    let Some(win) = app.get_webview_window("todo-sticky") else {
        if notes.is_empty() {
            return;
        }
        create_sticky_board(app);
        // 建窗后由页面 ready 事件推数据（此处也推一次兜底）
        push_sticky_notes(app, &notes, 0);
        return;
    };
    if notes.is_empty() {
        let _ = win.close();
        return;
    }
    push_sticky_notes(app, &notes, 0);
}

fn create_sticky_board(app: &AppHandle) {
    let (ax, ay, aw, ah) = work_area_physical(app);
    let x = ax as f64 + aw as f64 - BOARD_W - 16.0;
    let y = ay as f64 + ah as f64 - BOARD_H - 16.0;
    let scale = display_scale(app);
    match WebviewWindowBuilder::new(app, "todo-sticky", window_url("windows/todo-sticky.html"))
        .title("便签")
        .position((x / scale).round(), (y / scale).round())
        .inner_size(BOARD_W / scale, BOARD_H / scale)
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

/// 关闭全部贴屏便签（退出清理，对齐 closeAllStickyNotes）
pub fn close_all_sticky_notes(app: &AppHandle) {
    if let Some(win) = app.get_webview_window("todo-sticky") {
        let _ = win.close();
    }
}

// ===== 到期提醒弹窗 =====

/// 入队一条提醒（同屏只弹一个，关闭后弹下一条）
pub fn show_todo_reminder(app: &AppHandle, title: String, body: String) {
    ReminderState::global().queue.lock().unwrap().push((title, body));
    pump_reminder(app);
}

fn pump_reminder(app: &AppHandle) {
    if app.get_webview_window("todo-reminder").is_some() {
        return; // 已有一个在显示
    }
    let next = ReminderState::global().queue.lock().unwrap().first().cloned();
    let Some((title, body)) = next else { return };
    ReminderState::global().queue.lock().unwrap().remove(0);
    open_reminder_popup(app, title, body);
}

fn open_reminder_popup(app: &AppHandle, title: String, body: String) {
    let (ax, ay, aw, ah) = work_area_physical(app);
    let x = ax as f64 + aw as f64 - REMINDER_W - 16.0;
    let y = ay as f64 + ah as f64 - REMINDER_H - 16.0;
    let scale = display_scale(app);
    match WebviewWindowBuilder::new(app, "todo-reminder", window_url("windows/todo-reminder.html"))
        .title("提醒")
        .position((x / scale).round(), (y / scale).round())
        .inner_size(REMINDER_W / scale, REMINDER_H / scale)
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

/// 由球心推面板左上角（上方优先，放不下翻下方，水平夹回屏幕内）
fn panel_origin(app: &AppHandle, center: (i32, i32)) -> (i32, i32) {
    let (ax, ay, aw, _ah) = work_area_physical(app);
    let mut x = (center.0 as f64 - PANEL_W / 2.0).round() as i32;
    let mut y = (center.1 as f64 - BALL_HALF - GAP - PANEL_H).round() as i32;
    if y < ay {
        y = (center.1 as f64 + BALL_HALF + GAP).round() as i32;
    }
    x = x.clamp(ax, ax + aw - PANEL_W as i32);
    (x, y)
}

/// 创建并显示散热面板（center 为 None 时放弃；已存在则复用刷状态）
pub fn show_cooling_overlay(app: &AppHandle, center: Option<(i32, i32)>) {
    if let Some(win) = app.get_webview_window("cooling-overlay") {
        if let Some(p) = CoolingPanelState::global().last_payload.lock().unwrap().clone() {
            let _ = win.eval(&format!(
                "if (window.updateCooling) updateCooling({p}); void 0;"
            ));
        }
        return;
    }
    let Some(c) = center else { return };
    let (px, py) = panel_origin(app, c);
    let scale = display_scale(app);
    match WebviewWindowBuilder::new(app, "cooling-overlay", window_url("windows/cooling-overlay.html"))
        .title("散热")
        .position((px as f64 / scale).round(), (py as f64 / scale).round())
        .inner_size(PANEL_W / scale, PANEL_H / scale)
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
            if let Some(p) = CoolingPanelState::global().last_payload.lock().unwrap().clone() {
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
    let (Some(win), Some(c)) = (app.get_webview_window("cooling-overlay"), center) else { return };
    let (px, py) = panel_origin(app, c);
    let scale = display_scale(app);
    let _ = win.set_position(tauri::PhysicalPosition::new(
        (px as f64 / scale).round() as i32,
        (py as f64 / scale).round() as i32,
    ));
}

/// 推送状态到面板（phase==='done' 时启动 3s 自毁）
pub fn update_cooling_overlay(app: &AppHandle, payload: serde_json::Value) {
    *CoolingPanelState::global().last_payload.lock().unwrap() = Some(payload.clone());
    let Some(win) = app.get_webview_window("cooling-overlay") else { return };
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

/// 贴屏便签「取消贴屏」：P3 接 todo 数据层做 pin=false 持久化；当前转发事件由数据层处理
pub fn on_sticky_unpin(app: &AppHandle, id: &str) {
    log::info!("sticky unpin: {id}");
    let _ = app.emit("todo-toggle-pin-request", id);
}

/// 贴屏便签「打开待办」：拉起待办窗口并聚焦该条
pub fn on_sticky_open(app: &AppHandle, id: &str) {
    log::info!("sticky open: {id}");
    if let Some(win) = app.get_webview_window("todo") {
        let _ = win.show();
        let _ = win.set_focus();
    }
    let _ = app.emit("todo-focus-item", id);
}
