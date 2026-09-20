// MUERZHI 万能 AI 悬浮球 — Tauri 2 后端库入口
// 迁移自 electron/main/index.ts（P0 地基阶段：单实例 + 主窗口 + 托盘 + 全局快捷键 + 自启）
// 后续阶段在 modules/ 下逐步补齐窗口体系/agent/散热/媒体/录制，见 docs/superpowers/plans/

mod modules;

use modules::settings::BallSettings;
use std::sync::OnceLock;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager,
};

/// 进程级 AppHandle：少数「没有 app 参数」的辅助函数（如托盘气泡通知）需要它。
/// 在 setup 里一次性写入；测试进程（cargo test）不会走到这里，调用方按 None 降级。
static APP_HANDLE: OnceLock<AppHandle> = OnceLock::new();

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
            // P1 实装命令
            modules::commands::files::write_file,
            modules::commands::files::read_file,
            modules::commands::files::append_file,
            modules::commands::files::file_exists,
            modules::commands::files::delete_file,
            modules::commands::files::get_file_size,
            modules::commands::files::load_recordings,
            modules::commands::files::save_recordings,
            modules::commands::files::get_default_save_dir,
            modules::commands::screen::get_screen_scale_factor,
            modules::commands::screen::get_screen_bounds,
            modules::commands::screen::get_all_displays,
            modules::commands::app_settings::get_floating_ball_settings,
            modules::commands::app_settings::set_floating_ball_settings,
            modules::commands::app_settings::set_ai_island_settings,
            modules::commands::app_settings::agent_get_auto_allow,
            modules::commands::app_settings::agent_set_auto_allow,
            modules::commands::app_settings::agent_get_auto_allow_sessions,
            modules::commands::app_settings::agent_set_auto_allow_session,
            modules::commands::app_settings::agent_get_card_expiry,
            modules::commands::app_settings::agent_set_card_expiry,
            modules::commands::app_settings::get_ai_island_settings,
            modules::commands::app_settings::show_ai_window,
            modules::commands::app_settings::show_settings_window,
            modules::commands::app_settings::show_main_window,
            modules::commands::app_settings::notify_conversion_start,
            modules::commands::app_settings::notify_conversion_done,
            modules::windows::show_about_window,
            modules::windows::close_about_window,
            modules::windows::open_external,
            // P4 实装：截图 / 显示器源（缩略图）/ 音频设备枚举
            modules::commands::screen::take_screenshot,
            modules::commands::screen::get_sources,
            modules::commands::screen::get_system_audio_sources,
            modules::commands::screen::list_audio_devices,
            // 区域选择窗底图（region-selector.html 启动时拉主屏一帧铺 canvas）
            modules::recording::grab::grab_screen_thumbnail,
            media_convert_to_mp4,
            media_crop_video,
            media_convert_to_gif,
            media_merge_multi_screen,
            // 录制会话（P4 全量：WGC 分段采集 + WASAPI 音频 + ffmpeg 合成）
            modules::recording::recording_start,
            modules::recording::recording_pause,
            modules::recording::recording_resume,
            modules::recording::recording_stop,
            modules::recording::recording_get_status,
            modules::commands::stubs::minimize_window,
            modules::commands::stubs::show_window,
            modules::commands::stubs::maximize_window,
            modules::commands::stubs::close_window,
            modules::windows::region::show_region_border,
            modules::windows::region::hide_region_border,
            modules::windows::region::hide_border_only,
            modules::windows::region::show_floating_island,
            modules::windows::region::hide_floating_island,
            modules::windows::ai_island::show_ai_island,
            modules::windows::ai_island::hide_ai_island,
            modules::windows::region::hide_camera_preview,
            modules::windows::region::toggle_camera_preview,
            modules::windows::region::set_island_state,
            modules::windows::region::update_toolbar_state,
            modules::windows::region::start_region_select,
            modules::windows::region::region_selected,
            modules::windows::region::region_cancelled,
            modules::windows::region::camera_drag_start,
            modules::windows::region::camera_drag_end,
            modules::windows::region::camera_record_finished,
            modules::windows::region::camera_geometry_cmd,
            modules::windows::region::toggle_annotation,
            modules::windows::region::hide_annotation,
            // AI 岛（P2 实装）
            modules::windows::ai_island::resize_ai_island,
            modules::windows::ai_island::ai_island_drag_start,
            modules::windows::ai_island::ai_island_drag_move,
            modules::windows::ai_island::ai_island_drag_end,
            modules::windows::ai_island::set_ai_island_mouse_mode,
            // 待办窗口族（P2 实装：贴屏便签/提醒弹窗/散热面板）
            modules::windows::todo_windows::push_sticky_notes_cmd,
            modules::windows::todo_windows::close_sticky_notes,
            modules::windows::todo_windows::hide_todo_reminder_cmd,
            modules::windows::todo_windows::clear_todo_reminder_queue_cmd,
            modules::windows::todo_windows::hide_cooling_overlay_cmd,
            // 散热（P3 实装）
            modules::cooling::start_cooling,
            modules::cooling::is_cooling_active,
            modules::cooling::get_cooling_duration_sec,
            modules::cooling::cancel_cooling,
            // 悬浮球（P2 实装）
            modules::windows::floating_ball::show_floating_ball,
            modules::windows::floating_ball::hide_floating_ball,
            modules::windows::floating_ball::toggle_floating_ball,
            modules::windows::floating_ball::ball_expand,
            modules::windows::floating_ball::ball_collapse,
            modules::windows::floating_ball::ball_drag_start,
            modules::windows::floating_ball::ball_drag_clear,
            modules::windows::floating_ball::ball_move,
            modules::windows::floating_ball::ball_drag_end,
            modules::windows::floating_ball::reset_floating_ball_position,
            modules::todo::store::todo_get,
            modules::todo::store::todo_create,
            modules::todo::store::todo_update,
            modules::todo::store::todo_delete,
            modules::todo::store::todo_toggle_done,
            modules::todo::store::todo_toggle_pin,
            modules::commands::stubs::todo_show_window,
            modules::commands::stubs::todo_close_window,
            modules::commands::stubs::todo_window_visible,
            modules::commands::stubs::todo_toggle_always_on_top,
            modules::todo::store::todo_get_settings,
            modules::todo::store::todo_set_settings,
            // Agent 子系统（P3 实装）
            agent_get_status,
            agent_install_hooks,
            agent_uninstall_hooks,
            agent_resolve_permission,
            agent_dismiss_question,
            agent_submit_question,
        ])
        .setup(|app| {
            log::info!("MUERZHI (Tauri) starting...");
            let _ = APP_HANDLE.set(app.handle().clone());

            setup_tray(app.handle())?;

            register_global_shortcuts(app.handle());

            // 启动时按持久化设置对齐开机自启（对齐 index.ts L162-168）
            let settings = BallSettings::load(app.handle());
            modules::autostart::sync(app.handle(), settings.open_at_login);

            // i18n locale 对齐悬浮球设置（渲染层 get_app_i18n 前主进程窗口标题等已就绪）
            modules::i18n::I18n::global()
                .set_locale(modules::i18n::Locale::from_str_lossy(&settings.locale));

            // 主窗口关闭 → 通知渲染层释放 + 隐藏（对齐 Electron close 语义）
            modules::windows::setup_main_window_close_guard(app.handle());

            // 主窗口 ready-to-show 后再显示（配置里 visible:false）
            if let Some(win) = app.get_webview_window("main") {
                let _ = win.show();
                let _ = win.set_focus();
            }

            // 悬浮球：按设置显隐启动（对齐 showFloatingBallIfVisible）
            if settings.visible {
                modules::windows::floating_ball::show_ball(app.handle());
            }

            // 悬浮球动作转发（对齐 floating-ball-action → clawd-show-* 窗口）
            setup_ball_events(app.handle());

            // 录制工具条/悬浮岛事件（close → 关边框；其余动作由 event 广播到主窗口）
            setup_region_events(app.handle());
            setup_todo_events(app.handle());

            // 录制：音频电平 ticker（20Hz → 原生窗口音量表 + 渲染层事件）
            modules::recording::spawn_level_ticker(app.handle().clone());

            // 待办：启动提醒调度（先补扫再 30s 轮询）+ 整理贴屏便签 + 推一次角标
            modules::todo::scheduler::start(app.handle());
            modules::windows::todo_windows::sync_sticky_from_store(app.handle());
            modules::windows::todo_windows::refresh_badge(app.handle());

            // 散热：崩溃残留恢复（上次散热中被强杀 → 写回 powercfg/风扇原值）
            modules::cooling::Cooling::recover_residue(app.handle());

            // Agent 子系统：HTTP 服务（60000-60019）+ 状态机 + Claude hooks 安装 + 健康看护
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                modules::agent::bridge::start(handle).await;
            });

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
                // before-quit 等价清理（对齐 index.ts before-quit 的子系统收尾）
                modules::agent::bridge::stop();
                modules::todo::scheduler::stop();
                // 散热：同步恢复被限制的电源设置/风扇模式（对齐 cancelCooling）
                modules::cooling::Cooling::global().cancel(app);
                modules::windows::todo_windows::hide_cooling_overlay(app);
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

