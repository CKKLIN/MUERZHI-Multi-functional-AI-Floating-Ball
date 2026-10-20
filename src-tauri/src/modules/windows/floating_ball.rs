// 悬浮球 — 移植 electron/main/floating-ball.ts（G5 水滴吸附版）
// 窗口 66/240 双形态、绝对增量拖拽 + DWM 读回修正、elasticOut 贴边动画、
// 100ms 光标轮询穿透（展开圆 78 / 吸附胶囊 / 收起圆 30 三种几何）、位置持久化。
// UI 由 public/windows/floating-ball.html 承载（Tauri 无 data:URL 窗口），
// 本文件负责窗口几何/状态机/穿透，渲染层经 event 与 command 交互。

use crate::modules::settings::{settings_file, BallSettings};
use serde::Serialize;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use tauri::{
    AppHandle, Emitter, Manager, PhysicalPosition, PhysicalSize, WebviewUrl, WebviewWindowBuilder,
};

pub const BALL_SIZE: f64 = 66.0;
pub const RING_SIZE: f64 = 240.0;
const SNAP: f64 = 40.0;
const PASS_R_EXPANDED: f64 = 78.0;
const PASS_R_BALL: f64 = 30.0;
const POS_FILE: &str = "floating-ball-pos.json";
const COLLAPSE_TIMER_MS: u64 = 920; // > 花瓣动画 0.5s + 最大错落 0.4s

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum SnapSide {
    Left,
    Right,
    Top,
    Bottom,
}

/// 拖拽锚点（光标跟随法）
///
/// win = 按下时窗口**中心**物理坐标；scr = 按下时光标物理坐标；offset = win - scr，
/// 拖动期间恒定，每帧「窗口中心 = 光标 + offset」。用中心而非左上角：跨屏切换尺寸时
/// Windows 会按 DPI 重排窗口（尺寸变了左上角锚点语义漂移，实测固定偏 -130,-130），
/// 中心 + 「先 set_size 后 set_position」的顺序能让位置设置最终生效、覆盖重排。
#[derive(Debug, Clone, Copy)]
pub struct DragOrigin {
    pub win_x: f64,
    pub win_y: f64,
    pub scr_x: f64,
    pub scr_y: f64,
    pub w: f64,
    pub h: f64,
}

pub struct BallState {
    /// 66 球左上角（物理像素）
    pub pos: Mutex<Option<(i32, i32)>>,
    /// 拖拽起点绝对基准（Some = 拖拽中）
    pub drag: Mutex<Option<DragOrigin>>,
    pub expanded: AtomicBool,
    pub snapped_side: Mutex<Option<SnapSide>>,
    pub mouse_ignored: AtomicBool,
    /// collapseTimer 等价（快速连点时 expand 取消收尾）
    pub collapse_scheduled: AtomicBool,
    pub poll_running: AtomicBool,
    /// 散热触发了「临时展开」（触发时菜单是收起的）→ 结束后 restore_after_cooling 收回；
    /// 菜单原本就展开的不置位（结束后保持展开）
    pub cooling_temp_expanded: AtomicBool,
}

impl BallState {
    pub fn global() -> &'static BallState {
        use std::sync::OnceLock;
        static S: OnceLock<BallState> = std::sync::OnceLock::new();
        S.get_or_init(|| BallState {
            pos: Mutex::new(None),
            drag: Mutex::new(None),
            expanded: AtomicBool::new(false),
            snapped_side: Mutex::new(None),
            mouse_ignored: AtomicBool::new(true),
            collapse_scheduled: AtomicBool::new(false),
            poll_running: AtomicBool::new(false),
            cooling_temp_expanded: AtomicBool::new(false),
        })
    }
}

fn pos_path(app: &AppHandle) -> std::path::PathBuf {
    settings_file(app, POS_FILE)
}

pub fn load_ball_position(app: &AppHandle) -> Option<(i32, i32)> {
    let text = std::fs::read_to_string(pos_path(app)).ok()?;
    let v: serde_json::Value = serde_json::from_str(&text).ok()?;
    Some((v.get("x")?.as_i64()? as i32, v.get("y")?.as_i64()? as i32))
}

pub fn save_ball_position(app: &AppHandle, pos: (i32, i32)) {
    if let Ok(s) = serde_json::to_string(&serde_json::json!({ "x": pos.0, "y": pos.1 })) {
        let _ = std::fs::write(pos_path(app), s);
    }
}

pub fn clear_ball_position(app: &AppHandle) {
    let _ = std::fs::remove_file(pos_path(app));
    *BallState::global().pos.lock().unwrap() = None;
}

/// 带防御的 setBounds：非有限值丢弃 + 吞错（对齐 TS setBallBounds）
///
/// 量纲：x/y/w/h 一律**物理像素**（窗口几何真相域）。BALL_SIZE/RING_SIZE 是页面的
/// CSS 尺寸语义，物理值 = CSS × 缩放比 —— 由调用方换算（窗口尺寸随所在屏 DPI 变化，
/// 从窗口中心反查显示器拿 scale，位置用拖拽链已换算好的物理坐标原样传）。
///
/// ⚠️ 之前直接把 66/240 当物理值塞给 set_size：150% 屏窗口只有 2/3 大小，页面视口
/// 装不下 66 CSS 的球体/240 CSS 的花瓣环 → 球和展开菜单被硬裁（实测）。
pub fn set_ball_bounds(win: &tauri::WebviewWindow, x: f64, y: f64, w: f64, h: f64) {
    if !x.is_finite() || !y.is_finite() || !w.is_finite() || !h.is_finite() {
        log::warn!("Floating ball setBounds skipped (non-finite): {x},{y},{w},{h}");
        return;
    }
    let _ = win.set_position(PhysicalPosition::new(x.round() as i32, y.round() as i32));
    let _ = win.set_size(PhysicalSize::new(w.round() as u32, h.round() as u32));
}

