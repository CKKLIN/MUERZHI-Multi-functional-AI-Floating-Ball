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
    // 摄像头可用区 = 录制区域。region 是**逻辑像素**（选区窗按 CSS px 上报），而窗口几何与
    // 光标位置都是物理像素 —— 换算成物理像素后再存，摄像头窗才落在选区右上角而不是别处。
    let camera_area = region_to_physical(&app, &region);
    CameraArea::global().set(Some(camera_area));
    // 已经开着的预览窗跟着搬到选区右上角（对齐 Electron 版 showCameraPreview(region)）：
    // 不搬的话窗口停在旧位置（常在选区外），拖拽夹取与合成坐标都会落在画面外。
    place_camera_in_area(&app, camera_area);
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
    // region 是选区窗上报的 **逻辑像素**，与 builder 的 logical 口径一致 —— 这里不能再除
    // 缩放比（除一次 = 二次换算，150% 屏上红框会缩到 2/3 大小并整体左移上移）。
    .position(bx, by)
    .inner_size(bw, bh)
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
            // 取景框是给用户看的辅助层，不该被录进成品：WDA_EXCLUDEFROMCAPTURE 让窗口
            // 在屏幕上照常可见（人能看见红框），但任何屏幕捕获（含 WGC）拿到的是空。
            let _ = win.set_content_protected(true);
            let _ = win.show();
        }
        Err(e) => log::error!("border window failed: {e}"),
    }

    // 工具条：智能定位（顶/底/内三选一，对齐 TS 定位逻辑）
    show_toolbar_for_region(&app, &region);
}

/// 工具条智能定位：topSpace/bottomSpace ≥ 48 用外侧，否则贴 region 内部
///
/// region 与主屏 bounds 都是**逻辑像素**（region 来自选区窗的 CSS px；Electron 版
/// screen.getPrimaryDisplay().bounds 同为逻辑像素，两版行为一致）。
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
    // 同边框窗：位置/尺寸已是逻辑像素，builder 也吃逻辑像素，不再换算
    .position(tb_x as f64, tb_y as f64)
    .inner_size(tb_w as f64, TOOLBAR_HEIGHT + TIP_STRIP)
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
            // 工具条与悬浮岛是录制辅助 UI，不该出现在成品画面里（人能看见、录制看不到）
            let _ = win.set_content_protected(true);
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
    // 可用区随录制 overlay 一起作废（对齐 Electron 的 currentPreviewArea = null）
    CameraArea::global().set(None);
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
    // 全屏录制：摄像头可用区 = 目标显示器整块屏（物理像素；都是物理量，这里不换算）
    let area = targetDisplayId
        .and_then(|id| {
            app.available_monitors()
                .ok()?
                .into_iter()
                .nth(id as usize)
        })
        .map(|m| Region {
            x: m.position().x,
            y: m.position().y,
            width: m.size().width as i32,
            height: m.size().height as i32,
        })
        .unwrap_or_else(|| primary_area(&app));
    CameraArea::global().set(Some(area));
    place_camera_in_area(&app, area);
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
            let _ = win.set_content_protected(true);
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
    // 全屏录制的可用区（整块屏）随悬浮岛一起作废，别留给下一次区域录制当默认值
    CameraArea::global().set(None);
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

/// 摄像头预览窗可放置区域（**物理像素**）——拖拽时用它夹住窗口，初始位置也由它决定
///
/// 量纲约定：选区（region-selector.html 的 e.screenX）是逻辑像素，而窗口 outer_position /
/// cursor_position 都是物理像素。CameraArea 一律存物理像素（入口处换算），下游才不用关心缩放。
pub struct CameraArea(pub Mutex<Option<Region>>);

impl CameraArea {
    pub fn global() -> &'static CameraArea {
        use std::sync::OnceLock;
        static S: OnceLock<CameraArea> = OnceLock::new();
        S.get_or_init(|| CameraArea(Mutex::new(None)))
    }

    pub fn set(&self, area: Option<Region>) {
        *self.0.lock().unwrap() = area;
    }

    pub fn get(&self) -> Option<Region> {
        *self.0.lock().unwrap()
    }
}

/// 逻辑像素选区 → 物理像素可用区（摄像头窗几何同域）
fn region_to_physical(app: &AppHandle, region: &Region) -> Region {
    scale_region(region, display_scale(app))
}

