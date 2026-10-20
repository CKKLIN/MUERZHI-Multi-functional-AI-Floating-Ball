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

/// 一段媒体采集（麦克风/摄像头）在**会话时间轴**上的区间。
///
/// 时间轴 = 不含暂停的已录时长（与成品视频时长一致）。录制中开关麦克风/摄像头
/// 会产生带间隙的多段：停止合成时按这些区间补齐（音频插静音 / 视频按窗口 overlay），
/// 段内容才能对回成品时间线。
struct MediaPart {
    start: std::time::Duration,
    path: String,
    /// None = 仍在录（停止/暂停/关闭时写回当前时刻）
    end: Option<std::time::Duration>,
}

impl MediaPart {
    fn open(start: std::time::Duration, path: String) -> Self {
        Self {
            start,
            path,
            end: None,
        }
    }

    /// 关闭仍未结段的最后一段（找不到时静默——段可能已被关闭过）
    fn close_last(parts: &mut Vec<MediaPart>, end: std::time::Duration) {
        if let Some(p) = parts.iter_mut().rev().find(|p| p.end.is_none()) {
            p.end = Some(end);
        }
    }
}

/// 会话内部状态
struct SessionInner {
    id: String,
    options: StartOptions,
    started_at: std::time::Instant,
    /// 已累计的录制时长（不含暂停），用于 elapsed
    accumulated: std::time::Duration,
    /// 段序号：恢复/录制中开关设备各 +1，用于临时文件名（暂停分段靠它区分）
    part: usize,
    /// Arc：开关命令在**锁外**启停音频线程（stop_source 要 join，锁内等会卡状态轮询）
    audio: Option<std::sync::Arc<audio::AudioSession>>,
    /// 麦克风/摄像头当前开关（用户意图；启动失败等实际状态由 parts/audio 反映）
    mic_on: bool,
    cam_on: bool,
    mic_parts: Vec<MediaPart>,
    cam_parts: Vec<MediaPart>,
}

impl SessionInner {
    /// 当前已录时长（phase=1 用 accumulated+started_at.elapsed，暂停态就是 accumulated）。
    /// 调用方必须在持有 inner 锁的同时读取 phase，避免两值错位。
    fn elapsed_now(&self, phase: u8) -> std::time::Duration {
        if phase == 1 {
            self.accumulated + self.started_at.elapsed()
        } else {
            self.accumulated
        }
    }

    fn mic_part_path(&self) -> std::path::PathBuf {
        std::env::temp_dir().join(format!("muerzhi_mic_{}_p{:02}.wav", self.id, self.part))
    }

    fn cam_part_path(&self) -> std::path::PathBuf {
        std::env::temp_dir().join(format!("muerzhi_cam_{}_p{:02}.webm", self.id, self.part))
    }
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
    let monitors = app
        .available_monitors()
        .map_err(|e| format!("显示器枚举失败: {e}"))?;
    let wanted: Vec<usize> = if options.display_ids.is_empty() {
        vec![options.target_display_id.unwrap_or(0) as usize]
    } else {
        options.display_ids.iter().map(|d| *d as usize).collect()
    };
    let mut out = Vec::new();
    for idx in wanted {
        let m = monitors
            .get(idx)
            .ok_or_else(|| format!("显示器 #{idx} 不存在"))?;
        out.push(DisplayTarget {
            index: idx,
            bounds: (
                m.position().x,
                m.position().y,
                m.size().width as i32,
                m.size().height as i32,
            ),
            size: (m.size().width, m.size().height),
        });
    }
    Ok(out)
}

/// WGC 采集段要用 windows-capture 自己的显示器下标：两套枚举顺序不保证一致，
/// 靠设备名（`\\.\DISPLAYn`）配对，配不上时退回同名下标。
fn wgc_index(app: &AppHandle, tauri_index: usize) -> usize {
    let name = app.available_monitors().ok().and_then(|ms| {
        ms.get(tauri_index)
            .and_then(|m| m.name().map(|s| s.to_string()))
    });
    match name {
        Some(n) => capture::index_for_device_name(&n).unwrap_or(tauri_index),
        None => tauri_index,
    }
}

/// 启动一路（显示器）的采集段
async fn spawn_track(
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
    // WGC + MF 初始化是秒级阻塞调用（内部自带大栈线程），丢进 spawn_blocking
    // 别占住 async worker——否则启动/暂停期间整个应用的命令与事件都被卡住
    let active = tokio::task::spawn_blocking(move || capture::spawn_segment(cfg))
        .await
        .map_err(|e| format!("采集任务调度失败: {e}"))??;
    capture::CaptureHandles::global()
        .active
        .lock()
        .unwrap()
        .push(active);
    Ok(())
}

/// 结束当前所有活跃段，把产物登记进对应 track。
/// 各段相互独立，并行收尾（多屏时串行 join 的等待时间按屏数叠加，白等）。
async fn end_all_segments() {
    let handles = capture::CaptureHandles::global();
    let actives: Vec<capture::imp::Active> = handles.active.lock().unwrap().drain(..).collect();
    let mut tasks = Vec::new();
    for active in actives {
        tasks.push(tokio::task::spawn_blocking(move || {
            let monitor_index = active.monitor_index;
            capture::end_segment(active).map(|path| (monitor_index, path))
        }));
    }
    for t in tasks {
        match t.await {
            Ok(Ok((monitor_index, path))) => {
                if let Some(track) = handles
                    .tracks
                    .lock()
                    .unwrap()
                    .iter_mut()
                    .find(|t| t.monitor_index == monitor_index)
                {
                    track.segments.push(path);
                }
            }
            Ok(Err(e)) => log::error!("结束采集段失败: {e}"),
            Err(e) => log::error!("结束采集段任务失败: {e}"),
        }
    }
}

/// 结束所有活跃段并**丢弃**产物（recording_start 回滚用：失败会话不留下半截段文件）
async fn rollback_spawned_segments() {
    let handles = capture::CaptureHandles::global();
    let actives: Vec<capture::imp::Active> = handles.active.lock().unwrap().drain(..).collect();
    let mut tasks = Vec::new();
    for active in actives {
        tasks.push(tokio::task::spawn_blocking(move || capture::end_segment(active)));
    }
    for t in tasks {
        match t.await {
            Ok(Ok(path)) => {
                let _ = std::fs::remove_file(&path);
            }
            Ok(Err(e)) => log::error!("回滚采集段失败: {e}"),
            Err(e) => log::error!("回滚采集段任务失败: {e}"),
        }
    }
}