/// CSS 尺寸 → 该屏物理尺寸（悬浮球常量在调用方与 set_ball_bounds 之间走这一步）
fn scaled_for_window(
    app: &tauri::AppHandle,
    win: &tauri::WebviewWindow,
    css: f64,
    x: i32,
    y: i32,
    w: i32,
    h: i32,
) -> f64 {
    let _ = win;
    css * ball_scale_at(app, x, y, w, h)
}

fn get_position(win: &tauri::WebviewWindow) -> (f64, f64) {
    win.outer_position()
        .map(|p| (p.x as f64, p.y as f64))
        .unwrap_or((0.0, 0.0))
}

fn get_size(win: &tauri::WebviewWindow) -> (f64, f64) {
    win.outer_size()
        .map(|s| (s.width as f64, s.height as f64))
        .unwrap_or((BALL_SIZE, BALL_SIZE))
}

/// 66 球左上角：由窗口中心反推（展开 240/收起 66 同心，展开态拖拽不污染位置）
///
/// 返回**物理坐标**。窗口恒为环尺寸（物理）→ scale = ww / RING_SIZE，
/// 球物理半边 = BALL_SIZE × scale / 2（不能用常量 33：150% 屏球实际半边是 49.5）。
fn ball_pos_from_window(wx: f64, wy: f64, ww: f64, wh: f64) -> (i32, i32) {
    let scale = if ww > 0.0 { ww / RING_SIZE } else { 1.0 };
    (
        (wx + ww / 2.0 - BALL_SIZE * scale / 2.0).round() as i32,
        (wy + wh / 2.0 - BALL_SIZE * scale / 2.0).round() as i32,
    )
}

fn primary_bounds(app: &AppHandle) -> (i32, i32, i32, i32) {
    app.primary_monitor()
        .ok()
        .flatten()
        .map(|m| {
            (
                m.position().x,
                m.position().y,
                m.size().width as i32,
                m.size().height as i32,
            )
        })
        .unwrap_or((0, 0, 1920, 1080))
}

/// 找包含窗口中心的显示器物理 bounds（对齐 getDisplayMatching）
fn display_bounds_of(app: &AppHandle, x: i32, y: i32, w: i32, h: i32) -> (i32, i32, i32, i32) {
    let cx = x + w / 2;
    let cy = y + h / 2;
    if let Ok(monitors) = app.available_monitors() {
        for m in monitors {
            let (mx, my, mw, mh) = (
                m.position().x,
                m.position().y,
                m.size().width as i32,
                m.size().height as i32,
            );
            if cx >= mx && cx < mx + mw && cy >= my && cy < my + mh {
                return (mx, my, mw, mh);
            }
        }
    }
    primary_bounds(app)
}

/// 窗口中心所在显示器的缩放比（供 CSS↔物理换算；找不到时退主屏）
pub fn ball_scale_at(app: &AppHandle, x: i32, y: i32, w: i32, h: i32) -> f64 {
    let (bx, by, _, _) = display_bounds_of(app, x, y, w, h);
    let cx = x + w / 2;
    let cy = y + h / 2;
    if let Ok(monitors) = app.available_monitors() {
        for m in monitors {
            let (mx, my) = (m.position().x, m.position().y);
            if cx >= mx
                && cx < mx + m.size().width as i32
                && cy >= my
                && cy < my + m.size().height as i32
            {
                return m.scale_factor();
            }
        }
    }
    let _ = bx;
    let _ = by;
    app.primary_monitor()
        .ok()
        .flatten()
        .map(|m| m.scale_factor())
        .unwrap_or(1.0)
}

/// elasticOut 缓动（easeOutBack 式末尾过冲，对齐 TS elasticOut）
fn elastic_out(t: f64) -> f64 {
    if t <= 0.0 {
        return 0.0;
    }
    if t >= 1.0 {
        return 1.0;
    }
    let c4 = 2.0 * std::f64::consts::PI / 3.0;
    2.0f64.powf(-10.0 * t) * ((t * 10.0 - 0.75) * c4).sin() + 1.0
}

/// drag-end 贴边判定（对齐 detectEdgeSnap）：最近且 < SNAP 的边
///
/// SNAP 与 gutter 都是 **CSS 像素语义**（Electron 版 DIP），判定用的 x/y/w/h 是物理 ——
/// 阈值与留白必须 ×所在屏 scale。不换算时 150% 屏的有效吸附圈只有 26.7 CSS px，
/// 用户拖到视觉很贴边了仍不吸附（实测「吸附不了」）。
fn detect_edge_snap(app: &AppHandle, x: i32, y: i32, w: i32, h: i32) -> Option<SnapSide> {
    let settings = BallSettings::load(app);
    let scale = ball_scale_at(app, x, y, w, h);
    let snap = SNAP * scale;
    let gutter = settings.snap_gutter * scale;
    // 窗口恒环尺寸，贴边语义以 66 球为准：检测点从环左上换回球左上（+half）
    let half = (RING_SIZE - BALL_SIZE) * scale / 2.0;
    let x = x + half.round() as i32;
    let y = y + half.round() as i32;
    let w = (BALL_SIZE * scale).round() as i32;
    let h = w;
    let (bx, by, bw, bh) = display_bounds_of(app, x, y, w, h);
    let dl = (x as f64 - (bx as f64 + gutter)).abs();
    let dr = ((bx as f64 + bw as f64 - gutter) - (x + w) as f64).abs();
    let dt = (y as f64 - (by as f64 + gutter)).abs();
    let db = ((by as f64 + bh as f64 - gutter) - (y + h) as f64).abs();
    let mut best: Option<(f64, SnapSide)> = None;
    for (d, side) in [
        (dl, SnapSide::Left),
        (dr, SnapSide::Right),
        (dt, SnapSide::Top),
        (db, SnapSide::Bottom),
    ] {
        if d < snap && best.map(|(bd, _)| d < bd).unwrap_or(true) {
            best = Some((d, side));
        }
    }
    best.map(|(_, s)| s)
}

