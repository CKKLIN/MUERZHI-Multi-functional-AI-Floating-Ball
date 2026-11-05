// 区域选择体系 — 移植 electron/main/region-selector.ts
// 选区全屏透明窗（region-selector.html 承载 UI）→ 边框窗（全穿透 3px 框）
// → 工具条/悬浮岛（44px 胶囊 UI，浮在红框上方外部、底边与红框顶边齐平）
// 摄像头预览窗（200×150，16ms 轮询跟随拖拽）

// camelCase 参数名是 Tauri invoke 映射约定；P3 select_region 长连接接入后启用全部
#![allow(non_snake_case, dead_code)]

use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager, WebviewUrl, WebviewWindowBuilder};

pub const TOOLBAR_HEIGHT: f64 = 44.0;
/// 悬浮岛窗口尺寸（**逻辑像素**，builder 的口径）。
///
/// 这两个数是「页内视口尺寸」，不是物理像素 —— 旧实现两者都除了缩放比，页内 CSS 视口
/// 只剩 226×48，而胶囊要 302×44：胶囊上下被 flex 压扁、左右各被裁掉 ~37px
/// （实测待机裁 23px/侧、录制态 42px/侧，连关闭按钮都在窗外），肉眼就是「岛被切了」。
/// 现在：宽 326 = 最宽状态（待机，麦克风/摄像头按钮都在）302 + 左右各 12 放光晕；
/// 高 72 = 胶囊 44 + 上 12 / 下 16（向上是录制态那圈红光、向下是投影，实测下端要 16 才能把投影尾端放完）。
const ISLAND_W_LOGICAL: f64 = 396.0;
const ISLAND_H_LOGICAL: f64 = 72.0;
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

/// 鼠标光标当前所在显示器的物理 bounds
///
/// 选区窗**只盖一块屏**（不是整个虚拟桌面）：进程是 Per-Monitor DPI Aware V2，
/// 而 wry 用 `GetDpiForWindow` 决定 WebView2 的 CSS 像素比例 —— 一个跨屏大窗口只有
/// **一个** DPI 上下文（按窗口中心所在屏），不存在「视口内分段按屏归一化」。所以
/// 100% 主屏 + 150% 副屏时，副屏上的 clientX 与副屏物理像素比例错 1.5 倍，框出来
/// 的宽度偏小（实测）。让窗口严格贴合一块屏，DPI 上下文即天然单一。
/// 默认取鼠标所在屏（用户点「区域录制」时手在哪块屏就选哪块），可经页面切换。
fn monitor_under_cursor(app: &AppHandle) -> Region {
    let fallback = primary_area(app);
    let Some(win) = app.get_webview_window("region-selector") else {
        // 选区窗还没建（首次进入）→ 用主窗口的光标位置
        let cursor = app
            .get_webview_window("main")
            .and_then(|w| w.cursor_position().ok())
            .or_else(|| {
                app.get_webview_window("floating-ball")
                    .and_then(|w| w.cursor_position().ok())
            });
        let Some(c) = cursor else { return fallback };
        return monitor_area_at(app, c.x as i32, c.y as i32).unwrap_or(fallback);
    };
    let Ok(c) = win.cursor_position() else {
        return fallback;
    };
    monitor_area_at(app, c.x as i32, c.y as i32).unwrap_or(fallback)
}

/// 物理点所在显示器的 bounds（找不到退回 None）
fn monitor_area_at(app: &AppHandle, x: i32, y: i32) -> Option<Region> {
    let m = app.monitor_from_point(x as f64, y as f64).ok()??;
    Some(Region {
        x: m.position().x,
        y: m.position().y,
        width: m.size().width as i32,
        height: m.size().height as i32,
    })
}

/// 物理点所在显示器的下标（available_monitors 顺序；找不到返回 None）
///
/// 区域录制靠它把「选区在哪块屏」带回渲染层 —— targetDisplayId 曾被硬编码 0，
/// 在屏幕 2 上选区会录成屏幕 1 的内容（实测）。
fn monitor_index_at(app: &AppHandle, x: i32, y: i32) -> Option<usize> {
    let mons = app.available_monitors().ok()?;
    mons.iter()
        .position(|m| {
            let (mx, my) = (m.position().x, m.position().y);
            let (mw, mh) = (m.size().width as i32, m.size().height as i32);
            x >= mx && x < mx + mw && y >= my && y < my + mh
        })
}

/// 指定下标的显示器 bounds（页面「切到第 N 块屏」用）
fn monitor_area_by_index(app: &AppHandle, index: usize) -> Option<Region> {
    let mons = app.available_monitors().ok()?;
    let m = mons.get(index)?;
    Some(Region {
        x: m.position().x,
        y: m.position().y,
        width: m.size().width as i32,
        height: m.size().height as i32,
    })
}

fn window_url(path: &str) -> WebviewUrl {
    WebviewUrl::App(path.to_string().into())
}

// ===== 悬浮岛「录制中自动收起 + 鼠标悬停唤出」=====

/// 是否对该窗口启用「录制中自动收起」：全屏/多屏录制（show_floating_island）为 true；
/// 区域录制用的是同一个 label 的工具条（show_region_border），它贴在选区外沿、
/// 不挡画面，保持常显（藏了反而找不到暂停/停止按钮）。
static ISLAND_AUTO_HIDE: std::sync::atomic::AtomicBool = std::sync::atomic::AtomicBool::new(false);
/// 悬浮岛当前是否可见（避免每 120ms 重复 eval 同一状态）
static ISLAND_VISIBLE: std::sync::atomic::AtomicBool = std::sync::atomic::AtomicBool::new(true);

/// 只改悬浮岛/工具条的显隐。`hidden-island` 类只做透明 + 上移，**窗口仍在原地**，
/// 所以鼠标继续落在窗口矩形内也能被轮询看到 —— 悬停判定不需要额外的热区窗口。
///
/// 藏起来的同时必须放行**鼠标穿透**：不然那一小条看不见的窗口会把用户的点击吃掉，
/// 桌面/浏览器在岛下面点不动（配合 set_ignore_cursor_events，视觉与交互一致）。
fn eval_island_visibility(app: &AppHandle, hidden: bool) {
    if let Some(win) = toolbar_window(app) {
        let _ = win.set_ignore_cursor_events(hidden);
        let _ = win.eval(&format!(
            "window.applyIslandState && window.applyIslandState('{}'); void 0;",
            if hidden { "hide" } else { "show" }
        ));
    }
}

