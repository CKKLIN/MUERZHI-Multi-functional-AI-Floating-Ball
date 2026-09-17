// 悬浮球/应用级设置持久化 — 对齐 electron/main/floating-ball.ts L94-154
// 文件路径策略对齐 Electron：dev 放项目根，打包放 userData（Electron 版同规则），
// 保证同一台机器上 Electron 版与 Tauri 版共享同一份设置/待办/录制历史。

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

pub const MENU_KEYS: [&str; 4] = ["record", "ai", "todo", "settings"];

/// 设置文件目录：dev 态（cargo 调试运行）放项目根（src-tauri 的上级），
/// 打包态放 userData —— 与 Electron 版 dev/prod 分轨完全一致
pub fn settings_dir(app: &AppHandle) -> PathBuf {
    if cfg!(debug_assertions) {
        // src-tauri/target/debug/muerzhi.exe → 上四级 = 项目根（exe→debug→target→src-tauri→根）
        if let Ok(manifest) = std::env::current_exe() {
            if let Some(root) = manifest.ancestors().nth(4) {
                return root.to_path_buf();
            }
        }
    }
    app.path()
        .app_data_dir()
        .unwrap_or_else(|_| PathBuf::from("."))
}

pub fn settings_file(app: &AppHandle, name: &str) -> PathBuf {
    settings_dir(app).join(name)
}

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
        settings_file(app, "floating-ball-settings.json")
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

    /// 合并 patch（只接受有值字段），返回新对象；不落盘（落盘由调用方决定时机）
    pub fn merged_with(&self, patch: &serde_json::Value) -> Self {
        let mut next = self.clone();
        let map = match patch.as_object() {
            Some(m) => m,
            None => return next,
        };
        if let Some(v) = map.get("visible").and_then(|v| v.as_bool()) {
            next.visible = v;
        }
        if let Some(v) = map.get("alwaysOnTop").and_then(|v| v.as_bool()) {
            next.always_on_top = v;
        }
        if let Some(v) = map.get("openAtLogin").and_then(|v| v.as_bool()) {
            next.open_at_login = v;
        }
        if let Some(v) = map.get("locale").and_then(|v| v.as_str()) {
            next.locale = v.to_string();
        }
        if let Some(v) = map.get("snapGutter").and_then(|v| v.as_f64()) {
            // 对齐 Electron 校验：0-80
            next.snap_gutter = v.clamp(0.0, 80.0);
        }
        if let Some(items) = map.get("menuItems").and_then(|v| v.as_object()) {
            for key in MENU_KEYS {
                if let Some(v) = items.get(key).and_then(|v| v.as_bool()) {
                    next.menu_items.insert(key.to_string(), v);
                }
            }
        }
        next
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn merged_patch_partial_update() {
        let mut base = BallSettings::default();
        base.locale = "zh".into();
        let patch: serde_json::Value =
            serde_json::from_str(r#"{"locale":"en","menuItems":{"record":false}}"#).unwrap();
        let next = base.merged_with(&patch);
        assert_eq!(next.locale, "en");
        assert_eq!(next.menu_items.get("record"), Some(&false));
        assert_eq!(next.menu_items.get("ai"), Some(&true), "未提及的 key 保持原值");
        assert_eq!(next.visible, true, "patch 外字段不动");
        // 原对象不被修改
        assert_eq!(base.locale, "zh");
    }

    #[test]
    fn snap_gutter_clamped() {
        let base = BallSettings::default();
        let patch: serde_json::Value = serde_json::from_str(r#"{"snapGutter": 999}"#).unwrap();
        assert_eq!(base.merged_with(&patch).snap_gutter, 80.0);
    }
}
