// AI 悬浮岛 — 移植自 electron/main/ai-island.ts
// 贴顶居中动态岛：固定透明画布 + CSS 居中丝滑形变 + 严格内容区命中穿透。
//
// 为什么改用固定透明画布（同 floating_ball.rs RING_SIZE 方案）：
// WebView2 在原生透明窗口同时改变坐标和尺寸（如 88→380 左移+加宽展开）时，
// wry WM_SIZE 先重绑子窗口到新左上角 (0, 0)，而跨进程 Chromium 内核需要约 1 帧才
// 完成新视口重排，导致旧胶囊贴着新窗口左上角闪出 1 帧残影。
// 固定画布（CANVAS_W × CANVAS_H）让展开/收起/横条切回全程零 HWND resize，所有形变
// 仅靠内部 .island 的纯 CSS 居中过渡完成；同时通过 32ms 自适应光标轮询 + mousemove /
// mouseleave 即时上报将交互严格限制在真实可见 .island 矩形（AiIslandState.content），
// 透明空白区始终穿透。
//
// ⚠️ 窗口创建命令必须是 async（同步命令内 build() 与主线程死锁，webview 静默空白），
//    详见 region.rs::start_region_select 注释。

// camelCase 参数名是 Tauri invoke 映射约定（bridge.ts / ai-island.html 传 camelCase）
#![allow(non_snake_case)]

use serde::Serialize;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager, WebviewUrl, WebviewWindowBuilder};

const CANVAS_W: f64 = 560.0;
const CANVAS_H: f64 = 480.0;
const ISLAND_W: f64 = 88.0;
const ISLAND_H: f64 = 38.0;
const FLAT_H: f64 = 16.0;
const CAPSULE_TOP_GAP: f64 = 4.0;
const ACTIVE_POLL_MS: u64 = 16;
const FAR_POLL_MS: u64 = 120;
const FAR_MARGIN_PHYS: f64 = 200.0;

