// 厂商风扇杠杆 — 移植 cooling.ts 的 Uniwill ECRAM / Lenovo WMI 路径
// 探测顺序 uniwill → lenovo → asus（asus 默认禁用）；能力结果缓存 7 天。
// Uniwill：P/Invoke CreateFile('\\.\ACPIDriver') + DeviceIoControl(0x9C40A488 读 / 0x9C40A48C 写)
//          读 0x751 → 置 bit6(0x40) → 写回 → 读回验证，失败即回滚。
// Lenovo：root/wmi LENOVO_GAMEZONE_DATA 的 Get/SetSmartFanMode，mode=2。

use crate::modules::cooling::ps;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;

const LENOVO_CLASS: &str = "LENOVO_GAMEZONE_DATA";
const LENOVO_FULL_MODE: i32 = 2;
const ASUS_LEVER_ENABLED: bool = false;
const UNIWILL_ECRAM_FAN_CTL: u32 = 0x751;
const UNIWILL_FAN_BOOST_BITS: u32 = 0x40;
const UNIWILL_PROBE_ADDR2: u32 = 0x75B;
const IOCTL_ECREAD: u32 = 0x9C40A488;
const IOCTL_ECWRITE: u32 = 0x9C40A48C;

/// 已应用的厂商风扇（恢复用）
static APPLIED_VENDOR: Mutex<Option<String>> = Mutex::new(None);

pub fn applied_vendor_name() -> Option<String> {
    APPLIED_VENDOR.lock().unwrap().clone()
}

pub fn applied_vendor_info() -> Option<(String, i32)> {
    let v = APPLIED_VENDOR.lock().unwrap().clone()?;
    let mode = *APPLIED_MODE.lock().unwrap();
    Some((v, mode.unwrap_or(LENOVO_FULL_MODE)))
}

static APPLIED_MODE: Mutex<Option<i32>> = Mutex::new(None);

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct Capability {
    pub uniwill: bool,
    pub lenovo: bool,
    pub asus: bool,
    #[serde(rename = "probedAt")]
    pub probed_at: i64,
}

/// Uniwill ECRAM 读写 PowerShell 前导（Add-Type P/Invoke）
fn uniwill_preamble() -> String {
    format!(
        r#"$ErrorActionPreference='Stop'
try {{
  Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public class UWC {{
  [DllImport("kernel32", SetLastError=true, CharSet=CharSet.Ansi)]
  public static extern IntPtr CreateFile(string n, uint a, uint s, IntPtr sa, uint d, uint f, IntPtr t);
  [DllImport("kernel32", SetLastError=true)]
  public static extern bool DeviceIoControl(IntPtr h, uint c, byte[] i, uint n, byte[] o, uint osz, out uint r, IntPtr ov);
}}
'@
}} catch {{}}
$dev='\\.\ACPIDriver'
$h=[UWC]::CreateFile($dev, 3221225472, 3, [IntPtr]::Zero, 3, 0, [IntPtr]::Zero)
if ($h -eq [IntPtr](-1) -or $h -eq [IntPtr]::Zero) {{ throw 'no UWACPIDriver device' }}
function UwR($reg) {{
  $ib=[BitConverter]::GetBytes([int]$reg); $ob=New-Object byte[] 4; $r=0
  [void][UWC]::DeviceIoControl($h, {read}, $ib, 4, $ob, 4, [ref]$r, [IntPtr]::Zero)
  return [BitConverter]::ToInt32($ob,0)
}}
function UwW($reg,$val) {{
  $ib=New-Object byte[] 8
  [BitConverter]::GetBytes([int]$reg).CopyTo($ib,0)
  [BitConverter]::GetBytes([int]$val).CopyTo($ib,4)
  $ob=New-Object byte[] 4; $r=0
  [void][UWC]::DeviceIoControl($h, {write}, $ib, 8, $ob, 4, [ref]$r, [IntPtr]::Zero)
  return [BitConverter]::ToInt32($ob,0)
}}
"#,
        read = IOCTL_ECREAD,
        write = IOCTL_ECWRITE,
    )
}

fn uniwill_probe_ps() -> String {
    format!(
        "{preamble}\n$a=UwR {a1}\n$b=UwR {a2}\nif ($a -lt 0 -or $a -gt 255 -or $b -lt 0 -or $b -gt 255) {{ throw 'bad ECRAM reading' }}\nWrite-Output 'OK'\n",
        preamble = uniwill_preamble(),
        a1 = UNIWILL_ECRAM_FAN_CTL,
        a2 = UNIWILL_PROBE_ADDR2,
    )
}

/// 应用 Uniwill 风扇 boost（读-改-写 + 读回验证 + 失败回滚）
fn uniwill_apply_ps() -> String {
    format!(
        "{preamble}\n$o=UwR {addr}\n$b=($o -bor {bits})\n[void](UwW {addr} $b)\n$n=UwR {addr}\nWrite-Output (\"ORIG=$o;BOOSTED=$b;NOW=$n\")\nif ($n -ne $b) {{ [void](UwW {addr} $o); throw 'uniwill verify failed' }}\n",
        preamble = uniwill_preamble(),
        addr = UNIWILL_ECRAM_FAN_CTL,
        bits = UNIWILL_FAN_BOOST_BITS,
    )
}

