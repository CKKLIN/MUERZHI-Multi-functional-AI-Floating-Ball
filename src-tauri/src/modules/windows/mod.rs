// 窗口体系模块索引：P1 主/AI/设置/关于；P2 悬浮球 + 后续（区域选择/AI岛/便签/提醒/散热面板）
pub mod ai_island;
pub mod floating_ball;
pub mod region;
pub mod todo_windows;

// 内部共享符号（命令经 generate_handler 的完整路径 modules::windows::floating_ball::xxx 注册）
#[allow(unused_imports)]
pub use floating_ball::{
    animate_snap_to_edge, ball_center_for_overlay, clear_ball_position, clear_snap, hide_ball,
    load_ball_position, restore_snap_if_needed, show_ball, BallState, SnapSide, BALL_SIZE,
};

use tauri::{AppHandle, Emitter, Manager, WebviewUrl};

/// 强制窗口重绘一遍（show 之后补一次 INVALIDATE + 立即更新）
///
/// ⚠️ 这**不是**「窗口空白」的修复，那类问题的真因是 dev server 只监听 IPv6、
/// WebView2 走 localhost 先撞 IPv4 超时（见 vite.config.ts server.host 注释）——
/// 页面根本没加载完，窗口自然空白，与重绘无关。
/// 这里保留 RedrawWindow 是另一类场景的兜底：隐藏创建的 WebView 窗口 show 后
/// 偶发停在背景色，重绘能把它拉回来。成本极低（一次同步 INVALIDATE），留着无害。
///
/// RedrawWindow(RDW_INVALIDATE|RDW_UPDATENOW) 走 INVALIDATE 后立刻 UpdateWindow，
/// 同步等到重绘完成再返回；非 Windows / 取不到 HWND 时静默跳过。
#[cfg(windows)]
pub fn force_redraw(win: &tauri::WebviewWindow) {
    use windows_sys::Win32::Graphics::Gdi::{
        RedrawWindow, RDW_ALLCHILDREN, RDW_INVALIDATE, RDW_UPDATENOW,
    };

    // Tauri 的 HWND（windows crate，NewType）→ windows_sys 0.61 的 HWND（裸指针别名）
    let Ok(hwnd) = win.hwnd() else {
        return;
    };
    let hwnd = hwnd.0 as *mut std::ffi::c_void;
    // 空 HWND 传进 Win32 只会得到一个无意义的失败返回，直接跳过
    if hwnd.is_null() {
        return;
    }
    unsafe {
        RedrawWindow(
            hwnd,
            std::ptr::null(),
            std::ptr::null_mut(),
            RDW_INVALIDATE | RDW_UPDATENOW | RDW_ALLCHILDREN,
        );
    }
}

/// 非 Windows 平台无此问题，空实现保持调用点不写 cfg 分支
#[cfg(not(windows))]
pub fn force_redraw(_win: &tauri::WebviewWindow) {}

/// 为无边框窗口设置系统级硬件圆角（Windows 11 DWM 原生硬件圆角支持）
#[cfg(windows)]
pub fn apply_window_corners(win: &tauri::WebviewWindow) {
    let Ok(hwnd) = win.hwnd() else {
        return;
    };
    let hwnd = hwnd.0 as *mut std::ffi::c_void;
    if hwnd.is_null() {
        return;
    }

    // Windows 11 DWMWA_WINDOW_CORNER_PREFERENCE (33):
    // 0 = DWMWCP_DEFAULT, 1 = DWMWCP_DONOTROUND, 2 = DWMWCP_ROUND (8~12px), 3 = DWMWCP_ROUNDSMALL (4px)
    type DwmSetWindowAttributeFn = unsafe extern "system" fn(
        hwnd: *mut std::ffi::c_void,
        dw_attribute: u32,
        pv_attribute: *const std::ffi::c_void,
        cb_attribute: u32,
    ) -> i32;

    unsafe {
        use windows_sys::Win32::System::LibraryLoader::{GetProcAddress, LoadLibraryA};
        let dwmapi = LoadLibraryA(b"dwmapi.dll\0".as_ptr());
        if !dwmapi.is_null() {
            let func = GetProcAddress(dwmapi, b"DwmSetWindowAttribute\0".as_ptr());
            if let Some(func) = func {
                let func: DwmSetWindowAttributeFn = std::mem::transmute(func);
                let preference: u32 = 2; // DWMWCP_ROUND
                let _ = func(
                    hwnd,
                    33,
                    &preference as *const _ as *const _,
                    std::mem::size_of::<u32>() as u32,
                );
            }
        }
    }
}

#[cfg(not(windows))]
pub fn apply_window_corners(_win: &tauri::WebviewWindow) {}


