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
    // 启动后首次调用时按悬浮球设置对齐 locale（Electron 版在 ready 时同步）
    let settings = crate::modules::settings::BallSettings::load(&app);
    let i18n = I18n::global();
    i18n.set_locale(crate::modules::i18n::Locale::from_str_lossy(&settings.locale));
    i18n.bundle()
}
