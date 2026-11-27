// 现代化自定义托盘悬浮菜单（完全摆脱 Windows 原生 Win32 菜单的大行距与空白缺陷）
// 拥有与悬浮球、AI岛一致的莫兰迪毛玻璃高质感、高密度排版与无缝二级菜单展示。

use crate::modules::settings::BallSettings;
use crate::modules::tools::{list_custom_tools_sync, CustomToolItem};
use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{AppHandle, Manager, PhysicalPosition, WebviewUrl, WebviewWindow, WebviewWindowBuilder};

pub const TRAY_MENU_WIN_WIDTH: f64 = 350.0;
pub const TRAY_MENU_WIN_HEIGHT: f64 = 330.0;

static MENU_BUILDING: AtomicBool = AtomicBool::new(false);

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TrayMenuData {
    pub ball_visible: bool,
    pub tools: Vec<CustomToolItem>,
}

pub fn get_tray_menu_window(app: &AppHandle) -> Option<WebviewWindow> {
    app.get_webview_window("tray-menu")
}

#[tauri::command]
pub fn get_tray_menu_data(app: AppHandle) -> TrayMenuData {
    let settings = BallSettings::load(&app);
    let tools = list_custom_tools_sync(&app);
    TrayMenuData {
        ball_visible: settings.visible,
        tools,
    }
}

#[tauri::command]
pub fn hide_tray_menu(app: AppHandle) {
    if let Some(win) = get_tray_menu_window(&app) {
        let _ = win.hide();
    }
}

#[tauri::command]
pub async fn tray_menu_action(
    app: AppHandle,
    action: String,
    payload: Option<String>,
) -> Result<(), String> {
    hide_tray_menu(app.clone());

    match action.as_str() {
        "record" => {
            log::info!("Tray menu action: record");
            crate::modules::windows::show_main_window(&app);
            use tauri::Emitter;
            let _ = app.emit("on-floating-ball-action", "record");
        }
        "ai" => {
            log::info!("Tray menu action: ai");
            let handle = app.clone();
            tauri::async_runtime::spawn(async move {
                crate::modules::windows::open_or_focus(&handle, "ai", "/ai");
            });
        }
        "todo" => {
            log::info!("Tray menu action: todo");
            crate::modules::windows::todo_windows::set_badge_flash(&app, false);
            let handle = app.clone();
            tauri::async_runtime::spawn(async move {
                crate::modules::windows::open_or_focus(&handle, "todo", "/todo");
            });
        }
        "cooling" => {
            log::info!("Tray menu action: cooling");
            crate::modules::cooling::trigger_from_ball(&app);
        }
        "tools" => {
            log::info!("Tray menu action: tools");
            let handle = app.clone();
            tauri::async_runtime::spawn(async move {
                crate::modules::windows::open_or_focus(&handle, "tools", "/tools");
            });
        }
        "run-tool" => {
            if let Some(rel) = payload {
                log::info!("Tray menu action: run-tool {}", rel);
                let handle = app.clone();
                tauri::async_runtime::spawn(async move {
                    if let Err(e) = crate::modules::tools::open_custom_tool(handle, rel).await {
                        log::error!("failed to open custom tool from custom tray menu: {e}");
                    }
                });
            }
        }
        "toggle-ball" => {
            log::info!("Tray menu action: toggle-ball");
            let mut settings = BallSettings::load(&app);
            settings.visible = !settings.visible;
            if settings.visible {
                crate::modules::windows::floating_ball::show_ball(&app);
            } else {
                crate::modules::windows::floating_ball::hide_ball(&app);
            }
            if let Err(e) = settings.save(&app) {
                log::error!("save ball settings failed: {e}");
            }
            use tauri::Emitter;
            let _ = app.emit(
                "floating-ball-settings-changed",
                serde_json::to_value(&settings).unwrap_or_default(),
            );
        }
        "reset-ball" => {
            log::info!("Tray menu action: reset-ball");
            crate::modules::windows::floating_ball::reset_floating_ball_position(app.clone());
            crate::modules::windows::floating_ball::show_ball(&app);
        }
        "settings" => {
            log::info!("Tray menu action: settings");
            let handle = app.clone();
            tauri::async_runtime::spawn(async move {
                crate::modules::windows::open_or_focus(&handle, "settings", "/settings");
            });
        }
        "about" => {
            log::info!("Tray menu action: about");
            let handle = app.clone();
            tauri::async_runtime::spawn(async move {
                crate::modules::windows::open_or_focus(&handle, "about", "/about");
            });
        }
        "restart" => {
            log::info!("Tray menu action: restart");
            let handle = app.clone();
            tauri::async_runtime::spawn(crate::graceful_restart(handle));
        }
        "quit" => {
            log::info!("Tray menu action: quit");
            let handle = app.clone();
            tauri::async_runtime::spawn(crate::graceful_quit(handle));
        }
        _ => {}
    }
    Ok(())
}