/// 指定吸附边的目标坐标（对齐 snapTargetFor）：gutter 同样 ×scale（见 detect_edge_snap）
fn snap_target_for(app: &AppHandle, side: SnapSide, x: i32, y: i32, w: i32, h: i32) -> (i32, i32) {
    let settings = BallSettings::load(app);
    let scale = ball_scale_at(app, x, y, w, h);
    let gutter = settings.snap_gutter * scale;
    // 以 66 球为准（同 detect_edge_snap 的换算）
    let half = (RING_SIZE - BALL_SIZE) * scale / 2.0;
    let x = x + half.round() as i32;
    let y = y + half.round() as i32;
    let w = (BALL_SIZE * scale).round() as i32;
    let h = w;
    let (bx, by, bw, bh) = display_bounds_of(app, x, y, w, h);
    match side {
        SnapSide::Left => (bx + gutter as i32, y),
        SnapSide::Right => (bx + bw - gutter as i32 - w, y),
        SnapSide::Top => (x, by + gutter as i32),
        SnapSide::Bottom => (x, by + bh - gutter as i32 - h),
    }
}

fn send_snap_visual(app: &AppHandle, side: Option<SnapSide>) {
    let payload = side.map(|s| serde_json::to_value(s).unwrap_or_default());
    let _ = app.emit("ball-snap", payload);
}

fn ball_window(app: &AppHandle) -> Option<tauri::WebviewWindow> {
    app.get_webview_window("floating-ball")
}

/// 光标轮询穿透判定（对齐 pollBallPassThrough）：
/// 拖拽强制交互 / 展开窗心圆 78 / 吸附胶囊+2 / 收起圆 30
fn poll_with_cursor(app: &AppHandle, cursor: tauri::PhysicalPosition<i32>) {
    let Some(win) = ball_window(app) else { return };
    let state = BallState::global();
    if state.drag.lock().unwrap().is_some() {
        if state.mouse_ignored.load(Ordering::SeqCst) {
            state.mouse_ignored.store(false, Ordering::SeqCst);
            let _ = win.set_ignore_cursor_events(false);
        }
        return;
    }
    let (wx, wy) = get_position(&win);
    let (ww, wh) = get_size(&win);
    let cpx = cursor.x as f64;
    let cpy = cursor.y as f64;
    // 下列几何常量全是 **CSS 语义**（与 floating-ball.html 一一对应），光标/窗口坐标
    // 是物理 —— 必须 ×scale 换算。不换算时 150% 屏上判定圆只有 2/3 大小：展开态花瓣
    // 外半圈被误判成「不在窗口内」→ 穿透 → 点花瓣空白没反应、要点到图标/文字才行（实测）。
    let scale = ball_scale_at(app, wx as i32, wy as i32, ww as i32, wh as i32);
    // 窗口恒为环尺寸：66 球坐标系（页面 CSS/snap 几何的锚定系）相对窗口左上偏移 half
    let half_x = (ww - BALL_SIZE * scale) / 2.0;
    let half_y = (wh - BALL_SIZE * scale) / 2.0;
    // 按内容形态判定（expanded 标志与收起动画期可能短暂不一致，吸附态/圆球态以
    // 窗口中心几何区分 —— 窗口恒定后尺寸不再是形态信号）
    let inside = if state.expanded.load(Ordering::SeqCst) {
        // 展开窗：窗心圆（花瓣环 r2=75+3 + 中心按钮）
        let pass_r = PASS_R_EXPANDED * scale;
        let dx = cpx - (wx + ww / 2.0);
        let dy = cpy - (wy + wh / 2.0);
        dx * dx + dy * dy <= pass_r * pass_r
    } else {
        let snapped = *state.snapped_side.lock().unwrap();
        if let Some(side) = snapped {
            // 吸附收起态：水滴胶囊矩形 + 2px 余量（与 snap-* CSS 几何一一对应；
            // CSS 锚在 66 球坐标系 → 整体 + half 偏移到环窗口）
            let s = 2.0 * scale;
            let ball = BALL_SIZE * scale;
            let (x0, y0, x1, y1) = match side {
                SnapSide::Left => (
                    half_x,
                    4.0 * scale - s + half_y,
                    half_x + 44.0 * scale + s,
                    half_y + 62.0 * scale + s,
                ),
                SnapSide::Right => (
                    half_x + 22.0 * scale - s,
                    4.0 * scale - s + half_y,
                    half_x + ball,
                    half_y + 62.0 * scale + s,
                ),
                SnapSide::Top => (
                    half_x + 4.0 * scale - s,
                    half_y,
                    half_x + 62.0 * scale + s,
                    half_y + 44.0 * scale + s,
                ),
                SnapSide::Bottom => (
                    half_x + 4.0 * scale - s,
                    half_y + 22.0 * scale - s,
                    half_x + 62.0 * scale + s,
                    half_y + ball,
                ),
            };
            let lx = cpx - wx;
            let ly = cpy - wy;
            lx >= x0 && lx <= x1 && ly >= y0 && ly <= y1
        } else {
            // 未吸附收起态：中央 56px 圆（半径 28+2），四角透明区穿透
            let pass_r = PASS_R_BALL * scale;
            let dx = cpx - (wx + ww / 2.0);
            let dy = cpy - (wy + wh / 2.0);
            dx * dx + dy * dy <= pass_r * pass_r
        }
    };
    let ignore = !inside;
    if ignore != state.mouse_ignored.load(Ordering::SeqCst) {
        state.mouse_ignored.store(ignore, Ordering::SeqCst);
        let _ = win.set_ignore_cursor_events(ignore);
    }
}

