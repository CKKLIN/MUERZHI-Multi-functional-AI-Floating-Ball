// 录制会话（P4）— Rust 原生采集管线编排
//
// 架构：
//   屏幕：Windows Graphics Capture（capture.rs）逐帧 → MediaFoundation 编码器直出 mp4
//   声音：WASAPI 麦克风 + 系统声 loopback（audio.rs）各路录 48k/16bit 立体声 WAV
//   暂停：**分段**——暂停结束当前段，恢复起新段，停止后 ffmpeg concat（与 Electron 版
//         MediaRecorder.pause() 一样：暂停时长不出现在成品里，且界面计时器与视频时长一致）
//   区域：录全屏 → ffmpeg crop 后期裁剪（与 TS 版一致，WGC 无法只捕获屏幕子矩形）
//   多屏：每显示器一条 WGC 段链 → 各自 concat → ffmpeg merge_multi_screen 叠加
//   合成：视频 concat/crop/merge 之后，再与音频 WAV 混流（单路直接 mux，两路 amix）
//
// 摄像头画中画 / 画笔标注：渲染层负责采集（见 useRecording 的摄像头流与画笔 canvas），
// 停止后经 `recording_composite_overlays` 交由 ffmpeg overlay 合成。
//
// 电平：audio.rs 的 RMS 由 ticker 以 20Hz 推给原生窗口与渲染层音量表（见 level_ticker）。

pub mod audio;
pub mod capture;
pub mod grab;

use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicU8, Ordering};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager};

/// 录制会话参数（invoke 的 camelCase 字段名由 serde 映射）
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StartOptions {
    /// 目标显示器（Tauri available_monitors 下标；None = 主屏）
    pub target_display_id: Option<u32>,
    /// 多屏录制：每项是一个显示器下标；非空时忽略 target_display_id
    #[serde(default)]
    pub display_ids: Vec<u32>,
    pub with_mic: bool,
    pub with_sys: bool,
    pub mic_device_id: Option<String>,
    pub sys_device_id: Option<String>,
    /// "low" | "medium" | "high"
    pub quality: String,
    pub fps: u32,
    pub with_cursor: bool,
    /// 区域录制（逻辑像素，与选区窗上报的一致）
    pub region: Option<RegionRect>,
    /// 输出目录（渲染层设置项；空则用系统「视频」目录）
    pub output_dir: Option<String>,
    /// 摄像头画中画开关（渲染层把预览窗录成 webm 后，停止时由 ffmpeg 叠加）
    #[serde(default)]
    pub with_camera: bool,
    /// 画中画在成品画面里的位置与尺寸（物理像素，相对录制画面左上角）
    #[serde(default)]
    pub camera_rect: Option<CameraRect>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CameraRect {
    pub x: i32,
    pub y: i32,
    pub width: i32,
    pub height: i32,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RegionRect {
    pub x: i32,
    pub y: i32,
    pub width: i32,
    pub height: i32,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RecordingStatus {
    /// idle | recording | paused | converting
    pub state: String,
    pub frames: u64,
    pub tracks: usize,
    pub elapsed_sec: u64,
}

/// 会话内部状态
struct SessionInner {
    id: String,
    options: StartOptions,
    started_at: std::time::Instant,
    /// 已累计的录制时长（不含暂停），用于 elapsed
    accumulated: std::time::Duration,
    /// 段序号：每次恢复 +1，用于临时文件名与音频前缀（暂停分段靠它区分）
    part: usize,
    audio: Option<audio::AudioSession>,
}

#[derive(Debug, Default)]
pub struct SessionState {
    /// 0=idle 1=recording 2=paused 3=converting
    phase: AtomicU8,
    inner: Mutex<Option<SessionInner>>,
}

impl std::fmt::Debug for SessionInner {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("SessionInner")
            .field("id", &self.id)
            .field("part", &self.part)
            .finish()
    }
}

impl SessionState {
    pub fn global() -> &'static SessionState {
        use std::sync::OnceLock;
        static S: OnceLock<SessionState> = OnceLock::new();
        S.get_or_init(|| SessionState {
            phase: AtomicU8::new(0),
            inner: Mutex::new(None),
        })
    }

    pub fn phase(&self) -> u8 {
        self.phase.load(Ordering::SeqCst)
    }

    pub fn is_active(&self) -> bool {
        matches!(self.phase(), 1 | 2)
    }

    fn state_name(&self) -> &'static str {
        match self.phase() {
            1 => "recording",
            2 => "paused",
            3 => "converting",
            _ => "idle",
        }
    }
}

/// 输出目录：显式配置优先，其次系统「视频」目录，最后临时目录
fn resolve_output_dir(app: &AppHandle, configured: Option<&str>) -> std::path::PathBuf {
    if let Some(dir) = configured {
        if !dir.trim().is_empty() {
            let p = std::path::PathBuf::from(dir);
            if std::fs::create_dir_all(&p).is_ok() {
                return p;
            }
            log::warn!("输出目录不可用（{dir}），回退系统视频目录");
        }
    }
    if let Ok(p) = app.path().video_dir() {
        if std::fs::create_dir_all(&p).is_ok() {
            return p;
        }
    }
    std::env::temp_dir()
}

/// 文件时间戳（对齐 Electron：`2026-09-18_15-04-05` UTC）
fn file_stamp() -> String {
    let iso = crate::modules::todo::store::now_iso();
    let s: String = iso
        .replace(':', "-")
        .replace('.', "-")
        .replace('T', "_")
        .chars()
        .take(19)
        .collect();
    s
}

/// 显示器信息（物理像素 bounds + 尺寸 + 设备名）
struct DisplayTarget {
    index: usize,
    bounds: (i32, i32, i32, i32),
    size: (u32, u32),
}

