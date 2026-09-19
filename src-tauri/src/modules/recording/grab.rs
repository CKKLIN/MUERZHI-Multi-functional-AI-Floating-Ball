// 单帧抓取 — Windows Graphics Capture（与录制管线同一套机制）
//
// 用途（对齐 Electron 的 desktopCapturer.getSources）：
//   1. get_sources / get_all_displays 的显示器缩略图（340×200 级）
//   2. take_screenshot 全分辨率截图存桌面
//   3. 区域选择窗的全屏底图（region-selector.html 铺 canvas）
//
// **为什么不是 DXGI 复制**：DXGI 的 `AcquireNextFrame` 看着更像「取当前桌面一帧」，
// 但本机实测首帧**全黑**（平均亮度 0/255、alpha 也全 0），后续帧直接超时 —— 混合显卡
// 笔记本上这条路不可靠。WGC 是进程内已验证可用的通道（录制管线就跑在它上面）：起会话
// → 等首帧 → 停会话，代价几十毫秒，对「点一下抓一张」完全够用。
//
// **alpha 必须显式拉满**：WGC/DXGI 的 BGRA 帧 alpha 常为 0（桌面没有透明概念），直接
// 编码 PNG 会得到一张全透明图 —— data URL 看着有内容，页面上却什么都看不到（实测缩略图
// 与选区底图都曾是这样）。抓帧后统一置 255。
//
// feature 开关：无 screen-capture 时降级为明确错误（渲染层缩略图为空、截图报错提示）。
// 该路径下 WGC 实现整体不可达，但接口与时间戳工具保留（单测仍覆盖）→ 抑制告警。
#![cfg_attr(not(feature = "screen-capture"), allow(dead_code))]

// ===== GDI 抓屏（主路径）=====
//
// 为什么单帧抓图不用 WGC：实测副屏（`\.\DISPLAY2`，笔记本内屏/待机中）**整段会话只投
// 递 1 帧且全黑**（8 秒探针：t=61ms 亮度 0.00，之后无帧）—— WGC 是脏区驱动，不变化的屏
// 不投帧；唤醒时序又不可控。而 BitBlt 是**同步取当前屏幕内容**，没有"等帧"这回事，
// 主副屏都能立即拿到真实画面。代价是走 GDI 而非 GPU 路径（一次 ~10ms 级），
// 对"点一下抓一张"完全够用；alpha 由 GDI 天然填 0xFF，也省掉了手动置不透明的步骤。
//
// 仍保留 WGC 路径（imp 模块）用于诊断与未来可能的高帧率预览需求。
#[cfg(feature = "screen-capture")]
mod gdi {
    use windows_sys::Win32::Graphics::Gdi::{
        BitBlt, CreateCompatibleBitmap, CreateCompatibleDC, CreateDCW, DeleteDC, DeleteObject,
        GetDIBits, GetMonitorInfoW, EnumDisplayMonitors, SelectObject, BITMAPINFO,
        BITMAPINFOHEADER, BI_RGB, CAPTUREBLT, DIB_RGB_COLORS, HBITMAP, HDC, HGDIOBJ, HMONITOR,
        MONITORINFOEXW, SRCCOPY,
    };

    type MonitorEntry = (String, i32, i32, i32, i32);

