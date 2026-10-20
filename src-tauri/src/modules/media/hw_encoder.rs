// 硬件编码器探测 — 移植 electron/main/hw-encoder.ts
// ffmpeg -encoders 输出按优先级 nvenc > qsv > amf 匹配，命中即用，否则回退 libx264；
// 探测结果进程内缓存（多次调用共享同一结果）。

use std::sync::Mutex;
use std::time::Duration;

const PRIORITY: [&str; 3] = ["h264_nvenc", "h264_qsv", "h264_amf"];

static CACHED: Mutex<Option<String>> = Mutex::new(None);

/// 在 ffmpeg -encoders 输出里按优先级挑硬件编码器（纯函数，可单测）
pub fn pick_hw_encoder(text: &str) -> String {
    for enc in PRIORITY {
        // 词边界匹配，避免 h264_nvenc 命中 h264_nvenc_foo 之类
        if contains_word(text, enc) {
            return enc.to_string();
        }
    }
    "libx264".to_string()
}

fn contains_word(haystack: &str, needle: &str) -> bool {
    let bytes = haystack.as_bytes();
    let mut i = 0;
    while let Some(pos) = haystack[i..].find(needle) {
        let start = i + pos;
        let end = start + needle.len();
        let before_ok = start == 0 || !is_word_byte(bytes[start - 1]);
        let after_ok = end >= bytes.len() || !is_word_byte(bytes[end]);
        if before_ok && after_ok {
            return true;
        }
        i = start + 1;
    }
    false
}

fn is_word_byte(b: u8) -> bool {
    b.is_ascii_alphanumeric() || b == b'_'
}

/// 探测（带缓存的异步入口）
pub async fn get_h264_encoder(ffmpeg_bin: &str) -> String {
    {
        let guard = CACHED.lock().unwrap();
        if let Some(enc) = guard.as_ref() {
            return enc.clone();
        }
    }
    let enc = probe(ffmpeg_bin).await;
    *CACHED.lock().unwrap() = Some(enc.clone());
    log::info!("hw-encoder: selected {enc}");
    enc
}

async fn probe(ffmpeg_bin: &str) -> String {
    let mut cmd = tokio::process::Command::new(ffmpeg_bin);
    cmd.args(["-hide_banner", "-encoders"]);
    #[cfg(windows)]
    cmd.creation_flags(0x0800_0000);
    cmd.kill_on_drop(true); // 超时放弃时杀掉 ffmpeg，避免僵尸进程
    let out = tokio::time::timeout(Duration::from_millis(5000), cmd.output()).await;
    match out {
        Ok(Ok(o)) => {
            let text = format!(
                "{}{}",
                String::from_utf8_lossy(&o.stdout),
                String::from_utf8_lossy(&o.stderr)
            );
            pick_hw_encoder(&text)
        }
        _ => {
            log::warn!("hw-encoder probe failed, fallback libx264");
            "libx264".to_string()
        }
    }
}

/// 按编码器产出 ffmpeg 编码参数（对齐 buildEncodeOptions）
pub fn build_encode_options(encoder: &str, crf: &str, num_threads: usize) -> Vec<String> {
    let mut out: Vec<String> = match encoder {
        "h264_nvenc" => vec![
            "-c:v",
            "h264_nvenc",
            "-preset",
            "p4",
            "-rc",
            "vbr",
            "-cq",
            crf,
            "-b:v",
            "0",
        ],
        "h264_qsv" => vec![
            "-c:v",
            "h264_qsv",
            "-preset",
            "veryfast",
            "-global_quality",
            crf,
        ],
        "h264_amf" => vec![
            "-c:v", "h264_amf", "-quality", "balanced", "-rc", "cqp", "-qp_i", crf, "-qp_p", crf,
        ],
        _ => vec![
            "-c:v",
            "libx264",
            "-preset",
            "ultrafast",
            "-crf",
            crf,
            "-threads",
        ],
    }
    .into_iter()
    .map(|s| s.to_string())
    .collect();
    if encoder != "h264_nvenc" && encoder != "h264_qsv" && encoder != "h264_amf" {
        out.push(num_threads.to_string());
    }
    out
}

/// 测试用：清缓存
#[allow(dead_code)]
pub fn reset_cache() {
    *CACHED.lock().unwrap() = None;
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn picks_by_priority_nvenc_first() {
        let text = " V....D h264_qsv\n V....D h264_nvenc\n V....D h264_amf\n";
        assert_eq!(pick_hw_encoder(text), "h264_nvenc");
    }

    #[test]
    fn falls_back_in_priority_order() {
        assert_eq!(pick_hw_encoder("h264_qsv\nh264_amf"), "h264_qsv");
        assert_eq!(pick_hw_encoder("h264_amf"), "h264_amf");
        assert_eq!(pick_hw_encoder("libx264 only"), "libx264");
    }

    #[test]
    fn word_boundary_avoids_partial_match() {
        // h264_nvenc_extra 不应被判为 h264_nvenc（词边界）
        assert_eq!(pick_hw_encoder("h264_nvenc_extra"), "libx264");
    }

    #[test]
    fn encode_options_match_ts() {
        let nv = build_encode_options("h264_nvenc", "23", 8);
        assert_eq!(
            nv,
            vec![
                "-c:v",
                "h264_nvenc",
                "-preset",
                "p4",
                "-rc",
                "vbr",
                "-cq",
                "23",
                "-b:v",
                "0"
            ]
        );
        let x264 = build_encode_options("libx264", "18", 8);
        assert_eq!(
            x264,
            vec![
                "-c:v",
                "libx264",
                "-preset",
                "ultrafast",
                "-crf",
                "18",
                "-threads",
                "8"
            ]
        );
        let amf = build_encode_options("h264_amf", "23", 4);
        assert!(amf.contains(&"-qp_i".to_string()));
    }
}
