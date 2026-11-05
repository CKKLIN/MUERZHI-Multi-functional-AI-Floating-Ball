// 屏幕采集管线 — Windows Graphics Capture（windows-capture crate）
//
// 视频：WGC 帧泵（GraphicsCaptureApiHandler::on_frame_arrived）→ 内置 VideoEncoder
//       （MediaFoundation）直出 mp4。
// 音频：不在这里 —— 见 audio.rs（WASAPI 各路录 WAV，停止后 ffmpeg amix），
//       故 AudioSettingsBuilder 固定 disabled(true)。
// 停止：置该段 stop 标志 → on_frame_arrived 停止分支 encoder.finish() +
//       capture_control.stop()（发 WM_QUIT 结束消息循环）→ control.stop() join → mp4 完整。
//
// **定速补帧（关键）**：WGC 只在画面**发生变化**时投递帧（脏区驱动），静置桌面可能几秒
// 才来一帧；而 MF 编码器的时间戳完全来自帧到达时刻 —— 直接送帧的结果是「录 6 秒得到
// 0.03 秒视频」（实测）。所以这里改走**缓冲帧 + 墙钟定速推送**：帧到达时只把 BGRA 拷进
// last_frame，另一个 pacing 线程按目标 fps 以「距段开始的时间」为准反复推送最后一帧。
// 于是无论画面动静都得到真正的定帧率视频，时长与界面计时器一致。
// 代价是每帧一次 GPU→CPU 回读 + 行序翻转（内存拷贝），1080p@30 约 250MB/s，可忽略。
//
// **暂停 = 分段**：一张 WGC 会话只认一个输出文件，且 MF 编码器的时间戳来自捕获时钟，
// 中途跳帧会在成品里留一个时间黑洞（时长含暂停时间，与界面计时器不符）。所以暂停时
// 结束当前段、恢复时起新段，停止后 ffmpeg concat（-c copy，无重编码）拼接——得到与
// Electron 版 MediaRecorder.pause() 一致的「暂停时间从视频里消失」语义。
//
// **编码器用 H264 而非 HEVC**：内置的精简 ffmpeg 白名单里有 h264 解码器没有 hevc 解码器
// （见 vendor/ffmpeg/build-minimal.sh），而区域裁剪/GIF/多屏合并都要解码视频。H264 同时
// 在兼容性上更稳（Windows 自带播放器直开）。帧泵另一处 docs 示例用 HEVC 属默认值，非必需。
//
// feature 开关：无 screen-capture 时用空实现（命令返回明确错误），UI 可提示。
#![cfg_attr(not(feature = "screen-capture"), allow(dead_code))]

/// WGC + WASAPI 是否编译可用（feature 开关）
#[allow(dead_code)] // 保留：capture 内部检查 + UI 查询
pub const ENABLED: bool = cfg!(feature = "screen-capture");

use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::{Arc, Mutex};

// ===== 采集参数（一次录制会话的固定配置）=====

/// 画质档 → 目标码率（bps）。对齐 Electron 版 getBitrate：1080p 基准 5Mbps，
/// 每多 480p 加 3Mbps，再按档位乘系数。
pub fn bitrate_for(quality: &str, width: u32, height: u32) -> u32 {
    let pixels = width as f64 * height as f64;
    let base = 1920.0 * 1080.0;
    let step = 640.0 * 480.0;
    let extra = ((pixels - base) / step).round().max(0.0);
    let base_bitrate = 5_000_000.0 + extra * 3_000_000.0;
    let factor = match quality {
        "low" => 0.4,
        "medium" => 0.7,
        _ => 1.0,
    };
    (base_bitrate * factor).round() as u32
}

/// fps 合法区间收敛（WGC 最小更新间隔 + MF 帧率都要正整数）
pub fn clamp_fps(fps: u32) -> u32 {
    fps.clamp(5, 120)
}

/// 一段采集的配置
#[derive(Debug, Clone)]
pub struct SegmentConfig {
    pub output_path: String,
    pub width: u32,
    pub height: u32,
    pub fps: u32,
    pub bitrate: u32,
    pub with_cursor: bool,
    /// monitor index（0-based，与 windows_capture::Monitor::from_index 的 1-based 相差 1）
    pub monitor_index: usize,
    pub stop: Arc<AtomicBool>,
    pub frames: Arc<AtomicU64>,
}

