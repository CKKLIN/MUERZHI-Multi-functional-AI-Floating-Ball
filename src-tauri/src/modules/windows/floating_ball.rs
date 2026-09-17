// 悬浮球 — 移植 electron/main/floating-ball.ts（G5 水滴吸附版）
// 窗口 66/240 双形态、绝对增量拖拽 + DWM 读回修正、elasticOut 贴边动画、
// 100ms 光标轮询穿透（展开圆 78 / 吸附胶囊 / 收起圆 30 三种几何）、位置持久化。
// UI 由 public/windows/floating-ball.html 承载（Tauri 无 data:URL 窗口），
// 本文件负责窗口几何/状态机/穿透，渲染层经 event 与 command 交互。

use crate::modules::settings::{settings_file, BallSettings};
use serde::Serialize;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager, PhysicalPosition, PhysicalSize, WebviewUrl, WebviewWindowBuilder};

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
    /// 展开前冻结的 66 球锚点（收起用它，防 240 态反推污染）
    pub collapse_anchor: Mutex<Option<(i32, i32)>>,
    pub mouse_ignored: AtomicBool,
    /// collapseTimer 等价（快速连点时 expand 取消收尾）
    pub collapse_scheduled: AtomicBool,
    pub poll_running: AtomicBool,
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
            collapse_anchor: Mutex::new(None),
            mouse_ignored: AtomicBool::new(true),
            collapse_scheduled: AtomicBool::new(false),
            poll_running: AtomicBool::new(false),
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
pub fn set_ball_bounds(win: &tauri::WebviewWindow, x: f64, y: f64, w: f64, h: f64) {
    if !x.is_finite() || !y.is_finite() || !w.is_finite() || !h.is_finite() {
        log::warn!("Floating ball setBounds skipped (non-finite): {x},{y},{w},{h}");
        return;
    }
    let _ = win.set_position(PhysicalPosition::new(x.round() as i32, y.round() as i32));
    let _ = win.set_size(PhysicalSize::new(w.round() as u32, h.round() as u32));
}

fn get_position(win: &tauri::WebviewWindow) -> (f64, f64) {
    win.outer_position().map(|p| (p.x as f64, p.y as f64)).unwrap_or((0.0, 0.0))
}

fn get_size(win: &tauri::WebviewWindow) -> (f64, f64) {
    win.outer_size().map(|s| (s.width as f64, s.height as f64)).unwrap_or((BALL_SIZE, BALL_SIZE))
}

/// 66 球左上角：由窗口中心反推（展开 240/收起 66 同心，展开态拖拽不污染位置）
fn ball_pos_from_window(wx: f64, wy: f64, ww: f64, wh: f64) -> (i32, i32) {
    ((wx + ww / 2.0 - BALL_SIZE / 2.0).round() as i32, (wy + wh / 2.0 - BALL_SIZE / 2.0).round() as i32)
}

fn primary_bounds(app: &AppHandle) -> (i32, i32, i32, i32) {
    app.primary_monitor()
        .ok()
        .flatten()
        .map(|m| (m.position().x, m.position().y, m.size().width as i32, m.size().height as i32))
        .unwrap_or((0, 0, 1920, 1080))
}

/// 找包含窗口中心的显示器物理 bounds（对齐 getDisplayMatching）
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
    primary_bounds(app)
}

/// elasticOut 缓动（easeOutBack 式末尾过冲，对齐 TS elasticOut）
fn elastic_out(t: f64) -> f64 {
    if t <= 0.0 { return 0.0 }
    if t >= 1.0 { return 1.0 }
    let c4 = 2.0 * std::f64::consts::PI / 3.0;
    2.0f64.powf(-10.0 * t) * ((t * 10.0 - 0.75) * c4).sin() + 1.0
}

/// drag-end 贴边判定（对齐 detectEdgeSnap）：最近且 < SNAP 的边
fn detect_edge_snap(app: &AppHandle, x: i32, y: i32, w: i32, h: i32) -> Option<SnapSide> {
    let settings = BallSettings::load(app);
    let gutter = settings.snap_gutter;
    let (bx, by, bw, bh) = display_bounds_of(app, x, y, w, h);
    let dl = (x as f64 - (bx as f64 + gutter)).abs();
    let dr = ((bx as f64 + bw as f64 - gutter) - (x + w) as f64).abs();
    let dt = (y as f64 - (by as f64 + gutter)).abs();
    let db = ((by as f64 + bh as f64 - gutter) - (y + h) as f64).abs();
    let mut best: Option<(f64, SnapSide)> = None;
    for (d, side) in [(dl, SnapSide::Left), (dr, SnapSide::Right), (dt, SnapSide::Top), (db, SnapSide::Bottom)] {
        if d < SNAP && best.map(|(bd, _)| d < bd).unwrap_or(true) {
            best = Some((d, side));
        }
    }
    best.map(|(_, s)| s)
}

