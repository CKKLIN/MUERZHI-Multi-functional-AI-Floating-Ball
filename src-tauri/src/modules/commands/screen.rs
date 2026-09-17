// 屏幕信息 — 对齐 electron/main/ipc-handlers.ts L205-264
// ⚠️ 语义对齐：get_screen_bounds 返回 DIP（物理/缩放比，Math.round）；
//    get_all_displays 的 bounds 保持物理像素（Electron 版如此，渲染层按此消费）
// 多屏 sourceId 缩略图：Electron 用 desktopCapturer，Tauri 无对应——P4 capture 阶段
// 补真实缩略图，当前返回空串（渲染层 ScreenSelector 显示占位，不崩）。

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

fn dip_bounds(phys: &tauri::PhysicalPosition<i32>, phys_size: &tauri::PhysicalSize<u32>, scale: f64) -> Bounds {
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
        _ => Bounds { x: 0, y: 0, width: 0, height: 0 },
    }
}

#[tauri::command]
pub fn get_all_displays(app: AppHandle) -> Vec<DisplayInfo> {
    let mut displays = Vec::new();
    let Ok(monitors) = app.available_monitors() else {
        return displays;
    };
    let primary_name: Option<String> = app
        .primary_monitor()
        .ok()
        .flatten()
        .and_then(|m| m.name().map(|s| s.to_string()));
    for (i, m) in monitors.iter().enumerate() {
        let scale = m.scale_factor();
        let monitor_name = m.name().cloned().unwrap_or_default();
        let is_primary = primary_name.as_deref() == Some(monitor_name.as_str());
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
            source_id: None,        // P4 capture 阶段接 WGC 后填
            source_name: monitor_name,
            thumbnail: String::new(), // P4 补 340x200 缩略图
        });
    }
    displays
}
