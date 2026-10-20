// 屏幕信息 — 对齐 electron/main/ipc-handlers.ts L205-264 + desktopCapturer.getSources
// ⚠️ 语义对齐：get_screen_bounds 返回 DIP（物理/缩放比，Math.round）；
//    get_all_displays 的 bounds 保持物理像素（Electron 版如此，渲染层按此消费）
//
// P4 补全：缩略图不再留空 —— 经 DXGI 复制抓一帧（recording/grab.rs）编码 PNG 转 data URL。
// sourceId 语义：Electron 是 desktopCapturer 的源 id（渲染层拿它调 getUserMedia）；
// 本工程采集在 Rust 侧按显示器下标寻址，故 sourceId 统一为 `screen:{下标}`，
// 渲染层只是把它当不透明标识传递（store.selectedSource.id），不解析。

use serde::Serialize;
use tauri::AppHandle;

#[derive(Serialize)]
pub struct Bounds {
    pub x: i32,
    pub y: i32,
    pub width: i32,
    pub height: i32,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DisplayInfo {
    pub id: u32,
    pub label: String,
    pub bounds: Bounds,
    pub scale_factor: f64,
    pub size: Bounds,
    pub is_primary: bool,
    pub source_id: Option<String>,
    pub source_name: String,
    pub thumbnail: String,
}

/// 缩略图长边（对齐 Electron getSources 的 340×200 档：够看清是哪块屏又不拖慢列表）
const THUMB_W: u32 = 340;
const THUMB_H: u32 = 200;

fn dip_bounds(
    phys: &tauri::PhysicalPosition<i32>,
    phys_size: &tauri::PhysicalSize<u32>,
    scale: f64,
) -> Bounds {
    Bounds {
        x: (phys.x as f64 / scale).round() as i32,
        y: (phys.y as f64 / scale).round() as i32,
        width: (phys_size.width as f64 / scale).round() as i32,
        height: (phys_size.height as f64 / scale).round() as i32,
    }
}

#[tauri::command]
pub fn get_screen_scale_factor(app: AppHandle) -> f64 {
    app.primary_monitor()
        .ok()
        .flatten()
        .map(|m| m.scale_factor())
        .unwrap_or(1.0)
}

#[tauri::command]
pub fn get_screen_bounds(app: AppHandle) -> Bounds {
    // 对齐 Electron getPrimaryDisplay().bounds / scaleFactor → DIP
    match app.primary_monitor() {
        Ok(Some(m)) => dip_bounds(m.position(), m.size(), m.scale_factor()),
        _ => Bounds {
            x: 0,
            y: 0,
            width: 0,
            height: 0,
        },
    }
}

#[tauri::command]
pub async fn get_all_displays(app: AppHandle) -> Vec<DisplayInfo> {
    // 每屏一次 BitBlt 抓帧 + PNG 编码 + base64（高分辨率多屏时是秒级重活），
    // 丢进阻塞线程池，别卡住 async worker
    let app2 = app.clone();
    tokio::task::spawn_blocking(move || build_display_list(&app2))
        .await
        .unwrap_or_default()
}

fn build_display_list(app: &AppHandle) -> Vec<DisplayInfo> {
    let mut displays = Vec::new();
    let Ok(monitors) = app.available_monitors() else {
        return displays;
    };
    let primary_name: Option<String> = app
        .primary_monitor()
        .ok()
        .flatten()
        .and_then(|m| m.name().map(|s| s.to_string()));
    // 抓帧按 windows-capture 的显示器下标寻址，两套枚举顺序不保证一致 → 按设备名配对
    let wgc_names = crate::modules::recording::grab::monitor_device_names();
    for (i, m) in monitors.iter().enumerate() {
        let scale = m.scale_factor();
        let monitor_name = m.name().cloned().unwrap_or_default();
        let is_primary = primary_name.as_deref() == Some(monitor_name.as_str());
        let wgc_index = wgc_names
            .iter()
            .position(|n| n == &monitor_name)
            .unwrap_or(i);
        displays.push(DisplayInfo {
            id: i as u32,
            label: if is_primary {
                "主屏幕".to_string()
            } else {
                format!("屏幕 {}", i + 1)
            },
            // 物理像素 bounds（Electron 版 getAllDisplays 同语义）
            bounds: Bounds {
                x: m.position().x,
                y: m.position().y,
                width: m.size().width as i32,
                height: m.size().height as i32,
            },
            scale_factor: scale,
            size: Bounds {
                x: 0,
                y: 0,
                width: m.size().width as i32,
                height: m.size().height as i32,
            },
            is_primary,
            source_id: Some(format!("screen:{i}")),
            source_name: monitor_name,
            thumbnail: crate::modules::recording::grab::grab_data_url(wgc_index, THUMB_W, THUMB_H)
                .unwrap_or_default(),
        });
    }
    displays
}

/// 显示器源列表（对齐 Electron desktopCapturer.getSources({types:['screen']})）
///
/// 返回结构逐字段对齐 CaptureSource：id/name/display_id/appIcon/thumbnail。
/// appIcon 恒为 null —— 显示器源本来没有应用图标（Electron 对 screen 源同样返回空）。
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CaptureSource {
    pub id: String,
    pub name: String,
    pub display_id: String,
    pub app_icon: Option<String>,
    pub thumbnail: String,
}

#[tauri::command]
pub async fn get_sources(app: AppHandle, types: Option<Vec<String>>) -> Vec<CaptureSource> {
    // 同 get_all_displays：抓帧 + PNG 编码是秒级重活，丢阻塞线程池
    let want_screen = match &types {
        // 只支持 ['screen']（窗口捕获未实现）；显式排除时不返回任何源
        Some(t) => t.is_empty() || t.iter().any(|s| s == "screen"),
        None => true,
    };
    if !want_screen {
        return Vec::new();
    }
    tokio::task::spawn_blocking(move || build_capture_sources(&app))
        .await
        .unwrap_or_default()
}

fn build_capture_sources(app: &AppHandle) -> Vec<CaptureSource> {
    let Ok(monitors) = app.available_monitors() else {
        return Vec::new();
    };
    let primary_name = app
        .primary_monitor()
        .ok()
        .flatten()
        .and_then(|m| m.name().map(|s| s.to_string()));
    let wgc_names = crate::modules::recording::grab::monitor_device_names();
    let mut out = Vec::new();
    for (i, m) in monitors.iter().enumerate() {
        let monitor_name = m.name().cloned().unwrap_or_default();
        let is_primary = primary_name.as_deref() == Some(monitor_name.as_str());
        let wgc_index = wgc_names
            .iter()
            .position(|n| n == &monitor_name)
            .unwrap_or(i);
        out.push(CaptureSource {
            id: format!("screen:{i}"),
            name: if is_primary {
                "主屏幕".to_string()
            } else {
                format!("屏幕 {}", i + 1)
            },
            display_id: monitor_name,
            app_icon: None,
            thumbnail: crate::modules::recording::grab::grab_data_url(wgc_index, THUMB_W, THUMB_H)
                .unwrap_or_default(),
        });
    }
    out
}

/// 系统声音源列表（对齐 Electron getSystemAudioSources）
///
/// Electron 是 desktopCapturer 里的 loopback 源；这里返回 WASAPI 渲染设备的
/// endpoint id（id 直接喂给 recording_start 的 sysDeviceId）。
#[tauri::command]
pub fn get_system_audio_sources() -> Vec<serde_json::Value> {
    let (_mics, speakers) = crate::modules::recording::audio::list_devices();
    speakers
        .into_iter()
        .map(|(id, name)| serde_json::json!({ "id": id, "name": name }))
        .collect()
}

/// 音频输入设备列表（设置页麦克风下拉用）
///
/// 返回 WASAPI endpoint id —— 与渲染层 navigator.mediaDevices 的 deviceId **不通用**，
/// 故设置页必须改用它（旧值若是 WebView2 deviceId，录制时会落到默认设备兜底）。
#[tauri::command]
pub fn list_audio_devices() -> Vec<serde_json::Value> {
    let (mics, _speakers) = crate::modules::recording::audio::list_devices();
    mics.into_iter()
        .map(|(id, name)| serde_json::json!({ "deviceId": id, "label": name }))
        .collect()
}

// ===== 截图（对齐 Electron take-screenshot：存桌面 + 托盘气泡）=====

#[tauri::command]
pub async fn take_screenshot(app: tauri::AppHandle) -> serde_json::Value {
    use serde_json::json;
    log::info!("take_screenshot");
    let path = match crate::modules::recording::grab::screenshot_to_desktop(&app) {
        Ok(p) => p,
        Err(e) => {
            log::error!("截图失败: {e}");
            return json!({ "success": false, "error": e });
        }
    };
    log::info!("截图已落盘: {path}");
    let file_name = std::path::Path::new(&path)
        .file_name()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_default();
    crate::modules::commands::app_settings::balloon(
        "二支录制",
        &format!("截图已保存到桌面：{file_name}"),
    );
    json!({ "success": true, "filePath": path })
}