fn resolve_displays(app: &AppHandle, options: &StartOptions) -> Result<Vec<DisplayTarget>, String> {
    let monitors = app.available_monitors().map_err(|e| format!("显示器枚举失败: {e}"))?;
    let wanted: Vec<usize> = if options.display_ids.is_empty() {
        vec![options.target_display_id.unwrap_or(0) as usize]
    } else {
        options.display_ids.iter().map(|d| *d as usize).collect()
    };
    let mut out = Vec::new();
    for idx in wanted {
        let m = monitors.get(idx).ok_or_else(|| format!("显示器 #{idx} 不存在"))?;
        out.push(DisplayTarget {
            index: idx,
            bounds: (m.position().x, m.position().y, m.size().width as i32, m.size().height as i32),
            size: (m.size().width, m.size().height),
        });
    }
    Ok(out)
}

/// WGC 采集段要用 windows-capture 自己的显示器下标：两套枚举顺序不保证一致，
/// 靠设备名（`\\.\DISPLAYn`）配对，配不上时退回同名下标。
fn wgc_index(app: &AppHandle, tauri_index: usize) -> usize {
    let name = app
        .available_monitors()
        .ok()
        .and_then(|ms| ms.get(tauri_index).and_then(|m| m.name().map(|s| s.to_string())));
    match name {
        Some(n) => capture::index_for_device_name(&n).unwrap_or(tauri_index),
        None => tauri_index,
    }
}

/// 启动一路（显示器）的采集段
fn spawn_track(
    app: &AppHandle,
    session_id: &str,
    target: &DisplayTarget,
    options: &StartOptions,
    part: usize,
) -> Result<(), String> {
    let out = std::env::temp_dir().join(format!(
        "muerzhi_seg_{session_id}_{}_{}.mp4",
        target.index, part
    ));
    let _ = std::fs::remove_file(&out);
    let cfg = capture::SegmentConfig {
        output_path: out.to_string_lossy().to_string(),
        width: target.size.0,
        height: target.size.1,
        fps: capture::clamp_fps(options.fps),
        bitrate: capture::bitrate_for(&options.quality, target.size.0, target.size.1),
        with_cursor: options.with_cursor,
        monitor_index: wgc_index(app, target.index),
        stop: std::sync::Arc::new(std::sync::atomic::AtomicBool::new(false)),
        frames: capture::CaptureHandles::global().frames.clone(),
    };
    let active = capture::spawn_segment(cfg)?;
    capture::CaptureHandles::global().active.lock().unwrap().push(active);
    Ok(())
}

/// 结束当前所有活跃段，把产物登记进对应 track
fn end_all_segments() {
    let handles = capture::CaptureHandles::global();
    let actives: Vec<capture::imp::Active> = handles.active.lock().unwrap().drain(..).collect();
    for active in actives {
        let monitor_index = active.monitor_index;
        match capture::end_segment(active) {
            Ok(path) => {
                if let Some(t) = handles.tracks.lock().unwrap().iter_mut().find(|t| t.monitor_index == monitor_index) {
                    t.segments.push(path);
                }
            }
            Err(e) => log::error!("结束采集段失败: {e}"),
        }
    }
}

// ===== 命令：开始 / 暂停 / 继续 / 停止 =====

/// 开始录制（对齐渲染层 on-toolbar-action start）
#[tauri::command]
#[allow(non_snake_case)]
pub async fn recording_start(app: AppHandle, options: StartOptions) -> Result<String, String> {
    let state = SessionState::global();
    if state.is_active() {
        return Err("已有录制会话在进行".into());
    }
    if !capture::ENABLED {
        return Err("录制管线未编译（需 --features screen-capture 构建）".into());
    }
    let displays = resolve_displays(&app, &options)?;
    if displays.is_empty() {
        return Err("没有可用的显示器".into());
    }

    let id = crate::modules::agent::state_machine::new_uuid_like();
    capture::CaptureHandles::global().reset();

    // 音频先起（起不来不阻塞视频：麦克风会回错误，系统声只记日志）
    let audio_session = if options.with_mic || options.with_sys {
        match audio::start(
            &id,
            options.with_mic,
            options.with_sys,
            options.mic_device_id.clone(),
            options.sys_device_id.clone(),
        ) {
            Ok(s) => Some(s),
            Err(e) => {
                log::error!("音频采集启动失败（继续无声录制）: {e}");
                None
            }
        }
    } else {
        None
    };

    // 视频：逐显示器起段
    let mut started = Vec::new();
    for target in &displays {
        if let Err(e) = spawn_track(&app, &id, target, &options, 0) {
            // 任一路起不来：回滚已起的段，避免留下半场录制
            for t in &started {
                let _ = t;
            }
            end_all_segments();
            if let Some(a) = audio_session {
                let _ = a.stop();
            }
            return Err(e);
        }
        capture::CaptureHandles::global().add_track(wgc_index(&app, target.index), target.bounds);
        started.push(target.index);
    }

    // 摄像头画中画：预览窗自己录 webm（Rust 拿不到 WebView2 的摄像头流），
    // 停止时由 ffmpeg 叠加到主视频上
    if options.with_camera {
        let cam_path = std::env::temp_dir()
            .join(format!("muerzhi_cam_{id}.webm"))
            .to_string_lossy()
            .to_string();
        let _ = std::fs::remove_file(&cam_path);
        crate::modules::windows::region::start_camera_recording(&app, &cam_path);
    }

    *state.inner.lock().unwrap() = Some(SessionInner {
        id: id.clone(),
        options: options.clone(),
        started_at: std::time::Instant::now(),
        accumulated: std::time::Duration::ZERO,
        part: 0,
        audio: audio_session,
    });
    state.phase.store(1, Ordering::SeqCst);
    let _ = app.emit(
        "recording-state",
        serde_json::json!({"state": "recording", "id": id, "tracks": started.len()}),
    );
    log::info!("录制开始：session {id}，{} 路显示器", started.len());
    Ok(id)
}

