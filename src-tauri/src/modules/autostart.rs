// 开机自启 — 对齐 electron app.setLoginItemSettings({ openAtLogin })
// tauri-plugin-autostart 的 enable/disable 即注册/注销注册表 Run 项（Windows）

use tauri::AppHandle;
use tauri_plugin_autostart::ManagerExt;

/// 把系统自启状态对齐到指定值；失败仅记日志（Electron 版同样容忍失败）
pub fn sync(app: &AppHandle, open_at_login: bool) {
    let autostart = app.autolaunch();
    // disable 一个未注册的条目会报"文件不存在"（os error 2），先查当前状态再动
    let currently = autostart.is_enabled().unwrap_or(false);
    if currently == open_at_login {
        return;
    }
    let result = if open_at_login {
        autostart.enable()
    } else {
        autostart.disable()
    };
    if let Err(e) = result {
        log::warn!("Sync openAtLogin({open_at_login}) failed: {e}");
    } else {
        log::info!("openAtLogin synced to {open_at_login}");
    }
}
