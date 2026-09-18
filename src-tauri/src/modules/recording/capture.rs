// 屏幕采集 — Windows Graphics Capture + WASAPI 音频
//
// P4 分两步落地：
//   1. 帧泵与音频采集（本文件）——依赖 windows-capture / wasapi crate
//   2. ffmpeg 管线（rawvideo pipe + amix）——与 media/ffmpeg.rs 共用 ffmpeg_bin
//
// 当前为骨架：依赖未启用（feature "capture"），start 返回明确错误让 UI 提示未就绪，
// 录制会话状态机先跑通。启用步骤见 mod.rs 顶部注释。

use tauri::AppHandle;

/// WGC + WASAPI 是否编译可用（feature 开关）
pub const ENABLED: bool = cfg!(feature = "screen-capture");

static PAUSED: std::sync::atomic::AtomicBool = std::sync::atomic::AtomicBool::new(false);

/// 启动屏幕采集（含音频）。未启用 feature 时返回明确错误。
pub async fn spawn_screen_capture(
    _app: &AppHandle,
    _session_id: &str,
    _target_display_id: Option<u32>,
    _with_mic: bool,
    _with_sys: bool,
) -> Result<(), String> {
    if !ENABLED {
        return Err("屏幕采集管线尚未启用（P4 screen-capture feature 待开启）".into());
    }
    // TODO(P4): WGC 帧泵 + WASAPI loopback/mic 双路 PCM pipe → ffmpeg
    //   ffmpeg args: -f rawvideo -pix_fmt bgra -s WxH -r 30 -i pipe:0
    //                (-f wasapi -i loopback) (-f wasapi -i <mic>) -filter_complex amix
    //                -c:v h264_nvenc/-libx264 -movflags +faststart out.mp4
    Ok(())
}

pub fn pause_current() {
    PAUSED.store(true, std::sync::atomic::Ordering::SeqCst);
}

pub fn resume_current() {
    PAUSED.store(false, std::sync::atomic::Ordering::SeqCst);
}

/// 停止采集：ffmpeg graceful shutdown（q 键 / kill -INT），返回输出路径
pub async fn stop_current() -> Result<String, String> {
    if !ENABLED {
        return Err("采集管线未启用，无在途录制可停止".into());
    }
    Err("no active capture".into())
}