fn uniwill_restore_ps(orig: i32) -> String {
    format!(
        "{preamble}\n[void](UwW {addr} {orig})\n$n=UwR {addr}\nWrite-Output (\"NOW=$n\")\n",
        preamble = uniwill_preamble(),
        addr = UNIWILL_ECRAM_FAN_CTL,
        orig = orig,
    )
}

fn lenovo_probe_ps() -> String {
    format!(
        "$c=Get-CimClass -Namespace root/wmi -ClassName {LENOVO_CLASS}; ($c.CimClassMethods|%{{$_.Name}}) -join ','\n"
    )
}

fn lenovo_apply_ps() -> String {
    format!(
        r#"$obj=Get-CimInstance -Namespace root/wmi -ClassName {LENOVO_CLASS} | Select-Object -First 1
$o=Invoke-CimMethod -InputObject $obj -MethodName GetSmartFanMode
$orig=[int]$(if ($null -ne $o.Data) {{ $o.Data }} else {{ $o.mode }})
[void](Invoke-CimMethod -InputObject $obj -MethodName SetSmartFanMode -Arguments @{{ mode = {mode} }})
$n=Invoke-CimMethod -InputObject $obj -MethodName GetSmartFanMode
$now=[int]$(if ($null -ne $n.Data) {{ $n.Data }} else {{ $n.mode }})
Write-Output ("ORIG=$orig;NOW=$now")
"#,
        LENOVO_CLASS = LENOVO_CLASS,
        mode = LENOVO_FULL_MODE,
    )
}

fn lenovo_restore_ps(orig: i32) -> String {
    format!(
        "$obj=Get-CimInstance -Namespace root/wmi -ClassName {LENOVO_CLASS} | Select-Object -First 1\n[void](Invoke-CimMethod -InputObject $obj -MethodName SetSmartFanMode -Arguments @{{ mode = {orig} }})\n",
        LENOVO_CLASS = LENOVO_CLASS,
        orig = orig,
    )
}

fn asus_probe_ps() -> String {
    "Get-CimClass -Namespace root/wmi -ClassName AsusACPI | Out-Null; 'ok'\n".to_string()
}

fn capability_path(app: &tauri::AppHandle) -> std::path::PathBuf {
    crate::modules::settings::settings_file(app, "cooling-capability.json")
}

/// 读取/探测能力（带 7 天 TTL 缓存，对齐 ensureCapability）
pub async fn ensure_capability(app: &tauri::AppHandle) -> Capability {
    let path = capability_path(app);
    if let Ok(text) = std::fs::read_to_string(&path) {
        if let Ok(cap) = serde_json::from_str::<Capability>(&text) {
            let now = crate::modules::todo::store::now_ms();
            if cap.probed_at > 0 && now - cap.probed_at < crate::modules::cooling::CAPABILITY_TTL_MS
            {
                return cap;
            }
        }
    }
    let cap = probe_vendors().await;
    if let Ok(text) = serde_json::to_string(&cap) {
        let _ = std::fs::write(&path, text);
    }
    cap
}

/// 探测三厂商（串行，各自 8s 超时）
pub async fn probe_vendors() -> Capability {
    // 1) Uniwill
    let uniwill = match ps::run_powershell(&uniwill_probe_ps(), 8000).await {
        Some(out) => out.contains("OK"),
        None => false,
    };
    // 2) Lenovo
    let lenovo = match ps::run_powershell(&lenovo_probe_ps(), 8000).await {
        Some(out) => {
            let lower = out.to_lowercase();
            lower.contains("getsmartfanmode") && lower.contains("setsmartfanmode")
        }
        None => false,
    };
    // 3) Asus（默认禁用，仅探测记录）
    let asus = if ASUS_LEVER_ENABLED {
        ps::run_powershell(&asus_probe_ps(), 8000)
            .await
            .map(|o| o.contains("ok"))
            .unwrap_or(false)
    } else {
        false
    };
    log::info!("cooling capability: uniwill={uniwill} lenovo={lenovo} asus={asus}");
    Capability {
        uniwill,
        lenovo,
        asus,
        probed_at: crate::modules::todo::store::now_ms(),
    }
}

