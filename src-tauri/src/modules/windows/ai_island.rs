// AI 悬浮岛 — 移植 electron/main/ai-island.ts
// 200×44 贴顶居中胶囊：AI 状态点 + 权限审批卡 + AskUserQuestion 提问卡（逐题推进）。
// 穿透：**窗口尺寸严格等于内容尺寸**，不存在透明死区（见下方「为什么没有透明缓冲带」）；
// 拖拽只允许水平移动（y 固定），用户拖过后 resize 不再拉回居中。
//
// 为什么没有透明缓冲带（Electron 版有 +20 右侧缓冲与 +28 底部气泡带）：
// Electron 版那两条缓冲是给 tooltip 气泡留的渲染空间，而 Tauri 版 `ai-island.html`
// 完全没有 tooltip（页面里 0 处 data-tip/tooltip）。留着它们等于凭空在屏幕上放一块
// 「看不见但吃点击」的窗口 —— 可见岛下方 28px、右侧 20px 全靠 120ms 光标轮询调
// set_ignore_cursor_events 才穿透，轮询一旦没跑（窗口重建竞态、孤儿窗）整块区域
// 就永久吞掉下方应用的点击（实测反馈「AI 悬浮岛底下的区域没办法点击」）。
// 现在窗口 == 可见内容，指针在任何位置都不需要「猜」，穿透轮询退化为兜底。
//
// ⚠️ 窗口创建命令必须是 async（同步命令内 build() 与主线程死锁，webview 静默空白），
//    详见 region.rs::start_region_select 注释。

// camelCase 参数名是 Tauri invoke 映射约定（bridge.ts / ai-island.html 传 camelCase）
#![allow(non_snake_case)]

use serde::Serialize;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use tauri::{
    AppHandle, Emitter, Manager, PhysicalPosition, PhysicalSize, WebviewUrl, WebviewWindowBuilder,
};

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

/// 主屏缩放比（岛尚未定位时的初始 builder 换算用）
fn display_scale(app: &AppHandle) -> f64 {
    app.primary_monitor()
        .ok()
        .flatten()
        .map(|m| m.scale_factor())
        .unwrap_or(1.0)
}

/// 岛所在显示器的缩放比：窗口几何与页面上报尺寸的换算必须用**同一块屏**的 scale。
/// 取主屏会让拖到异缩放副屏的岛算错尺寸（100% 主屏 + 150% 副屏时窗口被撑到 1.5 倍，
/// CSS 视口装不下内容被裁；反向则缩水）。getDisplayMatching 同样口径。
fn window_scale(app: &AppHandle, win: &tauri::WebviewWindow) -> f64 {
    let (x, y, w, h) = (
        win.outer_position().map(|p| p.x).unwrap_or(0),
        win.outer_position().map(|p| p.y).unwrap_or(0),
        win.outer_size().map(|s| s.width as i32).unwrap_or(0),
        win.outer_size().map(|s| s.height as i32).unwrap_or(0),
    );
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
                return m.scale_factor();
            }
        }
    }
    display_scale(app)
}

/// 窗口所在显示器的物理 bounds（对齐 getDisplayMatching）
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
    let _ = win.set_position(PhysicalPosition::new(px, py));
    let _ = win.set_size(PhysicalSize::new(pw as u32, ph as u32));
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
        .unwrap_or((ISLAND_W, ISLAND_H))
}

/// 更新内容矩形并立即按光标位置对一次穿透态（对齐 updateAiIslandContentScreen）
fn update_content_and_poll(app: &AppHandle, rect: Rect) {
    *AiIslandState::global().content.lock().unwrap() = Some(rect);
    poll_pass_through(app);
}

