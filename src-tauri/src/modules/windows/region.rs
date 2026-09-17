// 区域选择体系 — 移植 electron/main/region-selector.ts
// 选区全屏透明窗（region-selector.html 承载 UI）→ 边框窗（全穿透 3px 框）
// → 工具条/悬浮岛（44px 胶囊 UI + TIP_STRIP 28 底部气泡带）
// 摄像头预览窗（200×150，16ms 轮询跟随拖拽）

// camelCase 参数名是 Tauri invoke 映射约定；P3 select_region 长连接接入后启用全部
#![allow(non_snake_case, dead_code)]

use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager, WebviewUrl, WebviewWindowBuilder};

pub const TOOLBAR_HEIGHT: f64 = 44.0;
pub const TIP_STRIP: f64 = 28.0;
const BORDER_PAD: f64 = 5.0;
const CAMERA_W: f64 = 200.0;
const CAMERA_H: f64 = 150.0;
const CAMERA_PAD: f64 = 12.0;

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Region {
    pub x: i32,
    pub y: i32,
    pub width: i32,
    pub height: i32,
}

/// 选区结果异步回传（selectRegion 是长连接命令：选完/取消才 resolve）
/// P3 录制会话接入 select_region 长连接命令时启用
#[allow(dead_code)]
pub struct RegionState {
    /// 待回传的选区结果（None = 用户取消）
    pub result: Mutex<Option<Region>>,
    /// select-region invoke 是否在等待（防重复选择）
    pub waiting: std::sync::atomic::AtomicBool,
}

#[allow(dead_code)]
impl RegionState {
    pub fn global() -> &'static RegionState {
        use std::sync::OnceLock;
        static S: OnceLock<RegionState> = std::sync::OnceLock::new();
        S.get_or_init(|| RegionState {
            result: Mutex::new(None),
            waiting: std::sync::atomic::AtomicBool::new(false),
        })
    }
}

#[allow(dead_code)]
fn region_window(app: &AppHandle) -> Option<tauri::WebviewWindow> {
    app.get_webview_window("region-selector")
}
fn border_window(app: &AppHandle) -> Option<tauri::WebviewWindow> {
    app.get_webview_window("region-border")
}
fn toolbar_window(app: &AppHandle) -> Option<tauri::WebviewWindow> {
    app.get_webview_window("floating-island")
}
fn camera_window(app: &AppHandle) -> Option<tauri::WebviewWindow> {
    app.get_webview_window("camera-preview")
}

/// 统一用 WebviewUrl::App：dev 下 Tauri 自动映射到 devUrl（localhost:21047），
/// 打包态指向 dist 资源。运行时创建的窗口用 External 会导航失败（实测停在 about:blank），
/// 故所有自建 HTML 窗口一律走 App 通道。
/// 主显示器缩放因子：窗口几何用物理像素计算，builder 只接受逻辑像素，需换算
fn display_scale(app: &AppHandle) -> f64 {
    app.primary_monitor()
        .ok()
        .flatten()
        .map(|m| m.scale_factor())
        .unwrap_or(1.0)
}

fn window_url(path: &str) -> WebviewUrl {
    WebviewUrl::App(path.to_string().into())
}