/// 录制开始：把悬浮岛收起来（藏起来，但鼠标移过去还能唤出，见 spawn_island_hover_watch）
pub fn hide_island_ui(app: &AppHandle) {
    use std::sync::atomic::Ordering;
    if !ISLAND_AUTO_HIDE.load(Ordering::SeqCst) {
        return;
    }
    ISLAND_VISIBLE.store(false, Ordering::SeqCst);
    eval_island_visibility(app, true);
}

/// 录制中光标轮询：进到悬浮岛矩形内 → 显示，移出 → 收起（120ms 粒度：比 20Hz 电平
/// ticker 轻，又比 500ms 跟手）。只在「全屏/多屏录制且会话进行中」跑，其余情况直接跳过。
///
/// 量纲：`cursor_position()` 与 `outer_position()` 都是**物理像素**（与 camera_drag_start
/// 同一口径），直接相减即可，不做缩放换算。
pub fn spawn_island_hover_watch(app: AppHandle) {
    use std::sync::atomic::Ordering;
    /// 胶囊四周留点余量：窗口矩形比视觉上的胶囊大，贴边即算悬停，手感更顺
    const HOVER_PAD: i32 = 6;
    /// 活跃粒度（全屏/多屏录制中，悬停唤出要跟手）
    const ACTIVE_MS: u64 = 120;
    /// 空闲粒度（不在录制：轮询只是确认「仍空闲」，开销压到 2Hz）
    const IDLE_MS: u64 = 500;
    tauri::async_runtime::spawn(async move {
        let mut tick = tokio::time::interval(std::time::Duration::from_millis(IDLE_MS));
        let mut active = false;
        loop {
            tick.tick().await;
            let now_active = ISLAND_AUTO_HIDE.load(Ordering::SeqCst)
                && crate::modules::recording::SessionState::global().is_active();
            if now_active != active {
                active = now_active;
                let ms = if active { ACTIVE_MS } else { IDLE_MS };
                tick = tokio::time::interval(std::time::Duration::from_millis(ms));
            }
            if !active {
                continue;
            }
            let Some(win) = toolbar_window(&app) else {
                continue;
            };
            let (Ok(pos), Ok(size), Ok(cursor)) = (
                win.outer_position(),
                win.outer_size(),
                win.cursor_position(),
            ) else {
                continue;
            };
            let inside = cursor.x >= (pos.x - HOVER_PAD) as f64
                && cursor.x <= (pos.x + size.width as i32 + HOVER_PAD) as f64
                && cursor.y >= (pos.y - HOVER_PAD) as f64
                && cursor.y <= (pos.y + size.height as i32 + HOVER_PAD) as f64;
            if ISLAND_VISIBLE.swap(inside, Ordering::SeqCst) != inside {
                eval_island_visibility(&app, !inside);
            }
        }
    });
}

/// 启动区域选择（对齐 selectRegion）：主窗口先最小化，全屏透明窗（底图 P4 接 WGC）
///
/// 必须是 async fn：同步命令跑在主线程上，而 WebviewWindowBuilder::build() 需要事件循环
/// 处理窗口创建消息 —— 同步命令里 build() 与主线程互等而死锁（实测：build() 返回 Ok，
/// 但 webview 永远停在空白且无错误日志）。异步命令走线程池，build() 投递主线程后正常。
#[tauri::command]
pub async fn start_region_select(app: AppHandle) {
    if RegionState::global()
        .waiting
        .load(std::sync::atomic::Ordering::SeqCst)
    {
        return;
    }
    log::info!("start_region_select: 主窗口最小化，开全屏选区窗");
    RegionState::global()
        .waiting
        .store(true, std::sync::atomic::Ordering::SeqCst);
    *RegionState::global().result.lock().unwrap() = None;

    if let Some(main) = (&app).get_webview_window("main") {
        let _ = main.minimize();
    }
    // 选区窗**只盖一块屏**（默认鼠标所在屏），不是整个虚拟桌面 —— 见 monitor_under_cursor
    // 注释：DPI 感知 V2 下跨屏窗口只有单一 DPI 上下文，副屏上框选宽度会偏小。
    // geometry: builder 的 position/inner_size 吃**逻辑像素**；这里用 set_position/
    // set_size 走**物理像素**（与 ai_island 同一量纲约定，见 AGENTS.md「量纲」段），
    // 避免混合 DPI 下二次换算把窗挪错屏/缩错尺寸。
    let target = monitor_under_cursor(&app);
    build_region_selector(&app, target, true);
}

/// 创建/重建选区窗：先确保旧窗（若有）彻底销毁，再在目标显示器上新建
///
/// 关窗销毁是异步的（close() 只发起请求），必须轮询等窗口真的从列表消失再建 ——
/// 否则撞「a webview with label `region-selector` already exists」，切屏静默失败。
/// 每次都是全新窗口：跨屏复用同一窗口在异缩放下不可靠（WebView2 换 DPI 上下文时
/// 旧尺寸像素会溢出到刚离开的屏上）。
fn build_region_selector(app: &AppHandle, target: Region, first_time: bool) {
    if region_window(app).is_none() {
        do_build_region_selector(app, target, first_time);
        return;
    }
    log::info!("build_region_selector: 存在旧选区窗，先擦除并强制销毁");
    if let Some(old) = region_window(app) {
        // 关键三步（顺序不能换）——解决「切屏后旧屏残留着一块选区画面」：
        // ① 缩到 1×1：DWM 会立刻用新内容覆盖**整块旧区域**，视觉残留立刻消失。
        //    仅 hide() 不够：WebView2 的 GPU 合成表面仍挂着，窗口再次 show 时
        //    旧像素会整块闪回（实测切两三轮后稳定复现：屏幕2 上留着一整块旧画面，
        //    上面还叠着新窗口的「屏幕1/屏幕2」按钮组，两组按钮同时可见）。
        // ② destroy()：close() 会发 CloseRequested（可能被拦截器吃掉导致窗口不关），
        //    且销毁有延迟；destroy 强制销毁、无事件。
        // ③ 等 400ms：destroy 在消息循环里处理（tao event_loop.rs 的 DestroyWindow），
        //    DWM 表面回收另有延迟，期间不能建新窗。
        let _ = old.set_size(tauri::PhysicalSize::new(1, 1));
        let _ = old.hide();
        let _ = old.destroy();
    }
    let app2 = app.clone();
    tauri::async_runtime::spawn(async move {
        // 等 Tauri 侧窗口对象消失（destroy 后通常立即消失）
        for _ in 0..80 {
            if app2.get_webview_window("region-selector").is_none() {
                break;
            }
            tokio::time::sleep(std::time::Duration::from_millis(25)).await;
        }
        if app2.get_webview_window("region-selector").is_some() {
            log::error!("build_region_selector: 旧选区窗 2s 未销毁，中止重建");
            if !first_time {
                let _ = app2.emit("region-cancelled", ());
            }
            return;
        }
        // ⚠️ 关键：Tauri 侧对象已消失 ≠ 底层 HWND 与其 WebView2 GPU 合成表面已从屏幕
        // 擦除。destroy 在消息循环里处理（tao event_loop.rs 的 DestroyWindow），DWM 的
        // 表面回收另有延迟 —— 期间旧全屏透明窗的像素仍留在刚离开的屏上
        // （实测「切两轮后整块副屏仍被点亮」）。固定多等，让合成器完成回收再重建。
        tokio::time::sleep(std::time::Duration::from_millis(400)).await;
        do_build_region_selector(&app2, target, first_time);
    });
}