    /// 按 0-based 下标取显示器设备名与物理范围
    fn monitor_at(index0: usize) -> Option<MonitorEntry> {
        // 收集器就地放在栈上：EnumDisplayMonitors 是同步调用，回调期间引用一直有效
        let mut found: Vec<MonitorEntry> = Vec::new();
        /// 回调内取显示器信息：`data` 是 sink 的裸指针（生命周期由外层调用保证）
        unsafe extern "system" fn cb(
            hmon: HMONITOR,
            _hdc: HDC,
            _rect: *mut windows_sys::Win32::Foundation::RECT,
            data: windows_sys::Win32::Foundation::LPARAM,
        ) -> windows_sys::core::BOOL {
            let list = unsafe { &mut *(data as *mut Vec<MonitorEntry>) };
            let mut info: MONITORINFOEXW = unsafe { std::mem::zeroed() };
            info.monitorInfo.cbSize = std::mem::size_of::<MONITORINFOEXW>() as u32;
            let ok = unsafe {
                GetMonitorInfoW(hmon, &mut info as *mut MONITORINFOEXW as *mut _)
            };
            if ok != 0 {
                let name: String = info
                    .szDevice
                    .iter()
                    .take_while(|c| **c != 0)
                    .map(|c| char::from_u32(*c as u32).unwrap_or('?'))
                    .collect();
                let r = info.monitorInfo.rcMonitor;
                list.push((name, r.left, r.top, r.right - r.left, r.bottom - r.top));
            }
            1
        }
        let sink_addr = &mut found as *mut Vec<MonitorEntry> as isize;
        unsafe {
            EnumDisplayMonitors(std::ptr::null_mut(), std::ptr::null(), Some(cb), sink_addr);
        }
        found.get(index0).cloned()
    }

    /// 诊断：分别用「该显示器自己的 DC + 源坐标(0,0)」与「虚拟桌面 DC + 虚拟坐标(mx,my)」
    /// 抓同一块屏，返回两路亮度 —— 用来判定副屏全黑到底是坐标问题还是屏本身没内容。
    #[allow(dead_code)] // 诊断用
    pub fn probe_both_paths(index0: usize) -> Result<(f64, f64, i32, i32), String> {
        let (_w, _h, buf) = grab_bgra(index0)?;
        let a = {
            let mut sum = 0u64;
            let mut n = 0u64;
            for px in buf.chunks_exact(4) {
                sum += px[0] as u64 + px[1] as u64 + px[2] as u64;
                n += 3;
            }
            sum as f64 / n.max(1) as f64
        };
        let (device, mx, my, mw, mh) = monitor_at(index0).ok_or("显示器不存在")?;
        let wide: Vec<u16> = device.encode_utf16().chain(std::iter::once(0)).collect();
        let b = unsafe {
            // 虚拟桌面 DC（NULL 驱动名 = 整块虚拟桌面，坐标是虚拟桌面坐标）
            let screen_dc = CreateDCW(std::ptr::null(), std::ptr::null(), std::ptr::null(), std::ptr::null());
            if screen_dc.is_null() {
                -1.0
            } else {
                let mem_dc = CreateCompatibleDC(screen_dc);
                let bitmap: HBITMAP = CreateCompatibleBitmap(screen_dc, mw, mh);
                let old: HGDIOBJ = SelectObject(mem_dc, bitmap as HGDIOBJ);
                let ok = BitBlt(mem_dc, 0, 0, mw, mh, screen_dc, mx, my, SRCCOPY | CAPTUREBLT);
                let mut info: BITMAPINFO = std::mem::zeroed();
                info.bmiHeader = BITMAPINFOHEADER {
                    biSize: std::mem::size_of::<BITMAPINFOHEADER>() as u32,
                    biWidth: mw,
                    biHeight: -mh,
                    biPlanes: 1,
                    biBitCount: 32,
                    biCompression: BI_RGB,
                    biSizeImage: (mw * mh * 4) as u32,
                    ..std::mem::zeroed()
                };
                let mut buf2 = vec![0u8; (mw as usize) * (mh as usize) * 4];
                let lines = if ok != 0 {
                    GetDIBits(mem_dc, bitmap, 0, mh as u32, buf2.as_mut_ptr() as *mut _, &mut info, DIB_RGB_COLORS)
                } else {
                    0
                };
                SelectObject(mem_dc, old);
                DeleteObject(bitmap as HGDIOBJ);
                DeleteDC(mem_dc);
                DeleteDC(screen_dc);
                if lines == 0 {
                    -1.0
                } else {
                    let mut sum = 0u64;
                    let mut n = 0u64;
                    for px in buf2.chunks_exact(4) {
                        sum += px[0] as u64 + px[1] as u64 + px[2] as u64;
                        n += 3;
                    }
                    sum as f64 / n.max(1) as f64
                }
            }
        };
        let _ = wide;
        Ok((a, b, mx, my))
    }