/// 换算本体（独立成函数以便单测：`region_to_physical` 需要 AppHandle）
fn scale_region(region: &Region, scale: f64) -> Region {
    Region {
        x: (region.x as f64 * scale).round() as i32,
        y: (region.y as f64 * scale).round() as i32,
        width: (region.width as f64 * scale).round() as i32,
        height: (region.height as f64 * scale).round() as i32,
    }
}

/// 主显示器物理 bounds
fn primary_area(app: &AppHandle) -> Region {
    match app.primary_monitor() {
        Ok(Some(m)) => Region {
            x: m.position().x,
            y: m.position().y,
            width: m.size().width as i32,
            height: m.size().height as i32,
        },
        _ => Region { x: 0, y: 0, width: 1920, height: 1080 },
    }
}

/// 预览窗在可用区里的初始位置（右上角，留 CAMERA_PAD 边距）
///
/// `.max(area.x)/.max(area.y)` 兜住「选区比预览窗还小」的情形 —— 否则右边缘会是负偏移，
/// 窗口跑到选区左上之外。
fn camera_pos_in_area(area: Region) -> (i32, i32) {
    (
        (area.x as f64 + area.width as f64 - CAMERA_W - CAMERA_PAD).max(area.x as f64).round() as i32,
        (area.y as f64 + CAMERA_PAD).round() as i32,
    )
}

/// 把已开的预览窗搬到可用区右上角（初次创建与选区变更时共用）
fn place_camera_in_area(app: &AppHandle, area: Region) {
    let Some(win) = camera_window(app) else { return };
    let (x, y) = camera_pos_in_area(area);
    let _ = win.set_position(tauri::PhysicalPosition::new(x, y));
}

/// 显示/隐藏摄像头预览（对齐 toggleCameraPreview）
/// async 原因同 start_region_select（同步命令内建窗死锁）
#[tauri::command]
pub async fn toggle_camera_preview(app: AppHandle, show: bool, cameraDeviceId: Option<String>) {
    if !show {
        hide_camera_preview_inner(&app);
        return;
    }
    // 初始位置：可用区右上角（有选区就贴选区，否则主屏）—— 单位为物理像素
    let area = CameraArea::global().get().unwrap_or_else(|| primary_area(&app));
    if let Some(win) = camera_window(&app) {
        let _ = win.show();
        place_camera_in_area(&app, area);
        let _ = win.eval("window.startCamera && window.startCamera()");
        return;
    }
    // 与 place_camera_in_area 同一算法
    let (x, y) = camera_pos_in_area(area);
    let device = cameraDeviceId.unwrap_or_default();
    let url = WebviewUrl::App(
        format!("windows/camera-preview.html?deviceId={}", uri_encode(&device)).into(),
    );
    match WebviewWindowBuilder::new(&app, "camera-preview", url)
        .title("摄像头")
        // builder 吃逻辑像素，而 area/x/y 是物理像素 —— 这里必须除缩放比
        .position(x as f64 / display_scale(&app), y as f64 / display_scale(&app))
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
        Ok(win) => {
            let _ = win.set_content_protected(true);
            // 放行摄像头/麦克风权限（否则 WebView2 弹的确认框在这类无边框窗里点不到）
            if let Err(e) = allow_media_permissions(&win) {
                log::warn!("摄像头窗权限放行失败: {e}");
            }
        }
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
// ===== 摄像头预览拖拽（对齐 TS startPreviewDrag：16ms 轮询跟随光标）=====

/// 拖拽状态：Some((offsetX, offsetY)) = 正在拖；offset 是「光标 - 窗口左上角」
struct CameraDrag;
impl CameraDrag {
    fn global() -> &'static Mutex<Option<(f64, f64)>> {
        static S: std::sync::OnceLock<Mutex<Option<(f64, f64)>>> = std::sync::OnceLock::new();
        S.get_or_init(|| Mutex::new(None))
    }
}

fn set_camera_bounds(win: &tauri::WebviewWindow, x: i32, y: i32) {
    let _ = win.set_position(tauri::PhysicalPosition::new(x, y));
}

