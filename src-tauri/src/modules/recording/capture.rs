// 屏幕采集管线 — Windows Graphics Capture（windows-capture crate）
//
// P4 定型设计（依据 windows-capture 2.x 能力实测）：
//   视频：WGC 帧泵（GraphicsCaptureApiHandler::on_frame_arrived）→ 内置 VideoEncoder
//         （MediaFoundation 硬编）直出 mp4
//   音频：WGC capture session 自带 loopback → AudioSettingsBuilder（AAC）
//   停止：recording_stop 置 stop_flag → on_frame_arrived 停止分支 encoder.finish() +
//         capture_control.stop()（发 WM_QUIT 结束消息循环）→ control.stop() join → mp4 完整
//
// feature 开关：无 screen-capture 时用空实现（命令返回明确错误），UI 可提示。

/// WGC + WASAPI 是否编译可用（feature 开关）
#[allow(dead_code)] // 保留：capture 内部检查 + 未来 UI 查询
pub const ENABLED: bool = cfg!(feature = "screen-capture");

use std::sync::atomic::{AtomicBool, Ordering};
#[allow(unused_imports)]
use std::sync::Mutex;

// ===== PAUSED（两模式共用）=====
static PAUSED: AtomicBool = AtomicBool::new(false);

pub fn pause_current() {
    PAUSED.store(true, Ordering::SeqCst);
}

pub fn resume_current() {
    PAUSED.store(false, Ordering::SeqCst);
}

// ==================== feature 版本 ====================
#[cfg(feature = "screen-capture")]
mod imp {
    use std::sync::Mutex;
    use super::*;
    use windows_capture::capture::{
        CaptureControl, Context, GraphicsCaptureApiHandler,
    };
    use windows_capture::encoder::{
        AudioSettingsBuilder, ContainerSettingsBuilder, VideoEncoder, VideoSettingsBuilder,
    };
    use windows_capture::frame::Frame;
    use windows_capture::graphics_capture_api::InternalCaptureControl;
    use windows_capture::monitor::Monitor;
    use windows_capture::settings::{
        ColorFormat, CursorCaptureSettings, DirtyRegionSettings, DrawBorderSettings,
        MinimumUpdateIntervalSettings, SecondaryWindowSettings, Settings,
    };

    /// WGC 采集器：on_frame_arrived 把帧送进 MediaFoundation 编码器，写 mp4
    pub struct ScreenCaptureHandler {
        pub encoder: Option<VideoEncoder>,
        pub frame_count: u64,
    }

    impl GraphicsCaptureApiHandler for ScreenCaptureHandler {
        type Flags = (String,);
        type Error = Box<dyn std::error::Error + Send + Sync>;

        fn new(ctx: Context<Self::Flags>) -> Result<Self, Self::Error> {
            let output_path = ctx.flags.0.clone();
            let encoder = VideoEncoder::new(
                VideoSettingsBuilder::new(1920, 1080),
                AudioSettingsBuilder::default(),
                ContainerSettingsBuilder::default(),
                &output_path,
            )?;
            Ok(Self { encoder: Some(encoder), frame_count: 0 })
        }

        fn on_frame_arrived(
            &mut self,
            frame: &mut Frame,
            capture_control: InternalCaptureControl,
        ) -> Result<(), Self::Error> {
            // 暂停期间跳帧（编码器时间轴由 WGC 帧时间戳维持）
            if PAUSED.load(Ordering::SeqCst) {
                return Ok(());
            }
            // stop 信号：finish + 停止消息循环
            if CaptureHandles::global().stop_flag.load(Ordering::SeqCst) {
                if let Some(enc) = self.encoder.take() {
                    enc.finish()?;
                }
                capture_control.stop();
                return Ok(());
            }
            if let Some(enc) = self.encoder.as_mut() {
                enc.send_frame(frame)?;
                self.frame_count += 1;
            }
            Ok(())
        }

        fn on_closed(&mut self) -> Result<(), Self::Error> {
            if let Some(enc) = self.encoder.take() {
                enc.finish()?;
            }
            Ok(())
        }
    }

    pub type Control =
        CaptureControl<ScreenCaptureHandler, Box<dyn std::error::Error + Send + Sync>>;

    /// 采集会话句柄（存全局，stop 时消费 control）
    pub struct CaptureHandles {
        pub stop_flag: AtomicBool,
        pub output_path: Mutex<String>,
        pub control: Mutex<Option<Control>>,
    }

    #[allow(dead_code)]
    impl CaptureHandles {
        pub fn global() -> &'static CaptureHandles {
            use std::sync::OnceLock;
            static S: OnceLock<CaptureHandles> = std::sync::OnceLock::new();
            S.get_or_init(|| CaptureHandles {
                stop_flag: AtomicBool::new(false),
                output_path: Mutex::new(String::new()),
                control: Mutex::new(None),
            })
        }

