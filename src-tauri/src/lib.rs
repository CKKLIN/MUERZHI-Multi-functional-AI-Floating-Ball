// MUERZHI 万能 AI 悬浮球 — Tauri 2 后端库入口
// 迁移自 electron/main/index.ts（P0 地基阶段：单实例 + 主窗口 + 托盘 + 全局快捷键 + 自启）
// 后续阶段在 modules/ 下逐步补齐窗口体系/agent/散热/媒体/录制，见 docs/superpowers/plans/

mod modules;

use modules::settings::BallSettings;
use std::sync::OnceLock;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle,
};

/// 进程级 AppHandle：少数「没有 app 参数」的辅助函数（如托盘气泡通知）需要它。
/// 在 setup 里一次性写入；测试进程（cargo test）不会走到这里，调用方按 None 降级。
static APP_HANDLE: OnceLock<AppHandle> = OnceLock::new();

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            // 与 Electron 版 second-instance 行为一致：已有实例拉起设置窗口。
            // settings 是按需创建的（启动不预建），open_or_focus 不存在时会建出
            modules::windows::open_or_focus(app, "settings", "/settings");
        }))
        .plugin(
            tauri_plugin_log::Builder::new()
                .targets([
                    // 终端直出（dev 排查用）；文件一份。
                    // 注意：不要加 TargetKind::Webview —— 它把每条日志 emit("log://log") 给所有
                    // 窗口（Tauri 事件投递 = evaluate_script），而 tauri_runtime_wry 对 eval 失败
                    // 又会 log::error！——前端无任何 log://log 订阅者，加了就构成
                    // 「eval 失败 → 记日志 → emit → 再 eval 失败」自激死循环：
                    // 实测安装版每次启动刷 5k-13k 行/秒，2MB 日志 2 秒滚满，
                    // 进程数分钟内 AppHangB1 挂死 + 日志目录堆到 147MB。
                    tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Stdout),
                    // app_log_dir（%LOCALAPPDATA%/com.muerzhi.aiball/logs/muerzhi.log）
                    tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::LogDir {
                        file_name: Some("muerzhi".into()),
                    }),
                ])
                // 单文件 2MB 轮换，保留最近 5 份（日期后缀备份），防长录制期间日志无限膨胀
                .max_file_size(2 * 1024 * 1024)
                .rotation_strategy(tauri_plugin_log::RotationStrategy::KeepSome(5))
                // 本地时区：文件里的时间戳要与用户的墙上时钟一致，跨时区排查才不绕
                .timezone_strategy(tauri_plugin_log::TimezoneStrategy::UseLocal)
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
        // local-video:// 流式回放协议（录制历史点开成品）。此前从未注册 —— 前端一直在
        // 用 local-video:/// 播放，请求无人应答 → 点历史视频必黑屏。
        // Windows 上 wry 把它映射成 http://local-video.localhost/* 拦截后原样转回
        // local-video://localhost/* 交给 handler（见 local_video::parse_path）。
        .register_uri_scheme_protocol("local-video", |_ctx, request| {
            modules::media::local_video::handle_local_video(request)
        })
        .invoke_handler(tauri::generate_handler![
            modules::commands::basic::get_app_version,
            modules::commands::basic::get_app_i18n,
            // P1 实装命令
            modules::commands::files::write_file,
            modules::commands::files::read_file,
            modules::commands::files::append_file,
            modules::commands::files::append_file_raw,
            modules::commands::files::file_exists,
            modules::commands::files::delete_file,
            modules::commands::files::get_file_size,
            modules::commands::files::load_recordings,
            modules::commands::files::save_recordings,
            modules::commands::files::get_default_save_dir,
            modules::commands::files::generate_thumbnail,
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
            modules::windows::open_local_path,
            modules::windows::open_log_dir,
            // P4 实装：截图 / 显示器源（缩略图）/ 音频设备枚举
            modules::commands::screen::take_screenshot,
            modules::commands::screen::get_sources,
            modules::commands::screen::get_system_audio_sources,
            modules::commands::screen::list_audio_devices,
            // 区域选择窗底图（region-selector.html 启动时拉主屏一帧铺 canvas）
            modules::recording::grab::grab_screen_thumbnail,
            modules::recording::grab::grab_virtual_desktop_backdrop,
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
            modules::recording::recording_set_mic,
            modules::recording::recording_set_camera,
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
            modules::windows::region::emit_preview_audio_level,
            modules::windows::region::push_island_audio_state,
            modules::windows::region::start_region_select,
            modules::windows::region::region_selector_ready,
            modules::windows::region::region_switch_monitor,
            modules::windows::region::region_selected,
            modules::windows::region::region_cancelled,
            modules::windows::region::camera_drag_start,
            modules::windows::region::camera_drag_end,
            modules::windows::region::camera_record_finished,
            modules::windows::region::camera_geometry_cmd,
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
            modules::windows::floating_ball::ball_drag_cancel,
            modules::windows::floating_ball::reset_floating_ball_position,
            modules::todo::store::todo_get,
            modules::todo::store::todo_create,
            modules::todo::store::todo_update,
            modules::todo::store::todo_delete,
            modules::todo::store::todo_toggle_done,
            modules::todo::store::todo_toggle_pin,
            modules::todo::store::todo_reorder,
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
            log::info!(
                "MUERZHI v{} (Tauri) starting... pid={}",
                env!("CARGO_PKG_VERSION"),
                std::process::id()
            );
            log::info!(
                "启动参数：dev={} screen-capture={}",
                cfg!(dev),
                modules::recording::capture::ENABLED
            );
            let _ = APP_HANDLE.set(app.handle().clone());

            // Electron 旧版数据一次性搬迁（必须早于任何 settings/todo 读取，
            // 否则 load 会先写出默认值把「目标已存在」的通道堵死）
            modules::settings::migrate_electron_data_once(app.handle());

            // 启动清扫：上次异常退出（断电/强杀）残留的录制中间产物（段/WAV/摄像头 webm 等）
            cleanup_stale_temp_artifacts();
            // 启动清扫：日志轮转残留（插件 KeepSome 只认 `.log` 后缀，同秒轮转产生的
            // `.log.bak` 永不清理 —— 实测洪泛时堆到 74 个文件/147MB），按修改时间只留最近 5 个
            cleanup_stale_log_files();

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

            // 主窗口保持隐藏启动（对齐 Electron：show:false 且从不自动 show）——
            // 只显示悬浮球，用户从悬浮球花瓣「录制」/托盘主动打开时才 show+focus。
            // 之前这里无条件 show+focus，每次启动都弹录屏窗口。

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
            // 录制：悬浮岛悬停唤出（全屏录制中岛自动收起，鼠标移到岛的位置再出现）
            modules::windows::region::spawn_island_hover_watch(app.handle().clone());

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
    let show_settings =
        MenuItem::with_id(app, "show-settings", "显示设置窗口", true, None::<&str>)?;
    let restart = MenuItem::with_id(app, "restart", "重新启动", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show_settings, &restart, &quit])?;

    let mut tray = TrayIconBuilder::with_id("main-tray")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show-settings" => {
                log::info!("Tray menu: show-settings");
                // settings 按需创建：托盘入口在窗口不存在时也要能建出
                modules::windows::open_or_focus(app, "settings", "/settings");
            }
            "restart" => {
                log::info!("Restart from tray");
                // 同样先跑收尾再退：录制中被硬杀会丢成品（见 graceful_quit 注释）。
                // 与「退出」的区别只是收尾后重启进程而非退出。
                let handle = app.clone();
                tauri::async_runtime::spawn(graceful_restart(handle));
            }
            "quit" => {
                log::info!("Quit from tray");
                // before-quit 等价清理（对齐 index.ts before-quit 的子系统收尾）：
                // 先广播给渲染层做录制收尾，等会话真正结束再退（见 graceful_quit）
                let handle = app.clone();
                tauri::async_runtime::spawn(graceful_quit(handle));
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            // 左键单击托盘 → 拉起设置窗口（对齐 tray.ts click 行为）
            if matches!(
                event,
                TrayIconEvent::Click {
                    button: MouseButton::Left,
                    button_state: MouseButtonState::Up,
                    ..
                }
            ) {
                log::info!("Tray icon clicked → settings window");
                let app = tray.app_handle();
                modules::windows::open_or_focus(app, "settings", "/settings");
            }
        });

    // 托盘图标：编译期嵌入（include_bytes + from_bytes 解码成 RGBA）。
    // 之前用 Image::from_path("public/logo.ico") 相对路径 —— 工作目录是 src-tauri 时
    // 解析到 src-tauri/public/（不存在），失败被 if let Ok 静默吞掉，托盘落到默认
    // 空白图标（实测用户以相对路径启动 exe 时必现）。嵌入后 dev/prod 一致、无 cwd 依赖。
    match tauri::image::Image::from_bytes(include_bytes!("../../public/logo.ico")) {
        Ok(icon) => {
            tray = tray.icon(icon);
        }
        Err(e) => log::error!("tray icon decode failed: {e}"),
    }
    tray.build(app)?;
    Ok(())
}

