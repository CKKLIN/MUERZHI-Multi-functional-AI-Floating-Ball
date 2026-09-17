// AI 悬浮岛 — 移植 electron/main/ai-island.ts
// 200×44 贴顶居中胶囊：AI 状态点 + 权限审批卡 + AskUserQuestion 提问卡（逐题推进）。
// 穿透：120ms 光标轮询 vs「内容矩形」（窗口宽含 +20 右侧透明缓冲 / 横条态无缓冲），
// 拖拽只允许水平移动（y 固定），用户拖过后 resize 不再拉回居中。
//
// ⚠️ 窗口创建命令必须是 async（同步命令内 build() 与主线程死锁，webview 静默空白），
//    详见 region.rs::start_region_select 注释。

// camelCase 参数名是 Tauri invoke 映射约定（bridge.ts / ai-island.html 传 camelCase）
#![allow(non_snake_case)]

use serde::Serialize;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager, PhysicalPosition, PhysicalSize, WebviewUrl, WebviewWindowBuilder};

pub const TIP_STRIP: f64 = 28.0;
const ISLAND_W: f64 = 200.0;
const ISLAND_H: f64 = 44.0;
const POLL_MS: u64 = 120;

#[derive(Debug, Clone, Copy)]
pub struct Rect {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

pub struct AiIslandState {
    /// 内容矩形（屏幕坐标，物理像素）：光标在内 → 可交互，否则穿透
    pub content: Mutex<Option<Rect>>,
    /// 拖拽基准（绝对增量 + setBounds，仿悬浮球）
    pub drag: Mutex<Option<(f64, f64, f64, f64)>>, // winX, winY, scrX, scrY
    /// 用户拖过后锁定位置（resize 不再拉回居中）
    pub user_moved: AtomicBool,
    pub mouse_ignored: AtomicBool,
    pub poll_running: AtomicBool,
}

impl AiIslandState {
    pub fn global() -> &'static AiIslandState {
        use std::sync::OnceLock;
        static S: OnceLock<AiIslandState> = std::sync::OnceLock::new();
        S.get_or_init(|| AiIslandState {
            content: Mutex::new(None),
            drag: Mutex::new(None),
            user_moved: AtomicBool::new(false),
            mouse_ignored: AtomicBool::new(false),
            poll_running: AtomicBool::new(false),
        })
    }
}

fn island_window(app: &AppHandle) -> Option<tauri::WebviewWindow> {
    app.get_webview_window("ai-island")
}

fn display_scale(app: &AppHandle) -> f64 {
    app.primary_monitor()
        .ok()
        .flatten()
        .map(|m| m.scale_factor())
        .unwrap_or(1.0)
}

/// 窗口所在显示器的物理 bounds（对齐 getDisplayMatching）
fn display_bounds_of(app: &AppHandle, x: i32, y: i32, w: i32, h: i32) -> (i32, i32, i32, i32) {
    let cx = x + w / 2;
    let cy = y + h / 2;
    if let Ok(monitors) = app.available_monitors() {
        for m in monitors {
            let (mx, my, mw, mh) =
                (m.position().x, m.position().y, m.size().width as i32, m.size().height as i32);
            if cx >= mx && cx < mx + mw && cy >= my && cy < my + mh {
                return (mx, my, mw, mh);
            }
        }
    }
    app.primary_monitor()
        .ok()
        .flatten()
        .map(|m| (m.position().x, m.position().y, m.size().width as i32, m.size().height as i32))
        .unwrap_or((0, 0, 1920, 1080))
}

fn set_bounds(app: &AppHandle, win: &tauri::WebviewWindow, x: f64, y: f64, w: f64, h: f64) {
    if !x.is_finite() || !y.is_finite() || !w.is_finite() || !h.is_finite() {
        log::warn!("AI island setBounds skipped (non-finite): {x},{y},{w},{h}");
        return;
    }
    let scale = display_scale(app);
    let _ = win.set_position(PhysicalPosition::new((x / scale).round() as i32, (y / scale).round() as i32));
    let _ = win.set_size(PhysicalSize::new((w / scale).round() as u32, (h / scale).round() as u32));
}

fn get_position(win: &tauri::WebviewWindow, scale: f64) -> (f64, f64) {
    win.outer_position()
        .map(|p| (p.x as f64 * scale, p.y as f64 * scale))
        .unwrap_or((0.0, 0.0))
}

fn get_size(win: &tauri::WebviewWindow, scale: f64) -> (f64, f64) {
    win.outer_size()
        .map(|s| (s.width as f64 * scale, s.height as f64 * scale))
        .unwrap_or((ISLAND_W, ISLAND_H))
}

/// 更新内容矩形并立即按光标位置对一次穿透态（对齐 updateAiIslandContentScreen）
fn update_content_and_poll(app: &AppHandle, rect: Rect) {
    *AiIslandState::global().content.lock().unwrap() = Some(rect);
    poll_pass_through(app);
}