/// 100ms 光标轮询循环（对齐 startBallMousePolling）
fn start_mouse_polling(app: &AppHandle) {
    let state = BallState::global();
    if state.poll_running.swap(true, Ordering::SeqCst) {
        return;
    }
    let app = app.clone();
    tauri::async_runtime::spawn(async move {
        // 自适应粒度：光标贴近窗口（≤ FAR，可能要进穿透判定/点球）或展开/拖拽中
        // 用 100ms（跟手）；光标远离且收起态降到 400ms —— 100ms 的 Win32 光标查询
        // 只在「光标可能马上要摸到球」时才有意义，远离时 10Hz 空查纯属浪费。
        const ACTIVE_MS: u64 = 100;
        const FAR_MS: u64 = 400;
        const FAR_PX: f64 = 200.0;
        loop {
            if !BallState::global().poll_running.load(Ordering::SeqCst) {
                break;
            }
            let mut interval_ms = ACTIVE_MS;
            match ball_window(&app) {
                Some(win) => {
                    if let Ok(cursor) = win.cursor_position() {
                        let state = BallState::global();
                        let busy = state.expanded.load(Ordering::SeqCst)
                            || state.drag.lock().unwrap().is_some();
                        if !busy {
                            let (wx, wy) = get_position(&win);
                            let dx = cursor.x as f64 - (wx + get_size(&win).0 / 2.0);
                            let dy = cursor.y as f64 - (wy + get_size(&win).1 / 2.0);
                            if dx * dx + dy * dy > FAR_PX * FAR_PX {
                                interval_ms = FAR_MS;
                            }
                        }
                        poll_with_cursor(
                            &app,
                            tauri::PhysicalPosition::new(
                                cursor.x.round() as i32,
                                cursor.y.round() as i32,
                            ),
                        );
                    }
                }
                None => break,
            }
            tokio::time::sleep(std::time::Duration::from_millis(interval_ms)).await;
        }
        BallState::global()
            .poll_running
            .store(false, Ordering::SeqCst);
    });
}

fn stop_mouse_polling() {
    BallState::global()
        .poll_running
        .store(false, Ordering::SeqCst);
}

/// show/恢复吸附（对齐 restoreSnapIfNeeded）：优先内存边钉回屏幕边缘，无保存边才位置重判
pub fn restore_snap_if_needed(app: &AppHandle) {
    let Some(win) = ball_window(app) else { return };
    let state = BallState::global();
    let (x, y) = get_position(&win);
    let (w, h) = get_size(&win);
    let mut side = *state.snapped_side.lock().unwrap();
    if side.is_none() {
        side = detect_edge_snap(app, x as i32, y as i32, w as i32, h as i32);
    }
    if let Some(side) = side {
        let t = snap_target_for(app, side, x as i32, y as i32, w as i32, h as i32);
        // 窗口恒定 240：只挪位置（66 球左上语义 → 环左上 = t - (ring-ball)/2），尺寸不变
        let ring = scaled_for_window(app, &win, RING_SIZE, t.0, t.1, w as i32, h as i32);
        let ball = scaled_for_window(app, &win, BALL_SIZE, t.0, t.1, w as i32, h as i32);
        let half = (ring - ball) / 2.0;
        set_ball_bounds(&win, t.0 as f64 - half, t.1 as f64 - half, ring, ring);
        let mut pos = state.pos.lock().unwrap();
        *pos = Some(t);
        if let Some(p) = *pos {
            save_ball_position(app, p);
        }
        *state.snapped_side.lock().unwrap() = Some(side);
        send_snap_visual(app, Some(side));
    }
}

/// 清除吸附态（拖动开始/隐藏）：清边标记 + 收水滴视觉（对齐 clearSnap）
pub fn clear_snap(app: &AppHandle) {
    let state = BallState::global();
    let mut s = state.snapped_side.lock().unwrap();
    if s.is_some() {
        *s = None;
        drop(s);
        send_snap_visual(app, None);
    }
}

/// 仅清除吸附视觉（保留内存边；展开菜单用，对齐 clearSnapVisualOnly）
fn clear_snap_visual_only(app: &AppHandle) {
    let s = *BallState::global().snapped_side.lock().unwrap();
    if s.is_some() {
        send_snap_visual(app, None);
    }
}

/// elasticOut 贴边动画（对齐 animateSnapToEdge）：420ms 弹性过渡，落稳后 DWM 修正 + 持久化
///
/// from/to 是物理像素；尺寸按目标屏 scale 换算（BALL_SIZE 是 CSS 语义，见 set_ball_bounds 注释）
pub fn animate_snap_to_edge(app: &AppHandle, from: (f64, f64), to: (f64, f64), side: SnapSide) {
    if !from.0.is_finite() || !from.1.is_finite() || !to.0.is_finite() || !to.1.is_finite() {
        log::warn!("Floating ball snap skipped (non-finite input)");
        return;
    }
    let app = app.clone();
    let start = std::time::Instant::now();
    tauri::async_runtime::spawn(async move {
        loop {
            let Some(win) = ball_window(&app) else { return };
            let (x, y, w, h) = {
                let (wx, wy) = get_position(&win);
                let (ww, wh) = get_size(&win);
                (wx, wy, ww, wh)
            };
            // 恒定环尺寸；to 是 66 球左上语义 → 环左上 = to - (ring-ball)/2
            let ring = scaled_for_window(
                &app, &win, RING_SIZE, x as i32, y as i32, w as i32, h as i32,
            );
            let ball = scaled_for_window(
                &app, &win, BALL_SIZE, x as i32, y as i32, w as i32, h as i32,
            );
            let half = (ring - ball) / 2.0;
            let t = (start.elapsed().as_secs_f64() * 1000.0 / 420.0).min(1.0);
            let e = elastic_out(t);
            let nx = from.0 + (to.0 - half - from.0) * e;
            let ny = from.1 + (to.1 - half - from.1) * e;
            set_ball_bounds(&win, nx, ny, ring, ring);
            if t >= 1.0 {
                let final_x = to.0 - half;
                let final_y = to.1 - half;
                let (ax, ay) = get_position(&win);
                if (ax as i32) != final_x.round() as i32 || (ay as i32) != final_y.round() as i32 {
                    set_ball_bounds(&win, final_x, final_y, ring, ring);
                }
                let state = BallState::global();
                *state.snapped_side.lock().unwrap() = Some(side);
                send_snap_visual(&app, Some(side));
                let mut pos = state.pos.lock().unwrap();
                *pos = Some((to.0.round() as i32, to.1.round() as i32));
                if let Some(p) = *pos {
                    save_ball_position(&app, p);
                }
                break;
            }
            tokio::time::sleep(std::time::Duration::from_millis(16)).await;
        }
    });
}