/// 运行时句柄：正在跑的采集段 + 每路（每显示器）已完成段
pub struct TrackState {
    pub monitor_index: usize,
    /// 物理像素 bounds（x, y, w, h），多屏合并时定位用
    pub bounds: (i32, i32, i32, i32),
    pub segments: Vec<String>,
}

pub struct CaptureHandles {
    pub tracks: Mutex<Vec<TrackState>>,
    pub active: Mutex<Vec<imp::Active>>,
    pub frames: Arc<AtomicU64>,
}

impl CaptureHandles {
    pub fn global() -> &'static CaptureHandles {
        use std::sync::OnceLock;
        static S: OnceLock<CaptureHandles> = std::sync::OnceLock::new();
        S.get_or_init(|| CaptureHandles {
            tracks: Mutex::new(Vec::new()),
            active: Mutex::new(Vec::new()),
            frames: Arc::new(AtomicU64::new(0)),
        })
    }

    /// 开始新一轮录制（清空上一轮残留状态）
    pub fn reset(&self) {
        self.tracks.lock().unwrap().clear();
        self.active.lock().unwrap().clear();
        self.frames.store(0, Ordering::SeqCst);
        crate::modules::recording::audio::reset_levels();
    }

    pub fn frame_count(&self) -> u64 {
        self.frames.load(Ordering::SeqCst)
    }

    /// 登记一路（一个显示器）
    pub fn add_track(&self, monitor_index: usize, bounds: (i32, i32, i32, i32)) {
        self.tracks.lock().unwrap().push(TrackState {
            monitor_index,
            bounds,
            segments: Vec::new(),
        });
    }

    /// 某一路的成品段（按录制顺序）
    pub fn segments_of(&self, monitor_index: usize) -> Vec<String> {
        self.tracks
            .lock()
            .unwrap()
            .iter()
            .find(|t| t.monitor_index == monitor_index)
            .map(|t| t.segments.clone())
            .unwrap_or_default()
    }

    /// 某一路的 bounds
    pub fn bounds_of(&self, monitor_index: usize) -> (i32, i32, i32, i32) {
        self.tracks
            .lock()
            .unwrap()
            .iter()
            .find(|t| t.monitor_index == monitor_index)
            .map(|t| t.bounds)
            .unwrap_or((0, 0, 0, 0))
    }

    pub fn track_count(&self) -> usize {
        self.tracks.lock().unwrap().len()
    }
}

// ==================== feature 版本 ====================
#[cfg(feature = "screen-capture")]
pub mod imp {
    use super::*;
    use windows_capture::capture::{CaptureControl, Context, GraphicsCaptureApiHandler};
    use windows_capture::encoder::{
        AudioSettingsBuilder, ContainerSettingsBuilder, VideoEncoder, VideoSettingsBuilder,
        VideoSettingsSubType,
    };
    use windows_capture::frame::Frame;
    use windows_capture::graphics_capture_api::{GraphicsCaptureApi, InternalCaptureControl};
    use windows_capture::monitor::Monitor;
    use windows_capture::settings::{
        ColorFormat, CursorCaptureSettings, DirtyRegionSettings, DrawBorderSettings,
        MinimumUpdateIntervalSettings, SecondaryWindowSettings, Settings,
    };

    pub type Control =
        CaptureControl<ScreenCaptureHandler, Box<dyn std::error::Error + Send + Sync>>;

    /// 当前活跃的采集段
    pub struct Active {
        pub control: Control,
        pub stop: Arc<AtomicBool>,
        pub path: String,
        pub monitor_index: usize,
        /// 定速补帧线程（帧到达时更新共享缓冲，这里按 fps 推送）
        pacing: Option<std::thread::JoinHandle<()>>,
        /// 通知 pacing 线程退出
        paced_stop: Arc<AtomicBool>,
    }

    /// 跨线程共享的「最新一帧」（BGRA 紧凑缓冲，已翻正行序）
    pub struct SharedFrame {
        /// (像素缓冲, 宽, 高) —— None 表示还没收到任何帧
        buf: Mutex<Option<(Vec<u8>, u32, u32)>>,
        /// pacing 线程换帧时把旧缓冲归还到池里复用 —— 1080p 一帧 8MB，
        /// 不归还的话每秒 30 次大块分配/释放全砸在分配器上
        recycle: Mutex<Vec<Vec<u8>>>,
    }