/// 清理上次异常退出残留的录制中间产物（%TEMP%/muerzhi_*：段 mp4 / 音频 WAV / 摄像头 webm）。
/// 只删超过 2h 的 —— 太新的可能属于另一个正在运行的实例（双开），不能碰；
/// 2h 而非 24h：应用常驻托盘可连开数天，期间崩溃/强杀残留的段文件单场可达数百 MB。
fn cleanup_stale_temp_artifacts() {
    let dir = std::env::temp_dir();
    let Ok(entries) = std::fs::read_dir(&dir) else {
        return;
    };
    let max_age = std::time::Duration::from_secs(2 * 3600);
    let mut removed = 0usize;
    for e in entries.flatten() {
        let name = e.file_name().to_string_lossy().to_string();
        if !name.starts_with("muerzhi_") {
            continue;
        }
        let Ok(meta) = e.metadata() else {
            continue;
        };
        let stale = meta
            .modified()
            .ok()
            .and_then(|m| m.elapsed().ok())
            .map(|age| age > max_age)
            .unwrap_or(false);
        if stale && std::fs::remove_file(e.path()).is_ok() {
            removed += 1;
        }
    }
    if removed > 0 {
        log::info!("启动清扫：删除 {removed} 个超过 2h 的录制临时残留");
    }
}

