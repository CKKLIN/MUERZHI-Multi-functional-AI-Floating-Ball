// 单帧抓取 — DXGI Desktop Duplication（windows-capture crate）
//
// 用途（对齐 Electron 的 desktopCapturer.getSources）：
//   1. get_sources / get_all_displays 的显示器缩略图（340×200 级）
//   2. take_screenshot 全分辨率截图存桌面
//   3. 区域选择窗的全屏底图（P4 后续在 region-selector.html 里绘制）
//
// 为什么不用 WGC：WGC 面向持续帧泵，抓一帧要起会话 + 等首帧 + 停会话，开销大；
// DXGI 复制的 AcquireNextFrame 本身就是「取当前桌面一帧」的语义，更适合单次抓图。
// 另外 DXGI 复制拿到的首帧可能还是上一帧内容，这里最多重试 3 次取最新的。
//
// feature 开关：无 screen-capture 时降级为明确错误（渲染层缩略图为空、截图报错提示）。
// 该路径下 WGC/DXGI 实现整体不可达，但接口与时间戳工具保留（单测仍覆盖）→ 抑制告警。
#![cfg_attr(not(feature = "screen-capture"), allow(dead_code))]

#[cfg(feature = "screen-capture")]
mod imp {
    use base64::Engine;
    use windows_capture::dxgi_duplication_api::{DxgiDuplicationApi, DxgiDuplicationFormat};
    use windows_capture::encoder::{ImageEncoder, ImageEncoderPixelFormat, ImageFormat};
    use windows_capture::monitor::Monitor;

    /// 抓一帧的通用入口：返回 (BGRA 紧凑缓冲, 宽, 高)
    fn grab_bgra(index0: usize) -> Result<(Vec<u8>, u32, u32), String> {
        // windows-capture 的 Monitor::from_index 是 1-based；本工程对外一律 0-based（对齐
        // Tauri available_monitors 下标），故此处 +1 换算。
        let monitor = Monitor::from_index(index0 + 1)
            .map_err(|e| format!("显示器 #{index0} 不存在: {e}"))?;
        // 只声明 Bgra8 一种格式，让复制接口输出的 ModeDesc.Format 可预期（crate 内部会
        // 保证 Bgra8 在候选列表里），避免拿到 Rgba16F 之类没法直接喂 PNG 编码器的格式。
        let mut dup = DxgiDuplicationApi::new_options(monitor, &[DxgiDuplicationFormat::Bgra8])
            .map_err(|e| format!("DXGI 复制初始化失败: {e}"))?;

        // 首次 AcquireNextFrame 常返回「上一帧」或超时；最多轮询 3 次，拿到就画。
        let mut last_err = String::new();
        for _ in 0..3 {
            match dup.acquire_next_frame(500) {
                Ok(mut frame) => {
                    let buf = frame.buffer().map_err(|e| format!("帧映射失败: {e}"))?;
                    if buf.format() != DxgiDuplicationFormat::Bgra8 {
                        return Err("显示器像素格式不是 BGRA8".into());
                    }
                    let (w, h) = (buf.width(), buf.height());
                    // as_nopadding_buffer 返回借用 buf 的切片，须先拷出来再让 buf 析构
                    let mut scratch = Vec::new();
                    let packed = buf.as_nopadding_buffer(&mut scratch).to_vec();
                    return Ok((packed, w, h));
                }
                Err(e) => last_err = format!("{e}"),
            }
        }
        Err(format!("抓帧失败: {last_err}"))
    }

    /// 枚举显示器（0-based 下标 → 设备名），下标与 `Monitor::from_index(i+1)` 一致
    pub fn monitor_device_names() -> Vec<String> {
        match Monitor::enumerate() {
            Ok(list) => list
                .iter()
                .map(|m| m.device_name().unwrap_or_default())
                .collect(),
            Err(_) => Vec::new(),
        }
    }