    impl SharedFrame {
        /// 取一块可写的帧缓冲：优先复用归还池里的旧缓冲
        fn take_buffer(&self) -> Vec<u8> {
            self.recycle.lock().unwrap().pop().unwrap_or_default()
        }

        /// 发布新帧；被替换掉的旧缓冲若尺寸一致则回收入池
        fn publish(&self, buf: Vec<u8>, w: u32, h: u32) {
            let mut guard = self.buf.lock().unwrap();
            if let Some((old, _, _)) = guard.take() {
                if old.len() == buf.len() {
                    self.recycle.lock().unwrap().push(old);
                }
            }
            *guard = Some((buf, w, h));
        }

        /// pacing 线程换帧后归还旧缓冲
        fn recycle_buffer(&self, old: Vec<u8>) {
            self.recycle.lock().unwrap().push(old);
        }
    }

    /// WGC 采集器：帧到达只更新共享缓冲，真正的编码推送交给 pacing 线程
    pub struct ScreenCaptureHandler {
        stop: Arc<AtomicBool>,
        /// 仅持有引用保活（frames 只由 pacing 线程累加，语义=成品实际帧数）
        #[allow(dead_code)]
        frames: Arc<AtomicU64>,
        shared: Arc<SharedFrame>,
        /// as_nopadding_buffer 的行重排草稿（跨帧复用，仅源面带 row padding 时才会写入）
        packed_scratch: Vec<u8>,
    }

    impl GraphicsCaptureApiHandler for ScreenCaptureHandler {
        type Flags = (SegmentConfig, Arc<SharedFrame>);
        type Error = Box<dyn std::error::Error + Send + Sync>;

        fn new(ctx: Context<Self::Flags>) -> Result<Self, Self::Error> {
            let (cfg, shared) = ctx.flags;
            Ok(Self {
                stop: cfg.stop,
                frames: cfg.frames,
                shared,
                packed_scratch: Vec::new(),
            })
        }

        fn on_frame_arrived(
            &mut self,
            frame: &mut Frame,
            capture_control: InternalCaptureControl,
        ) -> Result<(), Self::Error> {
            if self.stop.load(Ordering::SeqCst) {
                capture_control.stop();
                return Ok(());
            }
            // 只保留最新一帧：把 GPU 表面拷成 CPU 缓冲并翻正行序（WGC 的 BGRA 是自下而上），
            // 由 pacing 线程按 fps 反复推送。这里不做任何编码，帧到达多快都不影响输出节奏。
            // 输出缓冲从共享池取（pacing 归还的旧缓冲），行序翻转融合进拷贝过程——
            // 稳态下每帧零分配、一次拷贝（原实现每帧 3 次分配 + 2 次整帧拷贝 + 1 次行交换）。
            let fb = frame.buffer()?;
            let (w, h) = (fb.width(), fb.height());
            let packed = fb.as_nopadding_buffer(&mut self.packed_scratch);
            let mut out = self.shared.take_buffer();
            pack_flipped_rows(packed, w, h, &mut out);
            self.shared.publish(out, w, h);
            // ⚠️ 不要在这里 fetch_add：frames 的语义是「成品里实际有多少帧」，
            // 而成品帧数由 pacing 线程决定（帧到达量随画面动静变化）。两个地方都加
            // 会让计数虚高近一倍（实测 3 秒 165 帧 vs 真实 90 帧），冒烟测试因此误报。
            Ok(())
        }

        fn on_closed(&mut self) -> Result<(), Self::Error> {
            Ok(())
        }
    }

    /// 把自下而上的 BGRA 紧凑缓冲按行倒序拷成自上而下（融合行序翻转，免临时行缓冲）。
    /// `out` 跨帧复用：容量足够时不再分配，也不做多余的清零。
    fn pack_flipped_rows(src: &[u8], w: u32, h: u32, out: &mut Vec<u8>) {
        let stride = (w * 4) as usize;
        let need = stride * h as usize;
        if stride == 0 || h == 0 || src.len() < need {
            return;
        }
        if out.len() < need {
            out.resize(need, 0);
        }
        for y in 0..h as usize {
            let dst = y * stride;
            let src_row = (h as usize - 1 - y) * stride;
            out[dst..dst + stride].copy_from_slice(&src[src_row..src_row + stride]);
        }
        out.truncate(need);
    }