/// 实际建窗（build_region_selector 的真正实现）
///
/// 全新窗口用 builder 的 position/inner_size 一次性把几何设成**逻辑像素**目标值。
/// 这里必须用 builder（而非 build 后 set_position/set_size）：后者在窗口刚创建、
/// 尚未映射时发出的尺寸请求可能被 Win32 忽略或与初始 DPI 上下文打架。
/// 位置/尺寸直接取该屏的物理值换算成逻辑（物理 / scale）。
fn do_build_region_selector(app: &AppHandle, target: Region, first_time: bool) {
    let scale = monitor_scale_of(app, &target);
    log::info!(
        "do_build_region_selector: 目标显示器 ({}, {}) {}x{} scale={scale}",
        target.x, target.y, target.width, target.height
    );
    // builder 吃逻辑像素。目标屏原点是物理像素；按该屏 scale 换算成逻辑后，
    // Windows 会再按同一 scale 映射回物理，净效果等于目标物理值。
    let lx = target.x as f64 / scale;
    let ly = target.y as f64 / scale;
    let lw = target.width as f64 / scale;
    let lh = target.height as f64 / scale;
    // 布局载荷在页面加载完成后注入（build() 后立刻 eval 会打在加载中的文档上，
    // window.__REGION_ORIGIN__ 丢失 → 页面回退 devicePixelRatio，缩放错）
    let layout_json = region_origin_json(app, &target, scale);
    match WebviewWindowBuilder::new(
        app,
        "region-selector",
        window_url("windows/region-selector.html"),
    )
    .title("选区")
    .position(lx.round(), ly.round())
    .inner_size(lw, lh)
    .decorations(false)
    .transparent(true)
    .resizable(false)
    .maximizable(false)
    .minimizable(false)
    .skip_taskbar(true)
    .shadow(false)
    .always_on_top(true)
    // ⚠️ 不设 background_color：Windows 上窗口层忽略 alpha（tauri 文档明说），
    // 设任何颜色都会在 WebView2 首帧前显示成一块不透明色块 —— 表现为「先灰一次、
    // 过一秒页面画完又灰一次」（用户反馈的两次变灰）。
    // 改为「页面首帧就绪后才 show」（region_selector_ready 命令），全程不见空窗。
    .visible(false)
    .on_page_load(move |webview, payload| {
        if matches!(payload.event(), tauri::webview::PageLoadEvent::Finished) {
            let _ = webview.eval(&format!(
                "if (window.applyRegionLayout) window.applyRegionLayout({layout_json}); void 0;"
            ));
            // 这里**不 show()**：Finished 只表示文档加载完，WebView2 还没合成出首帧
            // （遮罩/底图都没画）。此时显示就是一块空窗；等页面首帧就绪后由
            // region_selector_ready 命令触发 show —— 只灰一次，无中间态。
        }
    })
    .build()
    {
        Ok(win) => {
            let _ = win.set_focus();
            if let (Ok(p), Ok(s)) = (win.outer_position(), win.outer_size()) {
                log::info!(
                    "do_build_region_selector: 实际生效 pos=({},{}) size={}x{}（目标 {}x{} @({},{})）",
                    p.x, p.y, s.width, s.height,
                    target.width, target.height, target.x, target.y
                );
            }
            dump_windows(app, if first_time { "after-build" } else { "after-rebuild" });
            // 兜底：页面若因故没调 region_selector_ready（脚本异常/资源失败），
            // 3s 后强制显示，保证用户点了选区不会毫无反应。
            let app2 = app.clone();
            tauri::async_runtime::spawn(async move {
                tokio::time::sleep(std::time::Duration::from_millis(3000)).await;
                if let Some(w) = app2.get_webview_window("region-selector") {
                    if !w.is_visible().unwrap_or(false) {
                        log::warn!("do_build_region_selector: 3s 内未显示，兜底 show");
                        let _ = w.show();
                        let _ = w.set_content_protected(true);
                    }
                }
            });
            if first_time {
                match win.url() {
                    Ok(u) => log::info!("region selector url: {u}"),
                    Err(e) => log::error!("region selector url read failed: {e}"),
                }
            }
        }
        Err(e) => {
            log::error!("region selector window failed: {e}");
            if first_time {
                RegionState::global()
                    .waiting
                    .store(false, std::sync::atomic::Ordering::SeqCst);
                let _ = app.emit("region-cancelled", ());
            }
        }
    }
}

/// 选区页首帧就绪 → 显示窗口
///
/// 窗口建好后是 visible(false)（见 do_build_region_selector 的注释：Windows 窗口层
/// 忽略 alpha，建窗到 WebView2 合成首帧之间显示必然是一次「空窗/色块」闪变）。
/// 页面在 DOM + 遮罩 + 底图都画完后调本命令，窗口才出现 —— 视觉上只有一次遮罩。
///
/// 兜底：页面若因故没调（脚本异常/资源加载失败），Rust 侧 2.5s 后强制显示，
/// 保证用户点了选区不会「毫无反应」。
#[tauri::command]
pub fn region_selector_ready(app: AppHandle) {
    let Some(win) = region_window(&app) else {
        return;
    };
    if !RegionState::global()
        .waiting
        .load(std::sync::atomic::Ordering::SeqCst)
    {
        return;
    }
    let _ = win.show();
    // 内容保护（WDA_EXCLUDEFROMCAPTURE）：必须在窗口已映射后设才可靠。选区窗**必须**设，
    // 否则实时底图抓帧会把选区窗自己（遮罩+按钮+红框）拍进去 —— 表现为「底图里有个
    // 选区窗」。与边框窗/工具条/摄像头预览窗同一处理（画笔标注窗是唯一故意不设的）。
    let _ = win.set_content_protected(true);
    let _ = win.set_focus();
    let app2 = app.clone();
    tauri::async_runtime::spawn(async move {
        tokio::time::sleep(std::time::Duration::from_millis(2500)).await;
        if let Some(w) = app2.get_webview_window("region-selector") {
            if !w.is_visible().unwrap_or(false) {
                log::warn!("region_selector: 页面未回报就绪，2.5s 后兜底显示");
                let _ = w.show();
                let _ = w.set_content_protected(true);
            }
        }
    });
}