/// 启动区域选择（对齐 selectRegion）：主窗口先最小化，全屏透明窗（底图 P4 接 WGC）
///
/// 必须是 async fn：同步命令跑在主线程上，而 WebviewWindowBuilder::build() 需要事件循环
/// 处理窗口创建消息 —— 同步命令里 build() 与主线程互等而死锁（实测：build() 返回 Ok，
/// 但 webview 永远停在空白且无错误日志）。异步命令走线程池，build() 投递主线程后正常。
#[tauri::command]
pub async fn start_region_select(app: AppHandle) {
    if RegionState::global().waiting.load(std::sync::atomic::Ordering::SeqCst) {
        return;
    }
    RegionState::global().waiting.store(true, std::sync::atomic::Ordering::SeqCst);
    *RegionState::global().result.lock().unwrap() = None;

    if let Some(main) = (&app).get_webview_window("main") {
        let _ = main.minimize();
    }
    let (dx, dy, dw, dh) = match (&app).primary_monitor() {
        Ok(Some(m)) => (m.position().x, m.position().y, m.size().width as i32, m.size().height as i32),
        _ => (0, 0, 1920, 1080),
    };
    match WebviewWindowBuilder::new(&app, "region-selector", window_url("windows/region-selector.html"))
        .title("选区")
        .position((dx as f64) / display_scale(&app), (dy as f64) / display_scale(&app))
        .inner_size((dw as f64) / display_scale(&app), (dh as f64) / display_scale(&app))
        .decorations(false)
        .transparent(true)
        .resizable(false)
        .maximizable(false)
        .minimizable(false)
        .skip_taskbar(true)
        .shadow(false)
        .always_on_top(true)
        .visible(true)
        .build()
    {
        Ok(win) => {
            // 渲染层经 region-selector.html 上报 region-selected / region-cancelled 事件；
            // 全屏靠 builder 的 inner_size = 主屏物理尺寸（不用 set_fullscreen，避免干扰 webview）
            match win.url() {
                Ok(u) => log::info!("region selector url: {u}"),
                Err(e) => log::error!("region selector url read failed: {e}"),
            }
        }
        Err(e) => {
            log::error!("region selector window failed: {e}");
            RegionState::global().waiting.store(false, std::sync::atomic::Ordering::SeqCst);
            let _ = (&app).emit("region-cancelled", ());
        }
    }
}

/// 清理选区窗并恢复主窗口（选完/取消共用）
fn cleanup_region_selector(app: &AppHandle) {
    if let Some(win) = region_window(app) {
        let _ = win.close();
    }
    if let Some(main) = (&app).get_webview_window("main") {
        let _ = main.show();
        let _ = main.set_focus();
    }
    RegionState::global().waiting.store(false, std::sync::atomic::Ordering::SeqCst);
}

// ===== tauri command（region-selector.html / bridge.ts 调用）=====

/// 选区完成（对齐 region-selected）
#[tauri::command]
pub fn region_selected(app: AppHandle, x: i32, y: i32, width: i32, height: i32, sourceId: Option<String>) {
    log::info!("Region selected: {x},{y} {width}x{height}");
    *RegionState::global().result.lock().unwrap() = Some(Region { x, y, width, height });
    let _ = app.emit("region-selected", Region { x, y, width, height });
    cleanup_region_selector(&app);
    let _ = sourceId;
}

/// 选区取消 / ESC（对齐 region-cancelled）
#[tauri::command]
pub fn region_cancelled(app: AppHandle) {
    log::info!("Region cancelled");
    let _ = (&app).emit("region-cancelled", ());
    cleanup_region_selector(&app);
}

// ===== 边框窗 + 工具条 =====

/// 显示区域边框 + 工具条（对齐 showRegionBorder）
/// async 原因同 start_region_select（同步命令内建窗死锁）
#[tauri::command]
pub async fn show_region_border(app: AppHandle, region: Region) {
    // 边框窗：region 外扩 5px，3px 红框，全穿透
    if let Some(old) = border_window(&app) {
        let _ = old.close();
    }
    let bx = region.x as f64 - BORDER_PAD;
    let by = region.y as f64 - BORDER_PAD;
    let bw = region.width as f64 + BORDER_PAD * 2.0;
    let bh = region.height as f64 + BORDER_PAD * 2.0;
    match WebviewWindowBuilder::new(
        &app.clone(),
        "region-border",
        window_url("windows/region-border.html"),
    )
    .title("边框")
    .position(bx / display_scale(&app), by / display_scale(&app))
    .inner_size(bw / display_scale(&app), bh / display_scale(&app))
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
            let _ = win.set_ignore_cursor_events(true); // 全穿透
            let _ = win.show();
        }
        Err(e) => log::error!("border window failed: {e}"),
    }

    // 工具条：智能定位（顶/底/内三选一，对齐 TS 定位逻辑）
    show_toolbar_for_region(&app, &region);
}