/// 暂停：结束当前段（暂停时长不进成品），音频线程同步停掉
#[tauri::command]
pub async fn recording_pause(app: AppHandle) -> Result<(), String> {
    let state = SessionState::global();
    if state.phase() != 1 {
        return Err("当前不在录制中".into());
    }
    end_all_segments();
    // 独立作用域：MutexGuard 必须在 await 之前析构（跨 await 持有标准库 MutexGuard
    // 会让整个 future 变成 !Send，Tauri 命令编译不过）
    {
        let mut guard = state.inner.lock().unwrap();
        if let Some(s) = guard.as_mut() {
            s.accumulated += s.started_at.elapsed();
            // 音频暂停 = 停掉当前 WAV（与视频分段一致：暂停期间不产生音频）。
            // stop() 只回收空文件，有内容的 WAV 留在临时目录，停止时按前缀统一收集。
            if let Some(a) = s.audio.take() {
                let files = a.stop();
                log::info!("暂停：音频段收尾 {} 路", files.len());
            }
        }
    }
    // 摄像头段收尾（恢复时另起一段）。必须 await 完再置暂停态：若丢给后台线程，
    // 用户「暂停→立刻继续」会让新段的 MediaRecorder 与旧段的 stop 抢同一个文件。
    crate::modules::windows::region::stop_camera_recording(&app).await;
    state.phase.store(2, Ordering::SeqCst);
    let _ = app.emit("recording-state", serde_json::json!({"state": "paused"}));
    log::info!("录制已暂停（分段）");
    Ok(())
}

/// 继续：为每路显示器起新段 + 重开音频
#[tauri::command]
pub async fn recording_resume(app: AppHandle) -> Result<(), String> {
    let state = SessionState::global();
    if state.phase() != 2 {
        return Err("当前不在暂停中".into());
    }
    let (id, options, part) = {
        let mut guard = state.inner.lock().unwrap();
        let s = guard.as_mut().ok_or("会话已丢失")?;
        s.part += 1;
        (s.id.clone(), s.options.clone(), s.part)
    };
    let displays = resolve_displays(&app, &options)?;
    for target in &displays {
        spawn_track(&app, &id, target, &options, part)?;
    }
    {
        let mut guard = state.inner.lock().unwrap();
        if let Some(s) = guard.as_mut() {
            s.started_at = std::time::Instant::now();
            if options.with_mic || options.with_sys {
                // 暂停后的音频另起一段：文件名带 part 后缀，停止时按前缀一并收集。
                // part 补零到两位 —— collect_audio_files 按文件名排序还原时间顺序，
                // 不补零时 "10" 会排在 "2" 前面（第 10 次暂停的音频会插到第 2 次之前）。
                s.audio = audio::start(
                    &format!("{id}_p{part:02}"),
                    options.with_mic,
                    options.with_sys,
                    options.mic_device_id.clone(),
                    options.sys_device_id.clone(),
                )
                .ok();
            }
        }
    }
    // 摄像头另起一段（文件名带 part 后缀，与音频段同规则）
    if options.with_camera {
        let cam_path = std::env::temp_dir()
            .join(format!("muerzhi_cam_{id}_p{part:02}.webm"))
            .to_string_lossy()
            .to_string();
        let _ = std::fs::remove_file(&cam_path);
        crate::modules::windows::region::start_camera_recording(&app, &cam_path);
    }
    state.phase.store(1, Ordering::SeqCst);
    let _ = app.emit("recording-state", serde_json::json!({"state": "recording"}));
    log::info!("录制已继续（新段 #{part}）");
    Ok(())
}