    /// 按最长边限制做盒式降采样（缩略图用；点采样在 5×5 以上的降幅下会有明显锯齿）
    fn downsample_box(src: &[u8], sw: u32, sh: u32, tw: u32, th: u32) -> Vec<u8> {
        let mut out = vec![0u8; (tw * th * 4) as usize];
        if tw == 0 || th == 0 || sw == 0 || sh == 0 {
            return out;
        }
        for ty in 0..th {
            let y0 = (ty as u64 * sh as u64 / th as u64) as u32;
            let y1 = (((ty + 1) as u64 * sh as u64 / th as u64) as u32).max(y0 + 1).min(sh);
            for tx in 0..tw {
                let x0 = (tx as u64 * sw as u64 / tw as u64) as u32;
                let x1 = (((tx + 1) as u64 * sw as u64 / tw as u64) as u32).max(x0 + 1).min(sw);
                let (mut b, mut g, mut r, mut n) = (0u32, 0u32, 0u32, 0u32);
                for y in y0..y1 {
                    let row = (y * sw * 4) as usize;
                    for x in x0..x1 {
                        let i = row + (x * 4) as usize;
                        b += src[i] as u32;
                        g += src[i + 1] as u32;
                        r += src[i + 2] as u32;
                        n += 1;
                    }
                }
                if n == 0 {
                    n = 1;
                }
                let o = ((ty * tw + tx) * 4) as usize;
                out[o] = (b / n) as u8;
                out[o + 1] = (g / n) as u8;
                out[o + 2] = (r / n) as u8;
                out[o + 3] = 255;
            }
        }
        out
    }

    fn encode_png(buf: &[u8], w: u32, h: u32) -> Result<Vec<u8>, String> {
        ImageEncoder::new(ImageFormat::Png, ImageEncoderPixelFormat::Bgra8)
            .and_then(|enc| enc.encode(buf, w, h))
            .map_err(|e| format!("PNG 编码失败: {e}"))
    }

    /// 抓指定显示器一帧并编码成 PNG；max_w/max_h 为 0 表示原始分辨率
    pub fn grab_png(index0: usize, max_w: u32, max_h: u32) -> Result<Vec<u8>, String> {
        let (buf, w, h) = grab_bgra(index0)?;
        if max_w == 0 || max_h == 0 || (w <= max_w && h <= max_h) {
            return encode_png(&buf, w, h);
        }
        // 等比缩放到框内（缩略图 340×200 这类目标：宽高比不同 → 按较小缩放比取整）
        let ratio = f64::min(max_w as f64 / w as f64, max_h as f64 / h as f64);
        let tw = ((w as f64 * ratio).round() as u32).max(1);
        let th = ((h as f64 * ratio).round() as u32).max(1);
        let small = downsample_box(&buf, w, h, tw, th);
        encode_png(&small, tw, th)
    }

    /// PNG 字节 → data URL（`<img src>` 直接用，免二次 invoke）
    pub fn grab_data_url(index0: usize, max_w: u32, max_h: u32) -> Result<String, String> {
        let png = grab_png(index0, max_w, max_h)?;
        Ok(format!(
            "data:image/png;base64,{}",
            base64::engine::general_purpose::STANDARD.encode(&png)
        ))
    }
}

#[cfg(not(feature = "screen-capture"))]
mod imp {
    pub fn monitor_device_names() -> Vec<String> {
        Vec::new()
    }
    pub fn grab_png(_index0: usize, _max_w: u32, _max_h: u32) -> Result<Vec<u8>, String> {
        Err("屏幕采集管线未编译（用 --features screen-capture 构建）".into())
    }
    pub fn grab_data_url(_index0: usize, _max_w: u32, _max_h: u32) -> Result<String, String> {
        Err("屏幕采集管线未编译".into())
    }
}

#[allow(unused_imports)] // grab_png 仅截图路径用（screenshot_to_desktop）
pub use imp::{grab_data_url, grab_png, monitor_device_names};

// ===== 截图存桌面（对齐 Electron take-screenshot）=====