/// 展开菜单（对齐 expandBall）：窗口恒定 240 CSS×scale（show_ball/跟随循环已保证），
/// 这里只更新 pos/锚点并通知页面绽放 —— **不再 resize 窗口**。
///
/// 为什么不 resize：窗口 66→240 扩大的那一瞬间，WebView2 需要一帧才按新视口重排，
/// 旧帧内容贴窗口左上角渲染成残影（fixed+50% 也救不了 —— 50% 相对视口，视口本身
/// 在变，实测跨屏后第一次展开闪跳最明显）。窗口恒定尺寸后视口永不变，展开/收起
/// 纯页面动画，零闪。窗口大出来的区域由穿透轮询按内容几何精确放行/穿透。
pub fn expand_ball(app: &AppHandle) {
    let Some(win) = ball_window(app) else { return };
    let state = BallState::global();
    clear_snap_visual_only(app);
    state.collapse_scheduled.store(false, Ordering::SeqCst);
    let (wx, wy) = get_position(&win);
    let (ww, wh) = get_size(&win);
    let cx = wx + ww / 2.0;
    let cy = wy + wh / 2.0;
    let ball_phys = scaled_for_window(
        app, &win, BALL_SIZE, wx as i32, wy as i32, ww as i32, wh as i32,
    );
    // pos 同步为 66 球物理左上角（球心 - 66 球物理半边；collapse_anchor 已随恒定窗口废除）
    *state.pos.lock().unwrap() = Some((
        (cx - ball_phys / 2.0).round() as i32,
        (cy - ball_phys / 2.0).round() as i32,
    ));
    log::info!(
        "ball expand: 窗口({:.0},{:.0}) {}x{}（恒定，无 resize），球心=({:.0},{:.0})",
        wx,
        wy,
        ww,
        wh,
        cx,
        cy
    );
    let _ = win.eval("restartBloom && restartBloom(); void 0;");
    state.expanded.store(true, Ordering::SeqCst);
    let _ = app.emit("ball-state", "expanded");
}

/// 收起成 66 球（对齐 collapseBall 的 920ms 收尾语义：先合拢动画再清 DOM）
pub fn collapse_ball(app: &AppHandle) {
    let Some(win) = ball_window(app) else { return };
    let state = BallState::global();
    state.expanded.store(false, Ordering::SeqCst);
    // 窗口恒定环尺寸后收起不再移动窗口：同步 pos（66 球左上）供保存/下次展开用
    {
        let (x, y) = get_position(&win);
        let (ww, wh) = get_size(&win);
        *state.pos.lock().unwrap() = Some(ball_pos_from_window(x, y, ww, wh));
    }
    // 先移除 expanded class 让花瓣按 CSS 动画收合；920ms 后清 DOM + 恢复吸附
    let _ = win.eval("document.body.classList.remove('expanded'); isExpanded=false; void 0;");
    state.collapse_scheduled.store(true, Ordering::SeqCst);
    let app2 = app.clone();
    tauri::async_runtime::spawn(async move {
        tokio::time::sleep(std::time::Duration::from_millis(COLLAPSE_TIMER_MS)).await;
        let state = BallState::global();
        if !state.collapse_scheduled.swap(false, Ordering::SeqCst) {
            return; // 已被新的 expand 取消
        }
        if state.expanded.load(Ordering::SeqCst) {
            return; // 动画期间被重新展开
        }
        let Some(win) = ball_window(&app2) else {
            return;
        };
        let _ = win.eval(
            "var s=document.getElementById('ringSvg');while(s.firstChild){s.removeChild(s.firstChild)} menuCreated=false; void 0;",
        );
        // 窗口恒定尺寸（不再缩回 66）：收起只清页面内容，球回视口中心（fixed 锚定），零 resize 零闪
        let _ = app2.emit("ball-state", "collapsed");
        restore_snap_if_needed(&app2);
    });
}

/// 立即收起成 66 球（对齐 collapseToBallImmediate）：展开态起拖/贴屏用，无动画
fn collapse_to_ball_immediate(app: &AppHandle) {
    let Some(win) = ball_window(app) else { return };
    let state = BallState::global();
    state.expanded.store(false, Ordering::SeqCst);
    // 窗口恒定尺寸：无需锚点回移，只同步 pos（供后续保存/展开用）
    {
        let (x, y) = get_position(&win);
        let (ww, wh) = get_size(&win);
        *state.pos.lock().unwrap() = Some(ball_pos_from_window(x, y, ww, wh));
    }
    let _ = win.eval(
        "document.body.classList.remove('expanded'); document.body.classList.remove('no-anim'); isExpanded=false; var s=document.getElementById('ringSvg'); if(s){while(s.firstChild){s.removeChild(s.firstChild)}} menuCreated=false; void 0;",
    );
    state.collapse_scheduled.store(false, Ordering::SeqCst);
    // 窗口恒定尺寸：只清状态与页面内容，不动窗口几何
    let _ = app.emit("ball-state", "collapsed");
}

// ===== 窗口生命周期 =====