/// 应用厂商风扇（返回 (是否生效, 原值)）
pub async fn apply_vendor_lever(cap: &Capability) -> (bool, Option<i32>) {
    if cap.uniwill {
        match ps::run_powershell(&uniwill_apply_ps(), 6000).await {
            Some(out) => {
                if let Some((orig, now, boosted)) = parse_uniwill_out(&out) {
                    if now == boosted {
                        *APPLIED_VENDOR.lock().unwrap() = Some("uniwill".into());
                        *APPLIED_MODE.lock().unwrap() = Some(orig);
                        log::info!("cooling: uniwill fan boost applied (orig={orig} now={now})");
                        return (true, Some(orig));
                    }
                    // 读回不符：回滚
                    let _ = ps::run_powershell(&uniwill_restore_ps(orig), 6000).await;
                    log::warn!(
                        "cooling: uniwill verify failed (now={now} boosted={boosted})，已回滚"
                    );
                }
            }
            None => log::warn!("cooling: uniwill apply failed"),
        }
    }
    if cap.lenovo {
        match ps::run_powershell(&lenovo_apply_ps(), 6000).await {
            Some(out) => {
                if let Some((orig, now)) = parse_lenovo_out(&out) {
                    if now == LENOVO_FULL_MODE {
                        *APPLIED_VENDOR.lock().unwrap() = Some("lenovo".into());
                        *APPLIED_MODE.lock().unwrap() = Some(orig);
                        log::info!("cooling: lenovo smart fan mode applied (orig={orig})");
                        return (true, Some(orig));
                    }
                    restore_fan_mode("lenovo", orig).await;
                    log::warn!("cooling: lenovo verify failed (now={now})，已回滚");
                }
            }
            None => log::warn!("cooling: lenovo apply failed"),
        }
    }
    (false, None)
}

/// 恢复厂商风扇（按 state 文件记录）
pub async fn restore_vendor_lever(st: &crate::modules::cooling::CoolingStateFile) {
    if let (Some(vendor), Some(orig)) = (st.fan_vendor.as_deref(), st.fan_orig_mode) {
        restore_fan_mode(vendor, orig).await;
        *APPLIED_VENDOR.lock().unwrap() = None;
        *APPLIED_MODE.lock().unwrap() = None;
    }
}

pub async fn restore_fan_mode(vendor: &str, orig: i32) {
    match vendor {
        "uniwill" => {
            if let Some(out) = ps::run_powershell(&uniwill_restore_ps(orig), 6000).await {
                if let Some(now) = parse_back_now(&out) {
                    log::info!("cooling: uniwill fan restored (now={now}, orig={orig})");
                }
            }
        }
        "lenovo" => {
            let _ = ps::run_powershell(&lenovo_restore_ps(orig), 6000).await;
            log::info!("cooling: lenovo fan mode restored to {orig}");
        }
        _ => {}
    }
}

/// 同步恢复（退出/取消）
pub fn restore_vendor_lever_sync(st: &crate::modules::cooling::CoolingStateFile) {
    if let (Some(vendor), Some(orig)) = (st.fan_vendor.as_deref(), st.fan_orig_mode) {
        let script = match vendor {
            "uniwill" => uniwill_restore_ps(orig),
            "lenovo" => lenovo_restore_ps(orig),
            _ => return,
        };
        let _ = ps::run_powershell_sync(&script, 3000);
        *APPLIED_VENDOR.lock().unwrap() = None;
        *APPLIED_MODE.lock().unwrap() = None;
        log::info!("cooling: vendor fan restored sync ({vendor} → {orig})");
    }
}

/// 解析 "ORIG=n;BOOSTED=n;NOW=n"
pub fn parse_uniwill_out(s: &str) -> Option<(i32, i32, i32)> {
    let orig = extract_kv(s, "ORIG=")?;
    let boosted = extract_kv(s, "BOOSTED=")?;
    let now = extract_kv(s, "NOW=")?;
    Some((orig, boosted, now))
}

/// 解析 "ORIG=n;NOW=n"（Lenovo，ORIG 可为负）
pub fn parse_lenovo_out(s: &str) -> Option<(i32, i32)> {
    Some((extract_kv(s, "ORIG=")?, extract_kv(s, "NOW=")?))
}

fn parse_back_now(s: &str) -> Option<i32> {
    extract_kv(s, "NOW=")
}

fn extract_kv(s: &str, key: &str) -> Option<i32> {
    let idx = s.find(key)?;
    let rest = &s[idx + key.len()..];
    let digits: String = rest
        .chars()
        .take_while(|c| c.is_ascii_digit() || *c == '-')
        .collect();
    digits.parse().ok()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_uniwill_output() {
        assert_eq!(
            parse_uniwill_out("ORIG=17;BOOSTED=81;NOW=81"),
            Some((17, 81, 81))
        );
        assert_eq!(parse_uniwill_out("garbage"), None);
    }

    #[test]
    fn parses_lenovo_output_including_negative() {
        assert_eq!(parse_lenovo_out("ORIG=0;NOW=2"), Some((0, 2)));
        assert_eq!(parse_lenovo_out("ORIG=-1;NOW=2"), Some((-1, 2)));
    }

    #[test]
    fn preamble_contains_required_device_and_ioctls() {
        let p = uniwill_preamble();
        assert!(p.contains(r"\\.\ACPIDriver"));
        assert!(p.contains("3221225472"));
        assert!(p.contains(&format!("{IOCTL_ECREAD}")) || p.contains(&IOCTL_ECREAD.to_string()));
        assert!(p.contains(&IOCTL_ECWRITE.to_string()));
    }
}