/// 抓主显示器全分辨率一帧，按 `截图_YYYYMMDD_HHmmss.png` 存桌面，返回完整路径
#[cfg(feature = "screen-capture")]
pub fn screenshot_to_desktop(app: &tauri::AppHandle) -> Result<String, String> {
    use tauri::Manager;
    // 桌面目录走 Known Folder 解析（OneDrive 重定向也能拿到真实路径）
    let dir = app
        .path()
        .desktop_dir()
        .map_err(|e| format!("桌面目录不可用: {e}"))?;
    let name = format!("截图_{}.png", stamp_compact());
    let path = dir.join(name);
    let png = grab_png(0, 0, 0)?;
    std::fs::write(&path, png).map_err(|e| format!("截图写入失败: {e}"))?;
    Ok(path.to_string_lossy().to_string())
}

#[cfg(not(feature = "screen-capture"))]
pub fn screenshot_to_desktop(_app: &tauri::AppHandle) -> Result<String, String> {
    Err("截图功能需要屏幕采集管线（用 --features screen-capture 构建）".into())
}

/// 本地时间 `YYYYMMDD_HHmmss`（对齐 Electron 截图文件名）
///
/// 用系统时区偏移把 UTC 换成当地时间 —— 文件名要体现用户当下的墙上时钟，
/// 直接写 UTC 会差几个小时（跨时区用户会看不懂自己的截图时间）。
pub fn stamp_compact() -> String {
    let ms = crate::modules::todo::store::now_ms();
    let local_ms = ms + (local_utc_offset_seconds() as i64) * 1000;
    let secs = local_ms.div_euclid(1000);
    let days = secs.div_euclid(86400);
    let rem = secs.rem_euclid(86400);
    let (h, mi, s) = (rem / 3600, (rem % 3600) / 60, rem % 60);
    let (y, m, d) = civil_from_days(days);
    format!("{y:04}{m:02}{d:02}_{h:02}{mi:02}{s:02}")
}

#[cfg(windows)]
fn local_utc_offset_seconds() -> i32 {
    unsafe {
        let mut tz = std::mem::zeroed::<windows_sys::Win32::System::Time::TIME_ZONE_INFORMATION>();
        let id = windows_sys::Win32::System::Time::GetTimeZoneInformation(&mut tz);
        // Bias 语义是「UTC = 本地 + Bias」，故取负；夏令时再叠加 DaylightBias（本身为负）
        let mut minutes = -tz.Bias;
        // 2 = TIME_ZONE_ID_DAYLIGHT（该常量在 Win32_System_SystemServices 下，
        // 为它单开一个 feature 不划算；值是 Win32 固定约定）
        if id == 2 {
            minutes -= tz.DaylightBias;
        }
        minutes * 60
    }
}

#[cfg(not(windows))]
fn local_utc_offset_seconds() -> i32 {
    0
}

/// days since epoch → 公历年月日（Howard Hinnant 算法）
fn civil_from_days(z: i64) -> (i64, u32, u32) {
    let z = z + 719468;
    let era = if z >= 0 { z } else { z - 146096 } / 146097;
    let doe = (z - era * 146097) as u64;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    let y = yoe as i64 + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = (doy - (153 * mp + 2) / 5 + 1) as u32;
    let m = if mp < 10 { mp + 3 } else { mp - 9 } as u32;
    (if m <= 2 { y + 1 } else { y }, m, d)
}

#[cfg(test)]
mod tests {
    // downsample_box 属 imp 私有；这里只验证 feature 开关与错误路径的类型契约
    #[test]
    fn stamp_compact_shape() {
        let s = super::stamp_compact();
        assert_eq!(s.len(), 15, "stamp={s}");
        assert_eq!(&s[8..9], "_");
        assert!(s[..8].chars().all(|c| c.is_ascii_digit()), "stamp={s}");
        assert!(s[9..].chars().all(|c| c.is_ascii_digit()), "stamp={s}");
    }

    #[cfg(windows)]
    #[test]
    fn local_offset_is_within_real_world_range() {
        // UTC-12:00 .. UTC+14:00
        let off = super::local_utc_offset_seconds();
        assert!((-12 * 3600..=14 * 3600).contains(&off), "offset={off}");
    }

    #[cfg(not(feature = "screen-capture"))]
    #[test]
    fn disabled_returns_error() {
        assert!(super::grab_png(0, 340, 200).is_err());
        assert!(super::grab_data_url(0, 340, 200).is_err());
        assert!(super::monitor_device_names().is_empty());
    }
}