    /// 抓指定显示器的 BGRA 像素（宽, 高, 缓冲）
    pub fn grab_bgra(index0: usize) -> Result<(u32, u32, Vec<u8>), String> {
        let Some((device, _mx, _my, mw, mh)) = monitor_at(index0) else {
            return Err(format!("显示器 #{index0} 不存在"));
        };
        if mw <= 0 || mh <= 0 {
            return Err(format!("显示器 #{index0} 尺寸无效（{mw}x{mh}）"));
        }
        let wide: Vec<u16> = device.encode_utf16().chain(std::iter::once(0)).collect();

        unsafe {
            let screen_dc = CreateDCW(wide.as_ptr(), wide.as_ptr(), std::ptr::null(), std::ptr::null());
            if screen_dc.is_null() {
                return Err("CreateDCW 失败".into());
            }
            let mem_dc = CreateCompatibleDC(screen_dc);
            let bitmap: HBITMAP = CreateCompatibleBitmap(screen_dc, mw, mh);
            let old: HGDIOBJ = SelectObject(mem_dc, bitmap as HGDIOBJ);

            // ⚠️ 源坐标用 (0,0) 而非虚拟桌面偏移 (mx,my)：CreateDCW 拿到的是**该显示器自己的**
            // DC，其坐标原点就是这块屏的左上角。传虚拟桌面坐标会在副屏上取到界外内容 → 全黑
            // （主屏 mx,my=0,0 恰好掩盖了这个错误，副屏才暴露）。
            let (sx, sy) = (0, 0);
            // CAPTUREBLT：把分层窗口（含部分自绘 UI）一并抓进来，避免截图里出现空洞
            let ok = BitBlt(mem_dc, 0, 0, mw, mh, screen_dc, sx, sy, SRCCOPY | CAPTUREBLT);

            let mut info: BITMAPINFO = std::mem::zeroed();
            info.bmiHeader = BITMAPINFOHEADER {
                biSize: std::mem::size_of::<BITMAPINFOHEADER>() as u32,
                biWidth: mw,
                // 负高度 = 自上而下，省掉一次行序翻转
                biHeight: -mh,
                biPlanes: 1,
                biBitCount: 32,
                biCompression: BI_RGB,
                biSizeImage: (mw * mh * 4) as u32,
                ..std::mem::zeroed()
            };
            let mut buf = vec![0u8; (mw as usize) * (mh as usize) * 4];
            let lines = if ok != 0 {
                GetDIBits(
                    mem_dc,
                    bitmap,
                    0,
                    mh as u32,
                    buf.as_mut_ptr() as *mut core::ffi::c_void,
                    &mut info,
                    DIB_RGB_COLORS,
                )
            } else {
                0
            };

            SelectObject(mem_dc, old);
            DeleteObject(bitmap as HGDIOBJ);
            DeleteDC(mem_dc);
            DeleteDC(screen_dc);

            if ok == 0 || lines == 0 {
                return Err("BitBlt/GetDIBits 抓屏失败".into());
            }
            // GDI 的 32bpp 输出 alpha 字节恒为 0（与 WGC 同样的坑），统一置不透明
            for px in buf.chunks_exact_mut(4) {
                px[3] = 255;
            }
            Ok((mw as u32, mh as u32, buf))
        }
    }
}

// WGC 路径保留作诊断/对照用（生产抓帧走上面 gdi 模块）
#[cfg(feature = "screen-capture")]
#[allow(dead_code)]
mod imp {
    use base64::Engine;
    use std::sync::{Arc, Mutex};
    use std::time::Duration;
    use windows_capture::capture::{CaptureControl, Context, GraphicsCaptureApiHandler};
    use windows_capture::encoder::{ImageEncoder, ImageEncoderPixelFormat, ImageFormat};
    use windows_capture::frame::Frame;
    use windows_capture::graphics_capture_api::InternalCaptureControl;
    use windows_capture::monitor::Monitor;
    use windows_capture::settings::{
        ColorFormat, CursorCaptureSettings, DirtyRegionSettings, DrawBorderSettings,
        MinimumUpdateIntervalSettings, SecondaryWindowSettings, Settings,
    };