/// 打开或隐藏自定义托盘悬浮菜单
pub fn toggle_tray_menu(app: &AppHandle) {
    if let Some(win) = get_tray_menu_window(app) {
        if win.is_visible().unwrap_or(false) {
            let _ = win.hide();
            return;
        }
        reposition_and_show(app, &win);
        return;
    }

    if MENU_BUILDING.swap(true, Ordering::SeqCst) {
        return;
    }

    let app_handle = app.clone();
    let url = WebviewUrl::App("windows/tray-menu.html".into());
    match WebviewWindowBuilder::new(app, "tray-menu", url)
        .title("TrayMenu")
        .inner_size(TRAY_MENU_WIN_WIDTH, TRAY_MENU_WIN_HEIGHT)
        .decorations(false)
        .transparent(true)
        .resizable(false)
        .skip_taskbar(true)
        .shadow(false)
        .always_on_top(true)
        .visible(false)
        .build()
    {
        Ok(win) => {
            MENU_BUILDING.store(false, Ordering::SeqCst);
            reposition_and_show(&app_handle, &win);
        }
        Err(e) => {
            MENU_BUILDING.store(false, Ordering::SeqCst);
            log::error!("build tray-menu window failed: {e}");
        }
    }
}

/// 定位并显示托盘菜单
fn reposition_and_show(app: &AppHandle, win: &WebviewWindow) {
    let cursor = app.cursor_position().unwrap_or(PhysicalPosition::new(0.0, 0.0));
    let (cx, cy) = (cursor.x, cursor.y);

    let monitor = app
        .monitor_from_point(cx, cy)
        .ok()
        .flatten()
        .or_else(|| app.primary_monitor().ok().flatten());

    let scale = monitor.as_ref().map(|m| m.scale_factor()).unwrap_or(1.0);
    let (mx, my, mw, mh) = monitor
        .as_ref()
        .map(|m| {
            let pos = m.position();
            let size = m.size();
            (pos.x as f64, pos.y as f64, size.width as f64, size.height as f64)
        })
        .unwrap_or((0.0, 0.0, 1920.0, 1080.0));

    let win_w_phys = TRAY_MENU_WIN_WIDTH * scale;
    let win_h_phys = TRAY_MENU_WIN_HEIGHT * scale;

    // 默认停靠逻辑：因为主菜单在窗口右下侧（宽 140），窗口放置使得主菜单右边缘靠近光标
    let mut target_x = cx - win_w_phys + (140.0 * scale / 2.0);
    let mut target_y = cy - win_h_phys + (10.0 * scale);

    // 屏幕边界碰撞修正
    if target_x + win_w_phys > mx + mw - 8.0 {
        target_x = mx + mw - win_w_phys - 8.0;
    }
    if target_x < mx + 8.0 {
        target_x = mx + 8.0;
    }
    if target_y < my + 8.0 {
        target_y = cy + 12.0; // 若光标在屏幕顶栏，菜单向下弹出
    }
    if target_y + win_h_phys > my + mh - 8.0 {
        target_y = my + mh - win_h_phys - 8.0;
    }

    let _ = win.set_position(PhysicalPosition::new(target_x.round() as i32, target_y.round() as i32));
    let _ = win.unminimize();
    let _ = win.show();
    let _ = win.set_focus();
    let _ = win.eval("window.renderTrayMenu && window.renderTrayMenu(); void 0;");
}