/// 启动时把日志目录裁剪到只剩最近 5 个归档文件（当前 muerzhi.log 不动）。
///
/// 背景：tauri-plugin-log 的 `remove_old_files` 用 `strip_suffix(".log")` 识别归档名，
/// 同一秒内多次轮转产生的 `muerzhi_*.log.bak` 匹配不上 → 永远不进清理列表。
/// 日志洪泛时（已由移除 Webview target 根治）曾堆出 74 个文件/147MB，这里做兜底。
fn cleanup_stale_log_files() {
    let Some(local) = std::env::var_os("LOCALAPPDATA") else { return };
    let dir = std::path::PathBuf::from(local).join("com.muerzhi.aiball").join("logs");
    let Ok(entries) = std::fs::read_dir(&dir) else { return };
    let mut archived: Vec<(std::time::SystemTime, std::path::PathBuf)> = Vec::new();
    for e in entries.flatten() {
        let name = e.file_name().to_string_lossy().to_string();
        // 归档形如 muerzhi_<date>.log / muerzhi_<date>.log.bak；当前活动文件 muerzhi.log 跳过
        if name == "muerzhi.log" || !name.starts_with("muerzhi") {
            continue;
        }
        if let Ok(meta) = e.metadata() {
            if let Ok(m) = meta.modified() {
                archived.push((m, e.path()));
            }
        }
    }
    if archived.len() <= 5 {
        return;
    }
    archived.sort_by(|a, b| b.0.cmp(&a.0)); // 新→旧
    let mut removed = 0;
    for (_, path) in archived.into_iter().skip(5) {
        if std::fs::remove_file(&path).is_ok() {
            removed += 1;
        }
    }
    if removed > 0 {
        log::info!("启动清扫：删除 {removed} 个过期日志归档");
    }
}