    /// 定速推送线程：以段开始时刻为基准，按 fps 用墙钟时间戳推最后一帧
    fn spawn_pacer(
        mut encoder: VideoEncoder,
        shared: Arc<SharedFrame>,
        paced_stop: Arc<AtomicBool>,
        fps: u32,
        frames: Arc<AtomicU64>,
    ) -> Result<std::thread::JoinHandle<()>, String> {
        std::thread::Builder::new()
            .name("wgc-pacer".into())
            .spawn(move || {
                let period = std::time::Duration::from_nanos(1_000_000_000 / fps.max(1) as u64);
                let started = std::time::Instant::now();
                let mut next = started;
                let mut index: u64 = 0;
                let mut last: Option<(Vec<u8>, u32, u32)> = None;
                while !paced_stop.load(Ordering::SeqCst) {
                    // 取最新帧（有就用新的，旧缓冲归还共享池复用；没有就复用上一帧——首帧前保持等待）
                    if let Some(fresh) = shared.buf.lock().unwrap().take() {
                        if let Some((old, _, _)) = last.replace(fresh) {
                            shared.recycle_buffer(old);
                        }
                    }
                    let Some((buf, _w, _h)) = last.as_ref() else {
                        std::thread::sleep(period);
                        continue;
                    };
                    let ts = index as i64 * 10_000_000 / fps.max(1) as i64;
                    if let Err(e) = encoder.send_frame_buffer(buf, ts) {
                        log::error!("编码器送帧失败，本段提前结束: {e}");
                        break;
                    }
                    frames.fetch_add(1, Ordering::Relaxed);
                    index += 1;
                    next += period;
                    // 落后超过 1 帧就不追了（避免追帧时疯狂补推导致时长跑飞）
                    let now = std::time::Instant::now();
                    if next > now {
                        std::thread::sleep(next - now);
                    } else {
                        next = now;
                    }
                }
                // 正常路径由结束逻辑 finish；这里兜底释放（Drop 里也会 finish）
                let _ = encoder.finish();
            })
            .map_err(|e| format!("补帧线程启动失败: {e}"))
    }

    /// 启动一段采集（同一进程内可并行多段：多屏录制各显示器一段）
    pub fn spawn_segment(cfg: SegmentConfig) -> Result<Active, String> {
        // ⚠️ 必须在独立大栈线程上跑：Tauri 命令在 tokio worker（2MB 栈）里执行，
        // 而 WGC + MediaFoundation 初始化在 debug 构建下调用帧极深，直接在 worker
        // 线程上跑会 STATUS_STACK_OVERFLOW 整个进程崩掉（实测点开始录制即闪退）。
        let handle = std::thread::Builder::new()
            .name("wgc-spawn".into())
            .stack_size(16 * 1024 * 1024)
            .spawn(move || spawn_segment_inner(cfg))
            .map_err(|e| format!("采集线程启动失败: {e}"))?;
        handle.join().map_err(|_| "采集线程 panic".to_string())?
    }