    /// 帧收集器：**每帧都存**，由抓取方决定何时收会话。
    ///
    /// 不能「拿到第一帧就停」：WGC 会话刚起来的头一帧可能是**全黑**（实测副屏首帧亮度
    /// 0/255）。也不能「固定丢 N 帧再停」：屏静止时 WGC 按脏区投递，可能只来一帧，
    /// 丢完就再也等不到下一帧（实测超时失败）。所以这里持续更新最新帧，由 grab_bgra
    /// 综合「拿到一帧了(=有兜底)」与「帧不是全黑(=更可信)」两个条件决定何时收工。
    struct FrameCollectorHandler {
        slot: Arc<Mutex<Option<(Vec<u8>, u32, u32)>>>,
    }

    impl GraphicsCaptureApiHandler for FrameCollectorHandler {
        type Flags = Arc<Mutex<Option<(Vec<u8>, u32, u32)>>>;
        type Error = Box<dyn std::error::Error + Send + Sync>;

        fn new(ctx: Context<Self::Flags>) -> Result<Self, Self::Error> {
            Ok(Self { slot: ctx.flags })
        }

        fn on_frame_arrived(
            &mut self,
            frame: &mut Frame,
            _capture_control: InternalCaptureControl,
        ) -> Result<(), Self::Error> {
            let fb = frame.buffer()?;
            let (w, h) = (fb.width(), fb.height());
            let mut scratch = Vec::new();
            let mut packed = fb.as_nopadding_buffer(&mut scratch).to_vec();
            force_opaque_bgra(&mut packed);
            *self.slot.lock().unwrap() = Some((packed, w, h));
            Ok(())
        }
    }

    /// 帧平均亮度（0..255）
    fn brightness_of(buf: &[u8]) -> f64 {
        let mut sum = 0u64;
        let mut n = 0u64;
        for px in buf.chunks_exact(4) {
            sum += px[0] as u64 + px[1] as u64 + px[2] as u64;
            n += 3;
        }
        if n == 0 {
            0.0
        } else {
            sum as f64 / n as f64
        }
    }

    /// BGRA 缓冲 alpha 统一置 255（见文件头说明：不置不透明就编不出可见图）
    fn force_opaque_bgra(buf: &mut [u8]) {
        for px in buf.chunks_exact_mut(4) {
            px[3] = 255;
        }
    }

    /// 抓一帧（WGC 路径，保留用于诊断）：返回 (BGRA 紧凑缓冲, 宽, 高)
    pub fn grab_bgra(index0: usize) -> Result<(Vec<u8>, u32, u32), String> {
        // windows-capture 的 Monitor::from_index 是 1-based；本工程对外一律 0-based
        let monitor = Monitor::from_index(index0 + 1)
            .map_err(|e| format!("显示器 #{index0} 不存在: {e}"))?;
        let slot: Arc<Mutex<Option<(Vec<u8>, u32, u32)>>> = Arc::new(Mutex::new(None));
        let settings = Settings::new(
            monitor,
            CursorCaptureSettings::WithoutCursor,
            DrawBorderSettings::WithoutBorder,
            SecondaryWindowSettings::Default,
            MinimumUpdateIntervalSettings::Default,
            DirtyRegionSettings::Default,
            ColorFormat::Bgra8,
            slot.clone(),
        );
        let control: CaptureControl<
            FrameCollectorHandler,
            Box<dyn std::error::Error + Send + Sync>,
        > = FrameCollectorHandler::start_free_threaded(settings)
            .map_err(|e| format!("单帧捕获会话启动失败: {e}"))?;

        // 收工条件：拿到过帧 + （帧非全黑 或 已经等够了）
        //   静止屏：第一帧就是有效画面 → 立即返回，不必空等；
        //   首帧全黑：继续等下一帧（最多 800ms），期间保留黑帧作兜底，绝不空手而归。
        let start = std::time::Instant::now();
        let black_grace = Duration::from_millis(2500);
        let hard_deadline = start + Duration::from_millis(3000);
        let mut fallback: Option<(Vec<u8>, u32, u32)> = None;
        let mut chosen: Option<(Vec<u8>, u32, u32)> = None;
        while std::time::Instant::now() < hard_deadline {
            if let Some(f) = slot.lock().unwrap().take() {
                let bright = brightness_of(&f.0);
                if bright > 1.0 {
                    chosen = Some(f);
                    break;
                }
                if fallback.is_none() {
                    fallback = Some(f);
                }
                // 黑帧：给足宽限等下一帧（副屏从待机唤醒可能要 1~2 秒），超了就认账
                if std::time::Instant::now().duration_since(start) > black_grace {
                    break;
                }
            }
            std::thread::sleep(Duration::from_millis(15));
        }
        // 无论拿到没有都要收会话，避免留下悬挂的捕获线程
        let _ = std::thread::spawn(move || control.stop()).join();
        chosen
            .or(fallback)
            .ok_or_else(|| "3 秒内未取到画面帧".to_string())
    }

