// 窗口体系 — P1 先落 AI/设置/关于窗口与主窗口关闭语义
// P2 补悬浮球/选区/悬浮岛/AI岛/便签等特殊窗口（透明/穿透/贴边）

use tauri::{AppHandle, Emitter, Manager, WebviewUrl};

/// 主窗口关闭语义（对齐 index.ts L95-103）：通知渲染层释放录制资源 → 隐藏不销毁。
/// 用 CloseRequested 拦截实现（Electron 的 close 事件 preventDefault + hide 等价）。
pub fn setup_main_window_close_guard(app: &tauri::AppHandle) {
    let Some(main) = app.get_webview_window("main") else { return };
    let app = app.clone();
    main.on_window_event(move |event| {
        if let tauri::WindowEvent::CloseRequested { api, .. } = event {
            // 非退出路径的关闭：通知渲染层 → 隐藏窗口
            api.prevent_close();
            let _ = app.emit("app-main-window-close", ());
            if let Some(win) = app.get_webview_window("main") {
                let _ = win.hide();
            }
        }
    });
}

/// 打开或聚焦 Vue hash 路由窗口（对齐 index.ts showAiWindow/showSettingsWindow）
/// 窗口在 tauri.conf.json app.windows 预定义（builder External 在 Windows dev 下不加载），
/// 这里只做 show + focus。首次打开若路由不在 hash 位置，用 eval 修正。
pub fn open_or_focus(app: &tauri::AppHandle, label: &str, hash_route: &str) {
    if let Some(win) = app.get_webview_window(label) {
        let _ = win.show();
        let _ = win.set_focus();
        return;
    }
    // 配置里已预定义；走到这里说明窗口被关闭销毁过，重建（同主窗口机制）
    let (title, size) = match label {
        "ai" => ("AI 助手", (480.0, 540.0)),
        "settings" => ("设置", (420.0, 480.0)),
        "todo" => ("待办便签", (420.0, 520.0)),
        "about" => ("关于", (360.0, 400.0)),
        _ => ("窗口", (480.0, 480.0)),
    };
    let url = if cfg!(dev) {
        WebviewUrl::External(
            format!("http://localhost:21047/#{hash_route}").parse().expect("valid url"),
        )
    } else {
        WebviewUrl::App("index.html".into())
    };
    match tauri::WebviewWindowBuilder::new(app, label, url)
        .title(title)
        .inner_size(size.0, size.1)
        .decorations(false)
        .visible(false)
        .background_color(tauri::window::Color(0xea, 0xea, 0xec, 255))
        .build()
    {
        Ok(win) => {
            if !cfg!(dev) {
                let _ = win.eval(&format!("window.location.hash = '{hash_route}';"));
            }
            let _ = win.show();
            let _ = win.set_focus();
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

/// about.html「检查更新」按钮：打开 GitHub releases 页
#[tauri::command]
pub async fn open_external(app: AppHandle, url: String) {
    use tauri_plugin_opener::OpenerExt;
    let target = url.clone();
    if let Err(e) = app.opener().open_url(target, None::<&str>) {
        log::error!("open_external({url}) failed: {e}");
    }
}