/// 指定吸附边的目标坐标（对齐 snapTargetFor）
fn snap_target_for(app: &AppHandle, side: SnapSide, x: i32, y: i32, w: i32, h: i32) -> (i32, i32) {
    let settings = BallSettings::load(app);
    let gutter = settings.snap_gutter;
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
    // 按窗口尺寸判定（尺寸是几何真相，展开准备期/收起动画期与 expanded 标志可能短暂不一致）
    let inside = if ww >= RING_SIZE {
        // 240 窗：窗心圆（花瓣环 r2=75+3 + 中心按钮）
        let dx = cpx - (wx + ww / 2.0);
        let dy = cpy - (wy + wh / 2.0);
        dx * dx + dy * dy <= PASS_R_EXPANDED * PASS_R_EXPANDED
    } else {
        let snapped = *state.snapped_side.lock().unwrap();
        if let Some(side) = snapped {
            // 吸附收起态：水滴胶囊矩形 + 2px 余量（与 snap-* CSS 几何一一对应）
            const S: f64 = 2.0;
            let (x0, y0, x1, y1) = match side {
                SnapSide::Left => (0.0, 4.0 - S, 44.0 + S, 62.0 + S),
                SnapSide::Right => (22.0 - S, 4.0 - S, BALL_SIZE, 62.0 + S),
                SnapSide::Top => (4.0 - S, 0.0, 62.0 + S, 44.0 + S),
                SnapSide::Bottom => (4.0 - S, 22.0 - S, 62.0 + S, BALL_SIZE),
            };
            let lx = cpx - wx;
            let ly = cpy - wy;
            lx >= x0 && lx <= x1 && ly >= y0 && ly <= y1
        } else {
            // 未吸附收起态：中央 56px 圆（半径 28+2），四角透明区穿透
            let dx = cpx - (wx + ww / 2.0);
            let dy = cpy - (wy + wh / 2.0);
            dx * dx + dy * dy <= PASS_R_BALL * PASS_R_BALL
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
        loop {
            if !BallState::global().poll_running.load(Ordering::SeqCst) {
                break;
            }
            match ball_window(&app) {
                Some(win) => {
                    if let Ok(cursor) = win.cursor_position() {
                        poll_with_cursor(&app, tauri::PhysicalPosition::new(cursor.x.round() as i32, cursor.y.round() as i32));
                    }
                }
                None => break,
            }
            tokio::time::sleep(std::time::Duration::from_millis(100)).await;
        }
        BallState::global().poll_running.store(false, Ordering::SeqCst);
    });
}