    fn spawn_segment_inner(cfg: SegmentConfig) -> Result<Active, String> {
        // windows-capture 的 Monitor::from_index 是 1-based；本工程对外一律 0-based
        let monitor = Monitor::from_index(cfg.monitor_index + 1)
            .map_err(|e| format!("显示器 #{} 不存在: {e}", cfg.monitor_index))?;
        let shared: Arc<SharedFrame> = Arc::new(SharedFrame {
            buf: Mutex::new(None),
            recycle: Mutex::new(Vec::new()),
        });
        let cursor_settings = if GraphicsCaptureApi::is_cursor_settings_supported().unwrap_or(false) {
            if cfg.with_cursor {
                CursorCaptureSettings::WithCursor
            } else {
                CursorCaptureSettings::WithoutCursor
            }
        } else {
            CursorCaptureSettings::Default
        };
        // 关闭 WGC 自带的黄色捕获边框（Windows 11+ 支持；Windows 10 不支持此属性且本身无边框，需降级 Default 避免报错）
        let border_settings = if GraphicsCaptureApi::is_border_settings_supported().unwrap_or(false) {
            DrawBorderSettings::WithoutBorder
        } else {
            DrawBorderSettings::Default
        };
        // fps 上限交给系统侧节流（Windows 11+ 支持 MinUpdateInterval；不支持时降级 Default，由内部 pacer 线程负责定速补帧）
        let interval_settings = if GraphicsCaptureApi::is_minimum_update_interval_supported().unwrap_or(false) {
            MinimumUpdateIntervalSettings::Custom(std::time::Duration::from_millis(
                1000 / cfg.fps.max(1) as u64,
            ))
        } else {
            MinimumUpdateIntervalSettings::Default
        };
        let settings = Settings::new(
            monitor,
            cursor_settings,
            border_settings,
            SecondaryWindowSettings::Default,
            interval_settings,
            DirtyRegionSettings::Default,
            ColorFormat::Bgra8,
            (cfg.clone(), shared.clone()),
        );
        let stop = cfg.stop.clone();
        let path = cfg.output_path.clone();
        let monitor_index = cfg.monitor_index;
        // 编码器先建好交给 pacing 线程（WGC 的 handler 里不再持编码器）
        let encoder = VideoEncoder::new(
            VideoSettingsBuilder::new(cfg.width, cfg.height)
                .sub_type(VideoSettingsSubType::H264)
                .frame_rate(cfg.fps)
                .bitrate(cfg.bitrate),
            // 音频在 audio.rs 里单独录 WAV，最后 ffmpeg 合成 —— 这里必须显式关闭，
            // 否则 MF 容器会写出一个空音轨，后续 amix 时还要额外丢弃。
            AudioSettingsBuilder::new().disabled(true),
            ContainerSettingsBuilder::default(),
            &cfg.output_path,
        )
        .map_err(|e| format!("编码器创建失败: {e}"))?;

        let control = match ScreenCaptureHandler::start_free_threaded(settings) {
            Ok(c) => c,
            Err(e) => {
                // 编码器 Drop 时会 finish 写出文件头——不删的话临时目录会留下
                // 一个没人认领的空 mp4 段
                let _ = std::fs::remove_file(&cfg.output_path);
                return Err(format!("WGC 启动失败: {e}"));
            }
        };
        let paced_stop = Arc::new(AtomicBool::new(false));
        let pacer = spawn_pacer(
            encoder,
            shared,
            paced_stop.clone(),
            clamp_fps(cfg.fps),
            cfg.frames.clone(),
        )?;
        log::info!(
            "WGC 采集段已启动（monitor #{}, {}x{}@{}）",
            cfg.monitor_index,
            cfg.width,
            cfg.height,
            cfg.fps
        );
        Ok(Active {
            control,
            stop,
            path,
            monitor_index,
            pacing: Some(pacer),
            paced_stop,
        })
    }

    /// 结束一段：停 pacing → finish 编码器 → 停 WGC 并 join → 校验产物
    ///
    /// 顺序不能反：pacing 线程是**唯一**向编码器送帧的人，必须等它退出并 finish 完
    /// 才能停 WGC —— 否则 WGC 线程退出时 handler 析构，编码器已经被 Drop 掉，
    /// pacing 线程再送帧就会撞上已关闭的通道。
    pub fn end_segment(active: Active) -> Result<String, String> {
        // 同 spawn_segment：finish/join 调用链深，挪到大栈线程防 tokio worker 溢栈
        let handle = std::thread::Builder::new()
            .name("wgc-end".into())
            .stack_size(16 * 1024 * 1024)
            .spawn(move || end_segment_inner(active))
            .map_err(|e| format!("采集收尾线程启动失败: {e}"))?;
        handle
            .join()
            .map_err(|_| "采集收尾线程 panic".to_string())?
    }