/// 按 session id 清掉 %TEMP% 里本会话的全部中间产物
/// （段 mp4 / track 合并件 / videoonly / withcam / camjoin / 摄像头 webm / 音频 WAV）。
/// 启动失败回滚与停止流水线中途失败时调用：这些文件加起来可达数百 MB，
/// 不能留在临时目录里等系统清（无按 id 匹配的启动清扫，误删并发会话产物）。
fn cleanup_session_temp(session_id: &str) {
    let dir = std::env::temp_dir();
    let Ok(entries) = std::fs::read_dir(&dir) else {
        return;
    };
    let mut removed = 0usize;
    for e in entries.flatten() {
        let name = e.file_name().to_string_lossy().to_string();
        if name.starts_with("muerzhi_") && name.contains(session_id) {
            if std::fs::remove_file(e.path()).is_ok() {
                removed += 1;
            }
        }
    }
    if removed > 0 {
        log::info!("已清理会话 {session_id} 的 {removed} 个临时文件");
    }
}

// ===== 命令：开始 / 暂停 / 继续 / 停止 =====

/// 开始录制（对齐渲染层 on-toolbar-action start）
#[tauri::command]
#[allow(non_snake_case)]
pub async fn recording_start(app: AppHandle, options: StartOptions) -> Result<String, String> {
    let state = SessionState::global();
    log::info!(
        "recording_start: displays={:?} mic={} sys={} mic_dev={:?} sys_dev={:?} quality={} fps={} cursor={} region={:?} out_dir={:?} camera={} cam_rect={:?}",
        if options.display_ids.is_empty() { vec![options.target_display_id.unwrap_or(0)] } else { options.display_ids.clone() },
        options.with_mic,
        options.with_sys,
        options.mic_device_id.as_deref().map(|s| if s.len() > 12 { &s[..12] } else { s }),
        options.sys_device_id.as_deref().map(|s| if s.len() > 12 { &s[..12] } else { s }),
        options.quality,
        options.fps,
        options.with_cursor,
        options.region,
        options.output_dir,
        options.with_camera,
        options.camera_rect,
    );
    if state.is_active() {
        log::warn!(
            "recording_start 拒绝：已有会话进行中（phase={}）",
            state.phase()
        );
        return Err("已有录制会话在进行".into());
    }
    if !capture::ENABLED {
        return Err("录制管线未编译（需 --features screen-capture 构建）".into());
    }
    let displays = resolve_displays(&app, &options)?;
    if displays.is_empty() {
        log::warn!("recording_start 拒绝：没有可用的显示器");
        return Err("没有可用的显示器".into());
    }
    for d in &displays {
        log::info!(
            "recording_start: 目标显示器 #{} bounds=({},{}) {}x{}",
            d.index,
            d.bounds.0,
            d.bounds.1,
            d.bounds.2,
            d.bounds.3
        );
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
            Ok(s) => {
                log::info!(
                    "recording_start: 音频采集已启动（mic={}, sys={}）",
                    options.with_mic,
                    options.with_sys
                );
                Some(std::sync::Arc::new(s))
            }
            Err(e) => {
                log::error!("音频采集启动失败（继续无声录制）: {e}");
                None
            }
        }
    } else {
        None
    };
    let has_audio = audio_session.is_some();

    // 视频：逐显示器起段
    let mut started = Vec::new();
    for target in &displays {
        if let Err(e) = spawn_track(&app, &id, target, &options, 0).await {
            // 任一路起不来：end 掉已起的段并**直接删产物**（不入 tracks），
            // 再清掉本会话已落盘的音频 WAV / 摄像头占位 —— 不给 %TEMP% 留孤儿文件
            rollback_spawned_segments().await;
            if let Some(a) = audio_session {
                let _ = a.stop();
            }
            cleanup_session_temp(&id);
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

    // 设备分段跟踪：麦克风/摄像头各自的段区间（录制中可开关，见 recording_set_mic/camera）
    let mut mic_parts = Vec::new();
    let mut cam_parts = Vec::new();
    if has_audio && options.with_mic {
        mic_parts.push(MediaPart::open(
            std::time::Duration::ZERO,
            std::env::temp_dir()
                .join(format!("muerzhi_mic_{id}.wav"))
                .to_string_lossy()
                .to_string(),
        ));
    }
    if options.with_camera {
        cam_parts.push(MediaPart::open(
            std::time::Duration::ZERO,
            std::env::temp_dir()
                .join(format!("muerzhi_cam_{id}.webm"))
                .to_string_lossy()
                .to_string(),
        ));
    }

    *state.inner.lock().unwrap() = Some(SessionInner {
        id: id.clone(),
        options: options.clone(),
        started_at: std::time::Instant::now(),
        accumulated: std::time::Duration::ZERO,
        part: 0,
        audio: audio_session,
        mic_on: options.with_mic,
        cam_on: options.with_camera,
        mic_parts,
        cam_parts,
    });
    state.phase.store(1, Ordering::SeqCst);
    // 录制真正跑起来之后才收起悬浮岛（起失败了它得留着让用户重试）。
    // 收起只隐藏 UI，鼠标移到岛的位置会被 hover 轮询唤出（spawn_island_hover_watch）
    crate::modules::windows::region::hide_island_ui(&app);
    let _ = app.emit(
        "recording-state",
        serde_json::json!({"state": "recording", "id": id, "tracks": started.len()}),
    );
    log::info!(
        "录制开始：session {id}，{} 路显示器，音频={has_audio}",
        started.len()
    );
    Ok(id)
}

/// 暂停：结束当前段（暂停时长不进成品），音频线程同步停掉
#[tauri::command]
pub async fn recording_pause(app: AppHandle) -> Result<(), String> {
    let state = SessionState::global();
    if state.phase() != 1 {
        log::warn!("recording_pause 拒绝：当前 phase={}", state.phase());
        return Err("当前不在录制中".into());
    }
    log::info!("recording_pause: 结束当前段（暂停=分段）");
    end_all_segments().await;
    let audio_to_stop = {
        // 独立作用域：MutexGuard 必须在 await 之前析构（跨 await 持有标准库 MutexGuard
        // 会让整个 future 变成 !Send，Tauri 命令编译不过）
        let mut guard = state.inner.lock().unwrap();
        if let Some(s) = guard.as_mut() {
            s.accumulated += s.started_at.elapsed();
            // 未结段的媒体段在此刻收口（暂停时长不进成品时间轴）
            MediaPart::close_last(&mut s.mic_parts, s.accumulated);
            MediaPart::close_last(&mut s.cam_parts, s.accumulated);
        }
        guard.as_mut().and_then(|s| s.audio.take())
    };
    // 音频暂停 = 停掉当前 WAV（与视频分段一致：暂停期间不产生音频）。
    // stop() 要 join 采集线程（每路最长 200ms 事件超时），必须放在锁外执行——
    // 持锁等待会卡住所有等这把锁的命令（recording_get_status 轮询等）。
    if let Some(a) = audio_to_stop {
        let files = a.stop();
        log::info!("暂停：音频段收尾 {} 路", files.len());
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
        log::warn!("recording_resume 拒绝：当前 phase={}", state.phase());
        return Err("当前不在暂停中".into());
    }
    log::info!("recording_resume: 起新段");
    let (id, options, part) = {
        let mut guard = state.inner.lock().unwrap();
        let s = guard.as_mut().ok_or("会话已丢失")?;
        s.part += 1;
        (s.id.clone(), s.options.clone(), s.part)
    };
    let displays = resolve_displays(&app, &options)?;
    for target in &displays {
        if let Err(e) = spawn_track(&app, &id, target, &options, part).await {
            // 回滚本批已起的段：end 后直接删产物。本批段尚未登记进 tracks，直接丢弃
            // 不会污染停止时的 concat（直接 `?` 早退会让已起段变成孤儿——既不在管理内，
            // 再 resume 又起一批，停止时同一时间段的内容会重复拼接进成品）。
            // 会话保持暂停态，用户可直接重试「继续」。
            rollback_spawned_segments().await;
            return Err(e);
        }
    }
    {
        let mut guard = state.inner.lock().unwrap();
        if let Some(s) = guard.as_mut() {
            s.started_at = std::time::Instant::now();
            // 麦克风按 mic_on 续段（录制中被关掉的话，恢复不自动打开）；系统声不受开关影响
            let with_mic = options.with_mic && s.mic_on;
            if with_mic || options.with_sys {
                // 暂停后的音频另起一段：文件名带 part 后缀，停止时按前缀一并收集。
                // part 补零到两位 —— 按文件名排序还原时间顺序，不补零时 "10" 会排在 "2" 前面。
                s.audio = audio::start(
                    &format!("{id}_p{part:02}"),
                    with_mic,
                    options.with_sys,
                    options.mic_device_id.clone(),
                    options.sys_device_id.clone(),
                )
                .ok()
                .map(std::sync::Arc::new);
                if with_mic && s.audio.is_some() {
                    s.mic_parts
                        .push(MediaPart::open(s.accumulated, s.mic_part_path().to_string_lossy().to_string()));
                }
            }
        }
    }
    // 摄像头按 cam_on 续段（文件名带 part 后缀，与音频段同规则）
    if options.with_camera {
        let cam_on = state
            .inner
            .lock()
            .unwrap()
            .as_ref()
            .map(|s| s.cam_on)
            .unwrap_or(false);
        let cam_path = std::env::temp_dir()
            .join(format!("muerzhi_cam_{id}_p{part:02}.webm"))
            .to_string_lossy()
            .to_string();
        let _ = std::fs::remove_file(&cam_path);
        if cam_on {
            crate::modules::windows::region::start_camera_recording(&app, &cam_path);
            let mut guard = state.inner.lock().unwrap();
            if let Some(s) = guard.as_mut() {
                s.cam_parts
                    .push(MediaPart::open(s.accumulated, cam_path));
            }
        }
    }
    state.phase.store(1, Ordering::SeqCst);
    let _ = app.emit("recording-state", serde_json::json!({"state": "recording"}));
    log::info!("录制已继续（新段 #{part}）");
    Ok(())
}

// ===== 录制中开关麦克风/摄像头（工具条按钮录制中保留可点）=====
//
// 语义：开关只影响「此刻之后」的画面/声音。麦克风关闭区间在成品里是静音
// （build_mic_timeline 补静音对齐时间轴），摄像头关闭区间不叠小窗
// （build_camera_windows + 分段 overlay）。暂停态只翻标志，恢复时按标志起段。

#[tauri::command]
pub async fn recording_set_mic(app: AppHandle, on: bool) -> Result<bool, String> {
    let state = SessionState::global();
    if !state.is_active() {
        return Err("没有进行中的录制".into());
    }
    let phase = state.phase();
    enum MicAction {
        Nothing,
        Start { path: String, device: Option<String> },
        Stop,
    }
    let (action, audio) = {
        let mut guard = state.inner.lock().unwrap();
        let Some(s) = guard.as_mut() else {
            return Err("会话已丢失".into());
        };
        if s.mic_on == on {
            return Ok(on);
        }
        s.mic_on = on;
        let action = match (on, phase) {
            (true, 1) => {
                s.part += 1;
                let path = s.mic_part_path().to_string_lossy().to_string();
                s.mic_parts
                    .push(MediaPart::open(s.elapsed_now(phase), path.clone()));
                MicAction::Start {
                    path,
                    device: s.options.mic_device_id.clone(),
                }
            }
            (false, 1) => {
                let end = s.elapsed_now(phase);
                MediaPart::close_last(&mut s.mic_parts, end);
                MicAction::Stop
            }
            _ => MicAction::Nothing, // 暂停态：只翻标志，恢复时按标志起/停
        };
        (action, s.audio.clone())
    };
    let _ = &app;
    match action {
        MicAction::Start { path, device } => match audio {
            Some(a) => {
                // join/起线程放锁外（见 SessionInner.audio 注释）；失败回滚标志与段
                let a2 = a.clone();
                if let Err(e) =
                    tokio::task::spawn_blocking(move || a2.add_source(audio::Source::Mic, path.clone(), device))
                        .await
                        .map_err(|e| e.to_string())
                        .and_then(|r| r)
                {
                    let mut guard = state.inner.lock().unwrap();
                    if let Some(s) = guard.as_mut() {
                        s.mic_on = !on;
                        s.mic_parts.pop();
                    }
                    return Err(format!("麦克风启动失败: {e}"));
                }
            }
            None => {
                // 启动时就没起音频会话（静音录制）：现在补一个仅含麦克风的
                let session = audio::AudioSession::new();
                if let Err(e) = session.add_source(audio::Source::Mic, path.clone(), device) {
                    let mut guard = state.inner.lock().unwrap();
                    if let Some(s) = guard.as_mut() {
                        s.mic_on = !on;
                        s.mic_parts.pop();
                    }
                    return Err(format!("麦克风启动失败: {e}"));
                }
                let mut guard = state.inner.lock().unwrap();
                if let Some(s) = guard.as_mut() {
                    s.audio = Some(std::sync::Arc::new(session));
                }
            }
        },
        MicAction::Stop => {
            if let Some(a) = audio {
                let _ = tokio::task::spawn_blocking(move || a.stop_source(audio::Source::Mic))
                    .await;
            }
        }
        MicAction::Nothing => {}
    }
    log::info!("recording_set_mic: mic={on}");
    Ok(on)
}

#[tauri::command]
#[allow(non_snake_case)]
pub async fn recording_set_camera(
    app: AppHandle,
    on: bool,
    deviceId: Option<String>,
) -> Result<bool, String> {
    let state = SessionState::global();
    if !state.is_active() {
        return Err("没有进行中的录制".into());
    }
    let phase = state.phase();
    // （path, start）在锁内定好带出来，避免持锁跨 await
    let new_part: Option<(String, std::time::Duration)> = {
        let mut guard = state.inner.lock().unwrap();
        let Some(s) = guard.as_mut() else {
            return Err("会话已丢失".into());
        };
        if s.cam_on == on {
            return Ok(on);
        }
        s.cam_on = on;
        if on && phase == 1 {
            s.part += 1;
            let path = s.cam_part_path().to_string_lossy().to_string();
            let start = s.elapsed_now(phase);
            s.cam_parts.push(MediaPart::open(start, path.clone()));
            Some((path, start))
        } else {
            if !on {
                let end = s.elapsed_now(phase);
                MediaPart::close_last(&mut s.cam_parts, end);
            }
            None
        }
    };
    if on {
        // 窗口可能被 toggle-off 藏了 / 一开始就没开摄像头：show（不存在则按配置设备重建）
        let existed = app
            .get_webview_window("camera-preview")
            .is_some();
        crate::modules::windows::region::toggle_camera_preview(app.clone(), true, deviceId).await;
        if let Some((path, _)) = new_part {
            if !existed {
                // 刚建的窗：页面还没加载完，立刻 eval startRecording 会被静默吞掉
                //（与「暂停→立刻继续」的时序坑同类），等页面起流后再录
                tokio::time::sleep(std::time::Duration::from_millis(600)).await;
            }
            let _ = std::fs::remove_file(&path);
            crate::modules::windows::region::start_camera_recording(&app, &path);
        }
        // 暂停态只亮预览：录制在恢复时按 cam_on 起段
    } else {
        // 停录当前段并等 webm 尾段落盘，然后藏窗（窗口保留，恢复无需重建）
        crate::modules::windows::region::stop_camera_recording(&app).await;
        crate::modules::windows::region::hide_camera_preview_window(&app);
    }
    log::info!("recording_set_camera: camera={on}");
    Ok(on)
}

/// 停止：结束采集 → 拼接/裁剪/合并 → 混流音频 → 输出到目标目录
#[tauri::command]
pub async fn recording_stop(app: AppHandle) -> Result<serde_json::Value, String> {
    let state = SessionState::global();
    let was_paused = state.phase() == 2;
    if !state.is_active() {
        log::warn!(
            "recording_stop 拒绝：没有进行中的录制（phase={}）",
            state.phase()
        );
        return Err("没有进行中的录制".into());
    }
    log::info!(
        "recording_stop: 开始收尾（was_paused={was_paused}），收辅助窗 → 停段 → ffmpeg 合成"
    );
    state.phase.store(3, Ordering::SeqCst);
    let _ = app.emit(
        "recording-state",
        serde_json::json!({"state": "converting"}),
    );

    // 录制辅助窗停录即收：都是「录制中用」的浮层，主窗口马上回来，留着只挡桌面
    crate::modules::windows::region::hide_floating_island(app.clone());
    // 摄像头窗：先藏（视觉上停录即消失）再等 webm 尾段落盘，落完才真正关窗 ——
    // hide 不影响 WebView2 里的 flush 链；落盘信号到了才允许 ffmpeg overlay，顺序不能反
    crate::modules::windows::region::stop_and_close_camera_preview(&app).await;
    end_all_segments().await;
    let (id, options, elapsed_sec, audio_to_stop, mic_parts, cam_parts) = {
        let mut guard = state.inner.lock().unwrap();
        let mut s = guard.take().ok_or("会话已丢失")?;
        let elapsed = if was_paused {
            s.accumulated.as_secs()
        } else {
            (s.accumulated + s.started_at.elapsed()).as_secs()
        };
        // 仍在录的段在此刻全部收口（时间轴终点）
        MediaPart::close_last(&mut s.mic_parts, std::time::Duration::from_secs(elapsed));
        MediaPart::close_last(&mut s.cam_parts, std::time::Duration::from_secs(elapsed));
        (s.id, s.options, elapsed, s.audio, s.mic_parts, s.cam_parts)
    };
    // 音频收尾要 join 采集线程（每路最长 200ms 事件超时），放锁外执行——
    // 持锁等待会卡住所有等这把锁的命令（recording_get_status 轮询等）
    if let Some(a) = audio_to_stop {
        let files = a.stop();
        log::info!("停止：音频段收尾 {} 路", files.len());
    }

    let handles = capture::CaptureHandles::global();
    let pipeline =
        run_stop_pipeline(&app, handles, &id, &options, elapsed_sec, mic_parts, cam_parts).await;
    match pipeline {
        Ok((final_str, final_name)) => {
            state.phase.store(0, Ordering::SeqCst);
            // 帧数在 reset 清零前取出（reset 之后读永远是 0）
            let frames_total = handles.frame_count();
            handles.reset();

            // 抽首帧做历史缩略图（返回 base64 data URL，随记录 JSON 持久化；失败 → 列表显示占位图标）
            let thumbnail: Option<String> =
                crate::modules::media::ffmpeg::extract_first_frame(&app, &final_str).await;
            if thumbnail.is_none() {
                log::warn!("抽首帧生成缩略图失败，列表将显示占位图标");
            }

            let _ = app.emit(
                "recording-stopped",
                serde_json::json!({
                    "id": id,
                    "outputPath": final_str,
                    "elapsed": elapsed_sec,
                    "fileName": final_name,
                    "thumbnail": thumbnail,
                }),
            );
            let size = std::fs::metadata(&final_str).map(|m| m.len()).unwrap_or(0);
            log::info!(
                "录制完成: {final_str}（{elapsed_sec}s，{size} 字节，{frames_total} 帧）"
            );
            Ok(serde_json::json!({
                "outputPath": final_str,
                "thumbnail": thumbnail,
            }))
        }
        Err(e) => {
            // 失败收尾：清掉本会话在 %TEMP% 的全部中间产物（段/WAV/合成件，可达数百 MB），
            // 并把句柄与状态复位 —— 原实现各失败分支只把 phase 归零就返回，
            // 临时文件全部残留、状态（tracks/segments/录制区域）也拖到下一次 start 才清
            log::error!("录制收尾失败: {e}");
            cleanup_session_temp(&id);
            state.phase.store(0, Ordering::SeqCst);
            handles.reset();
            let _ = app.emit("recording-state", serde_json::json!({"state": "idle"}));
            Err(e)
        }
    }
}

/// 停止流水线主体：concat → crop/merge → 摄像头 overlay → 音频混流 → 清理临时件。
/// 返回 (成品路径, 成品文件名)。任一步失败直接 Err，由 recording_stop 统一清理收尾。
async fn run_stop_pipeline(
    app: &AppHandle,
    handles: &capture::CaptureHandles,
    id: &str,
    options: &StartOptions,
    elapsed_sec: u64,
    mic_parts: Vec<MediaPart>,
    cam_parts: Vec<MediaPart>,
) -> Result<(String, String), String> {
    let tracks: Vec<usize> = handles
        .tracks
        .lock()
        .unwrap()
        .iter()
        .map(|t| t.monitor_index)
        .collect();
    if tracks.is_empty() {
        log::error!("recording_stop: 本次录制没有产生任何画面（tracks 空）");
        return Err("本次录制没有产生任何画面".into());
    }
    log::info!("recording_stop: 合成输入 tracks={tracks:?}，累计 {elapsed_sec}s");

    let out_dir = resolve_output_dir(app, options.output_dir.as_deref());
    let stamp = file_stamp();
    let final_name = format!("MUERZHI-{stamp}.mp4");
    let final_path = out_dir.join(&final_name);
    let final_str = final_path.to_string_lossy().to_string();
    log::info!("recording_stop: 成品输出 → {final_str}");

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
            crate::modules::media::ffmpeg::concat_videos(app, &segs, &merged)
                .await
                .map_err(|e| format!("拼接录制段失败: {e}"))?;
            merged
        };
        track_videos.push((*m, src, handles.bounds_of(*m)));
    }
    if track_videos.is_empty() {
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
                // region 是**物理像素**虚拟桌面坐标（选区页 toPhysical 上报，见
                // region-selector.html）；源视频是**单块显示器**的画面，所以要：
                // ① 减去该显示器在虚拟桌面里的原点，得到显示器内的相对偏移；
                // ② 不再乘 scale —— 早先这里把已经是物理像素的坐标又乘了一遍缩放比，
                //    150% 屏上裁出来大了 1.5 倍且位置偏移（「框选区域和实际录出来的不一样」，
                //    与边框窗/工具条同源的口径错配）。
                let mon_origin = app
                    .available_monitors()
                    .ok()
                    .and_then(|ms| {
                        ms.get(options.target_display_id.unwrap_or(0) as usize)
                            .map(|m| (m.position().x, m.position().y))
                    })
                    .unwrap_or((0, 0));
                let crop = (
                    r.x - mon_origin.0,
                    r.y - mon_origin.1,
                    r.width,
                    r.height,
                );
                log::info!(
                    "crop: region=({},{}) {}x{} 显示器原点={:?} → crop={:?}",
                    r.x, r.y, r.width, r.height, mon_origin, crop
                );
                crate::modules::media::ffmpeg::crop_video(app, src, &video_only, crop)
                    .await
                    .map_err(|e| format!("区域裁剪失败: {e}"))?;
                cleanup_video = video_only.clone();
            }
            None => cleanup_video = src.clone(),
        }
    } else {
        let inputs: Vec<crate::modules::media::ffmpeg::MergeInput> = track_videos
            .iter()
            .map(
                |(_, path, bounds)| crate::modules::media::ffmpeg::MergeInput {
                    file_path: path.clone(),
                    bounds: *bounds,
                },
            )
            .collect();
        crate::modules::media::ffmpeg::merge_multi_screen(app, &inputs, &video_only)
            .await
            .map_err(|e| format!("多屏合并失败: {e}"))?;
        cleanup_video = video_only.clone();
    }

    // 2.5) 摄像头画中画叠加（渲染层录的 webm → 主视频左上角/右下角小窗）
    // 段区间由会话跟踪（录制中可开关摄像头）：段间无间隙走 concat（暂停分段，老路径），
    // 有间隙走分段 overlay（enable 窗口）—— 间隙里的画面不叠小窗
    let camera_windows = build_camera_windows(&cam_parts, elapsed_sec as f64);
    let has_cam_gap = camera_windows
        .windows(2)
        .any(|w| w[1].1 - w[0].2 > 0.05);
    let mut cam_joined_mkv: Option<String> = None;
    let composited: String;
    if !camera_windows.is_empty() {
        let with_cam = std::env::temp_dir()
            .join(format!("muerzhi_withcam_{id}.mp4"))
            .to_string_lossy()
            .to_string();
        let _ = std::fs::remove_file(&with_cam);
        // 位置：渲染层给了 rect 就用它；否则默认右下角留 16px 边距。
        // 渲染层给的是**物理像素**（与 crop/merge 后的成品画面同域），直接用。
        let rect = match options.camera_rect {
            Some(r) => (r.x, r.y, r.width, r.height),
            None => {
                let (vw, vh) = get_video_size(&cleanup_video).await;
                (vw - 336, vh - 268, 320, 240)
            }
        };
        // 段间无间隙：多段 webm 先拼成一个（同参数段，无损 copy 即可；容器必须是
        // mkv —— MediaRecorder 出的是 VP8/VP9，mp4 装不下 VP8 会直接写不出文件头）。
        // 有间隙（录制中关过摄像头）：concat 会把段内容贴错时间轴，改走分段 overlay，
        // 每段按会话时间轴的 [start, end] 窗口叠加。
        let (cam_src, cam_single) = if camera_windows.len() == 1 {
            (camera_windows[0].0.clone(), true)
        } else if !has_cam_gap {
            let files: Vec<String> = camera_windows.iter().map(|(p, _, _)| p.clone()).collect();
            let joined = std::env::temp_dir()
                .join(format!("muerzhi_camjoin_{id}.mkv"))
                .to_string_lossy()
                .to_string();
            let _ = std::fs::remove_file(&joined);
            crate::modules::media::ffmpeg::concat_videos(app, &files, &joined)
                .await
                .map_err(|e| format!("摄像头分段拼接失败: {e}"))?;
            cam_joined_mkv = Some(joined.clone());
            (joined, true)
        } else {
            (String::new(), false)
        };
        let cam_size = if cam_src.is_empty() {
            camera_windows.iter().map(|(p, _, _)| std::fs::metadata(p).map(|m| m.len()).unwrap_or(0)).sum::<u64>()
        } else {
            std::fs::metadata(&cam_src).map(|m| m.len()).unwrap_or(0)
        };
        log::info!(
            "画中画合成：摄像头 {} 段共 {cam_size} 字节，位置 {rect:?}，帧率 {}",
            camera_windows.len(),
            capture::clamp_fps(options.fps)
        );
        if cam_single {
            crate::modules::media::ffmpeg::overlay_camera(
                app,
                &cleanup_video,
                &cam_src,
                rect,
                options.fps,
                &with_cam,
            )
            .await
            .map_err(|e| format!("摄像头合成失败: {e}"))?;
        } else {
            // 有间隙的分段叠加：每段只在 [start, end] 窗口内出现
            let windows: Vec<(String, f64, f64)> = camera_windows
                .iter()
                .map(|(p, s, e)| (p.clone(), *s, *e))
                .collect();
            crate::modules::media::ffmpeg::overlay_camera_multi(
                app,
                &cleanup_video,
                &windows,
                rect,
                options.fps,
                &with_cam,
            )
            .await
            .map_err(|e| format!("摄像头合成失败: {e}"))?;
        }
        composited = with_cam;
    } else {
        composited = cleanup_video.clone();
    }

    // 3) 混流音频（无音频 → remux 到 mp4 收尾）
    // 麦克风按会话时间线拼装：录制中开关麦克风产生的段间隙插入静音（系统声不受开关影响，
    // 仍按前缀扫描——暂停分段天然连续）
    let sys_files = collect_audio_files(id).1;
    let mic_files = build_mic_timeline(id, &mic_parts);
    log::info!(
        "recording_stop: 音频收集 mic={} 段（含静音填充）/ sys={} 段，开始混流",
        mic_files.len(),
        sys_files.len()
    );
    crate::modules::media::ffmpeg::mux_audio(app, &composited, &mic_files, &sys_files, &final_str)
        .await
        .map_err(|e| format!("音频混流失败: {e}"))?;

    // 4) 清理临时文件（录制段/音频/中间产物）
    // 设 MUERZHI_KEEP_TEMP=1 可保留全部中间产物（排查画中画/音频合成问题用）
    let keep_temp = std::env::var("MUERZHI_KEEP_TEMP")
        .map(|v| v == "1")
        .unwrap_or(false);
    if keep_temp {
        log::warn!("MUERZHI_KEEP_TEMP=1：保留中间产物（段/音频/摄像头/叠加件）");
    }
    if !keep_temp {
        for (_, path, _) in &track_videos {
            if path.contains(id) {
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
        for (p, _, _) in &camera_windows {
            let _ = std::fs::remove_file(p);
        }
        // 摄像头多段拼接的中间件（mkv）：collect_camera_files 只匹配 .webm 清不到它，
        // 漏删的话「有摄像头 + 至少一次暂停」的每次录制都在 %TEMP% 永久残留一整份摄像头视频
        if let Some(joined) = cam_joined_mkv {
            let _ = std::fs::remove_file(joined);
        }
    }
    Ok((final_str, final_name))
}

/// 原生侧录制收尾兜底：退出广播渲染层没人响应时（事件丢失/页面已崩溃），
/// 直接结束采集段并丢弃临时产物 —— 成品可以丢，几百 MB 的临时文件不能留在 %TEMP%。
/// 只应在 phase 为 1/2（还在录/暂停）时调用；phase=3 表示 ffmpeg 合成在跑，不能碰它的输入。
pub async fn discard_active_session() {
    let state = SessionState::global();
    if !state.is_active() {
        return;
    }
    end_all_segments().await;
    let (id, audio) = {
        let mut guard = state.inner.lock().unwrap();
        match guard.take() {
            Some(s) => (s.id, s.audio),
            None => (String::new(), None),
        }
    };
    if let Some(a) = audio {
        let _ = a.stop();
    }
    if !id.is_empty() {
        cleanup_session_temp(&id);
    }
    state.phase.store(0, Ordering::SeqCst);
    capture::CaptureHandles::global().reset();
    log::warn!("原生兜底收尾：活跃录制会话已结束并丢弃临时产物");
}

/// 摄像头窗口：(文件, 会话时间轴 start 秒, end 秒)
type CameraWindow = (String, f64, f64);

/// 把会话跟踪的摄像头段换算成时间轴窗口。
/// end 取「记录过的关闭时刻」，仍开着的段取下一段起点，最后一段取总会话时长。
/// 文件缺失/过小（<1024B，摄像头没起来）的段跳过。
fn build_camera_windows(parts: &[MediaPart], total_sec: f64) -> Vec<CameraWindow> {
    let mut list: Vec<(f64, String, Option<f64>)> = parts
        .iter()
        .filter(|p| {
            std::fs::metadata(&p.path)
                .map(|m| m.len() > 1024)
                .unwrap_or(false)
        })
        .map(|p| (p.start.as_secs_f64(), p.path.clone(), p.end.map(|e| e.as_secs_f64())))
        .collect();
    list.sort_by(|a, b| a.0.total_cmp(&b.0));
    let mut out = Vec::new();
    for (i, (start, path, end)) in list.iter().enumerate() {
        let start = *start;
        let end = end.unwrap_or_else(|| {
            list.get(i + 1).map(|(s, _, _)| *s).unwrap_or(total_sec)
        });
        if end > start {
            out.push((path.clone(), start, end));
        }
    }
    out
}

/// 16bit 立体声 WAV 的实际时长（48kHz，与 audio.rs 采集格式一致）
fn wav_seconds(path: &str) -> std::time::Duration {
    const BYTE_RATE: f64 = 48_000.0 * 2.0 * 2.0; // 采样率 × 声道 × 2 字节
    let data = std::fs::metadata(path)
        .map(|m| m.len().saturating_sub(44))
        .unwrap_or(0);
    std::time::Duration::from_secs_f64(data as f64 / BYTE_RATE)
}

/// 写一段静音 WAV（48kHz/16bit/立体声 PCM 全零）——麦克风段间隙的填充
fn write_silence_wav(path: &std::path::Path, seconds: f64) -> Result<(), String> {
    use std::io::Write as _;
    let sr = 48_000u32;
    let frames = (sr as f64 * seconds).round() as u32;
    let data_bytes = frames as usize * 4;
    let mut f = std::fs::File::create(path).map_err(|e| e.to_string())?;
    let mut header = Vec::with_capacity(44);
    header.extend_from_slice(b"RIFF");
    header.extend_from_slice(&(36 + data_bytes as u32).to_le_bytes());
    header.extend_from_slice(b"WAVEfmt ");
    header.extend_from_slice(&16u32.to_le_bytes());
    header.extend_from_slice(&1u16.to_le_bytes()); // PCM
    header.extend_from_slice(&2u16.to_le_bytes());
    header.extend_from_slice(&sr.to_le_bytes());
    header.extend_from_slice(&(sr * 4).to_le_bytes());
    header.extend_from_slice(&4u16.to_le_bytes());
    header.extend_from_slice(&16u16.to_le_bytes());
    header.extend_from_slice(b"data");
    header.extend_from_slice(&(data_bytes as u32).to_le_bytes());
    f.write_all(&header).map_err(|e| e.to_string())?;
    f.write_all(&vec![0u8; data_bytes]).map_err(|e| e.to_string())?;
    Ok(())
}

/// 把会话跟踪的麦克风段拼成连续时间线：相邻段之间的空隙生成静音 WAV 填充，
/// 段内容才能对回成品时间轴（录制中关过麦克风时，关闭区间正好无声）。
/// 文件缺失/过小（<2048B，audio.rs 视为空已删）的段跳过；<50ms 的缝隙视为抖动直接跨过。
fn build_mic_timeline(id: &str, parts: &[MediaPart]) -> Vec<String> {
    let mut files: Vec<(std::time::Duration, String)> = parts
        .iter()
        .filter(|p| {
            std::fs::metadata(&p.path)
                .map(|m| m.len() > 2048)
                .unwrap_or(false)
        })
        .map(|p| (p.start, p.path.clone()))
        .collect();
    files.sort_by_key(|(s, _)| *s);

    let mut out: Vec<String> = Vec::new();
    for (i, (start, path)) in files.iter().enumerate() {
        if i > 0 {
            let (prev_start, prev_path) = &files[i - 1];
            let cursor = *prev_start + wav_seconds(prev_path);
            if *start > cursor + std::time::Duration::from_millis(50) {
                let gap = (*start - cursor).as_secs_f64();
                let sil = std::env::temp_dir().join(format!("muerzhi_sil_{id}_{i}.wav"));
                match write_silence_wav(&sil, gap) {
                    Ok(()) => out.push(sil.to_string_lossy().to_string()),
                    Err(e) => log::warn!("静音填充写入失败（{gap:.2}s）: {e}"),
                }
            }
        }
        out.push(path.clone());
    }
    out
}

/// 读视频宽高（ffmpeg -i 的 stderr 面板；解析失败回退 1920×1080）。
/// 起子进程 + 等退出是纯阻塞 IO，丢进 spawn_blocking，别占着 async worker 线程。
async fn get_video_size(path: &str) -> (i32, i32) {
    let path = path.to_string();
    tokio::task::spawn_blocking(move || {
        let bin = crate::modules::media::ffmpeg::ffmpeg_bin_fallback();
        let mut cmd = std::process::Command::new(bin);
        cmd.args(["-i", &path]);
        // 摄像头画中画停录路径专用探测，绕过了 ffmpeg.rs 的 spawn_with_registry
        // （那里有隐藏），不加会闪一个 ffmpeg 控制台窗
        #[cfg(windows)]
        {
            use std::os::windows::process::CommandExt;
            cmd.creation_flags(0x0800_0000);
        }
        let Ok(out) = cmd.output() else {
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
    })
    .await
    .unwrap_or((1920, 1080))
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
            let extra = if state.phase() == 1 {
                s.started_at.elapsed()
            } else {
                std::time::Duration::ZERO
            };
            (
                (s.accumulated + extra).as_secs(),
                capture::CaptureHandles::global().track_count(),
            )
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
///
/// 空闲自适应：非录制且电平全零时按 250ms 粒度轮询（只是确认「还是空闲」），
/// 一旦进入录制/出现电平立刻回到 50ms 粒度 —— 20Hz 推送只在真有数据时跑，
/// 常驻空转的唤醒开销（每秒 20 次 atomics 读 + interval tick）降 80%。
pub fn spawn_level_ticker(app: AppHandle) {
    tauri::async_runtime::spawn(async move {
        const ACTIVE_MS: u64 = 50; // 录制中：20Hz 电平刷新
        const IDLE_MS: u64 = 250; // 空闲：4Hz 兜底（新录制开始的电平延迟 ≤250ms）
        let mut interval = tokio::time::interval(std::time::Duration::from_millis(IDLE_MS));
        let mut idle = true;
        loop {
            interval.tick().await;
            let mic = crate::modules::recording::audio::mic_level();
            let sys = crate::modules::recording::audio::sys_level();
            let recording = SessionState::global().is_active();
            let now_idle = !recording && mic == 0.0 && sys == 0.0;
            if now_idle != idle {
                idle = now_idle;
                let ms = if idle { IDLE_MS } else { ACTIVE_MS };
                // tokio 的 interval 周期重建：切粒度用新 interval 覆盖（MissedTickBehavior 沿用默认）
                interval = tokio::time::interval(std::time::Duration::from_millis(ms));
            }
            if idle {
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

    /// 麦克风时间线：中段被关 2 秒 → 相邻段之间插入静音 WAV，首尾段原样保留。
    /// 段文件用真实 WAV（write_silence_wav 生成的同格式），时长可由文件大小反推。
    #[test]
    fn mic_timeline_inserts_silence_for_gaps() {
        let id = "test-mic-timeline";
        let mk = |name: &str| std::env::temp_dir().join(name);
        let p1 = mk("muerzhi_test_tl_p0.wav");
        let p2 = mk("muerzhi_test_tl_p2.wav");
        let _ = std::fs::remove_file(&p1);
        let _ = std::fs::remove_file(&p2);
        // 段1：1 秒（start=0），段2：1 秒（start=3s）→ 2 秒间隙
        write_silence_wav(&p1, 1.0).unwrap();
        write_silence_wav(&p2, 1.0).unwrap();
        let parts = vec![
            MediaPart::open(std::time::Duration::ZERO, p1.to_string_lossy().to_string()),
            {
                let mut p = MediaPart::open(
                    std::time::Duration::from_secs(3),
                    p2.to_string_lossy().to_string(),
                );
                p.end = Some(std::time::Duration::from_secs(4));
                p
            },
        ];
        let timeline = build_mic_timeline(id, &parts);
        assert_eq!(timeline.len(), 3, "应为 [段1, 静音, 段2]: {timeline:?}");
        assert_eq!(timeline[0], p1.to_string_lossy().to_string());
        assert!(timeline[1].contains("muerzhi_sil_"), "中间应是静音: {}", timeline[1]);
        assert_eq!(timeline[2], p2.to_string_lossy().to_string());
        // 静音时长应 ≈ 2s（48k×2ch×2B×2s = 384000 + 44 头）
        let size = std::fs::metadata(&timeline[1]).unwrap().len();
        assert!(
            (size as i64 - (384_000 + 44) as i64).abs() < 8,
            "静音段大小异常: {size}"
        );
        let _ = std::fs::remove_file(&p1);
        let _ = std::fs::remove_file(&p2);
        let _ = std::fs::remove_file(&timeline[1]);
    }

    /// 无间隙（正常暂停分段）时不插静音
    #[test]
    fn mic_timeline_contiguous_parts_need_no_silence() {
        let id = "test-mic-contig";
        let p1 = std::env::temp_dir().join("muerzhi_test_ct_p0.wav");
        let p2 = std::env::temp_dir().join("muerzhi_test_ct_p1.wav");
        let _ = std::fs::remove_file(&p1);
        let _ = std::fs::remove_file(&p2);
        write_silence_wav(&p1, 1.0).unwrap();
        write_silence_wav(&p2, 1.0).unwrap();
        let parts = vec![
            MediaPart::open(std::time::Duration::ZERO, p1.to_string_lossy().to_string()),
            MediaPart::open(
                std::time::Duration::from_secs_f64(1.05),
                p2.to_string_lossy().to_string(),
            ),
        ];
        let timeline = build_mic_timeline(id, &parts);
        assert_eq!(timeline.len(), 2, "无缝隙不应有静音: {timeline:?}");
        let _ = std::fs::remove_file(&p1);
        let _ = std::fs::remove_file(&p2);
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
            &std::process::Command::new(&bin)
                .arg("-decoders")
                .output()
                .unwrap()
                .stdout,
        )
        .to_string();
        assert!(
            decoders.contains("vp8") && decoders.contains("vp9"),
            "缺少 VP8/VP9 解码器，摄像头 webm 无法合成"
        );

        // 摄像头素材容器用 matroska（webm 是其子集，读取走同一 demuxer）
        for (path, buf, w, h, extra) in [
            (&main_v, &black, 320, 240, vec!["-c:v", "libx264"]),
            (
                &cam_v,
                &white,
                160,
                120,
                vec!["-c:v", "libx264", "-f", "matroska"],
            ),
        ] {
            let raw = mk(&format!(
                "{}.raw",
                path.file_stem().unwrap().to_string_lossy()
            ));
            std::fs::write(&raw, buf).expect("写 raw");
            let mut args: Vec<String> = vec![
                "-y".into(),
                "-loglevel".into(),
                "error".into(),
                "-f".into(),
                "rawvideo".into(),
                "-pix_fmt".into(),
                "bgra".into(),
                "-s".into(),
                format!("{w}x{h}"),
                "-r".into(),
                "30".into(),
                "-i".into(),
                raw.to_string_lossy().to_string(),
            ];
            args.extend(extra.iter().map(|s| s.to_string()));
            args.push("-pix_fmt".into());
            args.push("yuv420p".into());
            args.push(path.to_string_lossy().to_string());
            let res = std::process::Command::new(&bin)
                .args(&args)
                .output()
                .expect("造素材");
            let _ = std::fs::remove_file(&raw);
            assert!(
                res.status.success(),
                "造素材失败: {}",
                String::from_utf8_lossy(&res.stderr)
            );
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
                &[
                    cam_v.to_string_lossy().to_string(),
                    cam2.to_string_lossy().to_string(),
                ],
                &joined.to_string_lossy(),
            )
            .await
            .expect("摄像头分段 concat 应成功（mkv 容器）");
        });
        let joined_info = String::from_utf8_lossy(
            &std::process::Command::new(&bin)
                .args(["-i", &joined.to_string_lossy()])
                .output()
                .unwrap()
                .stderr,
        )
        .to_string();
        // 两段各 2 秒 → 拼接后约 4 秒（若容器/时间戳处理错了，时长会塌成 2 秒或 N/A）
        assert!(
            joined_info.contains("Duration: 00:00:04"),
            "拼接时长应约 4 秒:\n{joined_info}"
        );
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
                "-y",
                "-loglevel",
                "error",
                "-ss",
                "1",
                "-i",
                &out.to_string_lossy(),
                "-frames:v",
                "1",
                "-f",
                "image2",
                &png.to_string_lossy(),
            ])
            .output()
            .expect("抽帧");
        assert!(
            res.status.success(),
            "抽帧失败: {}",
            String::from_utf8_lossy(&res.stderr)
        );
        let frame = std::fs::read(&png).expect("读帧");
        assert!(frame.len() > 500, "抽出的帧异常（{} 字节）", frame.len());
        let _ = std::fs::copy(&png, &keep); // 留一份供肉眼核对叠加位置

        // 时长应与输入一致（2 秒），确认 overlay 没有把时间轴搞乱
        let info = String::from_utf8_lossy(
            &std::process::Command::new(&bin)
                .args(["-i", &out.to_string_lossy()])
                .output()
                .unwrap()
                .stderr,
        )
        .to_string();
        assert!(
            info.contains("320x240"),
            "成品尺寸应保持主视频尺寸:
{info}"
        );
        assert!(
            info.contains("Duration: 00:00:02"),
            "成品时长应约 2 秒:
{info}"
        );
        println!(
            "画中画冒烟：{out:?}（{size} 字节），帧图 {png:?}（{} 字节）",
            frame.len()
        );
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
                    "-y",
                    "-loglevel",
                    "error",
                    "-f",
                    "rawvideo",
                    "-pix_fmt",
                    "bgra",
                    "-s",
                    "320x240",
                    "-r",
                    "30",
                    "-i",
                    &raw.to_string_lossy(),
                    "-c:v",
                    "libx264",
                    "-pix_fmt",
                    "yuv420p",
                    "-preset",
                    "ultrafast",
                    &path.to_string_lossy(),
                ])
                .output()
                .expect("起 ffmpeg 造视频");
            let _ = std::fs::remove_file(&raw);
            assert!(
                res.status.success(),
                "造视频失败: {}",
                String::from_utf8_lossy(&res.stderr)
            );
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
                &[
                    seg1.to_string_lossy().to_string(),
                    seg2.to_string_lossy().to_string(),
                ],
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
                    "-i",
                    &out.to_string_lossy(),
                    "-af",
                    "volumedetect",
                    "-vn",
                    // 精简 ffmpeg 没编 null muxer，用 mp4 落个临时文件当"丢弃输出"
                    "-f",
                    "mp4",
                    &probe_sink.to_string_lossy(),
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
        assert!(
            dur.starts_with("00:00:02"),
            "拼接后时长应为 2 秒左右，实际 {dur}"
        );

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
                    MergeInput {
                        file_path: mk("m1.mp4").to_string_lossy().to_string(),
                        bounds: (0, 0, 320, 240),
                    },
                    MergeInput {
                        file_path: mk("m2.mp4").to_string_lossy().to_string(),
                        bounds: (320, 0, 320, 240),
                    },
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
        assert!(
            minfo.contains("640x240"),
            "合并画布应为 640x240:
{minfo}"
        );

        for p in [
            &seg1,
            &seg2,
            &mic,
            &sys,
            &joined,
            &out,
            &merged,
            &probe_sink,
            &mk("m1.mp4"),
            &mk("m2.mp4"),
        ] {
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