/// 显示悬浮球（预定义窗口 show；ballPos 未加载时从文件或主屏中心取）
pub fn show_ball(app: &AppHandle) {
    let state = BallState::global();
    if let Some(win) = ball_window(app) {
        let _ = win.show();
        let _ = win.set_focus();
        // hide_ball 已经 stop_mouse_polling + close（销毁是异步的）：快速 hide→show
        // 走到这里窗口还在，穿透轮询必须重新拉起，否则点击穿透判定停摆
        start_mouse_polling(app);
        return;
    }
    let mut pos = state.pos.lock().unwrap();
    if pos.is_none() {
        *pos = load_ball_position(app).or_else(|| {
            let (dx, dy, dw, dh) = primary_bounds(app);
            // 主屏中心兜底：66 是 CSS 语义，位置按主屏 scale 换算成物理
            let scale = app
                .primary_monitor()
                .ok()
                .flatten()
                .map(|m| m.scale_factor())
                .unwrap_or(1.0);
            // 窗口恒环尺寸：位置按环居中（球心=屏心），pos 存 66 球左上 = 中心-球半边
            let ring = RING_SIZE * scale;
            let ball_half = BALL_SIZE * scale / 2.0;
            let wx = (dx as f64 + (dw as f64 - ring) / 2.0).round() as i32;
            let wy = (dy as f64 + (dh as f64 - ring) / 2.0).round() as i32;
            Some((
                wx + (ring / 2.0 - ball_half).round() as i32,
                wy + (ring / 2.0 - ball_half).round() as i32,
            ))
        });
    }
    // pos 是 66 球左上（物理）→ 环左上 = pos + (ring-ball)物理/2。窗口**恒定环尺寸**
    // 建出：expand_ball/collapse 已不 resize 窗口（resize 会闪残影），若这里还建 66，
    // 第一次展开 240 的花瓣菜单会被 66 视口硬裁（页面 fixed 居中也救不了视口本身太小）。
    let (px, py) = pos.unwrap();
    drop(pos);
    let settings = BallSettings::load(app);
    let scale0 = app
        .primary_monitor()
        .ok()
        .flatten()
        .map(|m| m.scale_factor())
        .unwrap_or(1.0);
    // 以 pos 所在屏的 scale 换算（pos 来自上次会话的物理坐标，反查所在屏更准；
    // 极端跨屏场景由 restore_snap_if_needed / 穿透轮询自纠）
    let (bx, by, bw, bh) = primary_bounds(app);
    let pos_scale = if px >= bx && px < bx + bw && py >= by && py < by + bh {
        scale0
    } else {
        app.available_monitors()
            .ok()
            .and_then(|ms| {
                ms.into_iter()
                    .find(|m| {
                        let (mx, my) = (m.position().x, m.position().y);
                        px >= mx
                            && px < mx + m.size().width as i32
                            && py >= my
                            && py < my + m.size().height as i32
                    })
                    .map(|m| m.scale_factor())
            })
            .unwrap_or(scale0)
    };
    let ring0 = RING_SIZE * pos_scale;
    let half0 = (ring0 - BALL_SIZE * pos_scale) / 2.0;

    // WebviewUrl::App 在 dev 下自动映射到 devUrl，打包态指向 dist（External 运行时创建会导航失败）
    let url = WebviewUrl::App("windows/floating-ball.html".into());
    let ball_data = ball_data_script(app);
    match WebviewWindowBuilder::new(app, "floating-ball", url)
        .title("MUERZHI")
        .inner_size(
            (ring0 / pos_scale).round() as f64,
            (ring0 / pos_scale).round() as f64,
        )
        .position(px as f64 + half0, py as f64 + half0)
        .decorations(false)
        .transparent(true)
        .resizable(false)
        .skip_taskbar(true)
        .shadow(false)
        .always_on_top(settings.always_on_top)
        .visible(false)
        // 菜单数据必须在页面任何脚本之前到位：页面启动时捕获 `const ITEMS = __BALL_DATA__`，
        // 之前用建窗后 eval 注入 —— 撞上「页面脚本先跑」的时序（dev server 忙时必现），
        // 页面捕到空数组且 menuCreated 已置 true，点开球永远没有花瓣（实测 11:06:46 连续三次 expand 无菜单）
        .initialization_script(&ball_data)
        .build()
    {
        Ok(win) => {
            let _ = win.set_ignore_cursor_events(true); // 初始穿透，轮询 100ms 内纠正
            start_mouse_polling(app);
            let _ = win.show();
            // 未吸附态也需要对齐「pos ↔ 环左上」语义：无保存边时不改位置，但
            // 若窗口被 DPI 重排过，按当前实际中心重算一次 pos，保证几何真相一致
            restore_snap_if_needed(app);
            // 预建菜单（数据已由 initialization_script 注入；页面未加载完时此调用静默跳过，
            // 首次展开会再建）
            let _ = win.eval("ensureMenu && ensureMenu(); void 0;");
            log::info!("Floating ball shown");
        }
        Err(e) => log::error!("show floating ball failed: {e}"),
    }
}

/// 隐藏悬浮球（保存位置 + 关闭窗口 + 停轮询）
pub fn hide_ball(app: &AppHandle) {
    let state = BallState::global();
    if let Some(win) = ball_window(app) {
        let (x, y) = get_position(&win);
        let (ww, wh) = get_size(&win);
        let p = ball_pos_from_window(x, y, ww, wh);
        *state.pos.lock().unwrap() = Some(p);
        save_ball_position(app, p);
        stop_mouse_polling();
        let _ = win.close();
        log::info!("Floating ball hidden");
    }
}

/// 悬浮球球心屏幕坐标（散热面板 P3 接入）（散热面板定位用）
#[allow(dead_code)]
pub fn ball_center_for_overlay(app: &AppHandle) -> Option<(i32, i32)> {
    let win = ball_window(app)?;
    let (x, y) = get_position(&win);
    let (w, h) = get_size(&win);
    Some(((x + w / 2.0).round() as i32, (y + h / 2.0).round() as i32))
}

// ===== tauri command（bridge.ts / floating-ball.html 经 invoke/emit 调用）=====

#[tauri::command]
pub async fn show_floating_ball(app: AppHandle) {
    // async 原因：同步命令内建窗会死锁主线程（见 region.rs）
    show_ball(&app);
}

#[tauri::command]
pub fn hide_floating_ball(app: AppHandle) {
    hide_ball(&app);
}

#[tauri::command]
pub fn toggle_floating_ball(app: AppHandle) {
    hide_ball(&app); // 对齐 Electron：仅隐藏（主窗口可再 show）
}

#[tauri::command]
pub fn ball_expand(app: AppHandle) {
    expand_ball(&app);
}

#[tauri::command]
pub fn ball_collapse(app: AppHandle) {
    collapse_ball(&app);
}