/// 几何判定：光标在内容矩形内 → 可交互；否则穿透（对齐 pollAiIslandPassThrough）
///
/// 量纲：cursor_position() 与 content 都是**物理像素**，直接比较。
fn poll_pass_through(app: &AppHandle) {
    let Some(win) = island_window(app) else {
        return;
    };
    let state = AiIslandState::global();
    let content = match *state.content.lock().unwrap() {
        Some(c) => c,
        None => return,
    };
    let Ok(cursor) = win.cursor_position() else {
        return;
    };
    let inside = cursor.x as f64 >= content.x
        && cursor.x as f64 <= content.x + content.width
        && cursor.y as f64 >= content.y
        && cursor.y as f64 <= content.y + content.height;
    let ignore = !inside;
    if ignore != state.mouse_ignored.load(Ordering::SeqCst) {
        state.mouse_ignored.store(ignore, Ordering::SeqCst);
        let _ = win.set_ignore_cursor_events(ignore);
    }
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
            if island_window(&app).is_none() {
                break;
            }
            poll_pass_through(&app);
            tokio::time::sleep(std::time::Duration::from_millis(POLL_MS)).await;
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

/// 岛位置持久化文件（左上角，**物理像素**；卡片的懒创建重建靠它恢复用户拖放的位置）
const POS_FILE: &str = "ai-island-pos.json";

/// 保存岛当前位置（窗口左上，物理像素）。窗口不存在时静默跳过。
fn save_island_position(app: &AppHandle) {
    let Some(win) = island_window(app) else {
        return;
    };
    let (x, y) = get_position(&win);
    if let Ok(s) = serde_json::to_string(&serde_json::json!({ "x": x.round(), "y": y.round() })) {
        let path = crate::modules::settings::settings_file(app, POS_FILE);
        if let Some(parent) = path.parent() {
            let _ = std::fs::create_dir_all(parent);
        }
        let _ = std::fs::write(path, s);
    }
}

/// 读取持久化的岛位置（物理像素）。保存的坐标必须落在某块显示器内才有效
/// （副屏拔掉后旧坐标会指到虚空中），否则返回 None 走主屏居中兜底。
fn load_island_position(app: &AppHandle) -> Option<(f64, f64)> {
    let path = crate::modules::settings::settings_file(app, POS_FILE);
    let text = std::fs::read_to_string(path).ok()?;
    let v: serde_json::Value = serde_json::from_str(&text).ok()?;
    let x = v.get("x")?.as_f64()?;
    let y = v.get("y")?.as_f64()?;
    let monitors = app.available_monitors().ok()?;
    for m in monitors {
        let (mx, my) = (m.position().x as f64, m.position().y as f64);
        let (mw, mh) = (m.size().width as f64, m.size().height as f64);
        // 窗口左上落在显示器 bounds 内（放宽一个窗口高度的余量：贴底/贴右缘时
        // 左上可能恰在边界外侧一点点），且不是完全在屏外
        if x >= mx - 40.0 && x <= mx + mw && y >= my - 40.0 && y <= my + mh {
            return Some((x, y));
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
    let scale = display_scale(app);
    // 位置：优先用户拖放过的持久化位置（物理像素 → 回逻辑给 builder），
    // 无保存（首次使用）才主屏顶居中兜底
    let saved = load_island_position(app);
    // 顺带记录「有没有保存位置」：下方建窗成功后 user_moved 复用它，
    // 原实现又 load_island_position 读了一遍盘
    let had_saved = saved.is_some();
    let (x_phys, y_phys) = match saved {
        Some((px, py)) => (px, py),
        None => {
            let (dx, dy, dw) = match app.primary_monitor() {
                Ok(Some(m)) => (m.position().x, m.position().y, m.size().width as i32),
                _ => (0, 0, 1920),
            };
            (
                dx as f64 + (dw as f64 - ISLAND_W * scale) / 2.0,
                dy as f64 + 4.0,
            )
        }
    };
    // 持久化过位置 = 用户已经定制过摆放：置 user_moved 让 resize 不再把它拉回居中。
    // （Ok 分支的 store 用同一判据兜底，防此处置位后中途被其他路径改写）
    if saved.is_some() {
        AiIslandState::global()
            .user_moved
            .store(true, Ordering::SeqCst);
    }
    let x_logical = x_phys / scale;
    let y_logical = y_phys / scale;
    let url = WebviewUrl::App("windows/ai-island.html".into());
    match WebviewWindowBuilder::new(app, "ai-island", url)
        .title("AI")
        .position(x_logical.round(), y_logical.round())
        .inner_size(ISLAND_W, ISLAND_H)
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
            // destroy 完成确认：hide_island 置位、这里在窗口真正销毁时清位，
            // show_island 以此判断旧 HWND 是否已从桌面消失
            win.on_window_event(|event| {
                if let tauri::WindowEvent::Destroyed = event {
                    ISLAND_DESTROY_PENDING.store(false, Ordering::SeqCst);
                }
            });
            // 初始内容矩形：物理像素占位（首帧 resize 会用真实内容尺寸覆盖）
            *AiIslandState::global().content.lock().unwrap() = Some(Rect {
                x: x_phys.round(),
                y: y_phys.round(),
                width: ISLAND_W * scale,
                height: ISLAND_H * scale,
            });
            AiIslandState::global().user_moved.store(had_saved, Ordering::SeqCst);
            let _ = win.set_ignore_cursor_events(false);
            // 同步复位穿透状态：旧窗残留的 true 会让首轮 poll_pass_through 误判
            // 「状态没变」而不纠正，透明区短暂吞点击
            AiIslandState::global()
                .mouse_ignored
                .store(false, Ordering::SeqCst);
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
///
/// 量纲：contentWidth/Height 是页面 CSS **逻辑像素**；窗口几何一律**物理像素**。
/// 入口 ×scale 换算，后续 set_bounds_phys/get_position/get_size 全程物理。
///
/// 窗口宽高 = 内容宽高（**不加任何透明缓冲**）：加了缓冲就在可见岛外围留出透明带，
/// 透明带完全靠穿透轮询兜着，轮询一断就吃点击（见文件头注释）。
#[tauri::command]
pub fn resize_ai_island(app: AppHandle, contentWidth: f64, contentHeight: Option<f64>) {
    let Some(win) = island_window(&app) else {
        return;
    };
    if !contentWidth.is_finite() {
        return;
    }
    let h = match contentHeight {
        Some(v) if v.is_finite() => v,
        _ => ISLAND_H,
    };
    if !h.is_finite() {
        return;
    }
    // CSS 逻辑 → 物理（窗口与 content 矩形从此都是物理像素）。
    // scale 取**岛所在屏**的缩放比：主屏 100% + 副屏 150% 时，用主屏换算会让窗口
    // 在副屏上尺寸错 1.5 倍（CSS 视口装不下内容被硬裁）。
    let scale = window_scale(&app, &win);
    let content_w_phys = contentWidth * scale;
    let h_phys = h * scale;
    let (wx, wy) = get_position(&win);
    let (ww, wh) = get_size(&win);
    let flat = crate::modules::commands::app_settings::ai_island_flat(&app);
    let state = AiIslandState::global();

    if flat && !state.user_moved.load(Ordering::SeqCst) {
        // 横条态（用户没拖过）：贴当前屏顶缘居中
        //
        // ⚠️ 必须以 user_moved 为先决条件：Agent 会话每次状态变化都 notify →
        // applyState → resizeIsland，若 flat 无条件重定位，用户拖到非居中位置的岛
        // 「过一会自动回到居中」（实测）。拖过则走下方保留位置分支，与普通态一致。
        let (bx, by, bw, _) = display_bounds_of(&app, wx as i32, wy as i32, ww as i32, wh as i32);
        let new_x = (bx as f64 + (bw as f64 - content_w_phys) / 2.0).round();
        if !new_x.is_finite() {
            return;
        }
        set_bounds_phys(&app, &win, new_x, by as f64, content_w_phys, h_phys);
        update_content_and_poll(
            &app,
            Rect {
                x: new_x,
                y: by as f64,
                width: content_w_phys,
                height: h_phys,
            },
        );
    } else if state.user_moved.load(Ordering::SeqCst) {
        // 用户拖过（普通态/横条态同路径）：保留位置，只调宽高
        set_bounds_phys(&app, &win, wx, wy, content_w_phys, h_phys);
        update_content_and_poll(
            &app,
            Rect {
                x: wx,
                y: wy,
                width: content_w_phys,
                height: h_phys,
            },
        );
    } else {
        // 未拖过（普通态）：主屏顶居中 + 4px 间隙
        let (bx, by, bw, _) = display_bounds_of(&app, wx as i32, wy as i32, ww as i32, wh as i32);
        let new_x = (bx as f64 + (bw as f64 - content_w_phys) / 2.0).round();
        let new_y = by as f64 + 4.0;
        set_bounds_phys(&app, &win, new_x, new_y, content_w_phys, h_phys);
        update_content_and_poll(
            &app,
            Rect {
                x: new_x,
                y: new_y,
                width: content_w_phys,
                height: h_phys,
            },
        );
    }
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
            // 窗口尺寸恒等于内容尺寸（无透明缓冲），内容矩形直接取整窗
            update_content_and_poll(
                &app,
                Rect {
                    x: nx,
                    y: win_y,
                    width: ww,
                    height: wh,
                },
            );
            tokio::time::sleep(std::time::Duration::from_millis(16)).await;
        }
        FOLLOW_RUNNING.store(false, Ordering::SeqCst);
    });
}

#[tauri::command]
pub fn ai_island_drag_end(app: AppHandle) {
    // 保存拖后位置：卡片懒创建（notify_card_change）重建岛时按保存位置恢复，
    // 否则审批卡永远回主屏中间（实测）
    save_island_position(&app);
    *AiIslandState::global().drag.lock().unwrap() = None;
    // 拖过就是「用户已移动」，与 flat 与否无关：flat 态的 resize 居中分支同样要被
    // user_moved 短路（此前只在非 flat 置位 → flat 岛拖完一次状态广播就回居中，实测）
    AiIslandState::global()
        .user_moved
        .store(true, Ordering::SeqCst);
}

/// 渲染层 mousemove/pointerdown 兜底切换穿透（对齐 set-ai-island-mouse-mode）
#[tauri::command]
pub fn set_ai_island_mouse_mode(app: AppHandle, interactive: bool) {
    let Some(win) = island_window(&app) else {
        return;
    };
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