/// 几何判定：光标在内容矩形内 → 可交互；否则穿透（对齐 pollAiIslandPassThrough）
fn poll_pass_through(app: &AppHandle) {
    let Some(win) = island_window(app) else { return };
    let state = AiIslandState::global();
    let content = match *state.content.lock().unwrap() {
        Some(c) => c,
        None => return,
    };
    let Ok(cursor) = win.cursor_position() else { return };
    let scale = display_scale(app);
    let cpx = cursor.x as f64 * scale;
    let cpy = cursor.y as f64 * scale;
    let inside = cpx >= content.x
        && cpx <= content.x + content.width
        && cpy >= content.y
        && cpy <= content.y + content.height;
    let ignore = !inside;
    if ignore != state.mouse_ignored.load(Ordering::SeqCst) {
        state.mouse_ignored.store(ignore, Ordering::SeqCst);
        let _ = win.set_ignore_cursor_events(ignore);
    }
}

fn start_polling(app: &AppHandle) {
    let state = AiIslandState::global();
    if state.poll_running.swap(true, Ordering::SeqCst) {
        return;
    }
    let app = app.clone();
    tauri::async_runtime::spawn(async move {
        loop {
            if !AiIslandState::global().poll_running.load(Ordering::SeqCst) {
                break;
            }
            if island_window(&app).is_none() {
                break;
            }
            poll_pass_through(&app);
            tokio::time::sleep(std::time::Duration::from_millis(POLL_MS)).await;
        }
        AiIslandState::global().poll_running.store(false, Ordering::SeqCst);
    });
}

fn stop_polling() {
    AiIslandState::global().poll_running.store(false, Ordering::SeqCst);
}

// ===== 窗口生命周期 =====

/// 显示 AI 岛（贴主屏顶居中，200×44）
pub fn show_island(app: &AppHandle) {
    if island_window(app).is_some() {
        return;
    }
    let (dx, dy, dw) = match app.primary_monitor() {
        Ok(Some(m)) => (m.position().x, m.position().y, m.size().width as i32),
        _ => (0, 0, 1920),
    };
    let (bx, by, bw) = (dx, dy, dw);
    let x = (bx as f64 + (bw as f64 - ISLAND_W) / 2.0).round();
    let y = by as f64 + 4.0;

    let scale = display_scale(app);
    let url = WebviewUrl::App("windows/ai-island.html".into());
    match WebviewWindowBuilder::new(app, "ai-island", url)
        .title("AI")
        .position((x / scale).round() as f64, (y / scale).round() as f64)
        .inner_size(ISLAND_W / scale, ISLAND_H / scale)
        .decorations(false)
        .transparent(true)
        // 必须非可缩放：Windows 上「透明 + resizable」会外扩不可见命中区且穿透不可靠
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
            // 初始内容矩形：创建时的占位（首帧 resize 会用真实内容尺寸覆盖）
            *AiIslandState::global().content.lock().unwrap() = Some(Rect { x, y, width: ISLAND_W, height: ISLAND_H });
            AiIslandState::global().user_moved.store(false, Ordering::SeqCst);
            let _ = win.set_ignore_cursor_events(false);
            start_polling(app);
            let _ = win.show();
            // 横条态设置注入（HTML 读 window.__AI_FLAT__）
            let flat = crate::modules::commands::app_settings::ai_island_flat(app);
            let _ = win.eval(&format!(
                "window.__AI_FLAT__ = {flat}; if (window.setFlat) setFlat({flat}); void 0;"
            ));
            log::info!("AI island shown");
        }
        Err(e) => log::error!("AI island failed: {e}"),
    }
}

/// 隐藏 AI 岛
pub fn hide_island(app: &AppHandle) {
    if let Some(win) = island_window(app) {
        stop_polling();
        let _ = win.close();
        *AiIslandState::global().content.lock().unwrap() = None;
        log::info!("AI island hidden");
    }
}

// ===== tauri command =====

#[tauri::command]
pub async fn show_ai_island(app: AppHandle) {
    show_island(&app);
}

#[tauri::command]
pub fn hide_ai_island(app: AppHandle) {
    hide_island(&app);
}