/// 页面请求切换到第 index 块显示器（多屏时在选区窗上提供切屏按钮）
///
/// **关旧窗 + 等销毁 + 建新窗**（异步）：跨屏复用同一窗口不可靠 —— 窗口跨到异缩放屏
/// 会收到 `WM_DPICHANGED`，WebView2 的 DPI 上下文与画布缓冲按新屏重建有延迟，期间
/// 旧尺寸的像素内容会溢出到刚离开的那块屏上（实测：切屏后整个副屏仍被「点亮」，
/// 表现为屏幕2 上留着一块选区窗大小的画面）。复用方案试过两轮都无法消除。
/// 销毁等待逻辑见 build_region_selector（close() 异步，必须等窗口真的消失）。
#[tauri::command]
pub fn region_switch_monitor(app: AppHandle, index: usize) {
    if !RegionState::global()
        .waiting
        .load(std::sync::atomic::Ordering::SeqCst)
    {
        return;
    }
    let Some(target) = monitor_area_by_index(&app, index) else {
        log::warn!("region_switch_monitor: 显示器 #{index} 不存在");
        return;
    };
    log::info!("region_switch_monitor: 切到显示器 #{index}");
    build_region_selector(&app, target, false);
}

/// 打印当前所有窗口的 label/几何/可见性（诊断「多出的小窗」用）
///
/// 枚举 Tauri 管理的全部 webview 窗口（`app.webview_windows()` 返回 label→窗口），
/// 把几何与可见性打进日志。用于定位「切屏后多出的小窗」到底是哪个 label。
fn dump_windows(app: &AppHandle, tag: &str) {
    use tauri::Manager;
    let mut list: Vec<String> = Vec::new();
    for (label, w) in app.webview_windows() {
        let pos = w
            .outer_position()
            .map(|p| format!("({},{})", p.x, p.y))
            .unwrap_or_else(|_| "?".into());
        let size = w
            .outer_size()
            .map(|s| format!("{}x{}", s.width, s.height))
            .unwrap_or_else(|_| "?".into());
        list.push(format!(
            "{label}@{pos} {size} vis={}",
            w.is_visible().unwrap_or(false)
        ));
    }
    list.sort();
    log::info!("[windows/{tag}] {}", list.join(" | "));
}


/// 注入给页面的布局载荷：目标屏原点/尺寸/scale + 全部显示器列表
fn region_origin_json(app: &AppHandle, target: &Region, scale: f64) -> String {
    let mut mons = Vec::new();
    if let Ok(list) = app.available_monitors() {
        for m in list {
            mons.push(serde_json::json!({
                "x": m.position().x,
                "y": m.position().y,
                "width": m.size().width as i32,
                "height": m.size().height as i32,
                "scale": m.scale_factor(),
            }));
        }
    }
    serde_json::json!({
        "x": target.x,
        "y": target.y,
        "w": target.width,
        "h": target.height,
        "scale": scale,
        "monitors": mons,
    })
    .to_string()
}

/// 该显示器区域的缩放比
fn monitor_scale_of(app: &AppHandle, area: &Region) -> f64 {
    monitor_scale_at(app, area.x, area.y)
}

/// 清理选区窗并恢复主窗口（选完/取消共用）
fn cleanup_region_selector(app: &AppHandle) {
    if let Some(win) = region_window(app) {
        let pos = win.outer_position().ok();
        let size = win.outer_size().ok();
        log::info!(
            "cleanup_region_selector: 销毁选区窗 pos={pos:?} size={size:?} visible={:?}",
            win.is_visible()
        );
        // 先缩到 1×1 再销毁：让 DWM 立刻用新内容覆盖整块旧区域，避免留下视觉残留
        // （用户会以为选区窗没关掉）。仅 hide() 不够 —— WebView2 的 GPU 合成表面仍挂着。
        let _ = win.set_size(tauri::PhysicalSize::new(1, 1));
        let _ = win.hide();
        let _ = win.destroy();
    } else {
        log::info!("cleanup_region_selector: 无选区窗");
    }
    if let Some(main) = (&app).get_webview_window("main") {
        let _ = main.show();
        let _ = main.set_focus();
    }
    RegionState::global()
        .waiting
        .store(false, std::sync::atomic::Ordering::SeqCst);
}

// ===== tauri command（region-selector.html / bridge.ts 调用）=====

