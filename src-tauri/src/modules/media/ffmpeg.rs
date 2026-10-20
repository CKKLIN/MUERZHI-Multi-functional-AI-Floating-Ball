// ffmpeg 转码族 — 移植 electron/main/ffmpeg.ts
// 转码（webm→mp4 含裁剪两遍）/ GIF 两遍 palette / 多屏合并 complexFilter；
// 进度经 on-conversion-progress 事件推给渲染层（口径与 TS 一致）。

use crate::modules::media::conversion_registry::{register_conversion, unregister_conversion};
use crate::modules::media::hw_encoder::build_encode_options;
use serde_json::json;
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use tauri::{AppHandle, Emitter};

/// ffmpeg 二进制路径：打包态 resources/ffmpeg.exe；dev 态项目根 vendor/ffmpeg/ffmpeg.exe
pub fn ffmpeg_bin(app: &AppHandle) -> PathBuf {
    if let Ok(res) = app.path().resource_dir() {
        let p = res.join("ffmpeg.exe");
        if p.exists() {
            return p;
        }
    }
    ffmpeg_bin_fallback()
}

/// 不依赖 AppHandle 的路径解析（app 不可用时的兜底，也供单元测试直接调用）：
/// 从当前 exe 上溯找 vendor/ffmpeg/ffmpeg.exe（dev 态 target/debug → 项目根），
/// 再退回 PATH 上的 ffmpeg.exe。
pub fn ffmpeg_bin_fallback() -> PathBuf {
    if let Ok(exe) = std::env::current_exe() {
        // 测试/调试产物在 target/{debug,release}/deps/ → 多试几级，命中即用
        for n in 3..=6 {
            if let Some(root) = exe.ancestors().nth(n) {
                let p = root.join("vendor").join("ffmpeg").join("ffmpeg.exe");
                if p.exists() {
                    return p;
                }
            }
        }
    }
    PathBuf::from("ffmpeg.exe")
}

fn num_threads() -> usize {
    std::thread::available_parallelism()
        .map(|n| n.get())
        .unwrap_or(4)
        .min(8)
}

use tauri::Manager;

/// 注册 kill 闭包（进程树杀：Windows 用 taskkill /T，避免 ffmpeg 子进程残留）
fn spawn_with_registry(mut cmd: Command) -> (Child, String) {
    cmd.stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
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
    (child, kill_id)
}

/// 进度上报（对齐 percent/targetSize 字段名）
fn emit_progress(app: &AppHandle, percent: f64, target_size: u64) {
    let _ = app.emit(
        "on-conversion-progress",
        json!({ "percent": percent, "targetSize": target_size }),
    );
}