/// 显示 + 聚焦（所有「把隐藏窗口拉出来给用户看」的路径统一走这里）
///
/// 两点都要有：① SW_SHOW 对**最小化**窗口无效（得 SW_RESTORE），少了 unminimize
/// 用户看到的是「点了没反应」——录制结束恢复主窗口、open_or_focus 复用已有窗口
/// 都踩过这个；② 隐藏创建的 WebView 窗口 show 后偶发停在背景色，补一次重绘。
pub fn show_and_refresh(win: &tauri::WebviewWindow) {
    // SW_SHOW 对**最小化**窗口无效（得 SW_RESTORE），少了 unminimize 用户看到的是
    // 「点了没反应」—— 录制结束恢复主窗口、open_or_focus 复用已有窗口都踩过这个。
    let _ = win.unminimize();
    let _ = win.show();
    // 重绘必须排在 show 之后：show 前重绘会被随后的 SW_SHOW 覆盖掉
    force_redraw(win);
    apply_window_corners(win);
    let _ = win.set_focus();
}

/// 打开或聚焦 Vue hash 路由窗口（对齐 index.ts showAiWindow/showSettingsWindow）
///
/// ai/settings/todo/about **不再在 tauri.conf.json 预定义**：启动时每个窗口是一个
/// WebView2 进程（内存几十 MB），主用户路径是「开箱只看悬浮球」，这四窗大多一次
/// 都不开 —— 全部改为首次 open_or_focus 时按需创建（本函数同时承担重建：窗口被
/// close 销毁后走同一分支）。visible(false) 建出，**等页面加载完（on_page_load Finished，
/// 3s 超时兜底）再 show+focus**，避免用户看到背景色空窗后才等 Vue 挂载。
pub fn open_or_focus(app: &tauri::AppHandle, label: &str, hash_route: &str) {
    if let Some(win) = app.get_webview_window(label) {
        log::info!("open_or_focus: {label} 已存在 → unminimize + show + 重绘 + focus");
        show_and_refresh(&win);
        return;
    }
    log::info!("open_or_focus: {label} 不存在 → 按需创建（route={hash_route}）");
    let (title, size, resizable, skip_taskbar) = match label {
        "ai" => ("AI 助手", (480.0, 540.0), true, false),
        "settings" => ("设置", (420.0, 480.0), true, false),
        "todo" => ("待办便签", (420.0, 520.0), true, false),
        "about" => ("关于", (360.0, 400.0), false, true),
        _ => ("窗口", (480.0, 480.0), true, false),
    };
    // hash 直接写进 URL，dev/prod 同构（hash_route 自带前导 "/"）。
    // ⚠️ 原先 prod 走 WebviewUrl::App("index.html") 再 build() 后 eval
    // window.location.hash —— 但 eval 早于页面加载完成，打在加载中的文档上，
    // 路由根本没设上（首屏空白/停在 /）。App URL 支持 "index.html#/route" 形态。
    let url = if cfg!(dev) {
        // 用 127.0.0.1 而非 localhost：Windows 上 localhost 先解析 IPv4，
        // 不通则回退 IPv6、每次都要等满连接超时（见 vite.config.ts server.host 注释）
        WebviewUrl::External(
            format!("http://127.0.0.1:21047/#{hash_route}")
                .parse()
                .expect("valid url"),
        )
    } else {
        WebviewUrl::App(format!("index.html#{hash_route}").into())
    };
    match tauri::WebviewWindowBuilder::new(app, label, url)
        .title(title)
        .inner_size(size.0, size.1)
        .decorations(false)
        .resizable(resizable)
        .maximizable(resizable)
        .minimizable(resizable)
        .skip_taskbar(skip_taskbar)
        .visible(false)
        .transparent(true)
        .shadow(false)
        // 等页面加载完再显示：首次建窗要初始化 WebView2 浏览器进程（几百 ms~数秒），
        // 早先 build() 返回就 show()，用户先看到一个背景色空窗、再等 Vue 挂载 ——
        // 表现为「点开很久才反应、内容还迟迟不出」。Finished 后 show 内容已就绪。
        // 兜底超时 3s：页面加载失败/资源卡住时也要显示，不能让点击彻底无反应。
        .on_page_load(|webview, payload| {
            if matches!(payload.event(), tauri::webview::PageLoadEvent::Finished) {
                show_and_refresh(&webview);
            }
        })
        .build()
    {
        Ok(_win) => {
            let app = app.clone();
            let label_owned = label.to_string();
            tauri::async_runtime::spawn(async move {
                tokio::time::sleep(std::time::Duration::from_millis(3000)).await;
                // 3s 仍未显示（页面加载失败/on_page_load 未触发）→ 强制显示
                if let Some(w) = app.get_webview_window(&label_owned) {
                    if !w.is_visible().unwrap_or(false) {
                        log::warn!("open_or_focus({label_owned}): 页面加载超时，强制显示窗口");
                        show_and_refresh(&w);
                    }
                }
            });
        }
        Err(e) => log::error!("open_or_focus({label}) failed: {e}"),
    }
}