/// 选区完成（对齐 region-selected）
///
/// 事件载荷带 `sourceId: "screen:{显示器下标}"`（按选区中心点所在屏推导）：
/// 渲染层 selectRegion 拿它填 targetDisplayId —— 曾硬编码 screen:0，在屏幕 2 上
/// 框选的区域会录成屏幕 1 的内容（crop 坐标按屏 1 原点平移后落在屏 1 画面里，实测）。
#[tauri::command]
pub fn region_selected(
    app: AppHandle,
    x: i32,
    y: i32,
    width: i32,
    height: i32,
    sourceId: Option<String>,
) {
    let monitor = monitor_index_at(&app, x + width / 2, y + height / 2).unwrap_or(0);
    log::info!("Region selected: {x},{y} {width}x{height}（显示器 #{monitor}，页面 sourceId={sourceId:?}）");
    *RegionState::global().result.lock().unwrap() = Some(Region {
        x,
        y,
        width,
        height,
    });
    let _ = app.emit(
        "region-selected",
        serde_json::json!({
            "x": x,
            "y": y,
            "width": width,
            "height": height,
            "sourceId": format!("screen:{monitor}"),
        }),
    );
    cleanup_region_selector(&app);
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
pub async fn show_region_border(
    app: AppHandle,
    region: Region,
    audioState: Option<IslandAudioState>,
) {
    use std::sync::atomic::Ordering;
    log::info!(
        "show_region_border: region=({},{}) {}x{}（mic={}, cam={}）",
        region.x,
        region.y,
        region.width,
        region.height,
        audioState.as_ref().map(|a| a.mic_enabled).unwrap_or(false),
        audioState
            .as_ref()
            .map(|a| a.camera_enabled)
            .unwrap_or(false),
    );
    // 区域录制用的是贴选区外沿的工具条（同 label，见 toolbar_window），常显不自动收起
    ISLAND_AUTO_HIDE.store(false, Ordering::SeqCst);
    ISLAND_VISIBLE.store(true, Ordering::SeqCst);
    // 摄像头可用区 = 录制区域。选区页按「窗口原点 + 本屏 scale」已经把 region 换算成
    // **物理像素**（见 region-selector.html 的 toPhysical），与窗口几何/光标位置同域，
    // 直接用即可 —— 早先这里再乘一次 scale 是因为页面上报逻辑像素，换算口径已变。
    let camera_area = region;
    CameraArea::global().set(Some(camera_area));
    // 已经开着的预览窗跟着搬到选区右上角（对齐 Electron 版 showCameraPreview(region)）：
    // 不搬的话窗口停在旧位置（常在选区外），拖拽夹取与合成坐标都会落在画面外。
    place_camera_in_area(&app, camera_area);
    // 边框窗：region 外扩 5px，3px 红框，全穿透（几何在 build 后按物理像素设，见下）
    if let Some(old) = border_window(&app) {
        let _ = old.close();
    }
    match WebviewWindowBuilder::new(
        &app.clone(),
        "region-border",
        window_url("windows/region-border.html"),
    )
    .title("边框")
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
            // region 现在是**物理像素**（选区页按「窗口原点 + 本屏 scale」换算上报，
            // 见 region-selector.html 的 toPhysical）。故用 set_position/set_size 走
            // **物理**口径，builder 的 position/inner_size（逻辑像素）不能用 ——
            // 150% 屏上会把 693/1044 当逻辑像素再乘 1.5，边框窗比实际选区大 1.5 倍
            // 且整体偏移，表现为「框选时的区域和框选结束后的区域不一样」（实测）。
            let pad = BORDER_PAD.round() as i32;
            let _ = win.set_position(tauri::PhysicalPosition::new(
                region.x - pad,
                region.y - pad,
            ));
            let _ = win.set_size(tauri::PhysicalSize::new(
                (region.width + pad * 2).max(1) as u32,
                (region.height + pad * 2).max(1) as u32,
            ));
            let _ = win.set_ignore_cursor_events(true); // 全穿透
            // 取景框是给用户看的辅助层，不该被录进成品：WDA_EXCLUDEFROMCAPTURE 让窗口
            // 在屏幕上照常可见（人能看见红框），但任何屏幕捕获（含 WGC）拿到的是空。
            let _ = win.set_content_protected(true);
            let _ = win.show();
        }
        Err(e) => log::error!("border window failed: {e}"),
    }

    // 工具条：智能定位（顶/底/内三选一，对齐 TS 定位逻辑）
    show_toolbar_for_region(&app, &region, audioState.as_ref());
}