#[derive(Debug, Clone, Copy)]
pub struct Rect {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

pub struct AiIslandState {
    /// 可见岛矩形（屏幕坐标，物理像素）：光标在内 → 可交互，否则穿透
    pub content: Mutex<Option<Rect>>,
    /// 用户确认的水平中心锚点（物理像素，拖过后固定，仅在极端贴边展开时临时夹紧窗口）
    pub anchor_cx: Mutex<Option<f64>>,
    /// 最近一次页面上报的逻辑内容宽高（CSS px，拖拽中维持精确 content 命中矩形）
    pub last_content_size: Mutex<(f64, f64)>,
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
            anchor_cx: Mutex::new(None),
            last_content_size: Mutex::new((ISLAND_W, ISLAND_H)),
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

/// destroy 在途标志：`destroy()` 只是发起，HWND 的实际拆除发生在主线程消息循环里
/// （WebView2 释放可能耗时数百 ms，录制刚结束系统繁忙时更久），期间 Tauri map 已查不到
/// 但旧 HWND 仍在桌面 —— 此刻重建会得到第二个岛，且旧窗已脱离 Tauri 管理**永远收不掉**，
/// 表现为「多次录制后桌面出现两个不同状态的 AI 岛」（旧的那个冻结在销毁前的状态）。
/// show_island 等本标志被 WindowEvent::Destroyed 清除后再建，把「猜测 200ms」换成事件确认。
static ISLAND_DESTROY_PENDING: AtomicBool = AtomicBool::new(false);

/// 建窗预约标志（**这是双岛的直接成因**）。
///
/// `show_ai_island` 是 async 命令，Tauri 在线程池里并发执行；一次「停止录制」就会连发
/// 两次 invoke（HomeView.handleStop 一次 + state watch 的 idle 分支一次）。两次调用会
/// 同时通过 `island_window().is_some()` 与 Tauri 的 label 检查（检查在建窗**之前**，两者
/// 之间没有原子性），于是各建一个窗口：后建的覆盖 Tauri map 条目，先建的成了收不掉的
/// 孤儿窗（不再接收 push_state，永远冻结在旧状态）。日志实测：同秒两条 `AI island shown`，
/// 或一条 shown 紧跟一条 `label already exists` 报错。
///
/// 用 CAS 预约而不是 Mutex：`build()` 会阻塞等主线程创建窗口，而 sync 命令（
/// hide_ai_island）本身跑在主线程上 —— 用锁会与 build 互等成死锁。
static ISLAND_BUILDING: AtomicBool = AtomicBool::new(false);

/// 主屏几何 + 缩放比（物理像素）
fn primary_bounds_and_scale(app: &AppHandle) -> (i32, i32, i32, i32, f64) {
    app.primary_monitor()
        .ok()
        .flatten()
        .map(|m| {
            (
                m.position().x,
                m.position().y,
                m.size().width as i32,
                m.size().height as i32,
                m.scale_factor(),
            )
        })
        .unwrap_or((0, 0, 1920, 1080, 1.0))
}

/// 查找包含点 (cx, cy) 的显示器物理 bounds 与缩放比；若垂直错开仅 X 命中则兜底匹配水平所属屏
fn monitor_bounds_and_scale_at(app: &AppHandle, cx: i32, cy: i32) -> (i32, i32, i32, i32, f64) {
    if let Ok(Some(m)) = app.monitor_from_point(cx as f64, cy as f64) {
        let (mx, my, mw, mh) = (
            m.position().x,
            m.position().y,
            m.size().width as i32,
            m.size().height as i32,
        );
        if cx >= mx && cx < mx + mw && cy >= my && cy < my + mh {
            return (mx, my, mw, mh, m.scale_factor());
        }
    }
    if let Ok(monitors) = app.available_monitors() {
        let mut x_fallback = None;
        for m in monitors {
            let (mx, my, mw, mh) = (
                m.position().x,
                m.position().y,
                m.size().width as i32,
                m.size().height as i32,
            );
            let scale = m.scale_factor();
            if cx >= mx && cx < mx + mw && cy >= my && cy < my + mh {
                return (mx, my, mw, mh, scale);
            }
            if x_fallback.is_none() && cx >= mx && cx < mx + mw {
                x_fallback = Some((mx, my, mw, mh, scale));
            }
        }
        if let Some(hit) = x_fallback {
            return hit;
        }
    }
    primary_bounds_and_scale(app)
}

/// 岛所在显示器的缩放比：窗口几何与页面上报尺寸的换算必须用**同一块屏**的 scale。
fn window_scale(app: &AppHandle, win: &tauri::WebviewWindow) -> f64 {
    let x = win.outer_position().map(|p| p.x).unwrap_or(0);
    let y = win.outer_position().map(|p| p.y).unwrap_or(0);
    let w = win.outer_size().map(|s| s.width as i32).unwrap_or(0);
    let h = win.outer_size().map(|s| s.height as i32).unwrap_or(0);
    monitor_bounds_and_scale_at(app, x + w / 2, y + h / 2).4
}

/// 窗口几何统一走**物理像素**（win.outer_position/outer_size 与 set_position(Physical) 同域，
/// 直接赋值，不做任何缩放换算）。页面上报的内容尺寸是 CSS 逻辑像素，入口处换算成物理。
///
/// ⚠️ 之前这里写反了：`set_bounds` 把逻辑值 `/scale` 塞给 PhysicalPosition/PhysicalSize、
/// `get_position` 又把物理值 `*scale` —— 150% 屏上窗口被缩到 2/3 且位置漂移，页面视口的
/// CSS 空间装不下内容 → 胶囊/卡片被硬裁（实测）。`cursor_position()` 本来就是物理像素，
/// 与 content 矩形同域直接比较即可。
fn set_bounds_phys(
    app: &AppHandle,
    win: &tauri::WebviewWindow,
    x: f64,
    y: f64,
    w: f64,
    h: f64,
) -> (i32, i32, i32, i32) {
    if !x.is_finite() || !y.is_finite() || !w.is_finite() || !h.is_finite() {
        log::warn!("AI island setBounds skipped (non-finite): {x},{y},{w},{h}");
        return (0, 0, 0, 0);
    }
    let px = x.round() as i32;
    let py = y.round() as i32;
    let pw = (w.round() as i32).max(1);
    let ph = (h.round() as i32).max(1);
    let _ = app; // 与调用方签名一致；物理量纲下不再需要主屏 scale

    let pos_same = win
        .outer_position()
        .map(|p| p.x == px && p.y == py)
        .unwrap_or(false);
    let size_same = win
        .outer_size()
        .map(|s| s.width == pw as u32 && s.height == ph as u32)
        .unwrap_or(false);
    if pos_same && size_same {
        return (px, py, pw, ph);
    }

    // Windows 必须单次 SetWindowPos 原子更新位置与宽高：
    // 先 set_position 再 set_size 会把旧宽度的窗口先移到新中心 X 再缩窄，造成内容横跳闪动。
    #[cfg(windows)]
    {
        use windows_sys::Win32::UI::WindowsAndMessaging::{
            SetWindowPos, SWP_ASYNCWINDOWPOS, SWP_NOACTIVATE, SWP_NOMOVE, SWP_NOSIZE, SWP_NOZORDER,
        };
        if let Ok(hwnd) = win.hwnd() {
            let hwnd = hwnd.0 as *mut std::ffi::c_void;
            if !hwnd.is_null() {
                let mut flags = SWP_ASYNCWINDOWPOS | SWP_NOZORDER | SWP_NOACTIVATE;
                if pos_same {
                    flags |= SWP_NOMOVE;
                }
                if size_same {
                    flags |= SWP_NOSIZE;
                }
                let ok = unsafe {
                    SetWindowPos(hwnd, std::ptr::null_mut(), px, py, pw, ph, flags) != 0
                };
                if ok {
                    return (px, py, pw, ph);
                }
            }
        }
    }

    if !pos_same {
        let _ = win.set_position(tauri::PhysicalPosition::new(px, py));
    }
    if !size_same {
        let _ = win.set_size(tauri::PhysicalSize::new(pw as u32, ph as u32));
    }
    (px, py, pw, ph)
}

fn get_position(win: &tauri::WebviewWindow) -> (f64, f64) {
    win.outer_position()
        .map(|p| (p.x as f64, p.y as f64))
        .unwrap_or((0.0, 0.0))
}

fn get_size(win: &tauri::WebviewWindow) -> (f64, f64) {
    win.outer_size()
        .map(|s| (s.width as f64, s.height as f64))
        .unwrap_or((CANVAS_W, CANVAS_H))
}

/// 计算画布内居中可见岛的物理矩形（y 偏移在平铺横条态为 0，否则 +4px CSS）
fn centered_content_rect(
    app: &AppHandle,
    win_x: f64,
    win_y: f64,
    win_w: f64,
    cw_log: f64,
    ch_log: f64,
    scale: f64,
) -> Rect {
    let flat = crate::modules::commands::app_settings::ai_island_flat(app);
    let y_off = if flat { 0.0 } else { CAPSULE_TOP_GAP * scale };
    let cw_phys = cw_log * scale;
    let ch_phys = ch_log * scale;
    Rect {
        x: win_x + (win_w - cw_phys) / 2.0,
        y: win_y + y_off,
        width: cw_phys,
        height: ch_phys,
    }
}

/// 更新内容矩形并立即按光标位置对一次穿透态（对齐 updateAiIslandContentScreen）
fn update_content_and_poll(app: &AppHandle, rect: Rect) {
    *AiIslandState::global().content.lock().unwrap() = Some(rect);
    poll_pass_through(app);
}

/// 几何判定：光标在内容矩形内或拖拽中 → 可交互；否则穿透
///
/// 量纲：cursor_position() 与 content 都是**物理像素**，直接比较。
fn poll_pass_through(app: &AppHandle) {
    if let Some(win) = island_window(app) {
        let _ = poll_tick(app, &win);
    }
}

/// 实时查询主键（考虑系统左右手交换设置）是否仍处于物理按下状态，
/// 防止 WebView2 丢弃 pointerup/pointercancel 时 `state.drag` 永久卡死并锁死全画布穿透。
fn primary_mouse_button_down() -> bool {
    #[cfg(windows)]
    unsafe {
        use windows_sys::Win32::UI::Input::KeyboardAndMouse::{
            GetAsyncKeyState, VK_LBUTTON, VK_RBUTTON,
        };
        use windows_sys::Win32::UI::WindowsAndMessaging::{GetSystemMetrics, SM_SWAPBUTTON};
        let vk = if GetSystemMetrics(SM_SWAPBUTTON) != 0 {
            VK_RBUTTON
        } else {
            VK_LBUTTON
        };
        (GetAsyncKeyState(vk as i32) as u16 & 0x8000) != 0
    }
    #[cfg(not(windows))]
    {
        true
    }
}

/// 单拍完成穿透状态更新与下一拍间隔计算（同一拍内复用光标与缩放信息，避免重复枚举显示器）
fn poll_tick(app: &AppHandle, win: &tauri::WebviewWindow) -> u64 {
    let state = AiIslandState::global();
    if state.drag.lock().unwrap().is_some() {
        if primary_mouse_button_down() {
            if state.mouse_ignored.load(Ordering::SeqCst) {
                state.mouse_ignored.store(false, Ordering::SeqCst);
                let _ = win.set_ignore_cursor_events(false);
            }
            return ACTIVE_POLL_MS;
        }
        *state.drag.lock().unwrap() = None;
    }
    let Some(content) = *state.content.lock().unwrap() else {
        return FAR_POLL_MS;
    };
    let Ok(cursor) = win.cursor_position() else {
        return FAR_POLL_MS;
    };
    let scale = win
        .scale_factor()
        .unwrap_or_else(|_| window_scale(app, win));
    let cx = cursor.x as f64;
    let cy = cursor.y as f64;
    let pad = 2.0 * scale;
    let inside = cx >= content.x - pad
        && cx <= content.x + content.width + pad
        && cy >= content.y - pad
        && cy <= content.y + content.height + pad;
    let ignore = !inside;
    if ignore != state.mouse_ignored.load(Ordering::SeqCst) {
        state.mouse_ignored.store(ignore, Ordering::SeqCst);
        let _ = win.set_ignore_cursor_events(ignore);
    }
    // 展开列表或卡片期间始终高频响应点击/移出
    if content.height > (ISLAND_H + 6.0) * scale {
        return ACTIVE_POLL_MS;
    }
    let (wx, wy) = get_position(win);
    let (ww, wh) = get_size(win);
    let margin = FAR_MARGIN_PHYS * scale;
    let near = cx >= wx - margin && cx <= wx + ww + margin && cy >= wy - margin && cy <= wy + wh + margin;
    if near { ACTIVE_POLL_MS } else { FAR_POLL_MS }
}

fn start_polling(app: &AppHandle) {
    let state = AiIslandState::global();
    if state.poll_running.swap(true, Ordering::SeqCst) {
        // 上一轮轮询任务还没退出（hide→立刻 show 的快速重建场景：任务下一拍发现窗口
        // 没了才退出）。直接跳过会让新岛没有穿透轮询（鼠标交互失效）——等旧任务退出
        // 后再启动；若旧任务其实还活着（窗口一直在的正常双调用），等满 2s 后 CAS 失败、
        // 不会重复起任务
        let app2 = app.clone();
        tauri::async_runtime::spawn(async move {
            let deadline = std::time::Instant::now() + std::time::Duration::from_secs(2);
            while AiIslandState::global().poll_running.load(Ordering::SeqCst)
                && std::time::Instant::now() < deadline
            {
                tokio::time::sleep(std::time::Duration::from_millis(20)).await;
            }
            if AiIslandState::global()
                .poll_running
                .compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst)
                .is_ok()
            {
                spawn_poll_task(app2);
            }
        });
        return;
    }
    spawn_poll_task(app.clone());
}

fn spawn_poll_task(app: AppHandle) {
    tauri::async_runtime::spawn(async move {
        loop {
            if !AiIslandState::global().poll_running.load(Ordering::SeqCst) {
                break;
            }
            let Some(win) = island_window(&app) else {
                break;
            };
            let wait_ms = poll_tick(&app, &win);
            tokio::time::sleep(std::time::Duration::from_millis(wait_ms)).await;
        }
        AiIslandState::global()
            .poll_running
            .store(false, Ordering::SeqCst);
    });
}

fn stop_polling() {
    AiIslandState::global()
        .poll_running
        .store(false, Ordering::SeqCst);
}

// ===== 窗口生命周期 =====

/// 岛位置持久化文件（水平中心 cx 与顶边 y，**物理像素**；与 CANVAS_W 解耦）
const POS_FILE: &str = "ai-island-pos.json";

/// 保存岛当前位置（仅用户拖过后保存，避免默认居中的岛误锁定到当前屏幕像素坐标）
fn save_island_position(app: &AppHandle) {
    let state = AiIslandState::global();
    if !state.user_moved.load(Ordering::SeqCst) {
        return;
    }
    let Some(win) = island_window(app) else {
        return;
    };
    let (wx, wy) = get_position(&win);
    let (ww, _) = get_size(&win);
    let cx = state
        .anchor_cx
        .lock()
        .unwrap()
        .unwrap_or_else(|| wx + ww / 2.0);
    if let Ok(s) = serde_json::to_string(&serde_json::json!({
        "cx": cx.round(),
        "y": wy.round(),
        "v": 2
    })) {
        let path = crate::modules::settings::settings_file(app, POS_FILE);
        if let Some(parent) = path.parent() {
            let _ = std::fs::create_dir_all(parent);
        }
        let _ = std::fs::write(path, s);
    }
}

/// 读取持久化的岛水平中心与顶边（物理像素；兼容旧版仅存左上 x 的格式）
///
/// 返回的 `(cx, by)` 中的 `by` 已对齐到所在显示器顶边（消除旧版 `y = by + 4`
/// 叠加上 CSS `padding-top: 4px` 造成双倍顶距）。若坐标落在所有显示器之外则返回 None。
fn load_island_position(app: &AppHandle) -> Option<(f64, f64)> {
    let path = crate::modules::settings::settings_file(app, POS_FILE);
    let text = std::fs::read_to_string(path).ok()?;
    let v: serde_json::Value = serde_json::from_str(&text).ok()?;
    let y = v.get("y")?.as_f64()?;
    let (raw_cx, is_legacy) = if let Some(cx) = v.get("cx").and_then(|n| n.as_f64()) {
        (cx, false)
    } else if let Some(x) = v.get("x").and_then(|n| n.as_f64()) {
        (x, true)
    } else {
        return None;
    };
    let monitors = app.available_monitors().ok()?;
    for m in monitors {
        let (mx, my) = (m.position().x as f64, m.position().y as f64);
        let (mw, mh) = (m.size().width as f64, m.size().height as f64);
        let scale = m.scale_factor();
        let cx = if is_legacy {
            raw_cx + ISLAND_W * scale / 2.0
        } else {
            raw_cx
        };
        if cx >= mx - 40.0 && cx <= mx + mw + 40.0 && y >= my - 40.0 && y <= my + mh {
            return Some((cx, my));
        }
    }
    None
}

/// 显示 AI 岛（默认贴主屏顶居中；有持久化位置则恢复——卡片懒创建/重启后位置不丢）
///
/// 初始窗口用 builder 的**逻辑像素**（ISLAND_W/H 本身是 CSS 尺寸语义）；首个 resize
/// 上报会用真实内容物理尺寸覆盖，content 矩形在 resize_ai_island 入口统一为物理像素。
pub fn show_island(app: &AppHandle) {
    use std::sync::atomic::Ordering;
    if island_window(app).is_some() {
        return;
    }
    // 建窗预约：并发调用（同一次停止流程连发两次 show_ai_island）只放一个进来建窗，
    // 另一个直接返回 —— 否则两个窗口都被建出来，先建的那个脱离 Tauri 管理收不掉（双岛）
    if ISLAND_BUILDING.swap(true, Ordering::SeqCst) {
        log::info!("show_island: 已有建窗在途（并发重复请求），跳过本次");
        return;
    }
    // 预约的释放交给 Drop：中途任何 return / panic 都不会把标志卡在 true（卡住 = 岛再也建不出来）
    struct BuildGuard;
    impl Drop for BuildGuard {
        fn drop(&mut self) {
            ISLAND_BUILDING.store(false, Ordering::SeqCst);
        }
    }
    let _guard = BuildGuard;
    show_island_inner(app);
}

fn show_island_inner(app: &AppHandle) {
    use std::sync::atomic::Ordering;
    if island_window(app).is_some() {
        return;
    }
    // 竞态兜底：上一次 destroy 尚未被 WindowEvent::Destroyed 确认（旧 HWND 还在拆）时
    // 直接 build 会造出第二个岛（见 ISLAND_DESTROY_PENDING 注释）。异步轮询等待事件
    // 确认；5s 兜底超时防事件意外丢失导致岛永远显示不出来。
    if ISLAND_DESTROY_PENDING.load(Ordering::SeqCst) {
        let app2 = app.clone();
        tauri::async_runtime::spawn(async move {
            let deadline = std::time::Instant::now() + std::time::Duration::from_secs(5);
            while ISLAND_DESTROY_PENDING.load(Ordering::SeqCst)
                && std::time::Instant::now() < deadline
            {
                tokio::time::sleep(std::time::Duration::from_millis(50)).await;
            }
            // 5s 到点 Destroyed 事件仍未送达（事件监听器随窗口析构丢失等）：
            // 必须强制清标志再重入 —— 不清的话 show_island 又进同一分支，
            // 形成每 5s 一班、永不放弃的自唤醒任务链，且岛永远建不出来。
            if ISLAND_DESTROY_PENDING.load(Ordering::SeqCst) {
                log::warn!("ISLAND_DESTROY_PENDING 超时未确认，强制复位");
                ISLAND_DESTROY_PENDING.store(false, Ordering::SeqCst);
            }
            if app2.get_webview_window("ai-island").is_none() {
                show_island(&app2);
            }
        });
        return;
    }
    let saved = load_island_position(app);
    let had_saved = saved.is_some();
    let (bx, by, bw, scale, anchor_cx) = match saved {
        Some((cx, sy)) => {
            let (mx, my, mw, _, ms) =
                monitor_bounds_and_scale_at(app, cx.round() as i32, sy.round() as i32);
            (mx, my, mw, ms, Some(cx))
        }
        None => {
            let (mx, my, mw, _, ms) = primary_bounds_and_scale(app);
            (mx, my, mw, ms, None)
        }
    };
    let canvas_w_phys = (CANVAS_W * scale).round();
    let canvas_h_phys = (CANVAS_H * scale).round();
    let cx = match anchor_cx {
        Some(c) => {
            let min_cx = bx as f64 + ISLAND_W * scale / 2.0;
            let max_cx = (bx as f64 + bw as f64 - ISLAND_W * scale / 2.0).max(min_cx);
            c.clamp(min_cx, max_cx)
        }
        None => bx as f64 + bw as f64 / 2.0,
    };
    let x_phys = (cx - canvas_w_phys / 2.0).round();
    let y_phys = by as f64;
    let state = AiIslandState::global();
    state.user_moved.store(had_saved, Ordering::SeqCst);
    *state.anchor_cx.lock().unwrap() = if had_saved { Some(cx) } else { None };
    *state.drag.lock().unwrap() = None;
    let flat = crate::modules::commands::app_settings::ai_island_flat(app);
    let init_h_log = if flat { FLAT_H } else { ISLAND_H };
    *state.last_content_size.lock().unwrap() = (ISLAND_W, init_h_log);

    let x_logical = x_phys / scale;
    let y_logical = y_phys / scale;
    let url = WebviewUrl::App("windows/ai-island.html".into());
    match WebviewWindowBuilder::new(app, "ai-island", url)
        .title("AI")
        .position(x_logical.round(), y_logical.round())
        .inner_size(CANVAS_W, CANVAS_H)
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
            set_bounds_phys(app, &win, x_phys, y_phys, canvas_w_phys, canvas_h_phys);
            // destroy 完成确认 + 失焦收起会话列表 + DPI 变更重对齐画布
            let win_for_event = win.clone();
            let app_for_event = app.clone();
            win.on_window_event(move |event| match event {
                tauri::WindowEvent::Destroyed => {
                    ISLAND_DESTROY_PENDING.store(false, Ordering::SeqCst);
                }
                tauri::WindowEvent::Focused(false) => {
                    let _ = win_for_event
                        .eval("if (window.collapseSessions) window.collapseSessions(); void 0;");
                }
                tauri::WindowEvent::ScaleFactorChanged { .. } => {
                    let (cw, ch) = *AiIslandState::global().last_content_size.lock().unwrap();
                    resize_ai_island(app_for_event.clone(), cw, Some(ch));
                }
                _ => {}
            });
            let init_rect = centered_content_rect(
                app,
                x_phys,
                y_phys,
                canvas_w_phys,
                ISLAND_W,
                init_h_log,
                scale,
            );
            state.user_moved.store(had_saved, Ordering::SeqCst);
            // 初始穿透态置 true（同 floating_ball 规范），防止建窗瞬间透明空白区吞点击；
            // update_content_and_poll 会立刻按当前真实光标位置纠正
            let _ = win.set_ignore_cursor_events(true);
            state.mouse_ignored.store(true, Ordering::SeqCst);
            update_content_and_poll(app, init_rect);
            start_polling(app);
            let _ = win.show();
            // 横条态设置注入（HTML 读 window.__AI_FLAT__，启动时传 immediate=true 避免多余过渡）
            let _ = win.eval(&format!(
                "window.__AI_FLAT__ = {flat}; if (window.setFlat) setFlat({flat}, true); void 0;"
            ));
            log::info!("AI island shown (fixed canvas {CANVAS_W}x{CANVAS_H})");
        }
        Err(e) => log::error!("AI island failed: {e}"),
    }
}