    /// join 带超时：正常退出返回 true；超时放弃等待并记日志（挂死的线程不再拖死
    /// 整条停止流程——代价是泄漏该线程及其看护线程，好过 recording_stop 永不返回）
    fn join_with_timeout(what: &'static str, h: std::thread::JoinHandle<()>) -> bool {
        let (tx, rx) = std::sync::mpsc::channel::<()>();
        let Ok(_join_watcher) = std::thread::Builder::new()
            .name(format!("{what}-join-watch"))
            .spawn(move || {
                let _ = h.join();
                let _ = tx.send(());
            })
        else {
            return false;
        };
        let done = rx
            .recv_timeout(std::time::Duration::from_secs(10))
            .is_ok();
        if !done {
            log::error!("{what} 线程 10s 内未退出，放弃等待（线程泄漏，停止流程继续）");
        }
        drop(_join_watcher);
        done
    }

    fn end_segment_inner(active: Active) -> Result<String, String> {
        let Active {
            control,
            stop,
            path,
            pacing,
            paced_stop,
            ..
        } = active;
        stop.store(true, Ordering::SeqCst);
        paced_stop.store(true, Ordering::SeqCst);
        if let Some(h) = pacing {
            join_with_timeout("wgc-pacer", h);
        }
        // control.stop() 会发 WM_QUIT 并 join（内部已处理线程已退出的竞态）
        let join = std::thread::spawn(move || control.stop().map_err(|e| format!("{e}")));
        let (tx, rx) = std::sync::mpsc::channel::<Result<(), String>>();
        let Ok(_stop_watcher) = std::thread::Builder::new()
            .name("wgc-stop-join-watch".into())
            .spawn(move || {
                let r = match join.join() {
                    Ok(inner) => inner.map_err(|e| format!("{e}")),
                    Err(_) => Err("WGC 停止线程 panic".to_string()),
                };
                let _ = tx.send(r);
            })
        else {
            return Err("WGC 停止看护线程启动失败".into());
        };
        match rx.recv_timeout(std::time::Duration::from_secs(10)) {
            Ok(Ok(())) => {}
            Ok(Err(e)) => log::warn!("WGC 停止时 join 报错: {e}"),
            Err(_) => log::error!("WGC 停止线程 10s 内未退出，放弃等待（继续后续合成）"),
        }
        // writer flush 后再判存在（finish 是同步的，这里只留一点余量）
        std::thread::sleep(std::time::Duration::from_millis(200));
        if std::path::Path::new(&path).exists() {
            Ok(path)
        } else {
            Err("编码器未产出文件".into())
        }
    }

    /// 显示器设备名 → WGC 枚举下标（0-based）。
    /// Tauri(tao) 与 windows-capture 都从 `GetMonitorInfoW` 拿 `\\.\DISPLAYn`，靠名字配对
    /// 才能保证两边下标一致（两套 EnumDisplayMonitors 的返回顺序不保证相同）。
    pub fn index_for_device_name(name: &str) -> Option<usize> {
        Monitor::enumerate()
            .ok()?
            .iter()
            .position(|m| m.device_name().map(|n| n == name).unwrap_or(false))
    }
}

#[cfg(feature = "screen-capture")]
pub use imp::{end_segment, index_for_device_name, spawn_segment};

// ==================== 无 feature 版本（空实现）====================
#[cfg(not(feature = "screen-capture"))]
pub mod imp {
    /// 无采集 feature 时的占位：字段与 feature 版同名同型，命令层无需 cfg 分支
    /// （mod.rs 的 end_all_segments 会读 monitor_index 登记产物）
    #[derive(Default)]
    pub struct Active {
        pub monitor_index: usize,
    }

    pub fn spawn_segment(_cfg: super::SegmentConfig) -> Result<Active, String> {
        Err("屏幕采集管线未编译（用 --features screen-capture 构建）".into())
    }

    pub fn end_segment(_active: Active) -> Result<String, String> {
        Err("采集管线未编译".into())
    }

    pub fn index_for_device_name(_name: &str) -> Option<usize> {
        None
    }
}

