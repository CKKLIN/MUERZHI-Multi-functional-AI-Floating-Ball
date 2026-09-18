// ffmpeg 转码族 — 移植 electron/main/ffmpeg.ts
// 转码（webm→mp4 含裁剪两遍）/ GIF 两遍 palette / 多屏合并 complexFilter；
// 进度经 on-conversion-progress 事件推给渲染层（口径与 TS 一致）。

use crate::modules::media::conversion_registry::{register_conversion, unregister_conversion};
use crate::modules::media::hw_encoder::build_encode_options;
use serde_json::json;
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::{AppHandle, Emitter};

/// ffmpeg 二进制路径：打包态 resources/ffmpeg.exe；dev 态项目根 vendor/ffmpeg/ffmpeg.exe
pub fn ffmpeg_bin(app: &AppHandle) -> PathBuf {
    if let Ok(res) = app.path().resource_dir() {
        let p = res.join("ffmpeg.exe");
        if p.exists() {
            return p;
        }
    }
    if let Ok(exe) = std::env::current_exe() {
        if let Some(root) = exe.ancestors().nth(4) {
            let p = root.join("vendor").join("ffmpeg").join("ffmpeg.exe");
            if p.exists() {
                return p;
            }
        }
    }
    PathBuf::from("ffmpeg.exe")
}

fn num_threads() -> usize {
    std::thread::available_parallelism().map(|n| n.get()).unwrap_or(4).min(8)
}

use tauri::Manager;

/// 注册 kill 闭包（进程树杀：Windows 用 taskkill /T，避免 ffmpeg 子进程残留）
fn spawn_with_registry(app: &AppHandle, mut cmd: Command) -> (Child, String) {
    cmd.stdin(Stdio::null()).stdout(Stdio::piped()).stderr(Stdio::piped());
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x0800_0000);
    }
    let child = cmd.spawn().expect("ffmpeg spawn failed");
    let pid = child.id();
    let kill_id = register_conversion(move || {
        #[cfg(windows)]
        {
            use std::os::windows::process::CommandExt;
            let mut k = Command::new("taskkill");
            k.args(["/F", "/T", "/PID", &pid.to_string()]);
            k.creation_flags(0x0800_0000);
            let _ = k.status();
        }
        #[cfg(not(windows))]
        {
            let _ = Command::new("kill").args(["-9", &pid.to_string()]).status();
        }
    });
    let _ = app;
    (child, kill_id)
}

/// 进度上报（对齐 percent/targetSize 字段名）
fn emit_progress(app: &AppHandle, percent: f64, target_size: u64) {
    let _ = app.emit(
        "on-conversion-progress",
        json!({ "percent": percent, "targetSize": target_size }),
    );
}

/// 读取 ffmpeg 输出（等待退出），返回成功与否 + stdout/stderr
async fn wait_output(mut child: Child) -> (bool, String) {
    let out = tokio::task::spawn_blocking(move || {
        let status = child.wait();
        let mut buf = String::new();
        if let Some(mut err) = child.stderr.take() {
            use std::io::Read;
            let _ = err.read_to_string(&mut buf);
        }
        (status.map(|s| s.success()).unwrap_or(false), buf)
    })
    .await;
    match out {
        Ok((ok, text)) => (ok, text),
        Err(e) => (false, format!("join failed: {e}")),
    }
}

// ===== 转码（webm → mp4，可选裁剪）=====