/// 悬浮球事件：花瓣动作转发到对应窗口（对齐 forwardAction）+ badge-ready 补推徽标
fn setup_ball_events(app: &tauri::AppHandle) {
    use tauri::{Emitter, Listener};

    let app_owned = app.clone();
    app.listen("floating-ball-action".to_string(), move |event| {
        let action = event.payload().trim().trim_matches('"');
        log::info!("Floating ball action: {action}");
        let app = app_owned.clone();
        match action {
            "record" => {
                if let Some(win) = app.get_webview_window("main") {
                    let _ = win.show();
                    let _ = win.set_focus();
                }
            }
            "ai" => {
                if let Some(win) = app.get_webview_window("ai") {
                    let _ = win.show();
                    let _ = win.set_focus();
                }
            }
            "todo" => {
                if let Some(win) = app.get_webview_window("todo") {
                    let _ = win.show();
                    let _ = win.set_focus();
                }
            }
            "settings" => {
                if let Some(win) = app.get_webview_window("settings") {
                    let _ = win.show();
                    let _ = win.set_focus();
                }
            }
            other => {
                let _ = app.emit("on-floating-ball-action", other);
            }
        }
        modules::windows::floating_ball::collapse_ball(&app);
    });

    let app_owned2 = app.clone();
    // 右键悬浮球 → 三档散热（面板 + 花瓣旋转）
    let app_cooling = app.clone();
    app.listen("floating-ball-cooling".to_string(), move |_event| {
        log::info!("Floating ball cooling requested");
        modules::cooling::trigger_from_ball(&app_cooling);
    });

    app.listen("floating-ball-badge-ready".to_string(), move |_event| {
        // P3 todo 模块接入后由 todo-badge 推送真实计数；P2 先推 0（隐藏徽标）
        if let Some(win) = app_owned2.get_webview_window("floating-ball") {
            let _ = win.eval("if(window.updateBadge) updateBadge(0,false,false)");
        }
    });
}