#[cfg(not(feature = "screen-capture"))]
pub use imp::{end_segment, index_for_device_name, spawn_segment};

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn bitrate_1080p_high_is_baseline() {
        assert_eq!(bitrate_for("high", 1920, 1080), 5_000_000);
    }

    #[test]
    fn bitrate_1080p_medium_and_low_scale() {
        assert_eq!(bitrate_for("medium", 1920, 1080), 3_500_000);
        assert_eq!(bitrate_for("low", 1920, 1080), 2_000_000);
    }

    #[test]
    fn bitrate_4k_has_extra_steps() {
        // (3840*2160 − 1920*1080) / (640*480) = 20.25 → round 20 → 5Mbps + 20×3Mbps
        assert_eq!(bitrate_for("high", 3840, 2160), 5_000_000 + 20 * 3_000_000);
    }

    #[test]
    fn bitrate_below_1080p_has_no_negative_steps() {
        assert_eq!(bitrate_for("high", 1280, 720), 5_000_000);
    }

    #[test]
    fn fps_clamped_to_sane_range() {
        assert_eq!(clamp_fps(0), 5);
        assert_eq!(clamp_fps(30), 30);
        assert_eq!(clamp_fps(240), 120);
    }

    #[test]
    fn enabled_flag_matches_feature() {
        assert_eq!(ENABLED, cfg!(feature = "screen-capture"));
    }

    #[cfg(not(feature = "screen-capture"))]
    #[test]
    fn disabled_returns_error() {
        let cfg = SegmentConfig {
            output_path: String::new(),
            width: 1,
            height: 1,
            fps: 30,
            bitrate: 1,
            with_cursor: false,
            monitor_index: 0,
            stop: Arc::new(AtomicBool::new(false)),
            frames: Arc::new(AtomicU64::new(0)),
        };
        assert!(spawn_segment(cfg).is_err());
        assert!(index_for_device_name("\\\\.\\DISPLAY1").is_none());
    }

    /// 真机冒烟：实起一段 WGC 采集，录约 3 秒，校验产出 mp4 非空且帧数 > 0。
    ///
    /// 需真实桌面会话（远程/无头会话下 WGC 会失败），故 `#[ignore]` 默认不跑。
    /// 手动执行：`cargo test --test unit -- --ignored --nocapture wgc_smoke`
    #[cfg(feature = "screen-capture")]
    #[test]
    #[ignore = "需要真实桌面会话；手动用 --ignored 跑"]
    fn wgc_smoke_records_playable_file() {
        let out = std::env::temp_dir().join("muerzhi_wgc_smoke.mp4");
        let _ = std::fs::remove_file(&out);
        let cfg = SegmentConfig {
            output_path: out.to_string_lossy().to_string(),
            width: 1920,
            height: 1080,
            fps: 30,
            bitrate: 5_000_000,
            with_cursor: false,
            monitor_index: 0,
            stop: Arc::new(AtomicBool::new(false)),
            frames: Arc::new(AtomicU64::new(0)),
        };
        let frames = cfg.frames.clone();
        let active = spawn_segment(cfg).expect("WGC 应能启动");
        let t0 = std::time::Instant::now();
        std::thread::sleep(std::time::Duration::from_secs(3));
        let path = end_segment(active).expect("应产出 mp4");
        let wall = t0.elapsed().as_secs_f64();
        let size = std::fs::metadata(&path).map(|m| m.len()).unwrap_or(0);
        assert!(size > 10_000, "mp4 过小（{size} 字节），编码器没真正写入");
        let n = frames.load(Ordering::SeqCst);
        // 定速补帧后帧数应≈fps×秒数（静态桌面也照推）；这条断言就是防「录 3 秒得 1 帧」
        assert!(n >= 60, "补帧失效：3 秒只有 {n} 帧");
        assert!(n <= 120, "补帧过头：3 秒推了 {n} 帧");

        // 时长必须贴合墙钟（静置桌面下 WGC 不投帧，靠补帧才对得上）
        let bin = crate::modules::media::ffmpeg::ffmpeg_bin_fallback();
        let probe = String::from_utf8_lossy(
            &std::process::Command::new(&bin)
                .args(["-i", &path])
                .output()
                .unwrap()
                .stderr,
        )
        .to_string();
        let dur = probe
            .lines()
            .find_map(|l| l.trim().strip_prefix("Duration:"))
            .and_then(|s| s.split(',').next())
            .map(|s| s.trim().to_string())
            .unwrap_or_default();
        println!("WGC 冒烟：{path}（{size} 字节，{n} 帧，时长 {dur}，墙钟 {wall:.1}s）");
        assert!(
            dur.starts_with("00:00:02") || dur.starts_with("00:00:03"),
            "时长 {dur} 与录制时长 {wall:.1}s 不符"
        );
        let _ = std::fs::remove_file(&path);
    }
}
