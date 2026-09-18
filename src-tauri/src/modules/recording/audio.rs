// WASAPI 音频采集 — 麦克风 + 系统声（loopback）
//
// 设计取舍：**各路各录一个 WAV，停止后用 ffmpeg amix 混音**，不做 Rust 内实时混音。
// 理由：混音要处理两路时钟漂移 + 重采样 + 环形缓冲，而 ffmpeg 的 amix/aresample 已经
// 是成熟实现；本工程本来就有常驻 ffmpeg 进程与进度上报链路，停止后多一步合成对用户
// 无感（录制阶段零 CPU 开销，比实时混音更省）。视频/音频各自从录制开始时刻起算，
// amix + -shortest 对齐误差在单帧级。
//
// 无 screen-capture 时整个采集实现不可达（命令层返回明确错误），但类型与常量保留
// 以维持接口稳定 → 抑制由此产生的 dead_code 告警。
#![cfg_attr(not(feature = "screen-capture"), allow(dead_code))]

// 电平：每块 PCM 算 RMS 写进全局 atomics，由 ticker 推给原生窗口与渲染层音量表。
// 设备 id 用 **WASAPI endpoint ID**（不是 WebView2 的 deviceId，两者不通用），
// 渲染层设置页经 list_audio_devices 拿到的就是这里的 id。

#[cfg(feature = "screen-capture")]
#[cfg(feature = "screen-capture")]
use std::collections::VecDeque;
#[cfg(feature = "screen-capture")]
use std::fs::File;
#[cfg(feature = "screen-capture")]
use std::io::{BufWriter, Seek, SeekFrom, Write};
#[cfg(feature = "screen-capture")]
use std::path::Path;
use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};
use std::sync::Arc;
use std::thread::JoinHandle;

/// 采集目标：麦克风（Capture 设备）或系统声（Render 设备 + loopback 标志）
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Source {
    Mic,
    System,
}

#[cfg(feature = "screen-capture")]
pub const SAMPLE_RATE: u32 = 48_000;
#[cfg(feature = "screen-capture")]
pub const CHANNELS: u16 = 2;
#[cfg(feature = "screen-capture")]
pub const BITS: u16 = 16;

// ===== 电平共享态（0.0..1.0，f32 位模式存 u32）=====

static MIC_LEVEL: AtomicU32 = AtomicU32::new(0);
static SYS_LEVEL: AtomicU32 = AtomicU32::new(0);

fn store_level(slot: &AtomicU32, v: f32) {
    slot.store(v.clamp(0.0, 1.0).to_bits(), Ordering::Relaxed);
}

fn load_level(slot: &AtomicU32) -> f32 {
    f32::from_bits(slot.load(Ordering::Relaxed))
}

pub fn set_level(source: Source, v: f32) {
    match source {
        Source::Mic => store_level(&MIC_LEVEL, v),
        Source::System => store_level(&SYS_LEVEL, v),
    }
}

pub fn mic_level() -> f32 {
    load_level(&MIC_LEVEL)
}

pub fn sys_level() -> f32 {
    load_level(&SYS_LEVEL)
}

/// 重置两路电平（停止录制 / 关闭预览时调用，避免表盘停在最后一格）
pub fn reset_levels() {
    set_level(Source::Mic, 0.0);
    set_level(Source::System, 0.0);
}

// ===== 设备枚举 =====

/// 输入设备（麦克风）与输出设备（系统声来源）的 endpoint id + 名字
pub fn list_devices() -> (Vec<(String, String)>, Vec<(String, String)>) {
    #[cfg(feature = "screen-capture")]
    {
        wasapi_list().unwrap_or_default()
    }
    #[cfg(not(feature = "screen-capture"))]
    {
        (Vec::new(), Vec::new())
    }
}

#[cfg(feature = "screen-capture")]
fn wasapi_list() -> Result<(Vec<(String, String)>, Vec<(String, String)>), String> {
    use wasapi::{initialize_mta, DeviceEnumerator, Direction};
    let _ = initialize_mta();
    let enumerator = DeviceEnumerator::new().map_err(|e| format!("音频设备枚举失败: {e}"))?;
    let collect = |dir: Direction| -> Vec<(String, String)> {
        let mut out = Vec::new();
        let Ok(col) = enumerator.get_device_collection(&dir) else {
            return out;
        };
        let Ok(n) = col.get_nbr_devices() else {
            return out;
        };
        for i in 0..n {
            let Ok(dev) = col.get_device_at_index(i) else {
                continue;
            };
            let id = dev.get_id().unwrap_or_default();
            let name = dev.get_friendlyname().unwrap_or_else(|_| id.clone());
            out.push((id, name));
        }
        out
    };
    Ok((collect(Direction::Capture), collect(Direction::Render)))
}

