// P0 基础命令：版本号 + i18n bundle（渲染层 stores/i18n.ts 的 getAppI18n 数据源）
// P1 桥阶段在此文件旁扩展全量 IPC 命令

use crate::modules::i18n::{I18n, I18nBundle};
use tauri::AppHandle;

#[tauri::command]
pub fn get_app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[tauri::command]
pub fn get_app_i18n(app: AppHandle) -> I18nBundle {
    // locale 真源是悬浮球设置文件：每次调用都以文件为准对齐（Electron 版语义：
    // set-floating-ball-settings 时主动 set_locale 并广播，文件修改后调用也应跟随）
    let settings = crate::modules::settings::BallSettings::load(&app);
    let i18n = I18n::global();
    i18n.set_locale(crate::modules::i18n::Locale::from_str_lossy(&settings.locale));
    i18n.bundle()
}
