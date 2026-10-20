// 功耗杠杆 — 移植 cooling.ts 的 powercfg 路径
// 查活动计划 → 读 PROCTHROTTLEMAX 原值 → 设 AC/DC 为 50% → setactive；
// 恢复时写回原值，仅当仍是同一活动计划才 setactive（避免打扰用户切计划）。

use crate::modules::cooling::ps;
use crate::modules::cooling::{CoolingStateFile, COOLING_THROTTLE_PCT};

const PS_TIMEOUT: u64 = 6000;
const POWERCFG_TIMEOUT: u64 = 4000;

/// 解析活动电源计划 GUID（小写）
pub fn parse_active_scheme(stdout: &str) -> Option<String> {
    // 形如 "Power Scheme GUID: 381b4222-f694-41f0-9685-ff5bb260df2e  (Balanced)"
    let bytes = stdout.as_bytes();
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i].is_ascii_hexdigit() {
            // 尝试匹配 8-4-4-4-12
            let rest = &stdout[i..];
            if rest.len() >= 36 {
                let candidate = &rest[..36];
                if is_guid(candidate) {
                    return Some(candidate.to_ascii_lowercase());
                }
            }
        }
        i += 1;
    }
    None
}

fn is_guid(s: &str) -> bool {
    let parts: Vec<&str> = s.split('-').collect();
    if parts.len() != 5 {
        return false;
    }
    let lens = [8, 4, 4, 4, 12];
    parts
        .iter()
        .zip(lens.iter())
        .all(|(p, l)| p.len() == *l && p.chars().all(|c| c.is_ascii_hexdigit()))
}

/// 解析 PROCTHROTTLEMAX 的 AC/DC 原值（对齐 parseThrottleMax）
pub fn parse_throttle_max(stdout: &str) -> Option<(u32, Option<u32>)> {
    // 优先关键字匹配：包含 AC/交流 的行里的 0x 值
    let mut ac: Option<u32> = None;
    let mut dc: Option<u32> = None;
    for line in stdout.lines() {
        let lower = line.to_lowercase();
        if let Some(hex) = extract_last_hex(line) {
            if lower.contains("ac") || line.contains("交流") {
                if ac.is_none() {
                    ac = Some(hex);
                }
            } else if lower.contains("dc") || line.contains("直流") {
                if dc.is_none() {
                    dc = Some(hex);
                }
            }
        }
    }
    if ac.is_some() {
        return ac.map(|a| (a, dc));
    }
    // 兜底：取最后两个以 0x 结尾行的值（倒数第二 = AC，最后 = DC）
    let hexes: Vec<u32> = stdout.lines().filter_map(extract_last_hex).collect();
    if hexes.len() >= 2 {
        let n = hexes.len();
        return Some((hexes[n - 2], Some(hexes[n - 1])));
    }
    None
}

fn extract_last_hex(line: &str) -> Option<u32> {
    let trimmed = line.trim_end();
    let idx = trimmed.rfind("0x")?;
    let hex = &trimmed[idx + 2..];
    let digits: String = hex.chars().take_while(|c| c.is_ascii_hexdigit()).collect();
    if digits.is_empty() {
        return None;
    }
    u32::from_str_radix(&digits, 16).ok()
}

/// 应用功耗限制（返回待恢复的原值；失败返回 None）
pub async fn apply_power_lever() -> Option<CoolingStateFile> {
    let out = ps::run_powercfg(&["/getactivescheme"], POWERCFG_TIMEOUT).await?;
    let scheme = parse_active_scheme(&out)?;
    let q = ps::run_powercfg(
        &["/q", &scheme, "SUB_PROCESSOR", "PROCTHROTTLEMAX"],
        POWERCFG_TIMEOUT,
    )
    .await?;
    let (ac_orig, dc_orig) = parse_throttle_max(&q)?;
    log::info!("cooling: active scheme {scheme}, throttle ac={ac_orig} dc={dc_orig:?}");

    let pct = COOLING_THROTTLE_PCT.to_string();
    ps::run_powercfg(
        &[
            "/setacvalueindex",
            &scheme,
            "SUB_PROCESSOR",
            "PROCTHROTTLEMAX",
            &pct,
        ],
        POWERCFG_TIMEOUT,
    )
    .await?;
    // DC 尽力而为（笔记本电池场景）
    let _ = ps::run_powercfg(
        &[
            "/setdcvalueindex",
            &scheme,
            "SUB_PROCESSOR",
            "PROCTHROTTLEMAX",
            &pct,
        ],
        POWERCFG_TIMEOUT,
    )
    .await;
    ps::run_powercfg(&["/setactive", &scheme], POWERCFG_TIMEOUT).await?;
    log::info!("cooling: power lever applied ({COOLING_THROTTLE_PCT}%)");

    Some(CoolingStateFile {
        scheme_guid: scheme,
        ac_orig,
        dc_orig,
        fan_vendor: None,
        fan_orig_mode: None,
        started_at: crate::modules::todo::store::now_ms(),
    })
}