#[tauri::command]
pub fn ball_drag_start(app: AppHandle, sx: f64, sy: f64, dpr: Option<f64>) {
    let _ = (sx, sy, dpr);
    let Some(win) = ball_window(&app) else { return };
    let (wx, wy) = get_position(&win);
    let (ww, wh) = get_size(&win);
    // 起点偏移用 Rust 光标物理坐标，且以「窗口中心 - 光标」记录（跟随按中心定位，
    // 跨屏尺寸切换时左上角锚点会被 OS 重排拉偏，中心不会）。
    // 不能用 HTML screenX×dpr：WebView2 的 screenX 参照系跨屏不连续，乘 dpr 也救不了。
    let Ok(cursor) = win.cursor_position() else {
        return;
    };
    let (cx, cy) = (wx + ww / 2.0, wy + wh / 2.0);
    *BallState::global().drag.lock().unwrap() = Some(DragOrigin {
        win_x: cx,
        win_y: cy,
        scr_x: cursor.x as f64,
        scr_y: cursor.y as f64,
        w: ww,
        h: wh,
    });
    log::info!(
        "ball_drag_start: 光标物理=({},{}), 窗口中心=({},{})",
        cursor.x,
        cursor.y,
        cx,
        cy
    );
}

#[tauri::command]
pub fn ball_drag_clear(app: AppHandle, sx: f64, sy: f64, dpr: Option<f64>) {
    let _ = (sx, sy, dpr);
    let state = BallState::global();
    if state.expanded.load(Ordering::SeqCst) {
        collapse_to_ball_immediate(&app);
    }
    clear_snap(&app);
    let Some(win) = ball_window(&app) else { return };
    let (wx, wy) = get_position(&win);
    let (ww, wh) = get_size(&win);
    let Ok(cursor) = win.cursor_position() else {
        return;
    };
    let (cx, cy) = (wx + ww / 2.0, wy + wh / 2.0);
    *state.drag.lock().unwrap() = Some(DragOrigin {
        win_x: cx,
        win_y: cy,
        scr_x: cursor.x as f64,
        scr_y: cursor.y as f64,
        w: ww,
        h: wh,
    });
}

/// 拖拽移动（对齐 floating-ball-move 的观感，实现改为**光标轮询跟随**）
///
/// 为什么不用「HTML screenX 逻辑差 × dpr」的锚点增量：WebView2 的 e.screenX **跨屏
/// 不连续**（每屏从自己的原点计数），副屏→主屏的瞬间 screenX 跳变一整屏宽 → 球猛地
/// 往左上偏（实测）。改用 Rust 侧 `win.cursor_position()`：物理全局坐标跨屏连续，
/// 每帧「光标 - 拖拽起点偏移」直接定位窗口（与 camera_drag_start 同方案）。
///
/// 调用契约：HTML pointermove 只发信号（参数忽略），真正跟手由 16ms 轮询完成；
/// `dpr` 参数保留仅为兼容签名。
#[tauri::command]
pub fn ball_move(app: AppHandle, sx: f64, sy: f64, dpr: Option<f64>) {
    let _ = (sx, sy, dpr);
    start_drag_follow(&app);
}

/// 拖拽跟随循环（16ms 轮询）：按「光标 - 起点偏移」移动窗口，跨屏尺寸自动切换。
/// drag.origin 存在期间循环自续，drag_end 置 None 后自然退出。
fn start_drag_follow(app: &AppHandle) {
    static FOLLOW_RUNNING: std::sync::atomic::AtomicBool =
        std::sync::atomic::AtomicBool::new(false);
    // 已有循环在跑（drag.origin 已设置）就不再起第二个
    if FOLLOW_RUNNING.swap(true, Ordering::SeqCst) {
        return;
    }
    if BallState::global().drag.lock().unwrap().is_none() {
        FOLLOW_RUNNING.store(false, Ordering::SeqCst);
        return;
    }
    let app = app.clone();
    tauri::async_runtime::spawn(async move {
        loop {
            let Some(o) = *BallState::global().drag.lock().unwrap() else {
                break;
            };
            let Some(win) = ball_window(&app) else { break };
            // 光标物理坐标全局连续（跨屏无跳变）；窗口中心 = 光标 + 恒定 offset
            let (Ok(cursor), _ok) = (win.cursor_position(), 0) else {
                break;
            };
            let cx = (cursor.x as f64 + (o.win_x - o.scr_x)).round();
            let cy = (cursor.y as f64 + (o.win_y - o.scr_y)).round();
            // 跨屏：按新中心所在屏重算物理尺寸（恒 240 CSS × 新 scale）
            let target = scaled_for_window(
                &app, &win, RING_SIZE, cx as i32, cy as i32, o.w as i32, o.h as i32,
            );
            let (w, h) = if (o.w - target).abs() > 0.5 || (o.h - target).abs() > 0.5 {
                (target, target)
            } else {
                (o.w, o.h)
            };
            // 顺序关键：先 set_size 后 set_position。跨屏时 Windows 会因 DPI 切换按
            // 新尺寸重排窗口位置，后设置的 set_position 用中心语义覆盖重排 —— 顺序
            // 反了（或一步到位的 set_bounds）会被重排拉偏，实测固定 -130,-130。
            let _ = win.set_size(PhysicalSize::new(w.round() as u32, h.round() as u32));
            let _ = win.set_position(PhysicalPosition::new(
                (cx - w / 2.0).round() as i32,
                (cy - h / 2.0).round() as i32,
            ));
            // ⚠️ 不要读回修正：set_position 异步生效，立刻读回拿到旧值会把偏差放大
            // 成跳变（实测）。跟随循环每帧按光标差绝对定位，天然自纠。
            // pos（66 球左上）= 环中心 - 球物理半边（按当前屏 scale）
            let scale_now = ball_scale_at(&app, cx as i32, cy as i32, w as i32, h as i32);
            let ball_half = BALL_SIZE * scale_now / 2.0;
            *BallState::global().pos.lock().unwrap() = Some((
                (cx - ball_half).round() as i32,
                (cy - ball_half).round() as i32,
            ));
            {
                let mut drag = BallState::global().drag.lock().unwrap();
                if let Some(o2) = drag.as_mut() {
                    o2.w = w;
                    o2.h = h;
                }
            }
            crate::modules::cooling::follow_ball(&app);
            tokio::time::sleep(std::time::Duration::from_millis(16)).await;
        }
        FOLLOW_RUNNING.store(false, Ordering::SeqCst);
    });
}

