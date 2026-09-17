// 温度与占用率采集 — 移植 cooling.ts 的 TEMP_ZONE_PS / TEMP_PERF_PS / USAGE_POLL_PS
// 温度：MSAcpi_ThermalZoneTemperature（0.1K）优先，降级 Win32_PerfFormattedData 三级单位猜；
// 占用率：单条 PS 采 CPU/内存/磁盘 + nvidia-smi 采 GPU。

use crate::modules::cooling::ps;
use crate::modules::cooling::UsageSample;

const TEMP_ZONE_PS: &str = "Get-CimInstance -Namespace root/wmi -ClassName MSAcpi_ThermalZoneTemperature -ErrorAction Stop | Select-Object -ExpandProperty CurrentTemperature";
const TEMP_PERF_PS: &str = "Get-CimInstance Win32_PerfFormattedData_Counters_ThermalZoneInformation -ErrorAction Stop | Select-Object -ExpandProperty Temperature";

const USAGE_POLL_PS: &str = r#"$ErrorActionPreference='Stop';
$cpu=[int]((Get-CimInstance Win32_Processor | Measure-Object -Property LoadPercentage -Average).Average);
$os=Get-CimInstance Win32_OperatingSystem;
$mem=[int]((1-$os.FreePhysicalMemory/$os.TotalVisibleMemorySize)*100);
$disk=(Get-CimInstance Win32_PerfFormattedData_PerfDisk_PhysicalDisk | Where-Object {$_.Name -eq '_Total'} | Select-Object -First 1).PercentDiskTime;
$smi=Join-Path $env:windir 'System32\nvidia-smi.exe';
$gpu='';
if(Test-Path $smi){$gpu=(& $smi --query-gpu=utilization.gpu --format=csv,noheader,nounits | Select-Object -First 1)};
Write-Output "CPU=$cpu;MEM=$mem;DISK=$disk;GPU=$gpu""#;

/// 0.1K → 摄氏（合理区间 0..=120，保留 1 位小数）
pub fn kelvin_to_celsius(raw_tenths_kelvin: f64) -> Option<f64> {
    if !raw_tenths_kelvin.is_finite() || raw_tenths_kelvin <= 0.0 {
        return None;
    }
    let c = raw_tenths_kelvin / 10.0 - 273.15;
    if !(0.0..=120.0).contains(&c) {
        return None;
    }
    Some((c * 10.0).round() / 10.0)
}

/// 逐行取最大有效摄氏（第一路温度源）
pub fn pick_max_zone_temp(stdout: &str) -> Option<f64> {
    let mut best: Option<f64> = None;
    for line in stdout.lines() {
        let t = line.trim();
        if t.is_empty() || !t.chars().all(|c| c.is_ascii_digit()) {
            continue;
        }
        if let Ok(v) = t.parse::<f64>() {
            if let Some(c) = kelvin_to_celsius(v) {
                best = Some(best.map_or(c, |b: f64| b.max(c)));
            }
        }
    }
    best
}

/// 降级源的三级单位猜（0.1K → 摄氏 → 开尔文），逐行取最大
pub fn pick_max_perf_counter_temp(stdout: &str) -> Option<f64> {
    let mut best: Option<f64> = None;
    for line in stdout.lines() {
        let t = line.trim();
        if t.is_empty() {
            continue;
        }
        let Ok(v) = t.parse::<f64>() else { continue };
        let c = if v >= 2732.0 {
            kelvin_to_celsius(v)
        } else if (0.0..=120.0).contains(&v) {
            Some(v)
        } else if (273.0..=393.0).contains(&v) {
            Some((((v - 273.15) * 10.0).round()) / 10.0)
        } else {
            None
        };
        if let Some(c) = c {
            best = Some(best.map_or(c, |b: f64| b.max(c)));
        }
    }
    best
}

/// 读当前温度（主源 → 降级源）
pub async fn read_temp_c() -> Option<f64> {
    if let Some(out) = ps::run_powershell(TEMP_ZONE_PS, 4000).await {
        if let Some(t) = pick_max_zone_temp(&out) {
            return Some(t);
        }
    }
    if let Some(out) = ps::run_powershell(TEMP_PERF_PS, 4000).await {
        if let Some(t) = pick_max_perf_counter_temp(&out) {
            return Some(t);
        }
    }
    None
}

/// 解析占用率行 "CPU=n;MEM=n;DISK=n;GPU=n"，disk clamp 100，GPU 空 → None
pub fn parse_usage_line(stdout: &str) -> Option<UsageSample> {
    let line = stdout.lines().find(|l| l.contains("CPU="))?;
    let cpu = extract_num(line, "CPU=")?;
    let mem = extract_num(line, "MEM=")?;
    let raw_disk = extract_num(line, "DISK=").unwrap_or(0);
    let disk = raw_disk.min(100);
    let gpu = extract_num(line, "GPU=");
    Some(UsageSample {
        cpu: Some(cpu),
        gpu,
        disk: Some(disk),
        mem: Some(mem),
    })
}

fn extract_num(line: &str, key: &str) -> Option<u32> {
    let idx = line.find(key)?;
    let rest = &line[idx + key.len()..];
    let digits: String = rest.chars().take_while(|c| c.is_ascii_digit()).collect();
    if digits.is_empty() {
        return None;
    }
    digits.parse().ok()
}

/// 采一次占用率（失败返回 None，调用方保持上次值）
pub async fn poll_usage() -> Option<UsageSample> {
    let out = ps::run_powershell(USAGE_POLL_PS, 6000).await?;
    parse_usage_line(&out)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn kelvin_conversion_bounds() {
        assert_eq!(kelvin_to_celsius(0.0), None);
        assert_eq!(kelvin_to_celsius(-1.0), None);
        // 2981 (0.1K) = 298.1K = 24.95°C → 25.0（保留 1 位）
        assert_eq!(kelvin_to_celsius(2981.0), Some(25.0));
        // 过高/过低判无效
        assert_eq!(kelvin_to_celsius(2000.0), None);
        assert_eq!(kelvin_to_celsius(5000.0), None);
    }

    #[test]
    fn zone_temp_picks_max() {
        let out = "2981\n3001\nnot-a-number\n";
        // 3001 → 26.95 → 27.0
        assert_eq!(pick_max_zone_temp(out), Some(27.0));
        assert_eq!(pick_max_zone_temp(""), None);
        assert_eq!(pick_max_zone_temp("abc\n"), None);
    }

    #[test]
    fn perf_counter_three_way_unit_guess() {
        // 0.1K 分支
        assert_eq!(pick_max_perf_counter_temp("2981"), Some(25.0));
        // 摄氏分支
        assert_eq!(pick_max_perf_counter_temp("45"), Some(45.0));
        // 开尔文分支
        assert_eq!(pick_max_perf_counter_temp("318"), Some(44.9));
        // 无有效值
        assert_eq!(pick_max_perf_counter_temp("500"), None);
    }

    #[test]
    fn usage_line_parsing() {
        let u = parse_usage_line("CPU=12;MEM=64;DISK=140;GPU=33").unwrap();
        assert_eq!(u.cpu, Some(12));
        assert_eq!(u.mem, Some(64));
        assert_eq!(u.disk, Some(100), "disk 应 clamp 到 100");
        assert_eq!(u.gpu, Some(33));
        // GPU 空（无 nvidia-smi）
        let u2 = parse_usage_line("CPU=5;MEM=30;DISK=0;GPU=").unwrap();
        assert_eq!(u2.gpu, None);
        // 整体不匹配
        assert!(parse_usage_line("garbage").is_none());
    }
}