/// 托盘退出的优雅收尾：先让渲染层停录制/释放硬件，等录制会话真正结束再退出。
///
/// 之前直接 `app.exit(0)`：录制中被直接杀掉 —— 成品丢失（ffmpeg 合成没跑），WGC/WASAPI
/// 的半截临时分段残留在 %TEMP%（渲染层的 onBeforeQuit 监听一直是死的：没人发 app-before-quit）。
/// 渲染层收到事件后跑 `recording.stop()`（含 ffmpeg 拼接/裁剪/混音，秒级到几十秒），
/// 这里轮询会话状态等它跑完：上限 90s —— 长录制的合成本来就要几十秒，超时就丢成品，
/// 宁可多等；真出意外（事件没人收）也不至于把用户永远卡在托盘里。
async fn graceful_quit(app: AppHandle) {
    shutdown_subsystems(&app).await;
    log::info!("graceful_quit: 收尾完成，进程退出");
    app.exit(0);
}

/// 托盘「重新启动」：与退出走同一套收尾（录制/合成/落盘等），收尾后重启进程
async fn graceful_restart(app: AppHandle) {
    shutdown_subsystems(&app).await;
    log::info!("graceful_restart: 收尾完成，重启进程");
    app.restart();
}

/// 退出/重启共用的子系统收尾：等录制会话结束 → 停各子系统 → 散热还原
async fn shutdown_subsystems(app: &AppHandle) {
    use tauri::Emitter;
    log::info!("shutdown_subsystems: 广播 app-before-quit 并等待子系统收尾");
    let _ = app.emit("app-before-quit", ());
    let state = modules::recording::SessionState::global();
    if state.phase() != 0 {
        log::info!("退出前等待录制会话收尾（phase={}）…", state.phase());
        for i in 0..1800 {
            if state.phase() == 0 {
                break;
            }
            if i > 0 && i % 300 == 0 {
                log::info!("仍在等待录制收尾（已 {}s）…", i / 20);
            }
            tokio::time::sleep(std::time::Duration::from_millis(50)).await;
        }
        if state.phase() != 0 {
            if state.phase() != 3 {
                // 渲染层没接住退出广播（事件丢失/页面已崩），还在录/暂停 → 原生兜底：
                // 结束采集段并丢弃临时产物，别把几百 MB 段文件留在 %TEMP%
                log::warn!("录制收尾等待超时（90s）且渲染层无响应，走原生兜底收尾");
                modules::recording::discard_active_session().await;
            } else {
                // phase=3：ffmpeg 合成在跑，不能碰它的输入文件；退出后残留
                // 由下次启动的 2h 时限清扫兜底
                log::warn!("录制合成等待超时（90s），直接退出");
            }
        } else {
            // phase 归零只代表 ffmpeg 合成结束：渲染层随后还要 getFileSize + addRecording
            // （invoke save_recordings 写历史）。等 save_recordings 真正落盘（时间戳前进）
            // 或最多 15s，否则这条录制成品不在历史列表里。
            let save_at_exit = modules::commands::files::last_recordings_save_ms();
            for i in 0..300 {
                let now = modules::commands::files::last_recordings_save_ms();
                if now > save_at_exit {
                    log::info!("退出前录制历史已落盘（等待 {}ms）", i * 50);
                    break;
                }
                tokio::time::sleep(std::time::Duration::from_millis(50)).await;
            }
        }
    }
    modules::agent::bridge::stop();
    modules::todo::scheduler::stop();
    // 手动转换（GIF/转码/合并）不在录制 phase 里，90s 等待逻辑管不到；app.exit 不级联
    // 子进程 —— 不在这里 kill 的话退出后 ffmpeg.exe 变孤儿继续吃 CPU
    let orphaned = modules::media::conversion_registry::kill_all_conversions();
    if orphaned > 0 {
        log::info!("退出清理：终止 {orphaned} 个仍在运行的 ffmpeg 转换进程");
    }
    // 贴屏便签：关窗前把当前位置落盘（下次贴屏恢复原位），顺便收窗
    modules::windows::todo_windows::close_all_sticky_notes(app);
    // 散热：同步恢复被限制的电源设置/风扇模式（对齐 cancelCooling）
    modules::cooling::Cooling::global().cancel(app);
    modules::windows::todo_windows::hide_cooling_overlay(app);
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
                // 走 show_main_window：统一 show + 重绘，加载期由 index.html 占位兜底
                modules::windows::show_main_window(&app);
            }
            // ai/todo/settings 走 open_or_focus：close_window 对这些窗口是**销毁**（close），
            // 不是隐藏 —— 只 get_webview_window+show 的话，关过一次后窗口已不存在，
            // 拿到 None 就静默返回，第二次点悬浮球「全部没反应」（实测）。
            // open_or_focus 会先 show 已存在的，销毁过则按预定义配置重建。
            "ai" => {
                modules::windows::open_or_focus(&app, "ai", "/ai");
            }
            "todo" => {
                modules::windows::open_or_focus(&app, "todo", "/todo");
            }
            "settings" => {
                modules::windows::open_or_focus(&app, "settings", "/settings");
            }
            other => {
                log::info!("Floating ball action → broadcast: {other}");
                let _ = app.emit("on-floating-ball-action", other);
            }
        }
        modules::windows::floating_ball::collapse_ball(&app);
    });

    let app_owned2 = app.clone();
    // 右键悬浮球 = 展开花瓣菜单 + **自动触发散热**（用户期望的交互：右键即散热，
    // 菜单同时绽放，花瓣逆时针旋转 = 散热动画本身）。散热已在进行中时只展开菜单
    // （面板会抖动提示防重入，不重置计时）。
    let app_menu = app.clone();
    app.listen("floating-ball-contextmenu".to_string(), move |_event| {
        log::info!("Floating ball right-click → expand menu + trigger cooling");
        modules::windows::floating_ball::expand_ball(&app_menu);
        modules::cooling::trigger_from_ball(&app_menu);
    });

    app.listen("floating-ball-badge-ready".to_string(), move |_event| {
        // 球页面就绪 → 补推真实角标。setup 里的 refresh_badge 跑在球窗口创建之前会被
        // 静默丢掉，之前这里是 P2 桩（永远推 0/false 隐藏），导致角标要等第一次数据
        // 变动才出现（实测）。
        modules::windows::todo_windows::refresh_badge(&app_owned2);
    });
}