/// 渲染层上报内容尺寸 → 三分支定位（对齐 resize-ai-island）
#[tauri::command]
pub fn resize_ai_island(app: AppHandle, contentWidth: f64, contentHeight: Option<f64>) {
    let Some(win) = island_window(&app) else { return };
    if !contentWidth.is_finite() {
        return;
    }
    let total_w = contentWidth + 20.0;
    let h = match contentHeight {
        Some(v) if v.is_finite() => v,
        _ => ISLAND_H,
    };
    if !total_w.is_finite() || !h.is_finite() {
        return;
    }
    let scale = display_scale(&app);
    let (wx, wy) = get_position(&win, scale);
    let (ww, wh) = get_size(&win, scale);
    let flat = crate::modules::commands::app_settings::ai_island_flat(&app);
    let state = AiIslandState::global();

    if flat {
        // 横条态：贴当前屏顶缘居中，宽 = 内容宽（无 +20 缓冲）
        let (bx, by, bw, _) = display_bounds_of(&app, wx as i32, wy as i32, ww as i32, wh as i32);
        let new_x = (bx as f64 + (bw as f64 - contentWidth) / 2.0).round();
        if !new_x.is_finite() {
            return;
        }
        set_bounds(&app, &win, new_x, by as f64, contentWidth, h + TIP_STRIP);
        update_content_and_poll(&app, Rect { x: new_x, y: by as f64, width: contentWidth, height: h });
    } else if state.user_moved.load(Ordering::SeqCst) {
        // 用户拖过：保留位置，只调宽高
        set_bounds(&app, &win, wx, wy, total_w, h + TIP_STRIP);
        update_content_and_poll(&app, Rect { x: wx, y: wy, width: contentWidth, height: h });
    } else {
        // 未拖过：主屏顶居中 + 4px 间隙
        let (bx, by, bw, _) = display_bounds_of(&app, wx as i32, wy as i32, ww as i32, wh as i32);
        let new_x = (bx as f64 + (bw as f64 - total_w) / 2.0).round();
        let new_y = by as f64 + 4.0;
        set_bounds(&app, &win, new_x, new_y, total_w, h + TIP_STRIP);
        update_content_and_poll(&app, Rect { x: new_x, y: new_y, width: contentWidth, height: h });
    }
}

/// AI 岛拖动：只水平移动，y 固定（对齐 ai-island-drag-*）
#[tauri::command]
pub fn ai_island_drag_start(app: AppHandle, sx: f64, sy: f64) {
    if !sx.is_finite() || !sy.is_finite() {
        return;
    }
    let Some(win) = island_window(&app) else { return };
    let scale = display_scale(&app);
    let (wx, wy) = get_position(&win, scale);
    *AiIslandState::global().drag.lock().unwrap() = Some((wx, wy, sx, sy));
}

#[tauri::command]
pub fn ai_island_drag_move(app: AppHandle, sx: f64, _sy: f64) {
    let (win_x, win_y, scr_x, _scr_y) = match *AiIslandState::global().drag.lock().unwrap() {
        Some(d) => d,
        None => return,
    };
    if !sx.is_finite() || !scr_x.is_finite() || !win_x.is_finite() || !win_y.is_finite() {
        return;
    }
    let Some(win) = island_window(&app) else { return };
    let nx = (win_x + (sx - scr_x)).round();
    if !nx.is_finite() {
        return;
    }
    let scale = display_scale(&app);
    let (ww, wh) = get_size(&win, scale);
    set_bounds(&app, &win, nx, win_y, ww, wh);
    let flat = crate::modules::commands::app_settings::ai_island_flat(&app);
    let content_w = if flat { ww } else { ww - 20.0 };
    update_content_and_poll(&app, Rect { x: nx, y: win_y, width: content_w, height: wh });
}

#[tauri::command]
pub fn ai_island_drag_end(app: AppHandle) {
    *AiIslandState::global().drag.lock().unwrap() = None;
    // 横条态位置固定、拖动无效，只有普通态才记录「已移动」
    if !crate::modules::commands::app_settings::ai_island_flat(&app) {
        AiIslandState::global().user_moved.store(true, Ordering::SeqCst);
    }
}

/// 渲染层 mousemove/pointerdown 兜底切换穿透（对齐 set-ai-island-mouse-mode）
#[tauri::command]
pub fn set_ai_island_mouse_mode(app: AppHandle, interactive: bool) {
    let Some(win) = island_window(&app) else { return };
    let ignore = !interactive;
    let state = AiIslandState::global();
    if ignore != state.mouse_ignored.load(Ordering::SeqCst) {
        state.mouse_ignored.store(ignore, Ordering::SeqCst);
        let _ = win.set_ignore_cursor_events(ignore);
    }
}

/// 状态/卡片推送到岛（对齐 agent-state-update / agent-card-update 的 webContents.send）
#[allow(dead_code)]
pub fn push_state(app: &AppHandle, payload: serde_json::Value) {
    if let Some(win) = island_window(app) {
        let _ = win.eval(&format!(
            "window.applyState && window.applyState({}); void 0;",
            payload
        ));
    }
    let _ = app.emit("agent-state-update", payload);
}

#[allow(dead_code)]
pub fn push_card(app: &AppHandle, payload: serde_json::Value) {
    if let Some(win) = island_window(app) {
        let _ = win.eval(&format!(
            "window.applyCard && window.applyCard({}); void 0;",
            payload
        ));
    }
    let _ = app.emit("agent-card-update", payload);
}

/// 横条态切换（对齐 ai-island-set-flat）
pub fn push_flat(app: &AppHandle, flat: bool) {
    if let Some(win) = island_window(app) {
        let _ = win.eval(&format!("window.setFlat && window.setFlat({flat}); void 0;"));
    }
}

/// 串行化卡片载荷（供 P3 agent 模块调用）
#[allow(dead_code)]
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CardPush {
    pub kind: String,
    pub session_id: String,
    pub tool_name: String,
    pub tool_input: serde_json::Value,
}
