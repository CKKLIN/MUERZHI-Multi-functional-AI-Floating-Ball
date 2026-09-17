// MUERZHI 万能 AI 悬浮球 — Tauri 2 后端库入口
// 迁移自 electron/main/index.ts（P0 地基阶段：单实例 + 主窗口 + 托盘 + 全局快捷键 + 自启）
// 后续阶段在 modules/ 下逐步补齐窗口体系/agent/散热/媒体/录制，见 docs/superpowers/plans/

mod modules;

use modules::settings::BallSettings;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            // 与 Electron 版 second-instance 行为一致：已有实例拉起设置窗口
            if let Some(win) = app.get_webview_window("settings") {
                let _ = win.show();
                let _ = win.set_focus();
            }
        }))
        .plugin(
            tauri_plugin_log::Builder::new()
                .target(tauri_plugin_log::Target::new(
                    tauri_plugin_log::TargetKind::LogDir { file_name: Some("muerzhi".into()) },
                ))
                .level(log::LevelFilter::Info)
                .build(),
        )
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            modules::commands::basic::get_app_version,
            modules::commands::basic::get_app_i18n,
            // P1 桥 stub 命令（P2-P4 逐个替换为真实现）
            modules::commands::stubs::get_default_save_dir,
            modules::commands::stubs::take_screenshot,
            modules::commands::stubs::select_region,
            modules::commands::stubs::file_exists,
            modules::commands::stubs::get_file_size,
            modules::commands::stubs::delete_file,
            modules::commands::stubs::convert_to_mp4,
            modules::commands::stubs::crop_video,
            modules::commands::stubs::convert_to_gif,
            modules::commands::stubs::merge_multi_screen,
            modules::commands::stubs::load_recordings,
            modules::commands::stubs::save_recordings,
            modules::commands::stubs::minimize_window,
            modules::commands::stubs::show_window,
            modules::commands::stubs::maximize_window,
            modules::commands::stubs::close_window,
            modules::commands::stubs::get_screen_scale_factor,
            modules::commands::stubs::get_screen_bounds,
            modules::commands::stubs::get_all_displays,
            modules::commands::stubs::show_region_border,
            modules::commands::stubs::hide_region_border,
            modules::commands::stubs::hide_border_only,
            modules::commands::stubs::show_floating_island,
            modules::commands::stubs::hide_floating_island,
            modules::commands::stubs::show_ai_island,
            modules::commands::stubs::hide_ai_island,
            modules::commands::stubs::get_ai_island_settings,
            modules::commands::stubs::set_ai_island_settings,
            modules::commands::stubs::hide_camera_preview,
            modules::commands::stubs::toggle_camera_preview,
            modules::commands::stubs::set_island_state,
            modules::commands::stubs::update_toolbar_state,
            modules::commands::stubs::update_audio_levels,
            modules::commands::stubs::show_floating_ball,
            modules::commands::stubs::hide_floating_ball,
            modules::commands::stubs::toggle_floating_ball,
            modules::commands::stubs::get_floating_ball_settings,
            modules::commands::stubs::set_floating_ball_settings,
            modules::commands::stubs::reset_floating_ball_position,
            modules::commands::stubs::agent_get_status,
            modules::commands::stubs::agent_install_hooks,
            modules::commands::stubs::agent_uninstall_hooks,
            modules::commands::stubs::agent_resolve_permission,
            modules::commands::stubs::agent_dismiss_question,
            modules::commands::stubs::agent_submit_question,
            modules::commands::stubs::agent_set_auto_allow,
            modules::commands::stubs::agent_get_auto_allow,
            modules::commands::stubs::agent_get_auto_allow_sessions,
            modules::commands::stubs::agent_set_auto_allow_session,
            modules::commands::stubs::agent_get_card_expiry,
            modules::commands::stubs::agent_set_card_expiry,
            modules::commands::stubs::show_ai_window,
            modules::commands::stubs::show_settings_window,
            modules::commands::stubs::show_main_window,
            modules::commands::stubs::todo_get,
            modules::commands::stubs::todo_create,
            modules::commands::stubs::todo_update,
            modules::commands::stubs::todo_delete,
            modules::commands::stubs::todo_toggle_done,
            modules::commands::stubs::todo_toggle_pin,
            modules::commands::stubs::todo_show_window,
            modules::commands::stubs::todo_close_window,
            modules::commands::stubs::todo_window_visible,
            modules::commands::stubs::todo_toggle_always_on_top,
            modules::commands::stubs::todo_get_settings,
            modules::commands::stubs::todo_set_settings,
            modules::commands::stubs::write_file,
            modules::commands::stubs::read_file,
        ])
        .setup(|app| {
            log::info!("MUERZHI (Tauri) starting...");

            setup_tray(app.handle())?;

            register_global_shortcuts(app.handle());

            // 启动时按持久化设置对齐开机自启（对齐 index.ts L162-168）
            let settings = BallSettings::load(app.handle());
            modules::autostart::sync(app.handle(), settings.open_at_login);

            // 主窗口 ready-to-show 后再显示（配置里 visible:false）
            if let Some(win) = app.get_webview_window("main") {
                let _ = win.show();
                let _ = win.set_focus();
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn setup_tray(app: &tauri::AppHandle) -> tauri::Result<()> {
    let show_settings = MenuItem::with_id(app, "show-settings", "显示设置窗口", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show_settings, &quit])?;

    let mut tray = TrayIconBuilder::with_id("main-tray")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show-settings" => {
                if let Some(win) = app.get_webview_window("settings") {
                    let _ = win.show();
                    let _ = win.set_focus();
                }
            }
            "quit" => {
                log::info!("Quit from tray");
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            // 左键单击托盘 → 拉起设置窗口（对齐 tray.ts click 行为）
            if matches!(
                event,
                TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. }
            ) {
                let app = tray.app_handle();
                if let Some(win) = app.get_webview_window("settings") {
                    let _ = win.show();
                    let _ = win.set_focus();
                }
            }
        });

    // 开发态从项目根取图标；打包后图标编译进二进制（tauri.conf.json bundle.icon）
    if let Ok(icon) = tauri::image::Image::from_path("public/logo.ico") {
        tray = tray.icon(icon);
    }
    tray.build(app)?;
    Ok(())
}

fn register_global_shortcuts(app: &tauri::AppHandle) {
    use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

    let r1 = app.global_shortcut().on_shortcut("Ctrl+Shift+R", |app, _shortcut, event| {
        if event.state == ShortcutState::Pressed {
            log::info!("Global shortcut: startStop");
            let _ = tauri::Emitter::emit(app, "on-global-shortcut", "startStop");
        }
    });
    let r2 = app.global_shortcut().on_shortcut("Ctrl+Shift+P", |app, _shortcut, event| {
        if event.state == ShortcutState::Pressed {
            log::info!("Global shortcut: pauseResume");
            let _ = tauri::Emitter::emit(app, "on-global-shortcut", "pauseResume");
        }
    });
    if let Err(e) = r1.and(r2) {
        log::error!("Global shortcut register failed: {e}");
    }
}