/// 读取 ffmpeg 输出（等待退出），返回成功与否 + stderr
/// stdout/stderr 必须在 wait 的同时并发排水：ffmpeg 持续写 stderr（进度/日志），
/// Windows 管道缓冲约 64KB，先 wait 再读会让 ffmpeg 卡死在写管道上（长转换必现）。
async fn wait_output(child: Child) -> (bool, String) {
    let out = tokio::task::spawn_blocking(move || match child.wait_with_output() {
        Ok(o) => (
            o.status.success(),
            String::from_utf8_lossy(&o.stderr).to_string(),
        ),
        Err(e) => (false, format!("wait failed: {e}")),
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
    log::info!("convert_webm_to_mp4: {input_path} → {output_path}（crop={crop:?}）");
    if crop.is_none() {
        // remux：-c:v copy -c:a aac -b:a 128k -movflags +faststart
        let mut cmd = Command::new(&bin);
        cmd.args([
            "-y",
            "-i",
            input_path,
            "-c:v",
            "copy",
            "-c:a",
            "aac",
            "-b:a",
            "128k",
            "-movflags",
            "+faststart",
            output_path,
        ]);
        let (child, kill_id) = spawn_with_registry(cmd);
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
        args.push(format!(
            "{}pad=ceil(iw/2)*2:ceil(ih/2)*2,format=yuv420p",
            crop_filter
        ));
        args.push("-an".into());
        args.push("-movflags".into());
        args.push("+faststart".into());
        args.push(tmp_path.clone());
        cmd.args(args);
        cmd
    };
    let (child, kill_id) = spawn_with_registry(try_pass1(&encoder));
    let (ok1, text1) = wait_output(child).await;
    unregister_conversion(&kill_id);
    let mut used_encoder = encoder.clone();
    if !ok1 {
        if encoder != "libx264" {
            log::warn!("pass1 failed with {encoder}, retry libx264");
            let _ = std::fs::remove_file(&tmp_path);
            let (child, kill_id) = spawn_with_registry(try_pass1("libx264"));
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
        "-y",
        "-i",
        &tmp_path,
        "-i",
        input_path,
        "-c:v",
        "copy",
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        "-map",
        "0:v",
        "-map",
        "1:a?",
        "-shortest",
        "-movflags",
        "+faststart",
        output_path,
    ]);
    let (child, kill_id) = spawn_with_registry(cmd);
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
pub async fn crop_video(
    app: &AppHandle,
    input_path: &str,
    output_path: &str,
    crop: (i32, i32, i32, i32),
) -> Result<(), String> {
    let bin = ffmpeg_bin(app);
    log::info!("crop_video: {input_path} → {output_path} crop={crop:?}");
    let (cx, cy, cw, ch) = crop;
    let even = |v: i32| ((v as f64 / 2.0).round() as i32) * 2;
    let vf = format!(
        "crop={}:{}:{}:{},format=yuv420p",
        even(cw),
        even(ch),
        even(cx),
        even(cy)
    );
    let encoder = crate::modules::media::hw_encoder::get_h264_encoder(&bin.to_string_lossy()).await;

    let run = |enc: &str| -> Command {
        let mut cmd = Command::new(&bin);
        let mut args: Vec<String> = vec!["-y".into(), "-i".into(), input_path.into()];
        args.extend(build_encode_options(enc, "18", num_threads()));
        args.extend([
            "-vf".into(),
            vf.clone(),
            "-c:a".into(),
            "copy".into(),
            "-movflags".into(),
            "+faststart".into(),
            output_path.into(),
        ]);
        cmd.args(args);
        cmd
    };
    let (child, kill_id) = spawn_with_registry(run(&encoder));
    let (ok, text) = wait_output(child).await;
    unregister_conversion(&kill_id);
    if ok {
        emit_progress(app, 100.0, 0);
        return Ok(());
    }
    if encoder != "libx264" {
        log::warn!("cropVideo failed with {encoder}, retry libx264");
        let _ = std::fs::remove_file(output_path);
        let (child, kill_id) = spawn_with_registry(run("libx264"));
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
    log::info!("convert_to_gif: {input_path} → {output_path}（width={width}, fps={fps}, duration={duration:?}）");
    let palette = std::env::temp_dir().join(format!(
        "gif_palette_{}.png",
        crate::modules::todo::store::now_ms()
    ));

    // pass1：palettegen
    // `-frames:v 1 -update 1`：palettegen 只出一帧，而 png 走 image2 封装器 ——
    // 不声明单图输出时 ffmpeg 会告警「filename does not contain an image sequence pattern」，
    // 序列写盘行为在不同版本下还可能写不出文件（pass2 随后就找不到 palette 输入）。
    let mut c1 = Command::new(&bin);
    c1.args([
        "-y",
        "-i",
        input_path,
        "-vf",
        &format!("fps={fps},scale={width}:-1:flags=lanczos,palettegen"),
        "-frames:v",
        "1",
        "-update",
        "1",
        &palette.to_string_lossy(),
    ]);
    let (child, kill_id) = spawn_with_registry(c1);
    let (ok1, text1) = wait_output(child).await;
    unregister_conversion(&kill_id);
    if !ok1 {
        let _ = std::fs::remove_file(&palette);
        return Err(format!("gif palettegen failed: {}", tail(&text1)));
    }

    // pass2：paletteuse（进度靠 stderr time= 解析，口径与 TS 一致：percent+50）
    let mut c2 = Command::new(&bin);
    c2.args([
        "-y",
        "-i",
        input_path,
        "-i",
        &palette.to_string_lossy(),
        "-filter_complex",
        &format!("[0:v]fps={fps},scale={width}:-1:flags=lanczos[x];[x][1:v]paletteuse"),
        output_path,
    ]);
    let (child, kill_id) = spawn_with_registry(c2);
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
        let candidate: String = part
            .chars()
            .take_while(|c| c.is_ascii_digit() || *c == ':' || *c == '.')
            .collect();
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
pub async fn merge_multi_screen(
    app: &AppHandle,
    inputs: &[MergeInput],
    output_path: &str,
) -> Result<(), String> {
    merge_multi_screen_core(Some(app), inputs, output_path).await
}

/// 多屏合并核心（app 可选：单元测试传 None 跳过进度事件）
pub async fn merge_multi_screen_core(
    app: Option<&AppHandle>,
    inputs: &[MergeInput],
    output_path: &str,
) -> Result<(), String> {
    let bin = match app {
        Some(a) => ffmpeg_bin(a),
        None => ffmpeg_bin_fallback(),
    };
    log::info!(
        "merge_multi_screen: {} 路输入 → {output_path}（bounds={:?}）",
        inputs.len(),
        inputs.iter().map(|i| i.bounds).collect::<Vec<_>>()
    );
    let emit = |pct: f64| {
        if let Some(a) = app {
            emit_progress(a, pct, 0);
        }
    };
    if inputs.is_empty() {
        return Err("no inputs".into());
    }
    // 画布尺寸
    let min_x = inputs.iter().map(|i| i.bounds.0).min().unwrap_or(0);
    let min_y = inputs.iter().map(|i| i.bounds.1).min().unwrap_or(0);
    let max_x = inputs
        .iter()
        .map(|i| i.bounds.0 + i.bounds.2)
        .max()
        .unwrap_or(0);
    let max_y = inputs
        .iter()
        .map(|i| i.bounds.1 + i.bounds.3)
        .max()
        .unwrap_or(0);
    let even = |v: i32| ((v as f64 / 2.0).round() as i32) * 2;
    let (cw, ch) = (even(max_x - min_x), even(max_y - min_y));

    // Step1：逐个 remux 到 mp4
    let mut remuxed: Vec<String> = Vec::new();
    for (i, input) in inputs.iter().enumerate() {
        // ️ 不能写成 `replace(".webm", "_remux.mp4")`：Rust 采集管线产出的段本来就是 mp4，
        // 那样替换不会生效 → out == input → ffmpeg 拒绝原地改写（"cannot edit existing files
        // in-place"）。统一按「原名 + 后缀」派生，任何扩展名都能得到不同的输出路径。
        let out = format!("{}_remux.mp4", input.file_path);
        let mut cmd = Command::new(&bin);
        cmd.args(["-y", "-i", &input.file_path, "-c", "copy", &out]);
        let (child, kill_id) = spawn_with_registry(cmd);
        let (ok, text) = wait_output(child).await;
        unregister_conversion(&kill_id);
        if !ok {
            cleanup_files(&remuxed, inputs);
            return Err(format!("remux #{i} failed: {}", tail(&text)));
        }
        remuxed.push(out);
        let pct = ((i + 1) as f64 / inputs.len() as f64 * 30.0).round();
        emit(pct);
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
        let out_label = if is_last {
            "[out]".to_string()
        } else {
            format!("[tmp{i}]")
        };
        // 最后一个 overlay 必须带 shortest=1，否则输出无限长（TS 注释记录的卡死 bug）
        let shortest = if is_last { ":shortest=1" } else { "" };
        filter.push_str(&format!(
            ";{prev}[s{i}]overlay={dx}:{dy}{shortest}{out_label}"
        ));
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
    let (child, kill_id) = spawn_with_registry(run(&encoder));
    let (ok, text) = wait_output(child).await;
    unregister_conversion(&kill_id);
    let mut success = ok;
    if !success && encoder != "libx264" {
        log::warn!("merge failed with {encoder}, retry libx264");
        let _ = std::fs::remove_file(output_path);
        let (child, kill_id) = spawn_with_registry(run("libx264"));
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
    emit(100.0);
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

// ===== 录制管线专用（P4）：段拼接 / 音频混流 =====

/// 拼接同源录制段（暂停分段后拼回一个文件）
///
/// 用 concat **demuxer** 而非 filter：所有段由同一编码器同参数产出（H264/mp4/同分辨率），
/// `-c copy` 即可无损拼接，不重编码也就没有画质损失与耗时；concat filter 需要解码再编码。
///
/// 容器由 `output_path` 后缀决定：mp4/mov 加 `-movflags +faststart`；`.mkv` 不加
/// （matroska 不吃这个 flag，而且 VP8 这类编码器 mp4 根本装不下，摄像头 webm 段必须走 mkv）。
pub async fn concat_videos(
    app: &AppHandle,
    segments: &[String],
    output_path: &str,
) -> Result<(), String> {
    concat_videos_core(Some(app), segments, output_path).await
}

/// concat 核心（app 可选：单元测试传 None 跳过进度事件）
pub async fn concat_videos_core(
    app: Option<&AppHandle>,
    segments: &[String],
    output_path: &str,
) -> Result<(), String> {
    if segments.is_empty() {
        return Err("没有可拼接的录制段".into());
    }
    log::info!(
        "concat_videos: {} 段 → {output_path}（首段 {}）",
        segments.len(),
        segments[0]
    );
    let bin = match app {
        Some(a) => ffmpeg_bin(a),
        None => ffmpeg_bin_fallback(),
    };
    let emit = |pct: f64| {
        if let Some(a) = app {
            emit_progress(a, pct, 0);
        }
    };
    let list_path = std::env::temp_dir().join(format!(
        "muerzhi_concat_{}.txt",
        crate::modules::todo::store::now_ms()
    ));
    // concat demuxer 的 file 行：反斜杠会被当转义，统一改成正斜杠；
    // 单引号需按 ffmpeg 规则写成 '\''（本工程临时路径不会出现，防御性处理）
    let body: String = segments
        .iter()
        .map(|p| format!("file '{}'\n", p.replace('\\', "/").replace('\'', "'\\''")))
        .collect();
    std::fs::write(&list_path, body).map_err(|e| format!("拼接清单写入失败: {e}"))?;

    let mut cmd = Command::new(&bin);
    cmd.args([
        "-y",
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        &list_path.to_string_lossy(),
        "-c",
        "copy",
    ]);
    cmd.args(concat_container_flags(output_path));
    cmd.arg(output_path);
    let (child, kill_id) = spawn_with_registry(cmd);
    emit(60.0);
    let (ok, text) = wait_output(child).await;
    unregister_conversion(&kill_id);
    let _ = std::fs::remove_file(&list_path);
    if !ok {
        return Err(format!("concat failed: {}", tail(&text)));
    }
    emit(80.0);
    Ok(())
}

/// concat 输出的容器相关参数：只有 mp4/mov 族认识 `+faststart`
/// （matroska 不认；VP8/VP9 段必须落在 mkv 里，见 concat_videos 注释）
fn concat_container_flags(output_path: &str) -> Vec<String> {
    let lower = output_path.to_ascii_lowercase();
    if lower.ends_with(".mp4") || lower.ends_with(".mov") || lower.ends_with(".m4v") {
        vec!["-movflags".into(), "+faststart".into()]
    } else {
        Vec::new()
    }
}

/// 给一路音频（可能多段）生成 filter label：单段直接引用，多段用 concat 滤镜接起来。
/// 接起来的段写进 chains（返回非 None 时调用方必须把 chains 交给 -filter_complex）。
fn audio_input_label(
    files: &[String],
    start: usize,
    name: &str,
    chains: &mut Vec<String>,
) -> Option<String> {
    match files.len() {
        0 => None,
        1 => Some(format!("[{start}:a]")),
        n => {
            let inputs: String = (0..n).map(|i| format!("[{}:a]", start + i)).collect();
            chains.push(format!("{inputs}concat=n={n}:v=0:a=1[{name}]"));
            Some(format!("[{name}]"))
        }
    }
}

/// 给视频混上音频（麦克风 / 系统声，各自可能多段）并输出最终 mp4
///
/// - 两路都没有：纯 remux（保留 faststart，播放器可即时 seek）
/// - 单路单段：直接 mux
/// - 任一路多段：先用 concat 滤镜把同源各段接起来（WAV 同格式，仅重采样开销）
/// - 两路都有：amix 混音（`duration=longest` + `-shortest` 由视频长度收口）
pub async fn mux_audio(
    app: &AppHandle,
    video_path: &str,
    mic_files: &[String],
    sys_files: &[String],
    output_path: &str,
) -> Result<(), String> {
    mux_audio_core(Some(app), video_path, mic_files, sys_files, output_path).await
}

/// mux 核心（app 可选：单元测试传 None 跳过进度事件与资源路径解析）
pub async fn mux_audio_core(
    app: Option<&AppHandle>,
    video_path: &str,
    mic_files: &[String],
    sys_files: &[String],
    output_path: &str,
) -> Result<(), String> {
    let bin = match app {
        Some(a) => ffmpeg_bin(a),
        None => ffmpeg_bin_fallback(),
    };
    log::info!(
        "mux_audio: {video_path} → {output_path}（mic {} 段 / sys {} 段）",
        mic_files.len(),
        sys_files.len()
    );
    let emit = |pct: f64| {
        if let Some(a) = app {
            emit_progress(a, pct, 0);
        }
    };

    // 无音频：remux 即可（copy 视频，不产生音频轨）
    if mic_files.is_empty() && sys_files.is_empty() {
        let mut cmd = Command::new(&bin);
        cmd.args([
            "-y",
            "-i",
            video_path,
            "-c",
            "copy",
            "-movflags",
            "+faststart",
            output_path,
        ]);
        let (child, kill_id) = spawn_with_registry(cmd);
        let (ok, text) = wait_output(child).await;
        unregister_conversion(&kill_id);
        if !ok {
            return Err(format!("remux without audio failed: {}", tail(&text)));
        }
        emit(100.0);
        return Ok(());
    }

    let mut cmd = Command::new(&bin);
    cmd.args(["-y", "-i", video_path]);
    for f in mic_files {
        cmd.args(["-i", f]);
    }
    for f in sys_files {
        cmd.args(["-i", f]);
    }

    // 输入下标：0 = 视频，随后依次麦克风段、系统声段
    let mic_start = 1usize;
    let sys_start = 1 + mic_files.len();
    let mut chains: Vec<String> = Vec::new();

    let mic_label = audio_input_label(mic_files, mic_start, "amic", &mut chains);
    let sys_label = audio_input_label(sys_files, sys_start, "asys", &mut chains);

    let audio_out = match (mic_label, sys_label) {
        (Some(m), Some(s)) => {
            // 两路混音：duration=longest 保两路都不被截
            chains.push(format!(
                "{m}{s}amix=inputs=2:duration=longest:dropout_transition=0:normalize=0[aout]"
            ));
            "[aout]".to_string()
        }
        (Some(m), None) => m,
        (None, Some(s)) => s,
        (None, None) => unreachable!("已在上面提前返回"),
    };

    // apad 把音频用静音无限延长，再配合 -shortest → **视频是唯一权威时长**。
    // 若直接 -shortest 而不 pad：音频短于视频时（麦克风起流晚 / WASAPI 循环少收几毫秒 /
    // 系统声整段静音）视频会被音频截短，用户看到「录了 10 秒只剩 9 秒」。
    // 反过来音频长于视频也只到视频长度为止，尾部多余采样被丢弃。
    chains.push(format!("{audio_out}apad[aout_padded]"));
    let audio_out = "[aout_padded]".to_string();

    // 只有「多段拼接」或「两路混音」才需要滤镜图；单路单段直接映射输入流即可。
    // 无条件传 -filter_complex（哪怕传空串）会让 ffmpeg 报 "Invalid filtergraph"。
    if !chains.is_empty() {
        cmd.args(["-filter_complex", &chains.join(";")]);
    }
    cmd.args([
        "-map",
        "0:v",
        "-map",
        &audio_out,
        "-c:v",
        "copy",
        "-c:a",
        "aac",
        "-b:a",
        "192k",
        "-shortest",
        "-movflags",
        "+faststart",
        output_path,
    ]);
    let (child, kill_id) = spawn_with_registry(cmd);
    emit(90.0);
    let (ok, text) = wait_output(child).await;
    unregister_conversion(&kill_id);
    if !ok {
        return Err(format!("audio mux failed: {}", tail(&text)));
    }
    emit(100.0);
    Ok(())
}

// ===== 录制叠加层（摄像头画中画）=====

/// 把摄像头画中画叠到成品视频上（对齐 Electron 版 canvas 合成的最终观感）
///
/// 两路输入：0 = 主视频，1 = 摄像头视频（渲染层录的 webm，含音频则丢弃）。
/// 摄像头按目标分辨率缩放到 (x, y)、圆角不做遮罩（ffmpeg 无内建圆角，旧版 canvas 合成的
/// 圆角在这里退化为直角，视觉差异可接受）。fps 必须显式传给输出（见函数内注释）。
pub async fn overlay_camera(
    app: &AppHandle,
    video_path: &str,
    camera_path: &str,
    rect: (i32, i32, i32, i32),
    fps: u32,
    output_path: &str,
) -> Result<(), String> {
    overlay_camera_core(Some(app), video_path, camera_path, rect, fps, output_path).await
}

/// 分段画中画叠加：录制中开关过摄像头时，各段按**会话时间轴**的 [start, end] 窗口出现，
/// 关闭区间不叠小窗（concat 会把段内容贴错时间轴，无法表达间隙）。
///
/// 滤镜：每段 `[i:v]scale,setsar,setpts=PTS-STARTPTS+{start}/TB` 平移到自己的起点，
/// 串行 overlay 并用 `enable='between(t,start,end)'` 控制可见窗口；窗口连续时行为与
/// concat + 单段 overlay 一致（间隙存在时才走这条路，见 recording/mod.rs 的分叉）。
pub async fn overlay_camera_multi(
    app: &AppHandle,
    video_path: &str,
    parts: &[(String, f64, f64)], // (路径, start 秒, end 秒)
    rect: (i32, i32, i32, i32),
    fps: u32,
    output_path: &str,
) -> Result<(), String> {
    overlay_camera_multi_core(Some(app), video_path, parts, rect, fps, output_path).await
}

pub async fn overlay_camera_multi_core(
    app: Option<&AppHandle>,
    video_path: &str,
    parts: &[(String, f64, f64)],
    rect: (i32, i32, i32, i32),
    fps: u32,
    output_path: &str,
) -> Result<(), String> {
    let bin = match app {
        Some(a) => ffmpeg_bin(a),
        None => ffmpeg_bin_fallback(),
    };
    log::info!(
        "overlay_camera_multi: {video_path} + {} 段 → {output_path}（rect={rect:?}, fps={fps}）",
        parts.len()
    );
    let emit = |pct: f64| {
        if let Some(a) = app {
            emit_progress(a, pct, 0);
        }
    };
    let (cx, cy, cw, ch) = rect;
    let even = |v: i32| ((v as f64 / 2.0).round() as i32) * 2;
    let (cw, ch) = (even(cw.max(16)), even(ch.max(16)));

    // 滤镜链：每段平移到自己的时间窗口，串行叠加，末段挂 format + 输出标签
    // （标签必须在链尾，见 overlay_camera_core 的注释）
    let mut chain = String::new();
    let mut prev_label = "0:v".to_string();
    for (i, (_path, start, end)) in parts.iter().enumerate() {
        chain.push_str(&format!(
            "[{}:v]scale={cw}:{ch},setsar=1,setpts=PTS-STARTPTS+{start}/TB[c{i}];",
            i + 1
        ));
        chain.push_str(&format!(
            "[{prev}][c{i}]overlay={}:{}:format=auto:enable='between(t,{start:.3},{end:.3})'[b{i}];",
            even(cx.max(0)),
            even(cy.max(0)),
            prev = prev_label,
            i = i,
        ));
        prev_label = format!("b{i}");
    }
    chain.push_str(&format!("[{prev_label}]format=yuv420p[out]"));

    let encoder = crate::modules::media::hw_encoder::get_h264_encoder(&bin.to_string_lossy()).await;
    let run = |enc: &str| -> Command {
        let mut cmd = Command::new(&bin);
        let mut args: Vec<String> = vec!["-y".into(), "-i".into(), video_path.into()];
        for (path, _, _) in parts {
            args.extend(["-i".into(), path.clone()]);
        }
        args.extend(["-filter_complex".into(), chain.clone()]);
        args.extend(build_encode_options(enc, "20", num_threads()));
        // 同单段 overlay：显式钉帧率，否则输出按摄像头 10fps 时间基驱动
        args.extend([
            "-r".into(),
            crate::modules::recording::capture::clamp_fps(fps).to_string(),
        ]);
        args.extend([
            "-map".into(),
            "[out]".into(),
            "-map".into(),
            "0:a?".into(),
            "-c:a".into(),
            "copy".into(),
            "-movflags".into(),
            "+faststart".into(),
            output_path.into(),
        ]);
        cmd.args(args);
        cmd
    };
    let (child, kill_id) = spawn_with_registry(run(&encoder));
    emit(60.0);
    let (ok, text) = wait_output(child).await;
    unregister_conversion(&kill_id);
    if ok {
        emit(100.0);
        return Ok(());
    }
    if encoder != "libx264" {
        log::warn!("分段 overlay 用 {encoder} 失败，回退 libx264");
        let _ = std::fs::remove_file(output_path);
        let (child, kill_id) = spawn_with_registry(run("libx264"));
        let (ok2, text2) = wait_output(child).await;
        unregister_conversion(&kill_id);
        if ok2 {
            emit(100.0);
            return Ok(());
        }
        return Err(format!("overlay multi failed: {}", tail(&text2)));
    }
    Err(format!("overlay multi failed: {}", tail(&text)))
}

/// overlay 核心（app 可选：单元测试传 None 跳过进度事件）
///
/// 摄像头源是渲染层 MediaRecorder 产出的 **webm（VP8/VP9）**，主视频是 H264/mp4 ——
/// 编码不同源故必须重编码主视频（不能用 -c copy）。主视频通常只有一条视频流 + 可能
/// 已混好的音轨；这里 -c:a copy 把音轨原样带过，避免二次编码损失。
pub async fn overlay_camera_core(
    app: Option<&AppHandle>,
    video_path: &str,
    camera_path: &str,
    rect: (i32, i32, i32, i32),
    fps: u32,
    output_path: &str,
) -> Result<(), String> {
    let bin = match app {
        Some(a) => ffmpeg_bin(a),
        None => ffmpeg_bin_fallback(),
    };
    log::info!(
        "overlay_camera: {video_path} + {camera_path} → {output_path}（rect={rect:?}, fps={fps}）"
    );
    let emit = |pct: f64| {
        if let Some(a) = app {
            emit_progress(a, pct, 0);
        }
    };
    let (cx, cy, cw, ch) = rect;
    let even = |v: i32| ((v as f64 / 2.0).round() as i32) * 2;
    let (cw, ch) = (even(cw.max(16)), even(ch.max(16)));
    // ⚠️ 滤镜链的**最后一段必须带输出标签**：写成 `[out]format=yuv420p`（无标签）会让
    // [out] 被消费掉，-map [out] 报 "Output with label 'out' does not exist in any defined
    // filter graph"。把 format 接在 overlay 同一链尾部、标签挂到最后即可。
    let filter = format!(
        "[1:v]scale={cw}:{ch},setsar=1[cam];[0:v][cam]overlay={}:{}:format=auto,format=yuv420p[out]",
        even(cx.max(0)),
        even(cy.max(0))
    );
    let encoder = crate::modules::media::hw_encoder::get_h264_encoder(&bin.to_string_lossy()).await;
    let run = |enc: &str| -> Command {
        let mut cmd = Command::new(&bin);
        let mut args: Vec<String> = vec![
            "-y".into(),
            "-i".into(),
            video_path.into(),
            "-i".into(),
            camera_path.into(),
        ];
        args.extend(["-filter_complex".into(), filter.clone()]);
        args.extend(build_encode_options(enc, "20", num_threads()));
        // 摄像头源是 10fps 的 VP9 webm，主视频 30fps —— 必须显式钉住输出帧率，
        // 否则 overlay 会按**摄像头的时间基**驱动输出（成品降到 10fps，主画面卡顿）。
        args.extend([
            "-r".into(),
            crate::modules::recording::capture::clamp_fps(fps).to_string(),
        ]);
        args.extend([
            "-map".into(),
            "[out]".into(),
            // 音频若已有（主视频里）就带走；摄像头那路的音轨不要（用户要的是麦克风/系统声）
            "-map".into(),
            "0:a?".into(),
            "-c:a".into(),
            "copy".into(),
            "-movflags".into(),
            "+faststart".into(),
            output_path.into(),
        ]);
        cmd.args(args);
        cmd
    };
    let (child, kill_id) = spawn_with_registry(run(&encoder));
    emit(60.0);
    let (ok, text) = wait_output(child).await;
    unregister_conversion(&kill_id);
    if ok {
        emit(100.0);
        return Ok(());
    }
    if encoder != "libx264" {
        log::warn!("overlay 用 {encoder} 失败，回退 libx264");
        let _ = std::fs::remove_file(output_path);
        let (child, kill_id) = spawn_with_registry(run("libx264"));
        let (ok2, text2) = wait_output(child).await;
        unregister_conversion(&kill_id);
        if ok2 {
            emit(100.0);
            return Ok(());
        }
        return Err(format!("camera overlay failed: {}", tail(&text2)));
    }
    Err(format!("camera overlay failed: {}", tail(&text)))
}

/// 从视频第 0 秒抽一帧生成 PNG base64 data URL（录制历史缩略图）。
///
/// 返回 `data:image/png;base64,...`，渲染层直接塞 `<img>` 显示、放进录制历史 JSON 一起
/// 持久化 —— 缩略图压缩到 ~120px 宽，一条记录十几 KB base64，几十条也就几 MB，
/// 远低于 localStorage 上限，且不依赖任何自定义协议，绝对可用。
///
/// **为什么用 PNG 不用 JPEG**：本工程 vendor 的 ffmpeg 是精简构建，`mjpeg`/`jpeg` 编码器
/// 被禁用了（`.encoders` 里只剩 png/gif/libx264/aac），指定 .jpg 输出直接报
/// `Automatic encoder selection failed ... codec mjpeg is probably disabled`，
/// 抽帧必然失败（首帧图因此一直看不到）。PNG 编码器可用，故改用 image/png。
///
/// 抽帧失败（0 帧/编码不支持）返回 None，列表落到播放占位图标。
pub async fn extract_first_frame(app: &AppHandle, video_path: &str) -> Option<String> {
    use base64::{engine::general_purpose::STANDARD, Engine as _};
    let bin = ffmpeg_bin(app);
    log::info!("extract_first_frame: {video_path}");
    let out = std::env::temp_dir().join(format!(
        "muerzhi_thumb_{}_{}.png",
        crate::modules::todo::store::now_ms(),
        std::process::id(),
    ));
    let out_str = out.to_string_lossy().to_string();
    let _ = std::fs::remove_file(&out_str);
    let mut cmd = Command::new(&bin);
    cmd.args([
        "-y",
        "-i",
        video_path,
        "-frames:v",
        "1",
        "-update",
        "1",
        "-vf",
        "scale=120:-2",
        &out_str,
    ]);
    let (child, kill_id) = spawn_with_registry(cmd);
    let (ok, _text) = wait_output(child).await;
    unregister_conversion(&kill_id);
    if !ok || !std::path::Path::new(&out_str).exists() {
        // 失败也可能留下半截 PNG（ffmpeg 中途被杀/编码中断）——不留的话
        // 每次抽帧失败都在 %TEMP% 挂一张，清扫兜底前会持续累积
        let _ = std::fs::remove_file(&out_str);
        return None;
    }
    let data = std::fs::read(&out_str).ok();
    let _ = std::fs::remove_file(&out_str);
    let bytes = data?;
    Some(format!("data:image/png;base64,{}", STANDARD.encode(bytes)))
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

    /// `-movflags +faststart` 只有 mp4/mov 族认；mkv 会因未知选项直接失败
    #[test]
    fn concat_flags_only_for_mp4_family() {
        for p in ["C:/t/a.mp4", "C:/t/a.MP4", "C:/t/a.mov", "C:/t/a.m4v"] {
            assert_eq!(
                concat_container_flags(p),
                vec!["-movflags", "+faststart"],
                "{p}"
            );
        }
        for p in ["C:/t/a.mkv", "C:/t/a.webm"] {
            assert!(concat_container_flags(p).is_empty(), "{p}");
        }
    }
}