// ===== WAV 写入（先占位 44 字节头，finalize 时回填长度）=====

#[cfg(feature = "screen-capture")]
struct WavWriter {
    file: BufWriter<File>,
    data_bytes: u32,
}

#[cfg(feature = "screen-capture")]
impl WavWriter {
    fn create(path: &Path) -> Result<Self, String> {
        if let Some(p) = path.parent() {
            std::fs::create_dir_all(p).map_err(|e| format!("音频目录创建失败: {e}"))?;
        }
        let mut file = BufWriter::new(File::create(path).map_err(|e| format!("音频文件创建失败: {e}"))?);
        file.write_all(&[0u8; 44]).map_err(|e| e.to_string())?;
        Ok(Self { file, data_bytes: 0 })
    }

    fn write(&mut self, data: &[u8]) -> Result<(), String> {
        self.file.write_all(data).map_err(|e| format!("音频写入失败: {e}"))?;
        self.data_bytes = self.data_bytes.saturating_add(data.len() as u32);
        Ok(())
    }

    fn finalize(mut self) -> Result<(), String> {
        self.file.flush().map_err(|e| e.to_string())?;
        let mut f = self.file.into_inner().map_err(|e| e.to_string())?;
        let byte_rate = SAMPLE_RATE * CHANNELS as u32 * (BITS / 8) as u32;
        let block_align = CHANNELS * (BITS / 8);
        let mut header = Vec::with_capacity(44);
        header.extend_from_slice(b"RIFF");
        header.extend_from_slice(&(36 + self.data_bytes).to_le_bytes());
        header.extend_from_slice(b"WAVEfmt ");
        header.extend_from_slice(&16u32.to_le_bytes());
        header.extend_from_slice(&1u16.to_le_bytes()); // PCM
        header.extend_from_slice(&CHANNELS.to_le_bytes());
        header.extend_from_slice(&SAMPLE_RATE.to_le_bytes());
        header.extend_from_slice(&byte_rate.to_le_bytes());
        header.extend_from_slice(&block_align.to_le_bytes());
        header.extend_from_slice(&BITS.to_le_bytes());
        header.extend_from_slice(b"data");
        header.extend_from_slice(&self.data_bytes.to_le_bytes());
        f.seek(SeekFrom::Start(0)).map_err(|e| e.to_string())?;
        f.write_all(&header).map_err(|e| format!("音频头回填失败: {e}"))?;
        f.flush().map_err(|e| e.to_string())?;
        Ok(())
    }
}

/// 16bit 立体声交织 PCM 的 RMS → 0..1（×4 增益：正常说话约到 6~8 格，留足头部空间）
fn rms_level(bytes: &[u8]) -> f32 {
    let mut sum = 0f64;
    let mut n = 0u64;
    for chunk in bytes.chunks_exact(2) {
        let s = i16::from_le_bytes([chunk[0], chunk[1]]) as f64;
        sum += s * s;
        n += 1;
    }
    if n == 0 {
        return 0.0;
    }
    let rms = (sum / n as f64).sqrt() / 32768.0;
    ((rms * 4.0) as f32).clamp(0.0, 1.0)
}

// ===== 采集会话 =====

struct Worker {
    stop: Arc<AtomicBool>,
    handle: Option<JoinHandle<()>>,
}

impl Worker {
    fn stop(&mut self) {
        self.stop.store(true, Ordering::SeqCst);
        if let Some(h) = self.handle.take() {
            let _ = h.join();
        }
    }
}

/// 一个音频采集会话（可含麦克风 + 系统声两路，各自独立线程）
pub struct AudioSession {
    workers: Vec<Worker>,
    mic_path: String,
    sys_path: String,
}