/// 工具条/悬浮岛事件：
///   - `close` → 关对应窗口
///   - `island-action` 的其余动作 → 翻译成 `toolbar-action` 广播（主窗口 onToolbarAction
///     只监听 `toolbar-action`；island.html 发的是 `island-action` 这个名字，不翻译的话
///     全屏录制时点 开始/暂停/继续/停止/麦克风/摄像头 全部没反应）
///
/// ⚠️ `toolbar-action` 监听器里**绝不能**再 `emit("toolbar-action")`：
/// `AppHandle::emit` 是先投给所有 webview、再把事件回投给 **Rust 侧自己的监听器**
/// （tauri-2.11 `Manager::emit_filter` 的两步：emit_js_filter + listeners.emit_filter），
/// 于是同一个监听器被自己递归调用，每轮吃 2KB 栈，几秒内把 worker 栈耗尽 →
/// `thread 'tokio-rt-worker' has overflowed its stack` + 0xc00000fd 整进程崩溃
/// （实测点悬浮岛「开始录制」必崩；RUST_MIN_STACK 调多大都只是晚死几秒）。
/// 页面发的 `toolbar-action` 本身就已经广播到主窗口了，用不着中转。
fn setup_region_events(app: &tauri::AppHandle) {
    use tauri::{Emitter, Listener};

    let app_owned = app.clone();
    app.listen("toolbar-action".to_string(), move |event| {
        let action = event.payload().trim().trim_matches('"').to_string();
        log::info!("Toolbar action: {action}");
        if action == "close" {
            modules::windows::region::hide_region_border(app_owned.clone());
        }
        // 其余动作由页面自己广播（见上方 ⚠️）
    });

    let app_owned2 = app.clone();
    app.listen("island-action".to_string(), move |event| {
        let action = event.payload().trim().trim_matches('"').to_string();
        log::info!("Island action: {action}");
        if action == "close" {
            modules::windows::region::hide_floating_island(app_owned2.clone());
        } else {
            // 只换名字转发一次（island-action ≠ toolbar-action，不会自递归）
            let _ = app_owned2.emit("toolbar-action", action.as_str());
        }
    });
}