/// 工具条智能定位：topSpace/bottomSpace ≥ 48 用外侧，否则贴 region 内部
///
/// region 与主屏 bounds 都是**逻辑像素**（region 来自选区窗的 CSS px；Electron 版
/// screen.getPrimaryDisplay().bounds 同为逻辑像素，两版行为一致）。
fn show_toolbar_for_region(
    app: &AppHandle,
    region: &Region,
    audio_state: Option<&IslandAudioState>,
) {
    if let Some(old) = toolbar_window(&app) {
        let _ = old.close();
    }
    // 工具条**浮在红框上方外部，底边与红框顶边齐平**（用户要的「并行排布」）。
    //
    // 「齐平」= 工具条**底边**正好落在 region.y（红框顶边那条线）上，不留缝也不压进去。
    // 高度只算可见的工具条本体（44px），**不含底部 28px 的 .tip-strip**：
    // 那是页面里一条透明带（只为贴边时也能接鼠标），把它算进偏移会让工具条整体上移
    // 28px×scale，底边停在红框顶边上方，出现一条空档（实测「和红框离得太远」）。
    //
    // 宽度与选区同宽并左右各外扩一点，让工具条两端比红框略宽一点，视觉上更稳。
    // 屏幕顶部空间不够时（选区贴着屏幕上沿）改为压在选区内部顶端，避免跑到屏外看不见。
    let m = monitor_area_at(app, region.x, region.y).unwrap_or_else(|| primary_area(app));
    let scale = monitor_scale_at(app, region.x, region.y);
    let tb_visible_h = ((TOOLBAR_HEIGHT * scale).round() as i32).max(1);
    let wing = ((6.0 * scale).round() as i32).max(1);
    // 工具条最小可用宽度：装下「设备组+计时器+主操作+关闭」。
    // 设备开关组（麦克风/摄像头）任何宽度都不再隐藏（用户要求录制中保留），
    // 最小宽度必须覆盖它：64(设备组) + 11(分隔线) + 44(计时器) + 34(主操作)
    // + 34(关闭) + 间距/内边距 ~50 ≈ 240。选区比它还窄时工具条比选区宽、
    // 相对选区**居中**，左右对称地探出红框一点 —— 比按钮被裁/被藏可接受得多。
    // 240 是 CSS 逻辑像素，按该屏 scale 转物理，100%/150% 屏上观感一致。
    const TB_MIN_W_CSS: i32 = 240;
    let tb_min_w = ((TB_MIN_W_CSS as f64 * scale).round() as i32).max(1);
    let want_w = region.width + wing * 2;
    let tb_w = want_w.max(tb_min_w);
    // 宽度超出选区时按居中算 x（左右各溢出 (tb_w - region.width) / 2）
    let tb_x = region.x - (tb_w - region.width) / 2;
    let (tb_x, tb_y) = if region.y - tb_visible_h >= m.y {
        // 常规：上方外部，底边与红框顶边齐平
        (tb_x, region.y - tb_visible_h)
    } else {
        // 顶上放不下（选区贴屏幕上沿）：压进选区内部顶端，至少保证可见可用
        (tb_x, region.y)
    };

    match WebviewWindowBuilder::new(
        &app.clone(),
        "floating-island",
        // 麦克风/摄像头开关初值随 URL 带入（同 island.html，build 后立刻 eval 会赶在页面脚本之前）
        WebviewUrl::App(
            format!(
                "windows/toolbar.html?mic={}&cam={}&w={}&h={}",
                if audio_state.map(|a| a.mic_enabled).unwrap_or(false) {
                    1
                } else {
                    0
                },
                if audio_state.map(|a| a.camera_enabled).unwrap_or(false) { 1 } else { 0 },
                region.width,
                region.height,
            )
            .into(),
        ),
    )
    .title("工具条")
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
            // tb_x/y/w 派生自 region（**物理像素**），故用 set_position/set_size 走物理
            // 口径 —— 同边框窗的理由：builder 的 position/inner_size 吃逻辑像素，
            // 150% 屏上会把物理值再乘一次 scale，工具条跑到选区外还变大 1.5 倍。
            //
            // 窗口高度 = 可见工具条本体（TOOLBAR_HEIGHT），按该屏 scale 转物理。页面已
            // 去掉 28px 透明气泡带，两边必须一致：早先窗口按 (TOOLBAR_HEIGHT + 28) 算而
            // 页面只画 44px，多出的透明区垂到红框顶上，表现为「一半工具条盖在红框上」。
            let scale = monitor_scale_at(&app, tb_x, tb_y);
            let _ = win.set_position(tauri::PhysicalPosition::new(tb_x, tb_y));
            let _ = win.set_size(tauri::PhysicalSize::new(
                tb_w.max(1) as u32,
                ((TOOLBAR_HEIGHT * scale).round() as i32).max(1) as u32,
            ));
            // 工具条内容区可交互，整窗可点。
            //
            // 圆角样式随位置走：常规（上方外部，底边与红框齐平）是 top 态；选区贴着屏幕
            // 上沿放不下时压进选区内部，是 inside 态。页面靠 body[data-pos] 取对应圆角。
            let pos = if tb_y == region.y { "inside" } else { "top" };
            let _ = win.eval(&format!("document.body.dataset.pos = '{pos}'; void 0;"));
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
    log::info!("hide_region_border: 关边框+工具条，清摄像头可用区");
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

/// 麦克风/摄像头开关状态 → 工具条与悬浮岛的按钮点亮/熄灭
///
/// 这两个原生窗口的按钮亮灭是**建窗时**从 URL 查询参数（?mic=1&cam=0）取的初值，
/// 之后没有任何回推通道 —— 在工具条上点麦克风/摄像头开关，按钮自己的状态不会变
/// （用户反馈「开关时那两个按钮要有状态显示」）。这里把新状态 eval 给两个窗口，
/// 页面侧的 applyIslandControls 负责切换 .on 类。
#[tauri::command]
pub fn push_island_audio_state(app: AppHandle, state: IslandAudioState) {
    use tauri::Manager;
    let mic = state.mic_enabled;
    let cam = state.camera_enabled;
    let script = format!(
        "window.applyIslandControls && window.applyIslandControls({{ mic: {mic}, cam: {cam} }}); void 0;"
    );
    for label in ["floating-island", "island"] {
        if let Some(win) = app.get_webview_window(label) {
            let _ = win.eval(&script);
        }
    }
}

/// 渲染层试音流的电平 → 原生工具条/悬浮岛音量表
///
/// 录制中电平由 recording/mod.rs 的 ticker 推（WASAPI 采集管线的 RMS）；**未录制**时
/// 没人往那些 atomics 写，电平恒 0，音量表完全不动。渲染层的 WebView2 试音流（麦克风
/// 预览）自己用 AnalyserNode 算 RMS，经此命令转过来，于是「开了麦克风、还没点开始
/// 录制」时说话也能看到电平条跳动。
///
/// 录制中收到的预览电平会被忽略：那时 WASAPI 才是真源，两条数据打架会跳变。
#[tauri::command]
pub fn emit_preview_audio_level(app: AppHandle, level: f32) {
    use tauri::Manager;
    if crate::modules::recording::SessionState::global().is_active() {
        return; // 录制中以 WASAPI ticker 为准
    }
    let level = level.clamp(0.0, 1.0);
    let script = format!("window.updateMeter && window.updateMeter({level:.4}); void 0;");
    for label in ["floating-island", "island"] {
        if let Some(win) = app.get_webview_window(label) {
            let _ = win.eval(&script);
        }
    }
}

/// 工具条状态推送（对齐 updateToolbarState）：html 端经 event 接收
#[tauri::command]
pub fn update_toolbar_state(app: AppHandle, state: String, elapsedSeconds: Option<u32>) {
    // None 不能强转成 0：原生页用 `typeof seconds === 'number'` 区分「更新时长」与
    // 「保持现值」——强转 0 会把暂停态的真实时长清零（实测暂停后工具条显示 00:00），
    // 页面收到 null 时保留原值继续显示
    let elapsed_js = match elapsedSeconds {
        Some(v) => v.to_string(),
        None => "null".to_string(),
    };
    if let Some(win) = toolbar_window(&app) {
        let _ = win.eval(&format!(
            "window.applyToolbarState && window.applyToolbarState({}, {}); void 0;",
            serde_json::to_string(&state).unwrap_or_default(),
            elapsed_js
        ));
    }
    let _ = app.emit(
        "toolbar-state",
        serde_json::json!({"state": state, "elapsed": elapsedSeconds}),
    );
}

// ===== 悬浮岛（录制态岛，对齐 showFloatingIsland）=====

/// 悬浮岛/工具条的开关初值（前端 show_floating_island 传的 audioState）
#[derive(Debug, Clone, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IslandAudioState {
    #[serde(default)]
    pub mic_enabled: bool,
    #[serde(default)]
    pub sys_enabled: bool,
    #[serde(default)]
    pub camera_enabled: bool,
    #[serde(default)]
    pub camera_device_id: Option<String>,
}