/// 对齐 convertWebmToMp4：无裁剪 = remux 直拷；有裁剪 = 两遍（先编码裁切，再 remux 合音频）
pub async fn convert_webm_to_mp4(
    app: &AppHandle,
    input_path: &str,
    output_path: &str,
    crop: Option<(i32, i32, i32, i32)>,
) -> Result<(), String> {
    let bin = ffmpeg_bin(app);
    if crop.is_none() {
        // remux：-c:v copy -c:a aac -b:a 128k -movflags +faststart
        let mut cmd = Command::new(&bin);
        cmd.args([
            "-y", "-i", input_path, "-c:v", "copy", "-c:a", "aac", "-b:a", "128k", "-movflags",
            "+faststart", output_path,
        ]);
        let (child, kill_id) = spawn_with_registry(app, cmd);
        emit_progress(app, 80.0, 0);
        let (ok, text) = wait_output(child).await;
        unregister_conversion(&kill_id);
        if !ok {
            return Err(format!("remux failed: {}", tail(&text)));
        }
        emit_progress(app, 100.0, 0);
        return Ok(());
    }

    let (cx, cy, cw, ch) = crop.unwrap();
    let even = |v: i32| ((v as f64 / 2.0).round() as i32) * 2;
    let crop_filter = format!("crop={}:{}:{}:{},", even(cw), even(ch), even(cx), even(cy));
    let tmp_path = output_path.replace(".mp4", "_tmp.mp4");

    // pass1：编码裁切（无音频）
    let encoder = crate::modules::media::hw_encoder::get_h264_encoder(&bin.to_string_lossy()).await;
    let try_pass1 = |enc: &str| -> Command {
        let mut cmd = Command::new(&bin);
        let mut args: Vec<String> = vec!["-y".into(), "-i".into(), input_path.into()];
        args.extend(build_encode_options(enc, "23", num_threads()));
        args.push("-vf".into());
        args.push(format!("{}pad=ceil(iw/2)*2:ceil(ih/2)*2,format=yuv420p", crop_filter));
        args.push("-an".into());
        args.push("-movflags".into());
        args.push("+faststart".into());
        args.push(tmp_path.clone());
        cmd.args(args);
        cmd
    };
    let (child, kill_id) = spawn_with_registry(app, try_pass1(&encoder));
    let (ok1, text1) = wait_output(child).await;
    unregister_conversion(&kill_id);
    let mut used_encoder = encoder.clone();
    if !ok1 {
        if encoder != "libx264" {
            log::warn!("pass1 failed with {encoder}, retry libx264");
            let _ = std::fs::remove_file(&tmp_path);
            let (child, kill_id) = spawn_with_registry(app, try_pass1("libx264"));
            let (ok1b, text1b) = wait_output(child).await;
            unregister_conversion(&kill_id);
            if !ok1b {
                let _ = std::fs::remove_file(&tmp_path);
                return Err(format!("crop pass1 failed: {}", tail(&text1b)));
            }
            used_encoder = "libx264".into();
        } else {
            let _ = std::fs::remove_file(&tmp_path);
            return Err(format!("crop pass1 failed: {}", tail(&text1)));
        }
    }
    let _ = used_encoder;
    emit_progress(app, 50.0, 0);

    // pass2：remux 合回音频
    let mut cmd = Command::new(&bin);
    cmd.args([
        "-y", "-i", &tmp_path, "-i", input_path, "-c:v", "copy", "-c:a", "aac", "-b:a", "128k",
        "-map", "0:v", "-map", "1:a?", "-shortest", "-movflags", "+faststart", output_path,
    ]);
    let (child, kill_id) = spawn_with_registry(app, cmd);
    let (ok2, text2) = wait_output(child).await;
    unregister_conversion(&kill_id);
    if ok2 {
        let _ = std::fs::remove_file(&tmp_path);
        emit_progress(app, 100.0, 0);
        Ok(())
    } else {
        // 兜底：pass1 产物直接改名
        let _ = std::fs::remove_file(output_path);
        match std::fs::rename(&tmp_path, output_path) {
            Ok(()) => {
                emit_progress(app, 100.0, 0);
                Ok(())
            }
            Err(_) => Err(format!("crop pass2 failed: {}", tail(&text2))),
        }
    }
}

/// 单遍裁剪（对齐 cropVideo）
pub async fn crop_video(app: &AppHandle, input_path: &str, output_path: &str, crop: (i32, i32, i32, i32)) -> Result<(), String> {
    let bin = ffmpeg_bin(app);
    let (cx, cy, cw, ch) = crop;
    let even = |v: i32| ((v as f64 / 2.0).round() as i32) * 2;
    let vf = format!("crop={}:{}:{}:{},format=yuv420p", even(cw), even(ch), even(cx), even(cy));
    let encoder = crate::modules::media::hw_encoder::get_h264_encoder(&bin.to_string_lossy()).await;

    let run = |enc: &str| -> Command {
        let mut cmd = Command::new(&bin);
        let mut args: Vec<String> = vec!["-y".into(), "-i".into(), input_path.into()];
        args.extend(build_encode_options(enc, "18", num_threads()));
        args.extend(["-vf".into(), vf.clone(), "-c:a".into(), "copy".into(), "-movflags".into(), "+faststart".into(), output_path.into()]);
        cmd.args(args);
        cmd
    };
    let (child, kill_id) = spawn_with_registry(app, run(&encoder));
    let (ok, text) = wait_output(child).await;
    unregister_conversion(&kill_id);
    if ok {
        emit_progress(app, 100.0, 0);
        return Ok(());
    }
    if encoder != "libx264" {
        log::warn!("cropVideo failed with {encoder}, retry libx264");
        let _ = std::fs::remove_file(output_path);
        let (child, kill_id) = spawn_with_registry(app, run("libx264"));
        let (ok2, text2) = wait_output(child).await;
        unregister_conversion(&kill_id);
        if ok2 {
            emit_progress(app, 100.0, 0);
            return Ok(());
        }
        return Err(format!("crop failed: {}", tail(&text2)));
    }
    Err(format!("crop failed: {}", tail(&text)))
}