/// 贴屏便签动作：unpin → 取消贴屏（P3 接 todo 数据层）；open → 拉起待办窗口
fn setup_todo_events(app: &tauri::AppHandle) {
    use tauri::Listener;

    let app_owned = app.clone();
    app.listen("todo-sticky-unpin".to_string(), move |event| {
        let id = event.payload().trim().trim_matches('"').to_string();
        log::info!("Sticky unpin event: {id}");
        modules::windows::todo_windows::on_sticky_unpin(&app_owned, &id);
    });

    let app_owned2 = app.clone();
    app.listen("todo-sticky-open".to_string(), move |event| {
        let id = event.payload().trim().trim_matches('"').to_string();
        log::info!("Sticky open event: {id}");
        modules::windows::todo_windows::on_sticky_open(&app_owned2, &id);
    });

    let app_owned6 = app.clone();
    app.listen("todo-sticky-done".to_string(), move |event| {
        let id = event.payload().trim().trim_matches('"').to_string();
        log::info!("Sticky done event: {id}");
        modules::windows::todo_windows::on_sticky_done(&app_owned6, &id);
    });

    let app_owned3 = app.clone();
    app.listen("todo-reminder-close".to_string(), move |_event| {
        modules::windows::todo_windows::hide_todo_reminder(&app_owned3);
    });

    let app_owned4 = app.clone();
    app.listen("todo-reminder-open".to_string(), move |_event| {
        log::info!("Reminder open → 清队列 + 拉起待办窗口");
        modules::windows::todo_windows::clear_todo_reminder_queue(&app_owned4);
        // todo 窗口按需创建：提醒打开时窗口可能从未开过
        modules::windows::open_or_focus(&app_owned4, "todo", "/todo");
    });

    // 便签板页面就绪：补推一次 pinned 列表。建窗后立即 eval 会被尚未加载完的页面
    // 静默吞掉（`if (window.renderNotes)` 为假），启动时已贴屏的数据只能靠这里补上
    let app_owned5 = app.clone();
    app.listen("todo-sticky-ready".to_string(), move |_event| {
        modules::windows::todo_windows::sync_sticky_from_store(&app_owned5);
    });
}

fn register_global_shortcuts(app: &tauri::AppHandle) {
    use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

    let r1 = app
        .global_shortcut()
        .on_shortcut("Ctrl+Shift+R", |app, _shortcut, event| {
            if event.state == ShortcutState::Pressed {
                log::info!("Global shortcut: startStop");
                let _ = tauri::Emitter::emit(app, "on-global-shortcut", "startStop");
            }
        });
    let r2 = app
        .global_shortcut()
        .on_shortcut("Ctrl+Shift+P", |app, _shortcut, event| {
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
async fn agent_get_status() -> serde_json::Value {
    // 缓存过期时同步起 tasklist 子进程 + 读 hooks settings.json，都是阻塞 IO——
    // 原来在主线程命令里跑，UI 线程被卡几十~几百 ms；丢阻塞线程池
    tokio::task::spawn_blocking(modules::agent::bridge::get_status)
        .await
        .unwrap_or(serde_json::Value::Null)
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
    match modules::media::ffmpeg::convert_to_gif(
        &app,
        &inputPath,
        &outputPath,
        width,
        fps,
        duration,
    )
    .await
    {
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
    v.as_ref()
        .and_then(|o| o.get("width"))
        .and_then(|w| w.as_u64())
        .unwrap_or(480) as u32
}

fn options_fps(v: &Option<serde_json::Value>) -> u32 {
    v.as_ref()
        .and_then(|o| o.get("fps"))
        .and_then(|f| f.as_u64())
        .unwrap_or(10) as u32
}

fn options_duration(v: &Option<serde_json::Value>) -> Option<f64> {
    v.as_ref()
        .and_then(|o| o.get("duration"))
        .and_then(|d| d.as_f64())
}

#[cfg(test)]
mod tray_icon_tests {
    /// 托盘图标必须能从嵌入字节解码：之前走相对路径 from_path，cwd 不是项目根时
    /// 静默失败、托盘落空白图标（实测）。换成 include_bytes 后用本测试锁住：
    /// 换图标文件 / 动了 image feature 时立刻发现，而不是运行时看托盘才发现。
    #[test]
    fn tray_icon_bytes_decode() {
        let icon = tauri::image::Image::from_bytes(include_bytes!("../../public/logo.ico"))
            .expect("logo.ico 必须能解码（image-ico feature）");
        assert!(icon.width() > 0 && icon.height() > 0);
    }
}