/// 工具条智能定位：topSpace/bottomSpace ≥ 48 用外侧，否则贴 region 内部
fn show_toolbar_for_region(app: &AppHandle, region: &Region) {
    if let Some(old) = toolbar_window(&app) {
        let _ = old.close();
    }
    let (dx, dy, dw, dh) = match (&app).primary_monitor() {
        Ok(Some(m)) => (m.position().x, m.position().y, m.size().width as i32, m.size().height as i32),
        _ => (0, 0, 1920, 1080),
    };
    let top_space = region.y - dy;
    let bottom_space = (dy + dh) - (region.y + region.height);
    let min_space = TOOLBAR_HEIGHT as i32 + 4;
    let (tb_x, tb_y, tb_w, inside) = if top_space >= min_space {
        (region.x - 5, region.y - 5 - TOOLBAR_HEIGHT as i32, region.width + 10, false)
    } else if bottom_space >= min_space {
        (region.x - 5, region.y + region.height + 5, region.width + 10, false)
    } else {
        (region.x, region.y, region.width.min(500), true)
    };
    let _ = dx;
    let _ = dy;
    let _ = dw;
    let _ = dh;

    match WebviewWindowBuilder::new(
        &app.clone(),
        "floating-island",
        window_url("windows/toolbar.html"),
    )
    .title("工具条")
    .position((tb_x as f64) / display_scale(&app), (tb_y as f64) / display_scale(&app))
    .inner_size((tb_w as f64) / display_scale(&app), (TOOLBAR_HEIGHT + TIP_STRIP) / display_scale(&app))
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
            // 工具条内容区可交互，底部 28px 气泡带穿透（由 html 端 mousemode + Rust 轮询协作；
            // P2 简化：整窗可交互——底部气泡带面积小，误穿透成本可接受，P3 再加轮询）
            let _ = win.eval(&format!(
                "window.__TB_STATE__ = {{ pos: {} }}; void 0;",
                serde_json::to_string(&inside).unwrap_or_default()
            ));
            let _ = win.show();
        }
        Err(e) => log::error!("toolbar window failed: {e}"),
    }
}

/// 隐藏边框+工具条（对齐 hideRegionBorder）
#[tauri::command]
pub fn hide_region_border(app: AppHandle) {
    if let Some(win) = border_window(&app) {
        let _ = win.close();
    }
    if let Some(win) = toolbar_window(&app) {
        let _ = win.close();
    }
}

/// 仅隐藏边框（对齐 hideBorderOnly）
#[tauri::command]
pub fn hide_border_only(app: AppHandle) {
    if let Some(win) = border_window(&app) {
        let _ = win.close();
    }
}

/// 工具条状态推送（对齐 updateToolbarState）：html 端经 event 接收
#[tauri::command]
pub fn update_toolbar_state(app: AppHandle, state: String, elapsedSeconds: Option<u32>) {
    if let Some(win) = toolbar_window(&app) {
        let _ = win.eval(&format!(
            "window.applyToolbarState && window.applyToolbarState({}, {}); void 0;",
            serde_json::to_string(&state).unwrap_or_default(),
            elapsedSeconds.unwrap_or(0)
        ));
    }
    let _ = app.emit("toolbar-state", serde_json::json!({"state": state, "elapsed": elapsedSeconds.unwrap_or(0)}));
}

// ===== 悬浮岛（录制态岛，对齐 showFloatingIsland）=====

/// 显示录制悬浮岛（340×72 顶居中胶囊；recording 时 hide-timer 由 Rust 侧轮询）
/// async 原因同 start_region_select（同步命令内建窗死锁）
#[tauri::command]
pub async fn show_floating_island(app: AppHandle, targetDisplayId: Option<u32>) {
    if let Some(old) = toolbar_window(&app) {
        let _ = old.close();
    }
    // 指定显示器（前端 getAllDisplays 的 id = 枚举下标，与 screen.rs 一致）或主屏
    let (dx, dy, dw) = match targetDisplayId.and_then(|id| {
        app.available_monitors()
            .ok()?
            .into_iter()
            .nth(id as usize)
    }) {
        Some(m) => (m.position().x, m.position().y, m.size().width as i32),
        None => match (&app).primary_monitor() {
            Ok(Some(m)) => (m.position().x, m.position().y, m.size().width as i32),
            _ => (0, 0, 1920),
        },
    };
    let island_w = 340.0_f64;
    let x = (dx as f64 + (dw as f64 - island_w) / 2.0).round();
    let y = dy + 4;

    match WebviewWindowBuilder::new(
        &app.clone(),
        "floating-island",
        window_url("windows/island.html"),
    )
    .title("录制")
    .position((x as f64) / display_scale(&app), (y as f64) / display_scale(&app))
    .inner_size(island_w / display_scale(&app), (TOOLBAR_HEIGHT + TIP_STRIP) / display_scale(&app))
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
        }
        Err(e) => log::error!("floating island failed: {e}"),
    }
}