    /// 诊断：在指定显示器上持续采集 duration_ms，逐帧打印亮度随时间的走势。
    ///
    /// 用来回答「副屏单帧抓取为什么全黑、要等多久才出画面」——连续录制能出画面说明
    /// 只是**首帧时序**问题，靠这个探针量出真实等待窗口再定策略，不靠猜。
    pub fn probe_frames(index0: usize, duration_ms: u64) -> Result<Vec<(u64, f64)>, String> {
        let monitor = Monitor::from_index(index0 + 1)
            .map_err(|e| format!("显示器 #{index0} 不存在: {e}"))?;
        let slot: Arc<Mutex<Option<(Vec<u8>, u32, u32)>>> = Arc::new(Mutex::new(None));
        let settings = Settings::new(
            monitor,
            CursorCaptureSettings::WithoutCursor,
            DrawBorderSettings::WithoutBorder,
            SecondaryWindowSettings::Default,
            MinimumUpdateIntervalSettings::Default,
            DirtyRegionSettings::Default,
            ColorFormat::Bgra8,
            slot.clone(),
        );
        let control: CaptureControl<
            FrameCollectorHandler,
            Box<dyn std::error::Error + Send + Sync>,
        > = FrameCollectorHandler::start_free_threaded(settings)
            .map_err(|e| format!("捕获会话启动失败: {e}"))?;

        let start = std::time::Instant::now();
        let mut log = Vec::new();
        while start.elapsed().as_millis() < duration_ms as u128 {
            if let Some(f) = slot.lock().unwrap().take() {
                log.push((start.elapsed().as_millis() as u64, brightness_of(&f.0)));
            }
            std::thread::sleep(Duration::from_millis(10));
        }
        let _ = std::thread::spawn(move || control.stop()).join();
        Ok(log)
    }

    /// 枚举显示器（0-based 下标 → 设备名），与 `Monitor::from_index(i+1)` 对齐
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

