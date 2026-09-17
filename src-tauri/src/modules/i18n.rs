// 全应用双语 i18n 层 — Rust 版（对齐 electron/main/i18n.ts）
// 词条表从 TS 版一次性导出为 JSON（scripts/export-i18n.mjs），include_str! 编译期嵌入。
// 切换持久化在 floating-ball-settings.json 的 locale 字段（settings.rs 为真相源）。

use serde::Serialize;
use std::collections::HashMap;
use std::sync::RwLock;

const ZH_JSON: &str = include_str!("../i18n/zh.json");
const EN_JSON: &str = include_str!("../i18n/en.json");

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Locale {
    Zh,
    En,
}

impl Locale {
    pub fn from_str_lossy(v: &str) -> Self {
        if v.eq_ignore_ascii_case("en") { Locale::En } else { Locale::Zh }
    }
}

fn parse_bundle(json: &str) -> HashMap<String, String> {
    serde_json::from_str(json).expect("i18n bundle JSON 嵌入损坏")
}

pub struct I18n {
    current: RwLock<Locale>,
    zh: HashMap<String, String>,
    en: HashMap<String, String>,
}

impl I18n {
    fn new() -> Self {
        Self {
            current: RwLock::new(Locale::Zh),
            zh: parse_bundle(ZH_JSON),
            en: parse_bundle(EN_JSON),
        }
    }

    pub fn global() -> &'static I18n {
        static I18N: std::sync::OnceLock<I18n> = std::sync::OnceLock::new();
        I18N.get_or_init(I18n::new)
    }

    pub fn set_locale(&self, locale: Locale) {
        *self.current.write().unwrap() = locale;
    }

    pub fn locale(&self) -> Locale {
        *self.current.read().unwrap()
    }

    /// t(key)：按当前语言取词条，缺失时回退另一语言，再缺失返回 key 本身
    #[allow(dead_code)] // P2 内联窗口迁移后启用
    pub fn t(&self, key: &str) -> String {
        self.t_with(key, &[])
    }

    /// t(key, params)：{name} 占位替换
    #[allow(dead_code)]
    pub fn t_with(&self, key: &str, params: &[(&str, &str)]) -> String {
        let current = self.locale();
        let (primary, fallback) = if current == Locale::Zh {
            (&self.zh, &self.en)
        } else {
            (&self.en, &self.zh)
        };
        let raw = primary
            .get(key)
            .or_else(|| fallback.get(key))
            .cloned()
            .unwrap_or_else(|| key.to_string());
        if params.is_empty() {
            raw
        } else {
            let mut s = raw;
            for (k, v) in params {
                s = s.replace(&format!("{{{k}}}"), v);
            }
            s
        }
    }

    /// 渲染层 bundle 下发（对齐 getAppI18nBundle）
    pub fn bundle(&self) -> I18nBundle {
        let locale = self.locale();
        let messages = if locale == Locale::En { &self.en } else { &self.zh };
        I18nBundle {
            locale: if locale == Locale::En { "en" } else { "zh" }.to_string(),
            messages: messages.clone(),
        }
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct I18nBundle {
    pub locale: String,
    pub messages: HashMap<String, String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn bundles_have_identical_keys() {
        let i18n = I18n::new();
        let zh_keys: std::collections::HashSet<_> = i18n.zh.keys().collect();
        let en_keys: std::collections::HashSet<_> = i18n.en.keys().collect();
        assert_eq!(zh_keys, en_keys, "zh/en 词条 key 必须一一对应");
        assert!(zh_keys.len() > 200, "词条数量异常: {}", zh_keys.len());
    }

    #[test]
    fn placeholder_substitution() {
        let i18n = I18n::new();
        i18n.set_locale(Locale::Zh);
        assert_eq!(
            i18n.t_with("ball.cooling.done", &[("before", "80"), ("after", "65")]),
            "散热完成 80°C → 65°C"
        );
    }
}