/// 停止：结束采集 → 拼接/裁剪/合并 → 混流音频 → 输出到目标目录
#[tauri::command]
pub async fn recording_stop(app: AppHandle) -> Result<String, String> {
    let state = SessionState::global();
    let was_paused = state.phase() == 2;
    if !state.is_active() {
        return Err("没有进行中的录制".into());
    }
    state.phase.store(3, Ordering::SeqCst);
    let _ = app.emit("recording-state", serde_json::json!({"state": "converting"}));

    // 先让摄像头段落盘（webm 尾部还在写时合成会截短）
    crate::modules::windows::region::stop_camera_recording(&app).await;
    end_all_segments();
    let (id, options, elapsed_sec) = {
        let mut guard = state.inner.lock().unwrap();
        let s = guard.take().ok_or("会话已丢失")?;
        let elapsed = if was_paused {
            s.accumulated.as_secs()
        } else {
            (s.accumulated + s.started_at.elapsed()).as_secs()
        };
        if let Some(a) = s.audio {
            let files = a.stop();
            log::info!("停止：音频段收尾 {} 路", files.len());
        }
        (s.id, s.options, elapsed)
    };

    let handles = capture::CaptureHandles::global();
    let tracks: Vec<usize> = handles.tracks.lock().unwrap().iter().map(|t| t.monitor_index).collect();
    if tracks.is_empty() {
        state.phase.store(0, Ordering::SeqCst);
        return Err("本次录制没有产生任何画面".into());
    }

    let out_dir = resolve_output_dir(&app, options.output_dir.as_deref());
    let stamp = file_stamp();
    let final_name = format!("MUERZHI-{stamp}.mp4");
    let final_path = out_dir.join(&final_name);
    let final_str = final_path.to_string_lossy().to_string();

    // 1) 每路：多段 concat → 单路 mp4
    let mut track_videos: Vec<(usize, String, (i32, i32, i32, i32))> = Vec::new();
    for m in &tracks {
        let segs = handles.segments_of(*m);
        if segs.is_empty() {
            continue;
        }
        let merged = std::env::temp_dir()
            .join(format!("muerzhi_track_{id}_{m}.mp4"))
            .to_string_lossy()
            .to_string();
        let _ = std::fs::remove_file(&merged);
        let src = if segs.len() == 1 {
            segs[0].clone()
        } else {
            crate::modules::media::ffmpeg::concat_videos(&app, &segs, &merged)
                .await
                .map_err(|e| {
                    state.phase.store(0, Ordering::SeqCst);
                    format!("拼接录制段失败: {e}")
                })?;
            merged
        };
        track_videos.push((*m, src, handles.bounds_of(*m)));
    }
    if track_videos.is_empty() {
        state.phase.store(0, Ordering::SeqCst);
        return Err("采集段为空（可能是显示器不可捕获）".into());
    }

    // 2) 单路 → 区域裁剪（可选）；多路 → 叠加合并
    let video_only = std::env::temp_dir()
        .join(format!("muerzhi_videoonly_{id}.mp4"))
        .to_string_lossy()
        .to_string();
    let _ = std::fs::remove_file(&video_only);

    let cleanup_video: String;
    if track_videos.len() == 1 {
        let (_, src, _) = &track_videos[0];
        match options.region {
            Some(r) => {
                // 逻辑像素 → 物理像素（选区窗上报逻辑坐标，编码器按物理分辨率收帧）
                let scale = app
                    .available_monitors()
                    .ok()
                    .and_then(|ms| {
                        ms.get(options.target_display_id.unwrap_or(0) as usize)
                            .map(|m| m.scale_factor())
                    })
                    .unwrap_or(1.0);
                let crop = (
                    (r.x as f64 * scale).round() as i32,
                    (r.y as f64 * scale).round() as i32,
                    (r.width as f64 * scale).round() as i32,
                    (r.height as f64 * scale).round() as i32,
                );
                crate::modules::media::ffmpeg::crop_video(&app, src, &video_only, crop)
                    .await
                    .map_err(|e| {
                        state.phase.store(0, Ordering::SeqCst);
                        format!("区域裁剪失败: {e}")
                    })?;
                cleanup_video = video_only.clone();
            }
            None => cleanup_video = src.clone(),
        }
    } else {
        let inputs: Vec<crate::modules::media::ffmpeg::MergeInput> = track_videos
            .iter()
            .map(|(_, path, bounds)| crate::modules::media::ffmpeg::MergeInput {
                file_path: path.clone(),
                bounds: *bounds,
            })
            .collect();
        crate::modules::media::ffmpeg::merge_multi_screen(&app, &inputs, &video_only)
            .await
            .map_err(|e| {
                state.phase.store(0, Ordering::SeqCst);
                format!("多屏合并失败: {e}")
            })?;
        cleanup_video = video_only.clone();
    }

    // 2.5) 摄像头画中画叠加（渲染层录的 webm → 主视频左上角/右下角小窗）
    let camera_webm = collect_camera_files(&id);
    let composited: String;
    if options.with_camera && !camera_webm.is_empty() {
        let with_cam = std::env::temp_dir()
            .join(format!("muerzhi_withcam_{id}.mp4"))
            .to_string_lossy()
            .to_string();
        let _ = std::fs::remove_file(&with_cam);
        // 位置：渲染层给了 rect 就用它；否则默认右下角留 16px 边距。
        // 渲染层给的是**物理像素**（与 crop/merge 后的成品画面同域），直接用。
        let rect = options.camera_rect.map(|r| (r.x, r.y, r.width, r.height)).unwrap_or_else(|| {
            let (vw, vh) = probe_video_size(&cleanup_video);
            (vw - 336, vh - 268, 320, 240)
        });
        // 暂停产生的多段摄像头 webm 先拼成一个（同参数段，无损 copy 即可；容器必须是
        // mkv —— MediaRecorder 出的是 VP8/VP9，mp4 装不下 VP8 会直接写不出文件头）
        let cam_src = if camera_webm.len() == 1 {
            camera_webm[0].clone()
        } else {
            let joined = std::env::temp_dir()
                .join(format!("muerzhi_camjoin_{id}.mkv"))
                .to_string_lossy()
                .to_string();
            let _ = std::fs::remove_file(&joined);
            crate::modules::media::ffmpeg::concat_videos(&app, &camera_webm, &joined)
                .await
                .map_err(|e| {
                    state.phase.store(0, Ordering::SeqCst);
                    format!("摄像头分段拼接失败: {e}")
                })?;
            joined
        };
        let cam_size = std::fs::metadata(&cam_src).map(|m| m.len()).unwrap_or(0);
        log::info!(
            "画中画合成：摄像头段 {cam_size} 字节，位置 {rect:?}，帧率 {}",
            capture::clamp_fps(options.fps)
        );
        crate::modules::media::ffmpeg::overlay_camera(
            &app,
            &cleanup_video,
            &cam_src,
            rect,
            options.fps,
            &with_cam,
        )
            .await
            .map_err(|e| {
                state.phase.store(0, Ordering::SeqCst);
                format!("摄像头合成失败: {e}")
            })?;
        composited = with_cam;
    } else {
        composited = cleanup_video.clone();
    }

    // 3) 混流音频（无音频 → remux 到 mp4 收尾）
    let (mic_files, sys_files) = collect_audio_files(&id);
    crate::modules::media::ffmpeg::mux_audio(&app, &composited, &mic_files, &sys_files, &final_str)
        .await
        .map_err(|e| {
            state.phase.store(0, Ordering::SeqCst);
            format!("音频混流失败: {e}")
        })?;

    // 4) 清理临时文件（录制段/音频/中间产物）
    // 设 MUERZHI_KEEP_TEMP=1 可保留全部中间产物（排查画中画/音频合成问题用）
    let keep_temp = std::env::var("MUERZHI_KEEP_TEMP").map(|v| v == "1").unwrap_or(false);
    if keep_temp {
        log::warn!("MUERZHI_KEEP_TEMP=1：保留中间产物（段/音频/摄像头/叠加件）");
    }
    if !keep_temp {
        for (_, path, _) in &track_videos {
            if path.contains(&id) {
                let _ = std::fs::remove_file(path);
            }
        }
        for f in mic_files.iter().chain(sys_files.iter()) {
            let _ = std::fs::remove_file(f);
        }
        if cleanup_video != final_str {
            let _ = std::fs::remove_file(&cleanup_video);
        }
        if composited != cleanup_video && composited != final_str {
            let _ = std::fs::remove_file(&composited);
        }
        for f in &camera_webm {
            let _ = std::fs::remove_file(f);
        }
    }

    state.phase.store(0, Ordering::SeqCst);
    capture::CaptureHandles::global().reset();
    let _ = app.emit(
        "recording-stopped",
        serde_json::json!({"id": id, "outputPath": final_str, "elapsed": elapsed_sec, "fileName": final_name}),
    );
    log::info!("录制完成: {final_str}（{elapsed_sec}s）");
    Ok(final_str)
}