/// 隐藏 AI 岛
pub fn hide_island(app: &AppHandle) {
    if let Some(win) = island_window(app) {
        // 关窗前保存位置：下次懒创建（审批卡到达）恢复到用户拖放的地方
        save_island_position(app);
        stop_polling();
        // destroy 而非 close：close 走 CloseRequested 且销毁异步，紧接着的 show_island
        // 会在 Tauri map 查不到窗口（已移除）但 HWND 还在销毁中 —— 又建一个，
        // 短暂出现两个 AI 岛叠在同一位置（实测两个标题 A 的窗口同时可见）。
        // destroy 强制销毁、无事件、最快；show_island 等 WindowEvent::Destroyed
        // 确认拆除完成后再重建（ISLAND_DESTROY_PENDING，事件驱动不再靠猜时间）。
        ISLAND_DESTROY_PENDING.store(true, Ordering::SeqCst);
        if win.destroy().is_err() {
            // destroy 发起失败：没人会来清标志，立即复位让后续 show 不被卡住
            ISLAND_DESTROY_PENDING.store(false, Ordering::SeqCst);
        }
        *AiIslandState::global().content.lock().unwrap() = None;
        *AiIslandState::global().anchor_cx.lock().unwrap() = None;
        *AiIslandState::global().drag.lock().unwrap() = None;
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

/// 页面上报内容尺寸 → 仅更新可见岛命中矩形，外层透明画布尺寸恒定不变（零 WebView2 重排闪烁）。
/// 仅当用户曾把岛拖到屏幕最左/最右贴边处且展开卡片超出屏界时，才用 `SWP_NOSIZE` 水平内移画布，
/// 避免卡片被显示器裁切，收起后仍回锚点 `anchor_cx`。
#[tauri::command]
pub fn resize_ai_island(app: AppHandle, contentWidth: f64, contentHeight: Option<f64>) {
    let Some(win) = island_window(&app) else {
        return;
    };
    if !contentWidth.is_finite() {
        return;
    }
    let ch = match contentHeight {
        Some(v) if v.is_finite() => v.clamp(12.0, CANVAS_H - CAPSULE_TOP_GAP),
        _ => ISLAND_H,
    };
    let cw = contentWidth.clamp(40.0, CANVAS_W);
    let state = AiIslandState::global();
    *state.last_content_size.lock().unwrap() = (cw, ch);

    let (wx, wy) = get_position(&win);
    let (ww, wh) = get_size(&win);
    let (bx, by, bw, _, scale) = monitor_bounds_and_scale_at(
        &app,
        (wx + ww / 2.0).round() as i32,
        (wy + wh / 2.0).round() as i32,
    );
    let canvas_w_phys = (CANVAS_W * scale).round();
    let canvas_h_phys = (CANVAS_H * scale).round();
    let cw_phys = cw * scale;

    let cx = if state.user_moved.load(Ordering::SeqCst) {
        let anchor = state
            .anchor_cx
            .lock()
            .unwrap()
            .unwrap_or_else(|| wx + ww / 2.0);
        let min_cx = bx as f64 + cw_phys / 2.0;
        let max_cx = (bx as f64 + bw as f64 - cw_phys / 2.0).max(min_cx);
        anchor.clamp(min_cx, max_cx)
    } else {
        bx as f64 + bw as f64 / 2.0
    };
    let new_x = (cx - canvas_w_phys / 2.0).round();
    let new_y = by as f64;
    set_bounds_phys(&app, &win, new_x, new_y, canvas_w_phys, canvas_h_phys);

    let rect = centered_content_rect(&app, new_x, new_y, canvas_w_phys, cw, ch, scale);
    update_content_and_poll(&app, rect);
}

/// AI 岛拖动：只水平移动，y 固定（对齐 ai-island-drag-*）
///
/// 与悬浮球同一方案（光标轮询跟随）：HTML `screenX` 是 WebView2 的**逻辑像素**且
/// 跨屏参照系不连续（每屏从自己的原点计数），锚点增量法在主屏↔副屏间拖动会瞬移
/// （实测悬浮球同款问题）。这里 pointer 事件只发信号，真正跟手由 16ms 轮询用
/// `cursor_position()`（物理全局坐标，跨屏连续）完成。
#[tauri::command]
pub fn ai_island_drag_start(app: AppHandle, sx: f64, sy: f64) {
    let _ = (sx, sy);
    let Some(win) = island_window(&app) else {
        return;
    };
    let Ok(cursor) = win.cursor_position() else {
        return;
    };
    let (wx, wy) = get_position(&win);
    *AiIslandState::global().drag.lock().unwrap() =
        Some((wx, wy, cursor.x as f64, cursor.y as f64));
}

#[tauri::command]
pub fn ai_island_drag_move(app: AppHandle, sx: f64, _sy: f64) {
    let _ = sx;
    start_drag_follow(&app);
}

/// 拖拽跟随循环（16ms 轮询）：窗口 x = 光标 x + 恒定偏移，y 固定。
/// drag.origin 存在期间循环自续，drag_end 置 None 后自然退出。
fn start_drag_follow(app: &AppHandle) {
    static FOLLOW_RUNNING: std::sync::atomic::AtomicBool =
        std::sync::atomic::AtomicBool::new(false);
    if FOLLOW_RUNNING.swap(true, Ordering::SeqCst) {
        return;
    }
    if AiIslandState::global().drag.lock().unwrap().is_none() {
        FOLLOW_RUNNING.store(false, Ordering::SeqCst);
        return;
    }
    let app = app.clone();
    tauri::async_runtime::spawn(async move {
        loop {
            let Some((win_x, win_y, scr_x, _)) = *AiIslandState::global().drag.lock().unwrap()
            else {
                break;
            };
            if !primary_mouse_button_down() {
                *AiIslandState::global().drag.lock().unwrap() = None;
                break;
            }
            let Some(win) = island_window(&app) else {
                break;
            };
            let Ok(cursor) = win.cursor_position() else {
                break;
            };
            // 偏移 = 按下时窗口左上 - 光标；拖动期间恒定（全物理像素，跨屏连续）
            let nx = (cursor.x as f64 + (win_x - scr_x)).round();
            if !nx.is_finite() {
                break;
            }
            let (ww, wh) = get_size(&win);
            set_bounds_phys(&app, &win, nx, win_y, ww, wh);
            let state = AiIslandState::global();
            let scale = window_scale(&app, &win);
            let (cw_log, ch_log) = *state.last_content_size.lock().unwrap();
            let rect = centered_content_rect(&app, nx, win_y, ww, cw_log, ch_log, scale);
            update_content_and_poll(&app, rect);
            tokio::time::sleep(std::time::Duration::from_millis(16)).await;
        }
        FOLLOW_RUNNING.store(false, Ordering::SeqCst);
    });
}

#[tauri::command]
pub fn ai_island_drag_end(app: AppHandle) {
    let state = AiIslandState::global();
    *state.drag.lock().unwrap() = None;
    state.user_moved.store(true, Ordering::SeqCst);
    if let Some(win) = island_window(&app) {
        let (wx, wy) = get_position(&win);
        let (ww, wh) = get_size(&win);
        let (bx, by, bw, _, scale) = monitor_bounds_and_scale_at(
            &app,
            (wx + ww / 2.0).round() as i32,
            (wy + wh / 2.0).round() as i32,
        );
        let canvas_w_phys = (CANVAS_W * scale).round();
        let canvas_h_phys = (CANVAS_H * scale).round();
        let (cw_log, ch_log) = *state.last_content_size.lock().unwrap();
        let cw_phys = cw_log * scale;
        let min_cx = bx as f64 + cw_phys / 2.0;
        let max_cx = (bx as f64 + bw as f64 - cw_phys / 2.0).max(min_cx);
        let cx = (wx + ww / 2.0).clamp(min_cx, max_cx);
        *state.anchor_cx.lock().unwrap() = Some(cx);
        let new_x = (cx - canvas_w_phys / 2.0).round();
        let new_y = by as f64;
        set_bounds_phys(&app, &win, new_x, new_y, canvas_w_phys, canvas_h_phys);
        let rect = centered_content_rect(&app, new_x, new_y, canvas_w_phys, cw_log, ch_log, scale);
        update_content_and_poll(&app, rect);
    }
    // 保存拖后水平中心锚点：卡片懒创建（notify_card_change）重建岛时恢复，
    // 并在最后存盘，确保写入的是边界夹紧后的最终位置
    save_island_position(&app);
}

#[tauri::command]
pub fn ai_island_drag_cancel(app: AppHandle) {
    let state = AiIslandState::global();
    *state.drag.lock().unwrap() = None;
    poll_pass_through(&app);
}

/// 渲染层 mousemove/pointerdown 兜底切换穿透（对齐 set-ai-island-mouse-mode）
#[tauri::command]
pub fn set_ai_island_mouse_mode(app: AppHandle, interactive: bool) {
    let Some(win) = island_window(&app) else {
        return;
    };
    let state = AiIslandState::global();
    if !interactive && state.drag.lock().unwrap().is_some() {
        if primary_mouse_button_down() {
            return;
        }
        *state.drag.lock().unwrap() = None;
    }
    let ignore = !interactive;
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
        let _ = win.eval(&format!(
            "window.setFlat && window.setFlat({flat}); void 0;"
        ));
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