impl AudioSession {
    /// 停止两路采集并返回「实际有数据」的文件路径（空文件按未启用处理）
    pub fn stop(mut self) -> Vec<(Source, String)> {
        for w in self.workers.iter_mut() {
            w.stop();
        }
        reset_levels();
        let mut out = Vec::new();
        for (src, path) in [
            (Source::Mic, self.mic_path.clone()),
            (Source::System, self.sys_path.clone()),
        ] {
            if std::fs::metadata(&path).map(|m| m.len() > 2048).unwrap_or(false) {
                out.push((src, path));
            } else {
                let _ = std::fs::remove_file(&path);
            }
        }
        out
    }
}

/// 启动采集：mic_id/sys_id 为 WASAPI endpoint id（空 = 系统默认设备）
pub fn start(
    session_id: &str,
    with_mic: bool,
    with_sys: bool,
    mic_id: Option<String>,
    sys_id: Option<String>,
) -> Result<AudioSession, String> {
    let dir = std::env::temp_dir();
    let mic_path = dir.join(format!("muerzhi_mic_{session_id}.wav")).to_string_lossy().to_string();
    let sys_path = dir.join(format!("muerzhi_sys_{session_id}.wav")).to_string_lossy().to_string();
    let mut workers = Vec::new();

    if with_mic {
        workers.push(spawn_worker(Source::Mic, mic_id, mic_path.clone())?);
    }
    if with_sys {
        // 系统声来自默认渲染设备（用户选的输出设备 id 直接作 device_id 用）
        match spawn_worker(Source::System, sys_id, sys_path.clone()) {
            Ok(w) => workers.push(w),
            Err(e) => {
                // 系统声拿不到不该拖垮整场录制（例如无声卡/被独占），只记日志
                log::warn!("系统声采集启动失败: {e}");
            }
        }
    }
    Ok(AudioSession { workers, mic_path, sys_path })
}

fn spawn_worker(source: Source, device_id: Option<String>, path: String) -> Result<Worker, String> {
    let stop = Arc::new(AtomicBool::new(false));
    let stop_thread = stop.clone();
    let handle = std::thread::Builder::new()
        .name(format!("wasapi-{:?}", source))
        .spawn(move || {
            if let Err(e) = capture_loop(source, device_id.as_deref(), &path, stop_thread) {
                log::error!("音频采集线程结束（{source:?}）: {e}");
            }
        })
        .map_err(|e| format!("音频线程创建失败: {e}"))?;
    Ok(Worker { stop, handle: Some(handle) })
}

#[cfg(feature = "screen-capture")]
fn capture_loop(
    source: Source,
    device_id: Option<&str>,
    path: &str,
    stop: Arc<AtomicBool>,
) -> Result<(), String> {
    use wasapi::{initialize_mta, DeviceEnumerator, Direction, SampleType, StreamMode, WaveFormat};

    // 每路线程各自 initialize_mta（COM 是线程局部的，主线程初始化无效）
    let _ = initialize_mta();

    let enumerator = DeviceEnumerator::new().map_err(|e| format!("音频设备枚举失败: {e}"))?;
    let device = match (source, device_id) {
        (_, Some(id)) if !id.is_empty() => enumerator.get_device(id).map_err(|e| format!("设备 {id} 打开失败: {e}"))?,
        (Source::Mic, _) => enumerator
            .get_default_device(&Direction::Capture)
            .map_err(|e| format!("默认麦克风打开失败: {e}"))?,
        (Source::System, _) => enumerator
            .get_default_device(&Direction::Render)
            .map_err(|e| format!("默认扬声器打开失败: {e}"))?,
    };
    let mut client = device.get_iaudioclient().map_err(|e| format!("AudioClient 获取失败: {e}"))?;

    // 统一 48kHz/16bit/立体声 PCM：autoconvert 让音频引擎替我们重采样，
    // 两路格式一致后 ffmpeg amix 不需要再协商格式。
    let format = WaveFormat::new(
        BITS as usize,
        BITS as usize,
        &SampleType::Int,
        SAMPLE_RATE as usize,
        CHANNELS as usize,
        None,
    );
    let (default_period, _min_period) = client.get_device_period().map_err(|e| format!("取设备周期失败: {e}"))?;
    let mode = StreamMode::EventsShared { autoconvert: true, buffer_duration_hns: default_period };

    // 系统声：设备是 Render 方向，但 initialize 传 Capture + Shared → wasapi 自动加
    // AUDCLNT_STREAMFLAGS_LOOPBACK（见 wasapi::AudioClient::initialize_client）。
    let direction = Direction::Capture;
    client
        .initialize_client(&format, &direction, &mode)
        .map_err(|e| format!("音频流初始化失败: {e}"))?;

    let h_event = client.set_get_eventhandle().map_err(|e| format!("事件句柄创建失败: {e}"))?;
    let capture = client.get_audiocaptureclient().map_err(|e| format!("采集客户端获取失败: {e}"))?;
    client.start_stream().map_err(|e| format!("音频流启动失败: {e}"))?;

    let mut wav = WavWriter::create(Path::new(path))?;
    let mut queue: VecDeque<u8> = VecDeque::with_capacity(SAMPLE_RATE as usize * 4);
    let mut chunk: Vec<u8> = Vec::with_capacity(16 * 1024);

    let result = (|| -> Result<(), String> {
        while !stop.load(Ordering::SeqCst) {
            capture
                .read_from_device_to_deque(&mut queue)
                .map_err(|e| format!("音频读取失败: {e}"))?;

            chunk.clear();
            // 只取整帧（block_align 对齐后的整块才能交给 WAV/电平计算）
            let take = queue.len() / 4 * 4;
            for _ in 0..take {
                if let Some(b) = queue.pop_front() {
                    chunk.push(b);
                }
            }
            if !chunk.is_empty() {
                set_level(source, rms_level(&chunk));
                wav.write(&chunk)?;
            }
            // 事件驱动等待（超时 200ms 兜底，保证 stop 信号最多 200ms 内被看到）
            let _ = h_event.wait_for_event(200);
        }
        Ok(())
    })();

    // 无论正常还是出错，先停流再封 WAV，避免留下无头的半个文件
    let _ = client.stop_stream();
    let finalize = wav.finalize();
    result.and(finalize)
}