#[tauri::command]
pub async fn camera_drag_start(app: AppHandle) {
    let Some(win) = camera_window(&app) else { return };
    let Ok(cursor) = win.cursor_position() else { return };
    let Ok(pos) = win.outer_position() else { return };
    // 记下光标相对窗口的偏移：拖动过程中保持这个相对位置，窗口才跟手
    let offset = (cursor.x - pos.x as f64, cursor.y - pos.y as f64);
    *CameraDrag::global().lock().unwrap() = Some(offset);

    // 16ms 轮询跟随（与旧版 setInterval 同频）。cursor_position 是物理像素，
    // 窗口位置也用物理像素设置，不做缩放换算。
    tauri::async_runtime::spawn(async move {
        loop {
            let offset = *CameraDrag::global().lock().unwrap();
            let Some((ox, oy)) = offset else { break };
            let Some(win) = camera_window(&app) else { break };
            let Ok(cursor) = win.cursor_position() else { break };
            let Ok(size) = win.outer_size() else { break };
            let mut nx = (cursor.x - ox).round() as i32;
            let mut ny = (cursor.y - oy).round() as i32;
            // 夹在可用区内（贴边取景时不许拖出录制范围，否则摄像头会落在成品画面外）。
            // 用 max/min 而不是 clamp：选区比预览窗还小时上界会小于下界，clamp 直接 panic。
            if let Some(area) = *CameraArea::global().0.lock().unwrap() {
                let max_x = (area.x + area.width - size.width as i32).max(area.x);
                let max_y = (area.y + area.height - size.height as i32).max(area.y);
                nx = nx.max(area.x).min(max_x);
                ny = ny.max(area.y).min(max_y);
            }
            set_camera_bounds(&win, nx, ny);
            tokio::time::sleep(std::time::Duration::from_millis(16)).await;
        }
    });
}

/// 摄像头预览窗几何（渲染层合成画中画时取窗口位置）
#[tauri::command]
pub fn camera_geometry_cmd(app: AppHandle) -> Option<serde_json::Value> {
    camera_geometry(&app).map(|(x, y, w, h)| serde_json::json!({"x": x, "y": y, "width": w, "height": h}))
}

#[tauri::command]
pub fn camera_drag_end() {
    *CameraDrag::global().lock().unwrap() = None;
}

/// 摄像头录制已落盘（camera-preview.html 的 MediaRecorder 停止后回报）
///
/// 录制停止流程会等这个信号再启动 ffmpeg overlay —— 否则 webm 尾部还在写，合成会截短。
pub fn camera_record_done() -> &'static std::sync::atomic::AtomicBool {
    static DONE: std::sync::OnceLock<std::sync::atomic::AtomicBool> = std::sync::OnceLock::new();
    DONE.get_or_init(|| std::sync::atomic::AtomicBool::new(true))
}

#[tauri::command]
pub fn camera_record_finished(_app: AppHandle, filePath: String) {
    log::info!("摄像头录制段已落盘: {filePath}");
    camera_record_done().store(true, std::sync::atomic::Ordering::SeqCst);
}

/// 放行 WebView2 的媒体权限（摄像头/麦克风）
///
/// WebView2 默认对 `getUserMedia` 弹**权限确认对话框**（CDP 目标里能直接看到
/// `edge://permission-request-dialog/`），而我们的窗口是无边框透明窗、用户看不到也点不到
/// 这个对话框 —— 表现就是「摄像头预览一直黑、videoWidth 恒为 0」。旧 Electron 版没有这层
/// 确认（Electron 直接放行），所以迁移后必须显式处理。
///
/// 做法：拿到底层 ICoreWebView2，挂 PermissionRequested 处理器，把摄像头/麦克风一律放行。
/// 只放行这两类（剪贴板/地理位置等仍走默认策略），避免无差别提权。
#[cfg(windows)]
fn allow_media_permissions(win: &tauri::WebviewWindow) -> Result<(), String> {
    use webview2_com::Microsoft::Web::WebView2::Win32::{
        COREWEBVIEW2_PERMISSION_KIND_CAMERA, COREWEBVIEW2_PERMISSION_KIND_MICROPHONE,
        COREWEBVIEW2_PERMISSION_STATE_ALLOW,
    };
    use webview2_com::PermissionRequestedEventHandler;

    win.with_webview(|webview| unsafe {
        let controller = webview.controller();
        let core = match controller.CoreWebView2() {
            Ok(c) => c,
            Err(e) => {
                log::warn!("取 CoreWebView2 失败，无法放行媒体权限: {e}");
                return;
            }
        };
        let mut token = 0i64;
        let handler = PermissionRequestedEventHandler::create(Box::new(|_, args| {
            let Some(args) = args else { return Ok(()) };
            let mut kind = Default::default();
            args.PermissionKind(&mut kind)?;
            if kind == COREWEBVIEW2_PERMISSION_KIND_CAMERA
                || kind == COREWEBVIEW2_PERMISSION_KIND_MICROPHONE
            {
                args.SetState(COREWEBVIEW2_PERMISSION_STATE_ALLOW)?;
            }
            Ok(())
        }));
        if let Err(e) = core.add_PermissionRequested(&handler, &mut token) {
            log::warn!("注册媒体权限处理器失败: {e}");
        }
    })
    .map_err(|e| format!("with_webview 失败: {e}"))
}