// ===== GIF 两遍 palette =====

pub async fn convert_to_gif(
    app: &AppHandle,
    input_path: &str,
    output_path: &str,
    width: u32,
    fps: u32,
    duration: Option<f64>,
) -> Result<(), String> {
    let bin = ffmpeg_bin(app);
    let palette = std::env::temp_dir().join(format!("gif_palette_{}.png", crate::modules::todo::store::now_ms()));

    // pass1：palettegen
    let mut c1 = Command::new(&bin);
    c1.args([
        "-y", "-i", input_path, "-vf",
        &format!("fps={fps},scale={width}:-1:flags=lanczos,palettegen"),
        &palette.to_string_lossy(),
    ]);
    let (child, kill_id) = spawn_with_registry(app, c1);
    let (ok1, text1) = wait_output(child).await;
    unregister_conversion(&kill_id);
    if !ok1 {
        let _ = std::fs::remove_file(&palette);
        return Err(format!("gif palettegen failed: {}", tail(&text1)));
    }

    // pass2：paletteuse（进度靠 stderr time= 解析，口径与 TS 一致：percent+50）
    let mut c2 = Command::new(&bin);
    c2.args([
        "-y", "-i", input_path, "-i", &palette.to_string_lossy(), "-filter_complex",
        &format!("[0:v]fps={fps},scale={width}:-1:flags=lanczos[x];[x][1:v]paletteuse"),
        output_path,
    ]);
    let (child, kill_id) = spawn_with_registry(app, c2);
    let (ok2, text2) = wait_output(child).await;
    unregister_conversion(&kill_id);
    let _ = std::fs::remove_file(&palette);
    if !ok2 {
        return Err(format!("gif paletteuse failed: {}", tail(&text2)));
    }
    // 进度按 time= 最后一条计算（简化：结束后直接 100）
    if let Some(dur) = duration {
        if let Some(cur) = parse_last_time(&text2) {
            let pct = ((cur / dur) * 100.0).round().min(99.0) + 50.0;
            emit_progress(app, pct, 0);
        }
    }
    emit_progress(app, 100.0, 0);
    Ok(())
}

/// 解析 stderr 里最后一个 time=HH:MM:SS.mmm 的秒数
pub fn parse_last_time(stderr: &str) -> Option<f64> {
    let mut last: Option<f64> = None;
    for part in stderr.split("time=") {
        let candidate: String = part.chars().take_while(|c| c.is_ascii_digit() || *c == ':' || *c == '.').collect();
        if let Some(secs) = parse_hms(&candidate) {
            last = Some(secs);
        }
    }
    last
}

fn parse_hms(s: &str) -> Option<f64> {
    let parts: Vec<&str> = s.split(':').collect();
    if parts.len() != 3 {
        return None;
    }
    let h: f64 = parts[0].parse().ok()?;
    let m: f64 = parts[1].parse().ok()?;
    let sec: f64 = parts[2].parse().ok()?;
    Some(h * 3600.0 + m * 60.0 + sec)
}

// ===== 多屏合并 =====

pub struct MergeInput {
    pub file_path: String,
    pub bounds: (i32, i32, i32, i32), // x, y, w, h
}