    /// 抓指定显示器一帧并编码成 PNG；max_w/max_h 为 0 表示原始分辨率。
    ///
    /// 走 GDI（同步取当前屏幕内容）而非 WGC：WGC 在静止/待机屏上不投帧（见 gdi 模块注释）。
    pub fn grab_png(index0: usize, max_w: u32, max_h: u32) -> Result<Vec<u8>, String> {
        let (w, h, buf) = super::gdi::grab_bgra(index0)?;
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

    /// 帧平均亮度（0..255）——用于单测确认抓到的**不是全黑帧**
    #[allow(dead_code)] // 仅真机冒烟用；生产路径不调用
    pub fn frame_brightness(index0: usize) -> Result<f64, String> {
        let (_w, _h, buf) = super::gdi::grab_bgra(index0)?;
        Ok(brightness_of(&buf))
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
    pub fn frame_brightness(_index0: usize) -> Result<f64, String> {
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

// ===== 区域选择窗底图（grab_screen_thumbnail 命令）=====

/// 主屏一帧 → PNG data URL（供 region-selector.html 铺底）
///
/// maxWidth/maxHeight 传 0 表示原始分辨率（选区底图要清晰，只有缩略图才限制尺寸）。
#[tauri::command]
#[allow(non_snake_case)]
pub fn grab_screen_thumbnail(maxWidth: u32, maxHeight: u32) -> Result<String, String> {
    grab_data_url(0, maxWidth, maxHeight)
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

    /// 诊断：两条 GDI 路径抓同一块屏的亮度对比
    #[cfg(feature = "screen-capture")]
    #[test]
    #[ignore = "诊断用；手动用 --ignored 跑"]
    fn probe_gdi_paths() {
        let idx: usize = std::env::var("MUERZHI_PROBE_INDEX").ok().and_then(|v| v.parse().ok()).unwrap_or(1);
        match super::gdi::probe_both_paths(idx) {
            Ok((a, b, mx, my)) => println!(
                "显示器 #{idx}（虚拟坐标 {mx},{my}）：本屏 DC+源(0,0) 亮度={a:.2} | 虚拟桌面 DC+源({mx},{my}) 亮度={b:.2}"
            ),
            Err(e) => println!("显示器 #{idx} 诊断失败: {e}"),
        }
    }

    /// 诊断：逐帧亮度走势（手动跑）。`MUERZHI_PROBE_INDEX=1 MUERZHI_PROBE_MS=8000`
    #[cfg(feature = "screen-capture")]
    #[test]
    #[ignore = "诊断用；手动用 --ignored 跑"]
    fn probe_frame_brightness_over_time() {
        let idx: usize = std::env::var("MUERZHI_PROBE_INDEX").ok().and_then(|v| v.parse().ok()).unwrap_or(1);
        let ms: u64 = std::env::var("MUERZHI_PROBE_MS").ok().and_then(|v| v.parse().ok()).unwrap_or(8000);
        let names = super::monitor_device_names();
        println!("WGC 枚举顺序: {names:?}");
        let log = super::imp::probe_frames(idx, ms).expect("采集应能启动");
        println!("显示器 #{idx} 共 {} 帧，前 12 帧与每 1s 采样：", log.len());
        for (n, (t, b)) in log.iter().enumerate() {
            let whole_sec = *t % 1000 < 20;
            if n < 12 || whole_sec {
                println!("  t={t:>5}ms 亮度={b:>6.2}");
            }
        }
    }

    /// 真机冒烟：抓一帧后校验**画面真的不是全黑**。
    ///
    /// 这条断言是本文件最重要的回归：DXGI 路径曾经做到的就是「编码成功但全黑」，
    /// 只看「有没有 PNG 字节」根本发现不了。
    /// 手动执行：`cargo test --test unit -- --ignored --nocapture grab_smoke`
    #[cfg(feature = "screen-capture")]
    #[test]
    #[ignore = "需要真实桌面；手动用 --ignored 跑"]
    fn grab_smoke_frame_is_visible() {
        let full = super::grab_png(0, 0, 0).expect("应能抓到全分辨率帧");
        assert!(full.len() > 20_000, "全分辨率 PNG 过小（{} 字节）", full.len());
        let small = super::grab_png(0, 340, 200).expect("应能抓到缩略图");
        assert!(small.len() > 1_000, "缩略图 PNG 过小（{} 字节）", small.len());

        let url = super::grab_data_url(0, 340, 200).expect("data URL");
        assert!(url.starts_with("data:image/png;base64,"));

        // 每个显示器都抓一张（副屏若物理关闭，GDI 也只能抓到黑屏 —— 属正常，只打印不判定）
        for i in 0..super::monitor_device_names().len() {
            match super::imp::frame_brightness(i) {
                Ok(b) => println!("显示器 #{i} 平均亮度 {b:.1}/255"),
                Err(e) => println!("显示器 #{i} 抓帧失败: {e}"),
            }
        }
        let bright = super::imp::frame_brightness(0).expect("亮度统计");
        println!(
            "抓帧冒烟：全分辨率 {} 字节，缩略图 {} 字节，平均亮度 {bright:.1}/255",
            full.len(),
            small.len()
        );
        assert!(bright > 1.0, "抓到的是全黑帧（平均亮度 {bright:.2}）");
    }
}