#[cfg(not(windows))]
fn allow_media_permissions(_win: &tauri::WebviewWindow) -> Result<(), String> {
    Ok(())
}

/// 让摄像头窗开始录制画中画（写 path），并复位信号
pub fn start_camera_recording(app: &AppHandle, path: &str) {
    if let Some(win) = camera_window(app) {
        camera_record_done().store(false, std::sync::atomic::Ordering::SeqCst);
        let script = format!(
            "window.startRecording && window.startRecording({}); void 0;",
            serde_json::to_string(path).unwrap_or_else(|_| "\"\"".to_string())
        );
        let _ = win.eval(&script);
    }
}

/// 让摄像头窗停止录制并等落盘（最多等 3 秒）
pub async fn stop_camera_recording(app: &AppHandle) {
    let Some(win) = camera_window(app) else { return };
    if camera_record_done().load(std::sync::atomic::Ordering::SeqCst) {
        return; // 没在录
    }
    let _ = win.eval("window.stopRecording && window.stopRecording(); void 0;");
    for _ in 0..60 {
        if camera_record_done().load(std::sync::atomic::Ordering::SeqCst) {
            return;
        }
        tokio::time::sleep(std::time::Duration::from_millis(50)).await;
    }
    log::warn!("等待摄像头段落盘超时（3s），继续合成");
}

/// 摄像头窗在屏幕上的当前几何（合成叠加时按它换算到成品画面坐标）
pub fn camera_geometry(app: &AppHandle) -> Option<(i32, i32, i32, i32)> {
    let win = camera_window(app)?;
    if !win.is_visible().unwrap_or(false) {
        return None;
    }
    let pos = win.outer_position().ok()?;
    let size = win.outer_size().ok()?;
    Some((pos.x, pos.y, size.width as i32, size.height as i32))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn region_scaled_to_physical_units() {
        // 150% 缩放：选区 (100,100,400,300) 逻辑像素 → (150,150,600,450) 物理像素。
        // 摄像头窗的 outer_position 就是物理像素，两边必须同域才能直接相减。
        let r = Region { x: 100, y: 100, width: 400, height: 300 };
        let p = scale_region(&r, 1.5);
        assert_eq!((p.x, p.y, p.width, p.height), (150, 150, 600, 450));
        // 100% 缩放是恒等（常见无缩放屏不该被换算动到）
        let q = scale_region(&r, 1.0);
        assert_eq!((q.x, q.y, q.width, q.height), (100, 100, 400, 300));
        // 125% 的 .5 边界要四舍五入而不是截断（截断会让窗口每次移动都往左上漂）
        let s = scale_region(&Region { x: 3, y: 5, width: 7, height: 9 }, 1.25);
        assert_eq!((s.x, s.y, s.width, s.height), (4, 6, 9, 11));
    }

    #[test]
    fn camera_placement_keeps_window_inside_area() {
        // 正常选区：贴在右上角、留 12px 边距
        let area = Region { x: 100, y: 100, width: 600, height: 450 };
        assert_eq!(camera_pos_in_area(area), (600 - 200 - 12 + 100, 112));
        // 可用区比摄像头窗还小时不能算出负坐标（否则窗口跑到选区左上之外）
        let tiny = Region { x: 10, y: 20, width: 100, height: 80 };
        assert_eq!(camera_pos_in_area(tiny), (10, 32));
    }
}