/// 拖拽结束：贴边判定 + 弹性吸附 + 保存位置（对齐 floating-ball-drag-end）
#[tauri::command]
pub fn ball_drag_end(app: AppHandle) {
    let state = BallState::global();
    *state.drag.lock().unwrap() = None;
    if let Some(win) = ball_window(&app) {
        let (x, y) = get_position(&win);
        let (w, h) = get_size(&win);
        if let Some(side) = detect_edge_snap(&app, x as i32, y as i32, w as i32, h as i32) {
            let target = snap_target_for(&app, side, x as i32, y as i32, w as i32, h as i32);
            animate_snap_to_edge(&app, (x, y), (target.0 as f64, target.1 as f64), side);
        }
        // 未贴近任何边：保持未吸附（drag-clear 已清视觉）
    }
    let pos = *state.pos.lock().unwrap();
    if let Some(p) = pos {
        save_ball_position(&app, p);
    }
}

/// 仅清拖拽状态（无吸附判定）。pointerup 的**纯点击**路径（展开/收起）用：
/// ball_drag_end 会顺带做贴边判定，球离边 <SNAP 时点一下就把球吸到屏幕边 ——
/// 点击不是拖拽，位置不该动。
#[tauri::command]
pub fn ball_drag_cancel(app: AppHandle) {
    *BallState::global().drag.lock().unwrap() = None;
    let _ = app; // 签名与其他 ball_* 命令一致
}

/// 重置位置到主屏中心（对齐 reset-floating-ball-position）
#[tauri::command]
pub fn reset_floating_ball_position(app: AppHandle) {
    clear_ball_position(&app);
    clear_snap(&app);
    let Some(win) = ball_window(&app) else { return };
    BallState::global().expanded.store(false, Ordering::SeqCst);
    let _ = win.eval(
        "document.body.classList.remove('expanded'); var s=document.getElementById('ringSvg');if(s){while(s.firstChild){s.removeChild(s.firstChild)}} menuCreated=false; isExpanded=false; void 0;",
    );
    let (dx, dy, dw, dh) = primary_bounds(&app);
    // 恒定环尺寸；球心与屏幕中心对齐
    let ring_phys = scaled_for_window(&app, &win, RING_SIZE, dx, dy, dw, dh);
    let nx = (dx as f64 + (dw as f64 - ring_phys) / 2.0).round();
    let ny = (dy as f64 + (dh as f64 - ring_phys) / 2.0).round();
    set_ball_bounds(&win, nx, ny, ring_phys, ring_phys);
    // pos 语义是 66 球左上角 = 环中心 - 球物理半径
    let ball_half = scaled_for_window(
        &app,
        &win,
        BALL_SIZE,
        nx as i32,
        ny as i32,
        ring_phys as i32,
        ring_phys as i32,
    ) / 2.0;
    *BallState::global().pos.lock().unwrap() = Some((
        (nx + ring_phys / 2.0 - ball_half).round() as i32,
        (ny + ring_phys / 2.0 - ball_half).round() as i32,
    ));
    let _ = app.emit("ball-state", "collapsed");
}
/// 菜单项数据注入脚本（对齐 TS getVisibleMenuItems）：label 走 i18n 当前语言
fn ball_data_script(app: &AppHandle) -> String {
    let settings = BallSettings::load(app);
    let i18n = crate::modules::i18n::I18n::global();
    let catalog = [
        ("record", "\u{25cf}", "record"),
        ("ai", "\u{2726}", "ai"),
        ("todo", "\u{2611}", "todo"),
        ("settings", "\u{2699}", "settings"),
    ];
    let items: Vec<String> = catalog
        .iter()
        .filter(|(key, _, _)| settings.menu_items.get(*key).copied().unwrap_or(true))
        .map(|(key, icon, action)| {
            let label = i18n.t(&format!("ball.menu.{key}"));
            format!(
                "{{ icon: {}, label: {}, action: {} }}",
                serde_json::to_string(icon).unwrap_or_default(),
                serde_json::to_string(&label).unwrap_or_default(),
                serde_json::to_string(action).unwrap_or_default(),
            )
        })
        .collect();
    format!("window.__BALL_DATA__ = [{}]; void 0;", items.join(","))
}

/// 散热视觉开关（对齐 setFloatingBallCoolingVisual）：花瓣旋转 + 圆圈冷光静止
pub fn set_cooling_visual(app: &AppHandle, on: bool) {
    if let Some(win) = ball_window(app) {
        let sec = crate::modules::cooling::Cooling::global().duration_sec();
        let _ = win.eval(&format!(
            "if (window.setCoolingVisual) setCoolingVisual({on}, {sec}); void 0;"
        ));
    }
}

/// 散热触发的临时展开：仅当菜单当前是收起态才展开 + 置 cooling_temp_expanded 标记
/// （结束后 restore_after_cooling 收回）；展开态触发不动（结束后保持展开）。
pub fn expand_for_cooling(app: &AppHandle) {
    let state = BallState::global();
    if state.expanded.load(Ordering::SeqCst) {
        return;
    }
    state.cooling_temp_expanded.store(true, Ordering::SeqCst);
    expand_ball(app);
}

/// 散热结束/取消后的菜单复位（对齐旧 Electron 版 done 回调）：
/// 仅当散热触发时菜单是**收起的**（被临时展开来播放旋转动画）才收回；
/// 菜单原本就展开的不动（用户可以继续点其他花瓣）。收起只清页面内容，窗口几何不动。
pub fn restore_after_cooling(app: &AppHandle) {
    let state = BallState::global();
    if !state.cooling_temp_expanded.swap(false, Ordering::SeqCst) {
        return;
    }
    state.expanded.store(false, Ordering::SeqCst);
    // 临时展开的菜单此刻还在页面上（body.cooling 已摘）：清 DOM + 通知收起
    if let Some(win) = ball_window(app) {
        let _ = win.eval(
            "document.body.classList.remove('expanded'); isExpanded=false; var s=document.getElementById('ringSvg'); if(s){while(s.firstChild){s.removeChild(s.firstChild)}} menuCreated=false; void 0;",
        );
    }
    let _ = app.emit("ball-state", "collapsed");
    restore_snap_if_needed(app);
}