/// 隐藏悬浮岛（对齐 hideFloatingIsland）
#[tauri::command]
pub fn hide_floating_island(app: AppHandle) {
    if let Some(win) = toolbar_window(&app) {
        let _ = win.close();
    }
}

/// 悬浮岛状态推送（对齐 setIslandState）：idle/recording/paused/show/hide
#[tauri::command]
pub fn set_island_state(app: AppHandle, state: String, elapsedSeconds: Option<u32>) {
    if let Some(win) = toolbar_window(&app) {
        let _ = win.eval(&format!(
            "window.applyIslandState && window.applyIslandState({}, {}); void 0;",
            serde_json::to_string(&state).unwrap_or_default(),
            elapsedSeconds.unwrap_or(0)
        ));
    }
    let _ = app.emit("island-state", serde_json::json!({"state": state, "elapsed": elapsedSeconds.unwrap_or(0)}));
}

// ===== 摄像头预览 =====

/// 显示/隐藏摄像头预览（对齐 toggleCameraPreview）
/// async 原因同 start_region_select（同步命令内建窗死锁）
#[tauri::command]
pub async fn toggle_camera_preview(app: AppHandle, show: bool, cameraDeviceId: Option<String>) {
    if !show {
        hide_camera_preview_inner(&app);
        return;
    }
    if let Some(win) = camera_window(&app) {
        let _ = win.show();
        let _ = win.eval("window.startCamera && window.startCamera()");
        return;
    }
    // 初始位置：录制区域右上角（P2 简化用主屏右上角；P3 录制会话传入 region）
    let (dx, dy, dw) = match (&app).primary_monitor() {
        Ok(Some(m)) => (m.position().x, m.position().y, m.size().width as i32),
        _ => (0, 0, 1920),
    };
    let x = dx as f64 + dw as f64 - CAMERA_W - CAMERA_PAD;
    let y = dy as f64 + CAMERA_PAD;
    let device = cameraDeviceId.unwrap_or_default();
    let url = WebviewUrl::App(
        format!("windows/camera-preview.html?deviceId={}", uri_encode(&device)).into(),
    );
    match WebviewWindowBuilder::new(&app, "camera-preview", url)
        .title("摄像头")
        .position((x as f64) / display_scale(&app), (y as f64) / display_scale(&app))
        .inner_size(CAMERA_W / display_scale(&app), CAMERA_H / display_scale(&app))
        .decorations(false)
        .transparent(true)
        .resizable(false)
        .maximizable(false)
        .minimizable(false)
        .skip_taskbar(true)
        .shadow(false)
        .always_on_top(true)
        .visible(true)
        .build()
    {
        Ok(_) => {}
        Err(e) => log::error!("camera preview failed: {e}"),
    }
}

/// 隐藏前先停摄像头（防硬件会话泄漏，对齐 hideCameraPreview）
#[tauri::command]
pub fn hide_camera_preview(app: AppHandle) {
    hide_camera_preview_inner(&app);
}

fn hide_camera_preview_inner(app: &AppHandle) {
    if let Some(win) = camera_window(app) {
        let _ = win.eval("window.stopCamera && window.stopCamera()");
        let _ = win.close();
    }
}

fn uri_encode(s: &str) -> String {
    let mut out = String::new();
    for b in s.bytes() {
        match b {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => out.push(b as char),
            _ => out.push_str(&format!("%{b:02X}")),
        }
    }
    out
}
/// 摄像头预览拖拽（对齐 TS camera-drag-start/end：16ms 轮询跟随光标）
#[tauri::command]
pub fn camera_drag_start(app: AppHandle) {
    if let Some(win) = camera_window(&app) {
        if let Ok(cursor) = win.cursor_position() {
            *CameraDrag::global().lock().unwrap() = Some((cursor.x, cursor.y));
        }
    }
}

#[tauri::command]
pub fn camera_drag_end() {
    *CameraDrag::global().lock().unwrap() = None;
}

static CAMERA_DRAG: std::sync::OnceLock<Mutex<Option<(f64, f64)>>> = std::sync::OnceLock::new();
struct CameraDrag;
impl CameraDrag {
    fn global() -> &'static Mutex<Option<(f64, f64)>> {
        CAMERA_DRAG.get_or_init(|| Mutex::new(None))
    }
}
