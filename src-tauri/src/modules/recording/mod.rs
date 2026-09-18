// 录制会话（P4）— Rust 原生采集管线
//
// 架构（与迁移计划 P4 一致）：
//   屏幕：Windows Graphics Capture（windows-capture crate）逐帧 → rawvideo pipe → ffmpeg 硬编码 → 临时 mp4
//   声音：WASAPI loopback（系统声）+ 麦克风双路 PCM pipe → 同一 ffmpeg amix 混音
//   摄像头：渲染层 getUserMedia + MediaRecorder 录 camera.webm，停止时 ffmpeg overlay 合成
//   画笔：canvas captureStream 录 strokes.webm，停止时 ffmpeg overlay 合成
//   区域：录全屏 → ffmpeg crop 后期裁剪（与 TS 版一致）
//   多屏：多个 WGC 会话并行 → 各自临时 mp4 → merge_multi_screen 合并
//
// 当前状态：会话状态机 + ffmpeg 命令构建 + 与 bridge 命令接线已就绪；
// WGC 帧泵与 WASAPI 采集在 capture/ 子模块（feature 开关隔离，未启用时 start 返回明确错误）。

use serde::{Deserialize, Serialize};
use tauri::Emitter;
use std::sync::atomic::{AtomicU8, Ordering};
use std::sync::Mutex;

pub mod capture;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RecordingSession {
    pub id: String,
    pub kind: String, // "screen" | "region" | "window"
    pub target: String,
    pub output_tmp: String,
    pub with_mic: bool,
    pub with_sys: bool,
}

#[derive(Debug, Default)]
pub struct SessionState {
    /// 0=idle 1=recording 2=paused
    pub phase: AtomicU8,
    pub current: Mutex<Option<RecordingSession>>,
}

impl SessionState {
    pub fn global() -> &'static SessionState {
        use std::sync::OnceLock;
        static S: OnceLock<SessionState> = OnceLock::new();
        S.get_or_init(|| SessionState {
            phase: AtomicU8::new(0),
            current: Mutex::new(None),
        })
    }

    pub fn phase(&self) -> u8 {
        self.phase.load(Ordering::SeqCst)
    }

    pub fn is_active(&self) -> bool {
        self.phase() != 0
    }
}

/// 启动录制（对齐渲染层 on-toolbar-action start）
#[tauri::command]
#[allow(non_snake_case)]
pub async fn recording_start(
    app: tauri::AppHandle,
    targetDisplayId: Option<u32>,
    withMic: bool,
    withSys: bool,
) -> Result<String, String> {
    let state = SessionState::global();
    if state.is_active() {
        return Err("recording already active".into());
    }
    let id = crate::modules::agent::state_machine::new_uuid_like();
    let tmp = std::env::temp_dir().join(format!("muerzhi_rec_{id}.mp4"));
    let session = RecordingSession {
        id: id.clone(),
        kind: "screen".into(),
        target: targetDisplayId.map(|d| d.to_string()).unwrap_or_default(),
        output_tmp: tmp.to_string_lossy().to_string(),
        with_mic: withMic,
        with_sys: withSys,
    };
    *state.current.lock().unwrap() = Some(session);
    state.phase.store(1, Ordering::SeqCst);

    // WGC 帧泵（capture/ 子模块；feature 未启用时返回明确错误由 UI 提示）
    capture::spawn_screen_capture(&app, &id, targetDisplayId, withMic, withSys).await?;
    let _ = app.emit("recording-state", serde_json::json!({"state": "recording", "id": id}));
    Ok(id)
}

/// 暂停/继续（ffmpeg 信号由 capture 子模块管理；此处仅状态翻转 + UI 通知）
#[tauri::command]
pub fn recording_pause(app: tauri::AppHandle) {
    let state = SessionState::global();
    if state.phase() == 1 {
        state.phase.store(2, Ordering::SeqCst);
        capture::pause_current();
        let _ = app.emit("recording-state", serde_json::json!({"state": "paused"}));
    }
}

#[tauri::command]
pub fn recording_resume(app: tauri::AppHandle) {
    let state = SessionState::global();
    if state.phase() == 2 {
        state.phase.store(1, Ordering::SeqCst);
        capture::resume_current();
        let _ = app.emit("recording-state", serde_json::json!({"state": "recording"}));
    }
}

/// 停止录制（对齐 toolbar stop）：优雅结束 ffmpeg → 渲染层写摄像头/画笔 webm → 合成
#[tauri::command]
pub async fn recording_stop(app: tauri::AppHandle) -> Result<String, String> {
    let state = SessionState::global();
    let Some(session) = state.current.lock().unwrap().clone() else {
        return Err("no active session".into());
    };
    state.phase.store(0, Ordering::SeqCst);
    let output = capture::stop_current().await?;
    *state.current.lock().unwrap() = None;
    let _ = app.emit(
        "recording-stopped",
        serde_json::json!({"id": session.id, "outputPath": output}),
    );
    Ok(output)
}

/// 让 Deserialize import 被使用（合成参数结构，P4 后续接线）
#[allow(dead_code)]
#[derive(Deserialize)]
struct CompositeInput {
    screen_mp4: String,
    camera_webm: Option<String>,
    strokes_webm: Option<String>,
    output_mp4: String,
}

