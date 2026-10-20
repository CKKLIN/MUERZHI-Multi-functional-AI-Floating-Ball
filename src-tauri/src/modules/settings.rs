// 悬浮球/应用级设置持久化 — 对齐 electron/main/floating-ball.ts L94-154
// 文件路径策略：dev 放项目根（与旧 Electron dev 轨道同一位置，历史数据天然连续），
// 打包放 %APPDATA%\com.muerzhi.aiball（identifier 建目录，与 Electron 的
// productName 目录 %APPDATA%\MUERZHI 不同 —— 首次升级时由 migrate_electron_data_once 一次性搬迁）。

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
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

/// 一次性把旧 Electron 版数据（%APPDATA%\MUERZHI）迁到 Tauri 版数据目录。
///
/// 背景：Electron 按 productName 建 userData（MUERZHI），Tauri 按 identifier 建
/// （com.muerzhi.aiball）—— 不搬迁的话升级安装后待办/设置「全丢」（实测旧目录
/// 46KB 待办 vs 新目录 462B 空壳）。只在 prod 执行：dev 的 settings_dir 就是
/// 项目根，旧 Electron dev 也写这里，两边本就同一份数据。
///
/// 规则：
/// - 目标已存在的文件一律不覆盖（新版可能已产生更新数据）；
/// - todo-notes.json 特殊处理：两边都有数据时按 items[].id 合并，补入旧版独有条目；
/// - 标记文件 .migrated-from-electron 保证只跑一次（否则用户删掉的旧待办每次启动
///   都会从源文件被合并回来）；
/// - settings.json / ai-cache.json / pending-reports.json 是 Electron 时代遗留，
///   新版不读取，不迁。
pub fn migrate_electron_data_once(app: &AppHandle) {
    if cfg!(debug_assertions) {
        return;
    }
    let dest = settings_dir(app);
    let marker = dest.join(".migrated-from-electron");
    if marker.exists() {
        return;
    }
    let Some(appdata) = std::env::var_os("APPDATA") else {
        return;
    };
    let src = PathBuf::from(appdata).join("MUERZHI");
    if let Err(e) = fs::create_dir_all(&dest) {
        log::warn!("migrate: create dest failed: {e}");
        return;
    }
    if !src.is_dir() {
        // 没有旧数据（全新用户）也落标记，避免每次启动空跑一轮探测
        let _ = fs::write(&marker, b"");
        return;
    }
    let mut migrated = 0u32;
    const FILES: &[&str] = &[
        "floating-ball-settings.json",
        "floating-ball-pos.json",
        "ai-island-settings.json",
        "ai-island-pos.json",
        "agent-settings.json",
        "cooling-capability.json",
        "todo-settings.json",
        "recordings.json",
    ];
    for name in FILES {
        let (s, d) = (src.join(name), dest.join(name));
        if s.is_file() && !d.exists() && fs::copy(&s, &d).is_ok() {
            migrated += 1;
        }
    }
    if merge_todo_notes(&src.join("todo-notes.json"), &dest.join("todo-notes.json")) {
        migrated += 1;
    }
    let _ = fs::write(&marker, b"");
    if migrated > 0 {
        log::info!("Electron 数据迁移：{migrated} 项写入 {}", dest.display());
    }
}

/// 旧待办并入新版：dest 缺失 → 直接拷贝；dest 存在 → 按 items[].id 去重追加旧版
/// 独有条目（新版为基准，不删不改已有条目）。返回 dest 是否被改动。
fn merge_todo_notes(src: &Path, dest: &Path) -> bool {
    let Ok(src_text) = fs::read_to_string(src) else {
        return false;
    };
    if !dest.exists() {
        return fs::copy(src, dest).is_ok();
    }
    let Ok(dest_text) = fs::read_to_string(dest) else {
        return false;
    };
    let (Ok(mut src_v), Ok(mut dest_v)) = (
        serde_json::from_str::<serde_json::Value>(&src_text),
        serde_json::from_str::<serde_json::Value>(&dest_text),
    ) else {
        // 任一侧解析失败不动数据（宁可不迁也不写坏）
        return false;
    };
    let (Some(src_items), Some(dest_items)) = (
        src_v.get_mut("items").and_then(|v| v.as_array()),
        dest_v.get_mut("items").and_then(|v| v.as_array_mut()),
    ) else {
        return false;
    };
    let existing: std::collections::HashSet<String> = dest_items
        .iter()
        .filter_map(|it| it.get("id").and_then(|i| i.as_str()))
        .map(str::to_owned)
        .collect();
    let mut added = 0u32;
    for item in src_items.iter() {
        let Some(id) = item.get("id").and_then(|i| i.as_str()) else {
            continue;
        };
        if !existing.contains(id) {
            dest_items.push(item.clone());
            added += 1;
        }
    }
    if added == 0 {
        return false;
    }
    match serde_json::to_string_pretty(&dest_v) {
        Ok(text) => fs::write(dest, text).is_ok(),
        Err(_) => false,
    }
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
        let menu_items = MENU_KEYS.iter().map(|k| (k.to_string(), true)).collect();
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
        assert_eq!(
            next.menu_items.get("ai"),
            Some(&true),
            "未提及的 key 保持原值"
        );
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

    /// 迁移合并：目标缺失直接拷；目标存在按 id 去重追加，已有条目不被改动
    #[test]
    fn merge_todo_notes_dedupes_by_id() {
        let dir = std::env::temp_dir().join(format!("muerzhi_mig_test_{}", std::process::id()));
        let _ = fs::create_dir_all(&dir);
        let src = dir.join("src.json");
        let dest = dir.join("dest.json");

        // dest 缺失 → 直接拷贝
        fs::write(&src, r#"{"items":[{"id":"a","title":"旧"}]}"#).unwrap();
        let _ = fs::remove_file(&dest);
        assert!(merge_todo_notes(&src, &dest));
        assert_eq!(fs::read_to_string(&dest).unwrap(), r#"{"items":[{"id":"a","title":"旧"}]}"#);

        // dest 存在 → 只追加 src 独有的 id（b），已有 a 不重复、dest 的 c 保留
        fs::write(&src, r#"{"items":[{"id":"a","title":"旧"},{"id":"b","title":"补"}]}"#).unwrap();
        fs::write(&dest, r#"{"items":[{"id":"a","title":"新"},{"id":"c","title":"新独有"}]}"#).unwrap();
        assert!(merge_todo_notes(&src, &dest));
        let merged: serde_json::Value = serde_json::from_str(&fs::read_to_string(&dest).unwrap()).unwrap();
        let ids: Vec<&str> = merged["items"]
            .as_array()
            .unwrap()
            .iter()
            .map(|i| i["id"].as_str().unwrap())
            .collect();
        assert_eq!(ids, vec!["a", "c", "b"]);
        assert_eq!(merged["items"][0]["title"], "新", "已有条目以 dest 为准");

        // src 无新增 → 不改动（返回 false）
        fs::write(&src, r#"{"items":[{"id":"a","title":"旧"}]}"#).unwrap();
        assert!(!merge_todo_notes(&src, &dest));

        // 任一侧 JSON 损坏 → 不动数据
        fs::write(&src, "not json").unwrap();
        assert!(!merge_todo_notes(&src, &dest));

        let _ = fs::remove_dir_all(&dir);
    }
}