#[cfg(not(feature = "screen-capture"))]
fn capture_loop(_s: Source, _d: Option<&str>, _p: &str, _stop: Arc<AtomicBool>) -> Result<(), String> {
    Err("音频采集管线未编译（用 --features screen-capture 构建）".into())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rms_of_silence_is_zero() {
        let bytes = vec![0u8; 400];
        assert_eq!(rms_level(&bytes), 0.0);
    }

    #[test]
    fn rms_of_full_scale_clamps_to_one() {
        // 满量程方波：RMS=1.0，×4 增益后必须被 clamp 到 1.0
        let mut bytes = Vec::new();
        for _ in 0..100 {
            bytes.extend_from_slice(&i16::MAX.to_le_bytes());
        }
        assert_eq!(rms_level(&bytes), 1.0);
    }

    #[test]
    fn rms_of_quiet_signal_is_small_but_nonzero() {
        let mut bytes = Vec::new();
        for _ in 0..100 {
            bytes.extend_from_slice(&(i16::MAX / 20).to_le_bytes());
        }
        let lv = rms_level(&bytes);
        assert!(lv > 0.0 && lv < 0.3, "level={lv}");
    }

    #[test]
    fn level_roundtrip_and_reset() {
        set_level(Source::Mic, 0.42);
        set_level(Source::System, 0.7);
        assert!((mic_level() - 0.42).abs() < 1e-6);
        assert!((sys_level() - 0.7).abs() < 1e-6);
        reset_levels();
        assert_eq!(mic_level(), 0.0);
        assert_eq!(sys_level(), 0.0);
    }

    #[test]
    fn wav_header_matches_spec() {
        let path = std::env::temp_dir().join("muerzhi_test_wav_header.wav");
        let mut w = WavWriter::create(&path).unwrap();
        w.write(&[1u8; 800]).unwrap();
        w.finalize().unwrap();
        let data = std::fs::read(&path).unwrap();
        assert_eq!(&data[0..4], b"RIFF");
        assert_eq!(&data[8..12], b"WAVE");
        assert_eq!(&data[36..40], b"data");
        assert_eq!(u32::from_le_bytes([data[40], data[41], data[42], data[43]]), 800);
        assert_eq!(u32::from_le_bytes([data[4], data[5], data[6], data[7]]), 36 + 800);
        // 采样率/声道/位深
        assert_eq!(u32::from_le_bytes([data[24], data[25], data[26], data[27]]), SAMPLE_RATE);
        assert_eq!(u16::from_le_bytes([data[22], data[23]]), CHANNELS);
        assert_eq!(u16::from_le_bytes([data[34], data[35]]), BITS);
        assert_eq!(data.len(), 44 + 800);
        let _ = std::fs::remove_file(&path);
    }

    /// 读 16bit WAV 的采样峰值（0..1）——用于区分「采到声音」与「只收到静音填充」
    #[cfg(feature = "screen-capture")]
    pub fn wav_peak(path: &str) -> f32 {
        let Ok(bytes) = std::fs::read(path) else {
            return 0.0;
        };
        if bytes.len() <= 44 {
            return 0.0;
        }
        let mut peak = 0i32;
        for chunk in bytes[44..].chunks_exact(2) {
            let s = i16::from_le_bytes([chunk[0], chunk[1]]) as i32;
            peak = peak.max(s.abs());
        }
        peak as f32 / 32768.0
    }

    /// 诊断用：同步跑某一路采集 1 秒，把真实错误字符串返回（不进日志，直接可见）
    #[cfg(all(test, feature = "screen-capture"))]
    pub fn probe_source(source: Source, seconds: u64) -> Result<usize, String> {
        let path = std::env::temp_dir().join(format!("muerzhi_probe_{source:?}.wav"));
        let _ = std::fs::remove_file(&path);
        let stop = Arc::new(AtomicBool::new(false));
        let stop_thread = stop.clone();
        let p = path.to_string_lossy().to_string();
        let handle = std::thread::spawn(move || capture_loop(source, None, &p, stop_thread));
        std::thread::sleep(std::time::Duration::from_secs(seconds));
        stop.store(true, Ordering::SeqCst);
        let res = handle.join().map_err(|_| "采集线程 panic".to_string())?;
        let size = std::fs::metadata(&path).map(|m| m.len() as usize).unwrap_or(0);
        let _ = std::fs::remove_file(&path);
        res.map(|_| size)
    }

    /// 真机冒烟：启系统声 loopback + 麦克风各录 2 秒，校验两路 WAV 都有 PCM 数据。
    ///
    /// 静音也会持续写入静音样本，故文件大小足以证明采集链路通（时钟在走、缓冲在被读）。
    /// 无麦克风的机器上该路会启动失败，此时只要求系统声那路成功。
    /// 手动执行：`cargo test --test unit -- --ignored --nocapture wasapi_smoke`
    #[cfg(feature = "screen-capture")]
    #[test]
    #[ignore = "需要真实音频设备；手动用 --ignored 跑"]
    fn wasapi_smoke_captures_audio() {
        // 系统声 loopback 的语义是「有音频流活动才有数据」——完全静音时 Windows 不推包，
        // 只会拿到 44 字节的空 WAV 头。所以必须在**采集进行中**播放声音做激励。
        let play = || {
            std::process::Command::new("powershell")
                .args([
                    "-NoProfile",
                    "-Command",
                    r"$p=New-Object Media.SoundPlayer 'C:\Windows\Media\Windows Ding.wav'; 1..8 | ForEach-Object { $p.PlaySync() }",
                ])
                .spawn()
        };

        let stim = play().expect("起提示音播放进程");
        let session = start("smoke", true, true, None, None).expect("音频会话应能启动");
        std::thread::sleep(std::time::Duration::from_secs(4));
        let files = session.stop();
        let mut child = stim;
        let _ = child.kill();
        let _ = child.wait();

        assert!(!files.is_empty(), "两路都没产出音频");
        let mut sys_peak = 0.0f32;
        for (src, path) in &files {
            let size = std::fs::metadata(path).map(|m| m.len()).unwrap_or(0);
            // 4 秒 48k/16bit 立体声 ≈ 768KB；阈值放到 64KB（容忍设备起流延迟）
            assert!(size > 64_000, "{src:?} 音频数据过少（{size} 字节）");
            // 光看字节数不够：loopback 无音频活动时也推静音填充，"有数据"≠"采到声音"。
            // 峰值才能证明链路真的采到了声波。
            let peak = wav_peak(path);
            println!("音频冒烟：{src:?} → {path}（{size} 字节，峰值 {peak:.4}）");
            if *src == Source::System {
                sys_peak = peak;
            }
            let _ = std::fs::remove_file(path);
        }
        assert!(sys_peak > 0.01, "系统声采到的是静音（峰值 {sys_peak:.4}）");
    }
}