/// 显示录制悬浮岛（340×44 顶居中胶囊；录制中自动收起，鼠标移过去由 hover 轮询唤出）
/// async 原因同 start_region_select（同步命令内建窗死锁）
#[tauri::command]
pub async fn show_floating_island(
    app: AppHandle,
    targetDisplayId: Option<u32>,
    audioState: Option<IslandAudioState>,
) {
    use std::sync::atomic::Ordering;
    log::info!(
        "show_floating_island: display={targetDisplayId:?}（mic={}, cam={}）",
        audioState.as_ref().map(|a| a.mic_enabled).unwrap_or(false),
        audioState
            .as_ref()
            .map(|a| a.camera_enabled)
            .unwrap_or(false),
    );
    if let Some(old) = toolbar_window(&app) {
        let _ = old.close();
    }
    // 全屏/多屏录制：这是「悬浮岛」，录制中自动收起 + 悬停唤出
    ISLAND_AUTO_HIDE.store(true, Ordering::SeqCst);
    ISLAND_VISIBLE.store(true, Ordering::SeqCst);
    // 全屏录制：摄像头可用区 = 目标显示器整块屏（物理像素；都是物理量，这里不换算）
    let area = targetDisplayId
        .and_then(|id| app.available_monitors().ok()?.into_iter().nth(id as usize))
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
    let (dx, dy, dw) = match targetDisplayId
        .and_then(|id| app.available_monitors().ok()?.into_iter().nth(id as usize))
    {
        Some(m) => (m.position().x, m.position().y, m.size().width as i32),
        None => match (&app).primary_monitor() {
            Ok(Some(m)) => (m.position().x, m.position().y, m.size().width as i32),
            _ => (0, 0, 1920),
        },
    };
    // 窗口宽 384 而胶囊最宽（录制态：多出暂停/停止）约 340 —— 留出左右各 ~22px 给
    // 胶囊的边框光晕；按 340 开窗时录制态胶囊正好顶满窗口，光晕被窗口边缘切平（实测）。
    let scale = display_scale(&app);
    let island_w = ISLAND_W_LOGICAL * scale; // 物理像素，仅用于居中计算
    let x = (dx as f64 + (dw as f64 - island_w) / 2.0).round();
    // 顶部不留偏移：胶囊的上下呼吸空间由页面自己的 margin 给（否则顶部光晕同样被切）
    let y = dy;

    match WebviewWindowBuilder::new(
        &app.clone(),
        "floating-island",
        // 麦克风/摄像头开关初值随 URL 带进去：窗口内容异步加载，build 完立刻 eval
        // 会赶在页面脚本定义 applyIslandControls 之前，参数就丢了（camera-preview 同理）
        WebviewUrl::App(
            format!(
                "windows/island.html?mic={}&cam={}",
                if audioState.as_ref().map(|a| a.mic_enabled).unwrap_or(false) {
                    1
                } else {
                    0
                },
                if audioState
                    .as_ref()
                    .map(|a| a.camera_enabled)
                    .unwrap_or(false)
                {
                    1
                } else {
                    0
                },
            )
            .into(),
        ),
    )
    .title("录制")
    .position(
        (x as f64) / display_scale(&app),
        (y as f64) / display_scale(&app),
    )
    .inner_size(ISLAND_W_LOGICAL, ISLAND_H_LOGICAL)
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
    use std::sync::atomic::Ordering;
    log::info!("hide_floating_island: 关悬浮岛，清摄像头可用区");
    if let Some(win) = toolbar_window(&app) {
        let _ = win.close();
    }
    // 全屏录制的可用区（整块屏）随悬浮岛一起作废，别留给下一次区域录制当默认值
    CameraArea::global().set(None);
    // 自动收起/悬停跟随也随窗口一起关掉，免得轮询拿着已销毁的窗口空转
    ISLAND_AUTO_HIDE.store(false, Ordering::SeqCst);
    ISLAND_VISIBLE.store(true, Ordering::SeqCst);
}

/// 悬浮岛状态推送（对齐 setIslandState）：idle/recording/paused/show/hide
#[tauri::command]
pub fn set_island_state(app: AppHandle, state: String, elapsedSeconds: Option<u32>) {
    // 同 update_toolbar_state：None 传 null，页面保留现值（暂停态时长不能被清零）
    let elapsed_js = match elapsedSeconds {
        Some(v) => v.to_string(),
        None => "null".to_string(),
    };
    if let Some(win) = toolbar_window(&app) {
        let _ = win.eval(&format!(
            "window.applyIslandState && window.applyIslandState({}, {}); void 0;",
            serde_json::to_string(&state).unwrap_or_default(),
            elapsed_js
        ));
    }
    let _ = app.emit(
        "island-state",
        serde_json::json!({"state": state, "elapsed": elapsedSeconds}),
    );
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

/// 物理点所在显示器的缩放比；找不到（含负坐标落在并集外）退回主屏
///
/// 入参是**物理像素**（显示器 bounds / 已换算的 region），直接拿去定位显示器。
fn monitor_scale_at(app: &AppHandle, x_phys: i32, y_phys: i32) -> f64 {
    match app.monitor_from_point(x_phys as f64, y_phys as f64) {
        Ok(Some(m)) => m.scale_factor(),
        _ => display_scale(app),
    }
}

/// 换算本体（独立成函数以便单测）
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
        _ => Region {
            x: 0,
            y: 0,
            width: 1920,
            height: 1080,
        },
    }
}

/// 预览窗在可用区里的初始位置（右上角，留 CAMERA_PAD 边距）
///
/// `.max(area.x)/.max(area.y)` 兜住「选区比预览窗还小」的情形 —— 否则右边缘会是负偏移，
/// 窗口跑到选区左上之外。
fn camera_pos_in_area(area: Region) -> (i32, i32) {
    (
        (area.x as f64 + area.width as f64 - CAMERA_W - CAMERA_PAD)
            .max(area.x as f64)
            .round() as i32,
        (area.y as f64 + CAMERA_PAD).round() as i32,
    )
}

/// 把已开的预览窗搬到可用区右上角（初次创建与选区变更时共用）
fn place_camera_in_area(app: &AppHandle, area: Region) {
    let Some(win) = camera_window(app) else {
        return;
    };
    let (x, y) = camera_pos_in_area(area);
    let _ = win.set_position(tauri::PhysicalPosition::new(x, y));
}

/// 显示/隐藏摄像头预览（对齐 toggleCameraPreview）
/// async 原因同 start_region_select（同步命令内建窗死锁）
#[tauri::command]
pub async fn toggle_camera_preview(app: AppHandle, show: bool, cameraDeviceId: Option<String>) {
    log::info!("toggle_camera_preview: show={show}, device={cameraDeviceId:?}");
    if !show {
        hide_camera_preview_inner(&app);
        return;
    }
    // 初始位置：可用区右上角（有选区就贴选区，否则主屏）—— 单位为物理像素
    let area = CameraArea::global()
        .get()
        .unwrap_or_else(|| primary_area(&app));
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
        format!(
            "windows/camera-preview.html?deviceId={}",
            uri_encode(&device)
        )
        .into(),
    );
    match WebviewWindowBuilder::new(&app, "camera-preview", url)
        .title("摄像头")
        // builder 吃逻辑像素，而 area/x/y 是物理像素 —— 这里必须除缩放比
        .position(
            x as f64 / display_scale(&app),
            y as f64 / display_scale(&app),
        )
        .inner_size(
            CAMERA_W / display_scale(&app),
            CAMERA_H / display_scale(&app),
        )
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