/// 收集本次会话的摄像头分段（命名规则见 recording_start/resume，排序即时间顺序）
fn collect_camera_files(session_id: &str) -> Vec<String> {
    let prefix = format!("muerzhi_cam_{session_id}");
    let mut out: Vec<String> = Vec::new();
    if let Ok(entries) = std::fs::read_dir(std::env::temp_dir()) {
        for e in entries.flatten() {
            let name = e.file_name().to_string_lossy().to_string();
            if name.starts_with(&prefix) && name.ends_with(".webm") {
                let path = e.path();
                // 空文件（摄像头没起来）直接跳过，别把 overlay 喂挂
                if std::fs::metadata(&path).map(|m| m.len() > 1024).unwrap_or(false) {
                    out.push(path.to_string_lossy().to_string());
                }
            }
        }
    }
    out.sort();
    out
}

/// 读视频宽高（ffmpeg -i 的 stderr 面板；解析失败回退 1920×1080）
fn probe_video_size(path: &str) -> (i32, i32) {
    let bin = crate::modules::media::ffmpeg::ffmpeg_bin_fallback();
    let Ok(out) = std::process::Command::new(bin).args(["-i", path]).output() else {
        return (1920, 1080);
    };
    let text = String::from_utf8_lossy(&out.stderr);
    for line in text.lines() {
        if let Some(idx) = line.find("Video:") {
            // 形如 "... , 2560x1440 [SAR 1:1 ..." / "..., 1920x1080 (default)"
            for token in line[idx..].split([',', ' ']) {
                let t = token.trim().trim_start_matches('(');
                if let Some((w, h)) = t.split_once('x') {
                    if let (Ok(w), Ok(h)) = (w.parse::<i32>(), h.parse::<i32>()) {
                        if w > 0 && h > 0 {
                            return (w, h);
                        }
                    }
                }
            }
        }
    }
    (1920, 1080)
}

/// 收集本次会话的音频 WAV：麦克风与系统声各一路列表（覆盖暂停产生的多段）
///
/// 命名规则见 audio::start —— 首段 `muerzhi_mic_{id}.wav`，恢复段
/// `muerzhi_mic_{id}_p{n}.wav`，同源文件排序后即为时间顺序。
fn collect_audio_files(session_id: &str) -> (Vec<String>, Vec<String>) {
    let mic_prefix = format!("muerzhi_mic_{session_id}");
    let sys_prefix = format!("muerzhi_sys_{session_id}");
    let mut mic: Vec<String> = Vec::new();
    let mut sys: Vec<String> = Vec::new();
    if let Ok(entries) = std::fs::read_dir(std::env::temp_dir()) {
        for e in entries.flatten() {
            let name = e.file_name().to_string_lossy().to_string();
            if !name.ends_with(".wav") {
                continue;
            }
            let path = e.path().to_string_lossy().to_string();
            if name.starts_with(&mic_prefix) {
                mic.push(path);
            } else if name.starts_with(&sys_prefix) {
                sys.push(path);
            }
        }
    }
    mic.sort();
    sys.sort();
    (mic, sys)
}

/// 会话状态（渲染层轮询用：文档隐藏时 setInterval 会被节流，UI 恢复时以此校正）
#[tauri::command]
pub fn recording_get_status() -> RecordingStatus {
    let state = SessionState::global();
    let guard = state.inner.lock().unwrap();
    let (elapsed, tracks) = match guard.as_ref() {
        Some(s) => {
            let extra = if state.phase() == 1 { s.started_at.elapsed() } else { std::time::Duration::ZERO };
            ((s.accumulated + extra).as_secs(), capture::CaptureHandles::global().track_count())
        }
        None => (0, 0),
    };
    RecordingStatus {
        state: state.state_name().to_string(),
        frames: capture::CaptureHandles::global().frame_count(),
        tracks,
        elapsed_sec: elapsed,
    }
}

// ===== 音频电平推送（P4-e）=====