/// 工具条/悬浮岛事件：close → 关对应窗口（对齐 region-selector.ts 的 close 分支）
fn setup_region_events(app: &tauri::AppHandle) {
    use tauri::Listener;

    let app_owned = app.clone();
    app.listen("toolbar-action".to_string(), move |event| {
        let action = event.payload().trim().trim_matches('"').to_string();
        if action == "close" {
            modules::windows::region::hide_region_border(app_owned.clone());
        }
    });

    let app_owned2 = app.clone();
    app.listen("island-action".to_string(), move |event| {
        let action = event.payload().trim().trim_matches('"').to_string();
        if action == "close" {
            modules::windows::region::hide_floating_island(app_owned2.clone());
        }
    });
}

/// 贴屏便签动作：unpin → 取消贴屏（P3 接 todo 数据层）；open → 拉起待办窗口
fn setup_todo_events(app: &tauri::AppHandle) {
    use tauri::Listener;

    let app_owned = app.clone();
    app.listen("todo-sticky-unpin".to_string(), move |event| {
        let id = event.payload().trim().trim_matches('"').to_string();
        modules::windows::todo_windows::on_sticky_unpin(&app_owned, &id);
    });

    let app_owned2 = app.clone();
    app.listen("todo-sticky-open".to_string(), move |event| {
        let id = event.payload().trim().trim_matches('"').to_string();
        modules::windows::todo_windows::on_sticky_open(&app_owned2, &id);
    });

    let app_owned3 = app.clone();
    app.listen("todo-reminder-close".to_string(), move |_event| {
        modules::windows::todo_windows::hide_todo_reminder(&app_owned3);
    });

    let app_owned4 = app.clone();
    app.listen("todo-reminder-open".to_string(), move |_event| {
        modules::windows::todo_windows::clear_todo_reminder_queue(&app_owned4);
        if let Some(win) = app_owned4.get_webview_window("todo") {
            let _ = win.show();
            let _ = win.set_focus();
        }
    });
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


// ===== Agent 子系统命令（P3）=====

#[tauri::command]
fn agent_get_status() -> serde_json::Value {
    modules::agent::bridge::get_status()
}

#[tauri::command]
fn agent_install_hooks(app: tauri::AppHandle) -> serde_json::Value {
    match modules::agent::hooks::install(&app) {
        Ok(()) => modules::agent::bridge::get_status(),
        Err(e) => {
            log::error!("agent_install_hooks failed: {e}");
            serde_json::Value::Null
        }
    }
}

#[tauri::command]
fn agent_uninstall_hooks(app: tauri::AppHandle) -> serde_json::Value {
    match modules::agent::hooks::uninstall(&app) {
        Ok(()) => modules::agent::bridge::get_status(),
        Err(e) => {
            log::error!("agent_uninstall_hooks failed: {e}");
            serde_json::Value::Null
        }
    }
}

#[tauri::command]
fn agent_resolve_permission(behavior: String) {
    modules::agent::server::AgentServer::global().resolve_pending_permission(&behavior);
}

#[tauri::command]
fn agent_dismiss_question() {
    modules::agent::server::AgentServer::global().dismiss_question();
}

#[tauri::command]
#[allow(non_snake_case)]
fn agent_submit_question(sessionId: String, answers: serde_json::Value) {
    modules::agent::server::AgentServer::global().submit_question(&sessionId, answers);
}

// ===== ffmpeg 转换族命令（P3；签名对齐 bridge.ts 的 invoke 参数）=====

#[tauri::command]
#[allow(non_snake_case)]
async fn media_convert_to_mp4(
    app: tauri::AppHandle,
    inputPath: String,
    outputPath: String,
    crop: Option<(i32, i32, i32, i32)>,
) -> serde_json::Value {
    match modules::media::ffmpeg::convert_webm_to_mp4(&app, &inputPath, &outputPath, crop).await {
        Ok(()) => json_out(true, &outputPath, None),
        Err(e) => json_out(false, &outputPath, Some(&e)),
    }
}

#[tauri::command]
#[allow(non_snake_case)]
async fn media_crop_video(
    app: tauri::AppHandle,
    inputPath: String,
    outputPath: String,
    crop: (i32, i32, i32, i32),
) -> serde_json::Value {
    match modules::media::ffmpeg::crop_video(&app, &inputPath, &outputPath, crop).await {
        Ok(()) => json_out(true, &outputPath, None),
        Err(e) => json_out(false, &outputPath, Some(&e)),
    }
}

#[tauri::command]
#[allow(non_snake_case)]
async fn media_convert_to_gif(
    app: tauri::AppHandle,
    inputPath: String,
    outputPath: String,
    options: Option<serde_json::Value>,
) -> serde_json::Value {
    let width = options_width(&options);
    let fps = options_fps(&options);
    let duration = options_duration(&options);
    match modules::media::ffmpeg::convert_to_gif(&app, &inputPath, &outputPath, width, fps, duration).await {
        Ok(()) => json_out(true, &outputPath, None),
        Err(e) => json_out(false, &outputPath, Some(&e)),
    }
}

#[tauri::command]
#[allow(non_snake_case)]
async fn media_merge_multi_screen(
    app: tauri::AppHandle,
    inputs: Vec<serde_json::Value>,
    outputPath: String,
) -> serde_json::Value {
    let parsed: Vec<modules::media::MergeInput> = inputs
        .iter()
        .filter_map(|v| {
            let fp = v.get("filePath")?.as_str()?.to_string();
            let b = v.get("bounds")?;
            Some(modules::media::MergeInput {
                file_path: fp,
                bounds: (
                    b.get("x")?.as_i64()? as i32,
                    b.get("y")?.as_i64()? as i32,
                    b.get("width")?.as_i64()? as i32,
                    b.get("height")?.as_i64()? as i32,
                ),
            })
        })
        .collect();
    match modules::media::ffmpeg::merge_multi_screen(&app, &parsed, &outputPath).await {
        Ok(()) => json_out(true, &outputPath, None),
        Err(e) => json_out(false, &outputPath, Some(&e)),
    }
}

fn json_out(success: bool, output_path: &str, error: Option<&str>) -> serde_json::Value {
    serde_json::json!({
        "success": success,
        "outputPath": output_path,
        "error": error,
    })
}

fn options_width(v: &Option<serde_json::Value>) -> u32 {
    v.as_ref().and_then(|o| o.get("width")).and_then(|w| w.as_u64()).unwrap_or(480) as u32
}

fn options_fps(v: &Option<serde_json::Value>) -> u32 {
    v.as_ref().and_then(|o| o.get("fps")).and_then(|f| f.as_u64()).unwrap_or(10) as u32
}

fn options_duration(v: &Option<serde_json::Value>) -> Option<f64> {
    v.as_ref().and_then(|o| o.get("duration")).and_then(|d| d.as_f64())
}