/// 仅隐藏摄像头预览窗（录制中临时关摄像头用）：窗口保留（恢复无需重建），但必须
/// 同步停掉 getUserMedia 流 —— 只藏窗的话摄像头硬件会话/指示灯/页面视频管线一直
/// 常驻到整场录制结束，用户视角是「关了摄像头但灯还亮」。恢复时
/// `toggle_camera_preview(true)` 会 eval startCamera 重新起流。
pub fn hide_camera_preview_window(app: &AppHandle) {
    if let Some(win) = camera_window(app) {
        let _ = win.eval("window.stopCamera && window.stopCamera()");
        let _ = win.hide();
    }
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
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                out.push(b as char)
            }
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
    let Some(win) = camera_window(&app) else {
        return;
    };
    let Ok(cursor) = win.cursor_position() else {
        return;
    };
    let Ok(pos) = win.outer_position() else {
        return;
    };
    // 记下光标相对窗口的偏移：拖动过程中保持这个相对位置，窗口才跟手
    let offset = (cursor.x - pos.x as f64, cursor.y - pos.y as f64);
    *CameraDrag::global().lock().unwrap() = Some(offset);

    // 并发守卫：重复 drag_start 会叠加多个 16ms 循环（悬浮球/岛的同款跟随循环都有
    // RUNNING 守卫，这里原本没有）
    static CAMERA_FOLLOW_RUNNING: std::sync::atomic::AtomicBool =
        std::sync::atomic::AtomicBool::new(false);
    if CAMERA_FOLLOW_RUNNING.swap(true, std::sync::atomic::Ordering::SeqCst) {
        return;
    }

    // 16ms 轮询跟随（与旧版 setInterval 同频）。cursor_position 是物理像素，
    // 窗口位置也用物理像素设置，不做缩放换算。
    tauri::async_runtime::spawn(async move {
        loop {
            let offset = *CameraDrag::global().lock().unwrap();
            let Some((ox, oy)) = offset else { break };
            let Some(win) = camera_window(&app) else {
                break;
            };
            // cursor_position 出错即视为拖拽失效：清掉拖拽状态再退出，别让 CameraDrag
            // 残留 Some（直到下次 drag_end 前，窗口跟随判定一直是「拖拽中」）
            let Ok(cursor) = win.cursor_position() else {
                *CameraDrag::global().lock().unwrap() = None;
                break;
            };
            let Ok(size) = win.outer_size() else {
                *CameraDrag::global().lock().unwrap() = None;
                break
            };
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
        CAMERA_FOLLOW_RUNNING.store(false, std::sync::atomic::Ordering::SeqCst);
    });
}

/// 摄像头预览窗几何（渲染层合成画中画时取窗口位置）
#[tauri::command]
pub fn camera_geometry_cmd(app: AppHandle) -> Option<serde_json::Value> {
    camera_geometry(&app)
        .map(|(x, y, w, h)| serde_json::json!({"x": x, "y": y, "width": w, "height": h}))
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

/// 通知摄像头窗停录并等 webm 尾段落盘（最多 3s）
///
/// MediaRecorder.stop() 的 flush 链（ondataavailable → append_file）要 1~2s；
/// `win.hide()` 只是视觉隐藏，WebView2 的 JS 照常执行，等待期间 flush 不受影响。
async fn stop_recording_and_wait_flush(win: &tauri::WebviewWindow) {
    let _ = win.eval("window.stopRecording && window.stopRecording(); void 0;");
    for _ in 0..60 {
        if camera_record_done().load(std::sync::atomic::Ordering::SeqCst) {
            return;
        }
        tokio::time::sleep(std::time::Duration::from_millis(50)).await;
    }
    log::warn!("等待摄像头段落盘超时（3s），继续合成");
}

/// 暂停时让摄像头段落盘（恢复时另起一段；窗口保持显示，预览不中断）
pub async fn stop_camera_recording(app: &AppHandle) {
    let Some(win) = camera_window(app) else {
        return;
    };
    if camera_record_done().load(std::sync::atomic::Ordering::SeqCst) {
        return; // 没在录
    }
    stop_recording_and_wait_flush(&win).await;
}

/// 录制结束时的摄像头窗收尾：**先藏窗**再等落盘，最后关窗。
///
/// 「等落盘 → 再关窗」的顺序会让预览窗在屏幕上多挂 1~2s 才消失（用户可感知），
/// 所以先 hide（flush 链照跑），落盘信号到了才允许 ffmpeg overlay，顺序不能反。
pub async fn stop_and_close_camera_preview(app: &AppHandle) {
    let Some(win) = camera_window(app) else {
        return;
    };
    if !camera_record_done().load(std::sync::atomic::Ordering::SeqCst) {
        let _ = win.hide();
        stop_recording_and_wait_flush(&win).await;
    }
    let _ = win.eval("window.stopCamera && window.stopCamera()");
    let _ = win.close();
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
        let r = Region {
            x: 100,
            y: 100,
            width: 400,
            height: 300,
        };
        let p = scale_region(&r, 1.5);
        assert_eq!((p.x, p.y, p.width, p.height), (150, 150, 600, 450));
        // 100% 缩放是恒等（常见无缩放屏不该被换算动到）
        let q = scale_region(&r, 1.0);
        assert_eq!((q.x, q.y, q.width, q.height), (100, 100, 400, 300));
        // 125% 的 .5 边界要四舍五入而不是截断（截断会让窗口每次移动都往左上漂）
        let s = scale_region(
            &Region {
                x: 3,
                y: 5,
                width: 7,
                height: 9,
            },
            1.25,
        );
        assert_eq!((s.x, s.y, s.width, s.height), (4, 6, 9, 11));
    }

    #[test]
    fn camera_placement_keeps_window_inside_area() {
        // 正常选区：贴在右上角、留 12px 边距
        let area = Region {
            x: 100,
            y: 100,
            width: 600,
            height: 450,
        };
        assert_eq!(camera_pos_in_area(area), (600 - 200 - 12 + 100, 112));
        // 可用区比摄像头窗还小时不能算出负坐标（否则窗口跑到选区左上之外）
        let tiny = Region {
            x: 10,
            y: 20,
            width: 100,
            height: 80,
        };
        assert_eq!(camera_pos_in_area(tiny), (10, 32));
    }
}