/// 20Hz 把 RMS 电平推给原生窗口（工具条/悬浮岛音量表）与渲染层（AudioMeter）
///
/// 原生窗口用 `win.eval('window.updateMeter(...)')` —— 与 set_island_state /
/// update_toolbar_state 同机制，无额外事件通道；两个原生窗口的音量表都只画麦克风
/// （系统声没有可视表盘），故只推 mic；系统声电平随 `audio-levels` 事件给渲染层。
/// 未在录制且电平全零时跳过一次推送（省掉每 50ms 一次跨进程 eval）。
pub fn spawn_level_ticker(app: AppHandle) {
    tauri::async_runtime::spawn(async move {
        let mut tick = tokio::time::interval(std::time::Duration::from_millis(50));
        loop {
            tick.tick().await;
            let mic = crate::modules::recording::audio::mic_level();
            let sys = crate::modules::recording::audio::sys_level();
            let recording = SessionState::global().is_active();
            if !recording && mic == 0.0 && sys == 0.0 {
                continue;
            }
            let script = format!("window.updateMeter && window.updateMeter({mic:.4}); void 0;");
            for label in ["floating-island", "island"] {
                if let Some(win) = app.get_webview_window(label) {
                    let _ = win.eval(&script);
                }
            }
            let _ = app.emit("audio-levels", serde_json::json!({"mic": mic, "sys": sys}));
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn file_stamp_matches_electron_shape() {
        let s = file_stamp();
        // 期望 `YYYY-MM-DD_HH-MM-SS`（19 字符）
        assert_eq!(s.len(), 19, "stamp={s}");
        assert_eq!(&s[4..5], "-");
        assert_eq!(&s[10..11], "_");
        assert_eq!(&s[13..14], "-");
        assert_eq!(&s[16..17], "-");
        assert!(!s.contains(':'), "冒号不能进文件名: {s}");
    }

    #[test]
    fn idle_state_reports_idle() {
        // 测试进程未开始录制
        let st = recording_get_status();
        assert_eq!(st.state, "idle");
        assert_eq!(st.tracks, 0);
    }

    #[test]
    fn collect_audio_files_ignores_other_sessions() {
        let (mic, sys) = collect_audio_files("no-such-session-id-xyz");
        assert!(mic.is_empty());
        assert!(sys.is_empty());
    }

    /// 真机冒烟：摄像头画中画叠加（主 mp4 + 摄像头 webm → 叠加后的 mp4）。
    /// 手动执行：`cargo test --test unit -- --ignored --nocapture camera_overlay`
    #[test]
    #[ignore = "起 ffmpeg 子进程造素材；手动用 --ignored 跑"]
    fn camera_overlay_smoke() {
        use crate::modules::media::ffmpeg;
        let bin = ffmpeg::ffmpeg_bin_fallback();
        if !bin.exists() {
            eprintln!("跳过：找不到内置 ffmpeg");
            return;
        }
        let dir = std::env::temp_dir();
        let mk = |n: &str| dir.join(format!("muerzhi_cam_{n}"));
        let main_v = mk("main.mp4");
        let cam_v = mk("cam.webm");
        let out = mk("out.mp4");
        for p in [&main_v, &cam_v, &out] {
            let _ = std::fs::remove_file(p);
        }

        // 主视频：320×240 纯黑 2 秒；摄像头：160×120 纯白 2 秒（VP9 webm）
        let black = vec![0u8; 320 * 240 * 4 * 60];
        let white = vec![255u8; 160 * 120 * 4 * 60];
        // 先确认渲染层 MediaRecorder 产出的 VP8/VP9 能解码（精简 ffmpeg 只编了解码器，
        // 没编 libvpx 编码器 —— 所以下面造素材只能退而用 H264/matroska，但**解码能力**
        // 这条断言才是生产路径真正依赖的）。
        let decoders = String::from_utf8_lossy(
            &std::process::Command::new(&bin).arg("-decoders").output().unwrap().stdout,
        )
        .to_string();
        assert!(decoders.contains("vp8") && decoders.contains("vp9"), "缺少 VP8/VP9 解码器，摄像头 webm 无法合成");

        // 摄像头素材容器用 matroska（webm 是其子集，读取走同一 demuxer）
        for (path, buf, w, h, extra) in [
            (&main_v, &black, 320, 240, vec!["-c:v", "libx264"]),
            (&cam_v, &white, 160, 120, vec!["-c:v", "libx264", "-f", "matroska"]),
        ] {
            let raw = mk(&format!("{}.raw", path.file_stem().unwrap().to_string_lossy()));
            std::fs::write(&raw, buf).expect("写 raw");
            let mut args: Vec<String> = vec![
                "-y".into(), "-loglevel".into(), "error".into(),
                "-f".into(), "rawvideo".into(), "-pix_fmt".into(), "bgra".into(),
                "-s".into(), format!("{w}x{h}"), "-r".into(), "30".into(),
                "-i".into(), raw.to_string_lossy().to_string(),
            ];
            args.extend(extra.iter().map(|s| s.to_string()));
            args.push("-pix_fmt".into());
            args.push("yuv420p".into());
            args.push(path.to_string_lossy().to_string());
            let res = std::process::Command::new(&bin).args(&args).output().expect("造素材");
            let _ = std::fs::remove_file(&raw);
            assert!(res.status.success(), "造素材失败: {}", String::from_utf8_lossy(&res.stderr));
        }

        block_on(async {
            ffmpeg::overlay_camera_core(
                None,
                &main_v.to_string_lossy(),
                &cam_v.to_string_lossy(),
                (160, 100, 120, 90),
                30,
                &out.to_string_lossy(),
            )
            .await
            .expect("画中画叠加应成功");
        });

        // 暂停产生的多段摄像头必须能无损拼起来 —— 且容器只能是 mkv/matroska：
        // MediaRecorder 出的是 VP8/VP9，`-c copy` 进 mp4 会因 "Could not find tag for
        // codec vp8" 直接写不出文件头。这条正是 recording_stop 里 camjoin 的真实命令。
        let cam2 = mk("cam2.webm");
        let joined = mk("join.mkv");
        let _ = std::fs::remove_file(&joined);
        std::fs::copy(&cam_v, &cam2).expect("复制第二段");
        block_on(async {
            ffmpeg::concat_videos_core(
                None,
                &[cam_v.to_string_lossy().to_string(), cam2.to_string_lossy().to_string()],
                &joined.to_string_lossy(),
            )
            .await
            .expect("摄像头分段 concat 应成功（mkv 容器）");
        });
        let joined_info = String::from_utf8_lossy(
            &std::process::Command::new(&bin).args(["-i", &joined.to_string_lossy()]).output().unwrap().stderr,
        )
        .to_string();
        // 两段各 2 秒 → 拼接后约 4 秒（若容器/时间戳处理错了，时长会塌成 2 秒或 N/A）
        assert!(joined_info.contains("Duration: 00:00:04"), "拼接时长应约 4 秒:\n{joined_info}");
        for p in [&cam2, &joined] {
            let _ = std::fs::remove_file(p);
        }

        let size = std::fs::metadata(&out).map(|m| m.len()).unwrap_or(0);
        assert!(size > 2_000, "叠加产物过小（{size} 字节）");
        // 抽一帧落 PNG 供人工/外部工具核对叠加位置。
        //
        // 为什么不在测试里直接做像素断言：精简 ffmpeg 只编了 rawvideo **demuxer**（没有
        // muxer），png 也只有 demuxer，Rust 侧又没引图像解码库 —— 三条取像素的路都断了。
        // 结构断言（时长/尺寸/音轨）+ 下面这张落盘帧已足够定位回归：叠加滤镜写错时
        // overlay 会直接失败，位置写错则一眼能从帧图上看出。
        let png = mk("frame.png");
        let keep = std::env::temp_dir().join("muerzhi_overlay_check.png");
        let _ = std::fs::remove_file(&keep);
        let _ = std::fs::remove_file(&png);
        let res = std::process::Command::new(&bin)
            .args([
                "-y", "-loglevel", "error", "-ss", "1", "-i", &out.to_string_lossy(),
                "-frames:v", "1", "-f", "image2", &png.to_string_lossy(),
            ])
            .output()
            .expect("抽帧");
        assert!(res.status.success(), "抽帧失败: {}", String::from_utf8_lossy(&res.stderr));
        let frame = std::fs::read(&png).expect("读帧");
        assert!(frame.len() > 500, "抽出的帧异常（{} 字节）", frame.len());
        let _ = std::fs::copy(&png, &keep); // 留一份供肉眼核对叠加位置

        // 时长应与输入一致（2 秒），确认 overlay 没有把时间轴搞乱
        let info = String::from_utf8_lossy(
            &std::process::Command::new(&bin).args(["-i", &out.to_string_lossy()]).output().unwrap().stderr,
        )
        .to_string();
        assert!(info.contains("320x240"), "成品尺寸应保持主视频尺寸:
{info}");
        assert!(info.contains("Duration: 00:00:02"), "成品时长应约 2 秒:
{info}");
        println!("画中画冒烟：{out:?}（{size} 字节），帧图 {png:?}（{} 字节）", frame.len());
        for p in [&main_v, &cam_v, &out, &png] {
            let _ = std::fs::remove_file(p);
        }
    }

    /// 真机冒烟：录制收尾链路（concat 拼接 → amix 混音）出来的是**带音轨**的可播 mp4。
    ///
    /// 绕开 AppHandle：直接调两个 core（app=None 跳过进度事件），素材用内置 ffmpeg 现场造
    /// （rawvideo 喂纯色帧 + pcm_s16le 正弦 WAV，均是白名单内的能力）。
    /// 手动执行：`cargo test --test unit -- --ignored --nocapture finalize_smoke`
    #[test]
    #[ignore = "起 ffmpeg 子进程造素材并转码；手动用 --ignored 跑"]
    fn finalize_smoke_produces_mp4_with_audio() {
        use crate::modules::media::ffmpeg::{self, MergeInput};

        let bin = ffmpeg::ffmpeg_bin_fallback();
        if !bin.exists() {
            eprintln!("跳过：找不到内置 ffmpeg（{bin:?}）");
            return;
        }
        let dir = std::env::temp_dir();
        let mk = |n: &str| dir.join(format!("muerzhi_fin_{n}"));

        let seg1 = mk("seg1.mp4");
        let seg2 = mk("seg2.mp4");
        let mic = mk("mic.wav");
        let sys = mk("sys.wav");
        let joined = mk("joined.mp4");
        let out = mk("out.mp4");
        for p in [&seg1, &seg2, &mic, &sys, &joined, &out] {
            let _ = std::fs::remove_file(p);
        }

        // 两段纯色视频（同一编码参数 → concat -c copy 可无损拼接）。
        // 内置 ffmpeg 无 lavfi 视频源 → 自己写 rawvideo 文件再让 ffmpeg 编码
        // （rawvideo demuxer 需要可 seek 的输入，stdin 管道会 BrokenPipe）。
        for (path, color) in [(&seg1, "black"), (&seg2, "gray")] {
            let pixel = match color {
                "black" => [0u8, 0, 0, 255],
                _ => [128u8, 128, 128, 255],
            };
            let raw = mk(&format!("raw_{color}.bin"));
            let frame: Vec<u8> = pixel.iter().copied().cycle().take(320 * 240 * 4).collect();
            let mut buf = Vec::with_capacity(frame.len() * 30);
            for _ in 0..30 {
                buf.extend_from_slice(&frame);
            }
            std::fs::write(&raw, &buf).expect("写 rawvideo 素材");

            let res = std::process::Command::new(&bin)
                .args([
                    "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "bgra",
                    "-s", "320x240", "-r", "30", "-i", &raw.to_string_lossy(),
                    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "ultrafast",
                    &path.to_string_lossy(),
                ])
                .output()
                .expect("起 ffmpeg 造视频");
            let _ = std::fs::remove_file(&raw);
            assert!(res.status.success(), "造视频失败: {}", String::from_utf8_lossy(&res.stderr));
        }

        // 两路音频 WAV（1 秒 440Hz / 880Hz，pcm_s16le 立体声）。
        // 内置 ffmpeg 没编 lavfi（音频素材造不出来），索性用 Rust 直接写 PCM——
        // 顺带覆盖 WAV 头写法本身。
        for (path, freq) in [(&mic, 440.0f64), (&sys, 880.0f64)] {
            write_sine_wav(path, freq, 1.0);
        }

        block_on(async {
            ffmpeg::concat_videos_core(
                None,
                &[seg1.to_string_lossy().to_string(), seg2.to_string_lossy().to_string()],
                &joined.to_string_lossy(),
            )
            .await
            .expect("两段应能 concat");

            ffmpeg::mux_audio_core(
                None,
                &joined.to_string_lossy(),
                &[mic.to_string_lossy().to_string()],
                &[sys.to_string_lossy().to_string()],
                &out.to_string_lossy(),
            )
            .await
            .expect("双路音频应能 amix 进 mp4");
        });

        let size = std::fs::metadata(&out).map(|m| m.len()).unwrap_or(0);
        assert!(size > 5_000, "成品过小（{size} 字节）");

        let probe = std::process::Command::new(&bin)
            .args(["-i", &out.to_string_lossy()])
            .output()
            .unwrap();
        let info = String::from_utf8_lossy(&probe.stderr);
        assert!(info.contains("Audio:"), "成品没有音轨:\n{info}");
        assert!(info.contains("Video:"), "成品没有视频轨:\n{info}");

        // 「有音轨」≠「有声音」：amix 输入链没接上或参数写错时，产物会是一条纯静音
        // 音轨，容器面板看不出来。用 volumedetect 校验实际电平（内置 ffmpeg 已编入该滤镜）。
        let probe_sink = mk("vol_probe.mp4");
        let _ = std::fs::remove_file(&probe_sink);
        let vol = String::from_utf8_lossy(
            &std::process::Command::new(&bin)
                .args([
                    "-i", &out.to_string_lossy(),
                    "-af", "volumedetect",
                    "-vn",
                    // 精简 ffmpeg 没编 null muxer，用 mp4 落个临时文件当"丢弃输出"
                    "-f", "mp4", &probe_sink.to_string_lossy(),
                ])
                .output()
                .unwrap()
                .stderr,
        )
        .to_string();
        let mean = vol
            .lines()
            .find_map(|l| l.split("mean_volume:").nth(1))
            .map(|s| s.trim().split(' ').next().unwrap_or("").to_string())
            .unwrap_or_default();
        let mean_db: f64 = mean.parse().unwrap_or(-999.0);
        println!("音轨平均电平：{mean} dB");
        assert!(mean_db > -60.0, "成品音轨接近静音（mean_volume={mean} dB）");
        // concat 两段各 1 秒 → 时长应约 2 秒（允许 ±0.4s）
        let dur = info
            .lines()
            .find_map(|l| l.trim().strip_prefix("Duration:"))
            .and_then(|s| s.split(',').next())
            .map(|s| s.trim().to_string())
            .unwrap_or_default();
        println!("收尾冒烟：{out:?}（{size} 字节，时长 {dur}）");
        assert!(dur.starts_with("00:00:02"), "拼接后时长应为 2 秒左右，实际 {dur}");

        // 顺带覆盖多屏合并路径（两路输入 → 叠加到 640×240 画布）。
        // merge_multi_screen 收尾会删掉输入文件，所以先把两段视频复制成副本再喂进去。
        let merged = mk("merged.mp4");
        let _ = std::fs::remove_file(&merged);
        for (src, dst) in [(&seg1, mk("m1.mp4")), (&seg2, mk("m2.mp4"))] {
            std::fs::copy(src, &dst).expect("复制合并输入");
        }
        block_on(async {
            ffmpeg::merge_multi_screen_core(
                None,
                &[
                    MergeInput { file_path: mk("m1.mp4").to_string_lossy().to_string(), bounds: (0, 0, 320, 240) },
                    MergeInput { file_path: mk("m2.mp4").to_string_lossy().to_string(), bounds: (320, 0, 320, 240) },
                ],
                &merged.to_string_lossy(),
            )
            .await
            .expect("两屏应能合并");
        });
        // 纯色素材压缩率极高（一段 320×240 静态画面只有 ~2KB），阈值只用于确认
        // 「确实写出了一个非空文件」；画布尺寸由 ffmpeg 的 -i 面板断言更可靠。
        let msize = std::fs::metadata(&merged).map(|m| m.len()).unwrap_or(0);
        assert!(msize > 1_000, "合并产物过小（{msize} 字节）");
        let minfo = String::from_utf8_lossy(
            &std::process::Command::new(&bin)
                .args(["-i", &merged.to_string_lossy()])
                .output()
                .unwrap()
                .stderr,
        )
        .to_string();
        assert!(minfo.contains("640x240"), "合并画布应为 640x240:
{minfo}");

        for p in [&seg1, &seg2, &mic, &sys, &joined, &out, &merged, &probe_sink, &mk("m1.mp4"), &mk("m2.mp4")] {
            let _ = std::fs::remove_file(p);
        }
    }

    /// 极简 block_on（测试里不引入 futures 依赖）
    fn block_on<F: std::future::Future>(fut: F) -> F::Output {
        tokio::runtime::Builder::new_current_thread()
            .enable_all()
            .build()
            .unwrap()
            .block_on(fut)
    }

    /// 造一段正弦 WAV（48kHz/16bit/立体声，与 audio.rs 的采集格式一致）
    fn write_sine_wav(path: &std::path::Path, freq: f64, seconds: f64) {
        use std::io::Write as _;
        let sr = 48_000u32;
        let frames = (sr as f64 * seconds) as u32;
        let mut data = Vec::with_capacity(frames as usize * 4);
        for n in 0..frames {
            let t = n as f64 / sr as f64;
            let v = ((t * freq * std::f64::consts::TAU).sin() * 0.5 * i16::MAX as f64) as i16;
            data.extend_from_slice(&v.to_le_bytes());
            data.extend_from_slice(&v.to_le_bytes());
        }
        let mut f = std::fs::File::create(path).expect("建测试 WAV");
        let mut header = Vec::new();
        header.extend_from_slice(b"RIFF");
        header.extend_from_slice(&(36 + data.len() as u32).to_le_bytes());
        header.extend_from_slice(b"WAVEfmt ");
        header.extend_from_slice(&16u32.to_le_bytes());
        header.extend_from_slice(&1u16.to_le_bytes());
        header.extend_from_slice(&2u16.to_le_bytes());
        header.extend_from_slice(&sr.to_le_bytes());
        header.extend_from_slice(&(sr * 4).to_le_bytes());
        header.extend_from_slice(&4u16.to_le_bytes());
        header.extend_from_slice(&16u16.to_le_bytes());
        header.extend_from_slice(b"data");
        header.extend_from_slice(&(data.len() as u32).to_le_bytes());
        f.write_all(&header).unwrap();
        f.write_all(&data).unwrap();
    }
}