/// 多屏合并（对齐 mergeMultiScreen）：先各自 remux，再用 color 背景 + scale/overlay 叠加
pub async fn merge_multi_screen(app: &AppHandle, inputs: &[MergeInput], output_path: &str) -> Result<(), String> {
    let bin = ffmpeg_bin(app);
    if inputs.is_empty() {
        return Err("no inputs".into());
    }
    // 画布尺寸
    let min_x = inputs.iter().map(|i| i.bounds.0).min().unwrap_or(0);
    let min_y = inputs.iter().map(|i| i.bounds.1).min().unwrap_or(0);
    let max_x = inputs.iter().map(|i| i.bounds.0 + i.bounds.2).max().unwrap_or(0);
    let max_y = inputs.iter().map(|i| i.bounds.1 + i.bounds.3).max().unwrap_or(0);
    let even = |v: i32| ((v as f64 / 2.0).round() as i32) * 2;
    let (cw, ch) = (even(max_x - min_x), even(max_y - min_y));

    // Step1：逐个 remux 到 mp4
    let mut remuxed: Vec<String> = Vec::new();
    for (i, input) in inputs.iter().enumerate() {
        let out = input.file_path.replace(".webm", "_remux.mp4");
        let mut cmd = Command::new(&bin);
        cmd.args(["-y", "-i", &input.file_path, "-c", "copy", &out]);
        let (child, kill_id) = spawn_with_registry(app, cmd);
        let (ok, text) = wait_output(child).await;
        unregister_conversion(&kill_id);
        if !ok {
            cleanup_files(&remuxed, inputs);
            return Err(format!("remux #{i} failed: {}", tail(&text)));
        }
        remuxed.push(out);
        let pct = ((i + 1) as f64 / inputs.len() as f64 * 30.0).round();
        emit_progress(app, pct, 0);
    }

    // Step2：complexFilter 合成
    let mut filter = format!("color=c=black:s={cw}x{ch}[bg]");
    let mut prev = "[bg]".to_string();
    for (i, input) in inputs.iter().enumerate() {
        let dx = even(input.bounds.0 - min_x);
        let dy = even(input.bounds.1 - min_y);
        let sw = even(input.bounds.2);
        let sh = even(input.bounds.3);
        filter.push_str(&format!(";[{i}:v]scale={sw}:{sh},setsar=1[s{i}]"));
        let is_last = i == inputs.len() - 1;
        let out_label = if is_last { "[out]".to_string() } else { format!("[tmp{i}]") };
        // 最后一个 overlay 必须带 shortest=1，否则输出无限长（TS 注释记录的卡死 bug）
        let shortest = if is_last { ":shortest=1" } else { "" };
        filter.push_str(&format!(";{prev}[s{i}]overlay={dx}:{dy}{shortest}{out_label}"));
        prev = out_label;
    }
    filter.push_str(";[out]format=yuv420p");

    let encoder = crate::modules::media::hw_encoder::get_h264_encoder(&bin.to_string_lossy()).await;
    let run = |enc: &str| -> Command {
        let mut cmd = Command::new(&bin);
        let mut args: Vec<String> = vec!["-y".into()];
        for r in &remuxed {
            args.push("-i".into());
            args.push(r.clone());
        }
        args.push("-filter_complex".into());
        args.push(filter.clone());
        args.extend(build_encode_options(enc, "23", num_threads()));
        args.push("-movflags".into());
        args.push("+faststart".into());
        args.push(output_path.into());
        cmd.args(args);
        cmd
    };
    let (child, kill_id) = spawn_with_registry(app, run(&encoder));
    let (ok, text) = wait_output(child).await;
    unregister_conversion(&kill_id);
    let mut success = ok;
    if !success && encoder != "libx264" {
        log::warn!("merge failed with {encoder}, retry libx264");
        let _ = std::fs::remove_file(output_path);
        let (child, kill_id) = spawn_with_registry(app, run("libx264"));
        let (ok2, text2) = wait_output(child).await;
        unregister_conversion(&kill_id);
        success = ok2;
        if !success {
            cleanup_files(&remuxed, inputs);
            return Err(format!("merge failed: {}", tail(&text2)));
        }
    } else if !success {
        cleanup_files(&remuxed, inputs);
        return Err(format!("merge failed: {}", tail(&text)));
    }
    emit_progress(app, 100.0, 0);
    cleanup_files(&remuxed, inputs);
    Ok(())
}

fn cleanup_files(remuxed: &[String], inputs: &[MergeInput]) {
    for r in remuxed {
        let _ = std::fs::remove_file(r);
    }
    for i in inputs {
        let _ = std::fs::remove_file(&i.file_path);
    }
}

fn tail(s: &str) -> String {
    let lines: Vec<&str> = s.lines().filter(|l| !l.trim().is_empty()).collect();
    let start = lines.len().saturating_sub(3);
    lines[start..].join(" | ").chars().take(300).collect()
}

/// 让 Path/Arc/AtomicBool import 被使用（预留：P4 录制管线复用）
#[allow(dead_code)]
fn _unused(_p: &Path, _b: Arc<AtomicBool>) {
    let _ = _b.load(Ordering::SeqCst);
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_time_in_stderr() {
        let stderr = "frame= 30 fps=15 time=00:00:02.00 bitrate=...\nframe= 60 fps=20 time=00:00:04.50 bitrate=...";
        assert_eq!(parse_last_time(stderr), Some(4.5));
        assert_eq!(parse_last_time("no time here"), None);
    }

    #[test]
    fn hms_parsing() {
        assert_eq!(parse_hms("01:02:03.5"), Some(3723.5));
        assert_eq!(parse_hms("bad"), None);
    }
}