        pub fn reset(&self, output_path: &str) {
            self.stop_flag.store(false, Ordering::SeqCst);
            *self.output_path.lock().unwrap() = output_path.to_string();
            PAUSED.store(false, Ordering::SeqCst);
            *self.control.lock().unwrap() = None;
        }
    }

    /// 启动屏幕采集（WGC 帧泵 → mp4）
    pub async fn spawn_screen_capture(
        _app: &tauri::AppHandle,
        session_id: &str,
        target_display_id: Option<u32>,
        with_mic: bool,
        with_sys: bool,
    ) -> Result<(), String> {
        let _ = (with_mic, with_sys);
        let output_path = std::env::temp_dir()
            .join(format!("muerzhi_rec_{session_id}.mp4"))
            .to_string_lossy()
            .to_string();
        CaptureHandles::global().reset(&output_path);

        // 选定显示器（None/0=主屏，其他=枚举下标）
        let monitor = if target_display_id.unwrap_or(0) == 0 {
            Monitor::primary().map_err(|e| format!("primary monitor failed: {e}"))?
        } else {
            Monitor::from_index(target_display_id.unwrap() as usize)
                .map_err(|e| format!("monitor #{target_display_id:?} failed: {e}"))?
        };

        let settings = Settings::new(
            monitor,
            CursorCaptureSettings::WithoutCursor,
            DrawBorderSettings::WithoutBorder,
            SecondaryWindowSettings::Default,
            MinimumUpdateIntervalSettings::Default,
            DirtyRegionSettings::Default,
            ColorFormat::Rgba8,
            (output_path.clone(),),
        );

        // 异步启动 WGC 帧泵（独立线程）
        let control = ScreenCaptureHandler::start_free_threaded(settings)
            .map_err(|e| format!("WGC start failed: {e}"))?;
        // CaptureControl 存全局（stop 时消费）
        *CaptureHandles::global().control.lock().unwrap() = Some(control);
        log::info!("WGC capture started (session {session_id})");
        Ok(())
    }

    /// 停止采集：置 stop_flag → on_frame_arrived 停止分支 encoder.finish() →
    /// control.stop()（halt → WM_QUIT → join）→ 等文件落盘
    pub async fn stop_current() -> Result<String, String> {
        let handles = CaptureHandles::global();
        handles.stop_flag.store(true, Ordering::SeqCst);
        let control = handles.control.lock().unwrap().take();
        if let Some(control) = control {
            // stop 是阻塞 join，放 blocking 池
            let join = tokio::task::spawn_blocking(move || control.stop().map_err(|e| format!("{e}")))
                .await
                .map_err(|e| format!("join spawn failed: {e}"))?;
            if let Err(e) = join {
                log::warn!("WGC stop join: {e}");
            }
        }
        let path = handles.output_path.lock().unwrap().clone();
        if std::path::Path::new(&path).exists() {
            // 再等一拍让 writer flush 完
            tokio::time::sleep(std::time::Duration::from_millis(300)).await;
            return Ok(path);
        }
        Err("encoder 未在期限内产出文件".into())
    }
}

#[cfg(feature = "screen-capture")]
pub use imp::{spawn_screen_capture, stop_current};

// ==================== 无 feature 版本（空实现）====================
#[cfg(not(feature = "screen-capture"))]
mod imp {
    use std::sync::Mutex;
    use std::sync::atomic::{AtomicBool, Ordering};
    #[allow(dead_code)] // 保持与 feature 版同接口，命令层无需 cfg 分支
    pub struct CaptureHandles {
        pub stop_flag: AtomicBool,
        pub output_path: Mutex<String>,
        pub control: Mutex<Option<()>>,
    }

    #[allow(dead_code)]
    impl CaptureHandles {
        pub fn global() -> &'static CaptureHandles {
            use std::sync::OnceLock;
            static S: OnceLock<CaptureHandles> = std::sync::OnceLock::new();
            S.get_or_init(|| CaptureHandles {
                stop_flag: AtomicBool::new(false),
                output_path: Mutex::new(String::new()),
                control: Mutex::new(None),
            })
        }
        pub fn reset(&self, _output_path: &str) {
            self.stop_flag.store(false, Ordering::SeqCst);
            *self.output_path.lock().unwrap() = String::new();
        }
    }

    pub async fn spawn_screen_capture(
        _app: &tauri::AppHandle,
        _session_id: &str,
        _target_display_id: Option<u32>,
        _with_mic: bool,
        _with_sys: bool,
    ) -> Result<(), String> {
        Err("屏幕采集管线未编译（用 --features screen-capture 构建）".into())
    }

    pub async fn stop_current() -> Result<String, String> {
        Err("采集管线未编译".into())
    }
}

#[cfg(not(feature = "screen-capture"))]
pub use imp::{spawn_screen_capture, stop_current};