// 悬浮球/应用级设置持久化 — 对齐 electron/main/floating-ball.ts L106-136
// 文件沿用 %APPDATA%/MUERZHI/floating-ball-settings.json，保证 Electron→Tauri 数据连续

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

pub const MENU_KEYS: [&str; 4] = ["record", "ai", "todo", "settings"];

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BallSettings {
    pub visible: bool,
    pub always_on_top: bool,
    pub open_at_login: bool,
    pub locale: String, // "zh" | "en"
    #[serde(default = "default_snap_gutter")]
    pub snap_gutter: f64,
    pub menu_items: HashMap<String, bool>,
}

fn default_snap_gutter() -> f64 {
    40.0
}

impl Default for BallSettings {
    fn default() -> Self {
        let menu_items = MENU_KEYS
            .iter()
            .map(|k| (k.to_string(), true))
            .collect();
        Self {
            visible: true,
            always_on_top: true,
            open_at_login: false,
            locale: "zh".into(),
            snap_gutter: default_snap_gutter(),
            menu_items,
        }
    }
}

impl BallSettings {
    pub fn path(app: &AppHandle) -> PathBuf {
        let dir = app
            .path()
            .app_data_dir()
            .unwrap_or_else(|_| PathBuf::from("."));
        dir.join("floating-ball-settings.json")
    }

    /// 读取设置；文件不存在/损坏时落默认值（与 TS 版 getBallSettings 行为一致）
    pub fn load(app: &AppHandle) -> Self {
        let path = Self::path(app);
        match fs::read_to_string(&path) {
            Ok(text) => serde_json::from_str(&text).unwrap_or_else(|e| {
                log::warn!("floating-ball-settings.json parse failed: {e}; using defaults");
                Self::default()
            }),
            Err(_) => {
                let defaults = Self::default();
                let _ = defaults.save(app);
                defaults
            }
        }
    }

    pub fn save(&self, app: &AppHandle) -> std::io::Result<()> {
        let path = Self::path(app);
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)?;
        }
        fs::write(&path, serde_json::to_string_pretty(self)?)?;
        Ok(())
    }
}