/// 关于窗口（对齐 ipc-handlers.ts L301-336：小窗 360x400、skipTaskbar）
/// 走与 ai/settings 相同的 Vue hash 路由路径（窗口在 tauri.conf.json 预定义）
pub fn open_about_window(app: &tauri::AppHandle) {
    open_or_focus(app, "about", "/about");
}

#[tauri::command]
pub fn show_about_window(app: AppHandle) {
    open_about_window(&app);
}

#[tauri::command]
pub fn close_about_window(app: AppHandle) {
    if let Some(win) = app.get_webview_window("about") {
        let _ = win.close();
    }
}

/// 关于窗「检查更新」按钮：打开 GitHub releases 页
#[tauri::command]
pub async fn open_external(app: AppHandle, url: String) {
    use tauri_plugin_opener::OpenerExt;
    let target = url.clone();
    if let Err(e) = app.opener().open_url(target, None::<&str>) {
        log::error!("open_external({url}) failed: {e}");
    }
}

/// 用系统默认程序打开本地文件（录制历史点击 → 系统视频播放器）
///
/// 为什么不在前端直接用 plugin-opener 的 `openPath`：那是 JS 命令，受 capabilities 的
/// opener scope 约束 —— `opener:default` 只含 allow-open-url / allow-reveal-item-in-dir，
/// 不含 allow-open-path；而 open_path 的命令作用域没配条目时**一律拒绝**
/// （插件侧 `Error::ForbiddenPath`），表现就是「点历史列表毫无反应」（前端 catch 里静默）。
/// 走 Rust 侧调用不受 JS 命令作用域限制，也省得为开自己的录制文件放开一大片路径权限。
#[tauri::command]
pub async fn open_local_path(app: AppHandle, path: String) {
    use tauri_plugin_opener::OpenerExt;
    let target = path.clone();
    if let Err(e) = app.opener().open_path(target, None::<&str>) {
        log::error!("open_local_path({path}) failed: {e}");
    }
}

/// 在文件管理器里打开日志目录并选中日志文件（设置页「打开日志目录」入口）
///
/// 与 open_local_path 同理走 Rust 侧 opener：reveal_item_in_dir 不受 JS 命令作用域限制。
/// 文件不存在（首次启动还没写过日志）就退化为打开目录本身。
#[tauri::command]
pub async fn open_log_dir(app: AppHandle) {
    use tauri_plugin_opener::OpenerExt;
    let dir = match app.path().app_log_dir() {
        Ok(d) => d,
        Err(e) => {
            log::error!("open_log_dir: 日志目录解析失败: {e}");
            return;
        }
    };
    let file = dir.join("muerzhi.log");
    if file.exists() {
        let target = file.to_string_lossy().to_string();
        if let Err(e) = app.opener().reveal_item_in_dir(&target) {
            log::error!("open_log_dir: reveal({target}) failed: {e}");
        }
    } else {
        let target = dir.to_string_lossy().to_string();
        if let Err(e) = app.opener().open_path(target, None::<&str>) {
            log::error!("open_log_dir: open({}) failed: {e}", dir.display());
        }
    }
    log::info!("open_log_dir: {}", dir.display());
}

/// 主窗口关闭语义（对齐 index.ts L95-103）：通知渲染层释放录制资源 → 隐藏不销毁。
pub fn setup_main_window_close_guard(app: &tauri::AppHandle) {
    let Some(main) = app.get_webview_window("main") else {
        return;
    };
    let app = app.clone();
    main.on_window_event(move |event| {
        if let tauri::WindowEvent::CloseRequested { api, .. } = event {
            api.prevent_close();
            let _ = app.emit("app-main-window-close", ());
            if let Some(win) = app.get_webview_window("main") {
                let _ = win.hide();
            }
        }
    });
}

// ===== 主窗口显示 =====

/// 显示主窗口
///
/// 刻意**不做**「等页面加载完再显示」：实测冷启动主窗口页面要 87~113 秒才加载完
/// （Vite 编译依赖），压着不显示的话用户点了菜单要干等一分多钟，比空白更像卡死。
/// 现在的做法是立即显示，靠 index.html 里的加载占位兜住这段空窗期 —— HTML 本身
/// 1 秒内就到，用户看到的是「加载中…」而不是一片背景色（见 index.html 注释）。
/// 那道占位同时让「空白」的观感消失，这才是这个 bug 该有的修法。
pub fn show_main_window(app: &tauri::AppHandle) {
    if let Some(win) = app.get_webview_window("main") {
        show_and_refresh(&win);
    }
}