/// 恢复功耗设置（异步，对齐 restorePowerLeverInternal）
pub async fn restore_power_lever(st: &CoolingStateFile) {
    if st.scheme_guid.is_empty() {
        return;
    }
    restore_power_lever_impl(st, false).await;
}

/// 同步恢复（退出/取消路径）
pub fn restore_power_lever_sync(st: &CoolingStateFile) {
    if st.scheme_guid.is_empty() {
        return;
    }
    let ac = st.ac_orig.to_string();
    ps::run_powercfg_sync(
        &[
            "/setacvalueindex",
            &st.scheme_guid,
            "SUB_PROCESSOR",
            "PROCTHROTTLEMAX",
            &ac,
        ],
        3000,
    );
    if let Some(dc) = st.dc_orig {
        let dc_s = dc.to_string();
        ps::run_powercfg_sync(
            &[
                "/setdcvalueindex",
                &st.scheme_guid,
                "SUB_PROCESSOR",
                "PROCTHROTTLEMAX",
                &dc_s,
            ],
            3000,
        );
    }
    // 仅当仍是同一活动计划才 setactive（避免打扰用户切换后的计划）
    if active_scheme_sync().as_deref() == Some(st.scheme_guid.as_str()) {
        ps::run_powercfg_sync(&["/setactive", &st.scheme_guid], 3000);
    }
    log::info!("cooling: power settings restored (ac={})", st.ac_orig);
}

async fn restore_power_lever_impl(st: &CoolingStateFile, _sync: bool) {
    let ac = st.ac_orig.to_string();
    ps::run_powercfg(
        &[
            "/setacvalueindex",
            &st.scheme_guid,
            "SUB_PROCESSOR",
            "PROCTHROTTLEMAX",
            &ac,
        ],
        3000,
    )
    .await;
    if let Some(dc) = st.dc_orig {
        let dc_s = dc.to_string();
        ps::run_powercfg(
            &[
                "/setdcvalueindex",
                &st.scheme_guid,
                "SUB_PROCESSOR",
                "PROCTHROTTLEMAX",
                &dc_s,
            ],
            3000,
        )
        .await;
    }
    if let Some(out) = ps::run_powercfg(&["/getactivescheme"], 3000).await {
        if parse_active_scheme(&out).as_deref() == Some(st.scheme_guid.as_str()) {
            ps::run_powercfg(&["/setactive", &st.scheme_guid], 3000).await;
        }
    }
    log::info!("cooling: power settings restored (ac={})", st.ac_orig);
}

fn active_scheme_sync() -> Option<String> {
    #[cfg(windows)]
    use std::os::windows::process::CommandExt;
    let mut cmd = std::process::Command::new("powercfg");
    cmd.arg("/getactivescheme");
    #[cfg(windows)]
    cmd.creation_flags(0x0800_0000);
    let out = cmd.output().ok()?;
    parse_active_scheme(&String::from_utf8_lossy(&out.stdout))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_active_scheme_guid() {
        let s = "Power Scheme GUID: 381b4222-f694-41f0-9685-ff5bb260df2e  (Balanced)";
        assert_eq!(
            parse_active_scheme(s).as_deref(),
            Some("381b4222-f694-41f0-9685-ff5bb260df2e")
        );
        assert_eq!(parse_active_scheme("no guid here"), None);
    }

    #[test]
    fn parses_throttle_max_by_keyword() {
        let stdout = "  Current AC Power Setting Index: 0x00000064\n  Current DC Power Setting Index: 0x00000064\n";
        assert_eq!(parse_throttle_max(stdout), Some((100, Some(100))));
    }

    #[test]
    fn parses_throttle_max_by_position_fallback() {
        // 无 AC/DC 关键字：取最后两个 0x 值（倒数第二 AC，最后 DC）
        let stdout = "line a 0x00000050\nline b 0x00000064\n";
        assert_eq!(parse_throttle_max(stdout), Some((80, Some(100))));
        // 只有一个值 → 无结果（无法区分 AC/DC）
        assert_eq!(parse_throttle_max("only 0x00000032\n"), None);
    }
}