fn stop_mouse_polling() {
    BallState::global().poll_running.store(false, Ordering::SeqCst);
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
        set_ball_bounds(&win, t.0 as f64, t.1 as f64, BALL_SIZE, BALL_SIZE);
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
            let t = (start.elapsed().as_secs_f64() * 1000.0 / 420.0).min(1.0);
            let e = elastic_out(t);
            let nx = from.0 + (to.0 - from.0) * e;
            let ny = from.1 + (to.1 - from.1) * e;
            set_ball_bounds(&win, nx, ny, BALL_SIZE, BALL_SIZE);
            if t >= 1.0 {
                let (ax, ay) = get_position(&win);
                if (ax as i32) != to.0.round() as i32 || (ay as i32) != to.1.round() as i32 {
                    set_ball_bounds(&win, to.0, to.1, BALL_SIZE, BALL_SIZE);
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

/// 展开菜单（对齐 expandBall）：冻结 66 锚点 → 240 窗口 → restartBloom → ball-state 事件
pub fn expand_ball(app: &AppHandle) {
    let Some(win) = ball_window(app) else { return };
    let state = BallState::global();
    clear_snap_visual_only(app);
    state.collapse_scheduled.store(false, Ordering::SeqCst);
    let (bx, by) = match *state.pos.lock().unwrap() {
        Some(p) => (p.0 as f64, p.1 as f64),
        None => get_position(&win),
    };
    *state.collapse_anchor.lock().unwrap() = Some((bx.round() as i32, by.round() as i32));
    let cx = (bx + BALL_SIZE / 2.0).round();
    let cy = (by + BALL_SIZE / 2.0).round();
    let (_, ww) = get_size(&win);
    let need_resize = ww != RING_SIZE;
    if need_resize {
        // resize 前窗口不可见变化，避免 trigger 在 240 窗中偏移闪烁（对齐 TS setOpacity 手法）
        set_ball_bounds(&win, cx - RING_SIZE / 2.0, cy - RING_SIZE / 2.0, RING_SIZE, RING_SIZE);
    }
    let _ = win.eval("restartBloom && restartBloom(); void 0;");
    state.expanded.store(true, Ordering::SeqCst);
    let _ = app.emit("ball-state", "expanded");
}

/// 收起成 66 球（对齐 collapseBall 的 920ms 收尾语义：先合拢动画再缩窗清 DOM）
pub fn collapse_ball(app: &AppHandle) {
    let Some(win) = ball_window(app) else { return };
    let state = BallState::global();
    state.expanded.store(false, Ordering::SeqCst);
    let (bx, by) = match *state.collapse_anchor.lock().unwrap() {
        Some(a) => a,
        None => match *state.pos.lock().unwrap() {
            Some(p) => p,
            None => {
                let (x, y) = get_position(&win);
                let (ww, wh) = get_size(&win);
                ball_pos_from_window(x, y, ww, wh)
            }
        },
    };
    let bx = bx as f64;
    let by = by as f64;
    // 先移除 expanded class 让花瓣按 CSS 动画收合；920ms 后缩窗 + 清 DOM + 恢复吸附
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
        let Some(win) = ball_window(&app2) else { return };
        let _ = win.eval(
            "var s=document.getElementById('ringSvg');while(s.firstChild){s.removeChild(s.firstChild)} menuCreated=false; void 0;",
        );
        set_ball_bounds(&win, bx, by, BALL_SIZE, BALL_SIZE);
        let _ = app2.emit("ball-state", "collapsed");
        restore_snap_if_needed(&app2);
    });
}

/// 立即收起成 66 球（对齐 collapseToBallImmediate）：展开态起拖/贴屏用，无动画
fn collapse_to_ball_immediate(app: &AppHandle) {
    let Some(win) = ball_window(app) else { return };
    let state = BallState::global();
    state.expanded.store(false, Ordering::SeqCst);
    let (bx, by) = match *state.collapse_anchor.lock().unwrap() {
        Some(a) => a,
        None => match *state.pos.lock().unwrap() {
            Some(p) => p,
            None => {
                let (x, y) = get_position(&win);
                ball_pos_from_window(x, y, get_size(&win).0, get_size(&win).1)
            }
        },
    };
    let _ = win.eval(
        "document.body.classList.remove('expanded'); document.body.classList.remove('no-anim'); isExpanded=false; var s=document.getElementById('ringSvg'); if(s){while(s.firstChild){s.removeChild(s.firstChild)}} menuCreated=false; void 0;",
    );
    state.collapse_scheduled.store(false, Ordering::SeqCst);
    set_ball_bounds(&win, bx as f64, by as f64, BALL_SIZE, BALL_SIZE);
    let _ = app.emit("ball-state", "collapsed");
}

// ===== 窗口生命周期 =====

/// 显示悬浮球（预定义窗口 show；ballPos 未加载时从文件或主屏中心取）
pub fn show_ball(app: &AppHandle) {
    let state = BallState::global();
    if let Some(win) = ball_window(app) {
        let _ = win.show();
        let _ = win.set_focus();
        return;
    }
    let mut pos = state.pos.lock().unwrap();
    if pos.is_none() {
        *pos = load_ball_position(app).or_else(|| {
            let (dx, dy, dw, dh) = primary_bounds(app);
            Some((
                (dx as f64 + (dw as f64 - BALL_SIZE) / 2.0).round() as i32,
                (dy as f64 + (dh as f64 - BALL_SIZE) / 2.0).round() as i32,
            ))
        });
    }
    let (x, y) = pos.unwrap();
    drop(pos);

    let settings = BallSettings::load(app);
    // WebviewUrl::App 在 dev 下自动映射到 devUrl，打包态指向 dist（External 运行时创建会导航失败）
    let url = WebviewUrl::App("windows/floating-ball.html".into());
    match WebviewWindowBuilder::new(app, "floating-ball", url)
        .title("MUERZHI")
        .inner_size(BALL_SIZE, BALL_SIZE)
        .position(x as f64, y as f64)
        .decorations(false)
        .transparent(true)
        .resizable(false)
        .skip_taskbar(true)
        .shadow(false)
        .always_on_top(settings.always_on_top)
        .visible(false)
        .build()
    {
        Ok(win) => {
            let _ = win.set_ignore_cursor_events(true); // 初始穿透，轮询 100ms 内纠正
            start_mouse_polling(app);
            let _ = win.show();
            restore_snap_if_needed(app);
            // 注入菜单数据（花瓣按 menuItems 过滤，label 走 i18n 当前语言）+ 预建菜单
            let _ = win.eval(&ball_data_script(app));
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
pub async fn show_floating_ball(app: AppHandle) { // async 原因：同步命令内建窗会死锁主线程（见 region.rs）
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
pub fn ball_drag_start(app: AppHandle, sx: f64, sy: f64) {
    let Some(win) = ball_window(&app) else { return };
    let (wx, wy) = get_position(&win);
    let (ww, wh) = get_size(&win);
    *BallState::global().drag.lock().unwrap() = Some(DragOrigin {
        win_x: wx,
        win_y: wy,
        scr_x: sx,
        scr_y: sy,
        w: ww,
        h: wh,
    });
}

/// 真拖开始（位移>阈值）：展开态先立即收成 66 球；清吸附；重设锚点（对齐 drag-clear）
#[tauri::command]
pub fn ball_drag_clear(app: AppHandle, sx: f64, sy: f64) {
    let state = BallState::global();
    if state.expanded.load(Ordering::SeqCst) {
        collapse_to_ball_immediate(&app);
    }
    clear_snap(&app);
    let Some(win) = ball_window(&app) else { return };
    let (wx, wy) = get_position(&win);
    let (ww, wh) = get_size(&win);
    *BallState::global().drag.lock().unwrap() = Some(DragOrigin {
        win_x: wx,
        win_y: wy,
        scr_x: sx,
        scr_y: sy,
        w: ww,
        h: wh,
    });
}

/// 拖拽移动：绝对增量 + DWM 读回修正（对齐 floating-ball-move）
#[tauri::command]
pub fn ball_move(app: AppHandle, sx: f64, sy: f64) {
    let Some(win) = ball_window(&app) else { return };
    let origin = match *BallState::global().drag.lock().unwrap() {
        Some(o) => o,
        None => return,
    };
    if !sx.is_finite() || !sy.is_finite() {
        return;
    }
    let nx = (origin.win_x + (sx - origin.scr_x)).round();
    let ny = (origin.win_y + (sy - origin.scr_y)).round();
    set_ball_bounds(&win, nx, ny, origin.w, origin.h);
    // 读回修正 DWM 1px 偏移
    let (ax, ay) = get_position(&win);
    if ax.round() != nx || ay.round() != ny {
        set_ball_bounds(&win, nx + (nx - ax.round()), ny + (ny - ay.round()), origin.w, origin.h);
    }
    // 更新 ballPos（中心反推）
    let (wx, wy) = get_position(&win);
    let (ww, wh) = get_size(&win);
    *BallState::global().pos.lock().unwrap() = Some(ball_pos_from_window(wx, wy, ww, wh));
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
    let nx = (dx as f64 + (dw as f64 - BALL_SIZE) / 2.0).round();
    let ny = (dy as f64 + (dh as f64 - BALL_SIZE) / 2.0).round();
    set_ball_bounds(&win, nx, ny, BALL_SIZE, BALL_SIZE);
    *BallState::global().pos.lock().unwrap() = Some((nx as i32, ny as i32));
    // 读回修正 DWM 1px
    let (ax, ay) = get_position(&win);
    if ax.round() != nx || ay.round() != ny {
        set_ball_bounds(&win, nx + (nx - ax.round()), ny + (ny - ay.round()), BALL_SIZE, BALL_SIZE);
    }
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
