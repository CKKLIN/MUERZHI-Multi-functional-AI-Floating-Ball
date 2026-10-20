// local-video:// 自定义协议 — 移植 electron/main/local-video-protocol.ts
// 流式播放本地视频（支持 Range seek）。Tauri 侧注册 uri scheme protocol，
// 手写 206/Content-Range（WebView2 不会为自定义 scheme 自动处理 Range）。

use std::io::{Read, Seek, SeekFrom};
use tauri::http::{Request, Response, StatusCode};

/// 单次 Range 响应的最大块（浏览器会拿 206 的 Content-Range 自动续传后续块；
/// `bytes=0-` 直接把 GB 级成品整段读进内存会打爆内存峰值）
const MAX_RANGE_CHUNK: u64 = 4 * 1024 * 1024;

/// 注册协议（在 Builder::register_uri_scheme_protocol 中调用）
pub fn handle_local_video(request: Request<Vec<u8>>) -> Response<Vec<u8>> {
    let uri = request.uri().to_string();
    let file_path = match parse_path(&uri) {
        Some(p) => p,
        None => {
            return Response::builder()
                .status(StatusCode::BAD_REQUEST)
                .body(b"Bad request".to_vec())
                .unwrap()
        }
    };
    let path = std::path::Path::new(&file_path);
    let Ok(meta) = std::fs::metadata(path) else {
        return Response::builder()
            .status(StatusCode::NOT_FOUND)
            .body(format!("File not found: {file_path}").into_bytes())
            .unwrap();
    };
    let size = meta.len();
    let mime = mime_of(&file_path);

    let range = request
        .headers()
        .get("range")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string());

    if let Some(r) = range {
        if let Some((start, end)) = parse_range(&r, size) {
            let end = end.min(start + MAX_RANGE_CHUNK - 1);
            let len = (end - start + 1) as usize;
            let mut file = match std::fs::File::open(path) {
                Ok(f) => f,
                Err(e) => {
                    return Response::builder()
                        .status(StatusCode::INTERNAL_SERVER_ERROR)
                        .body(e.to_string().into_bytes())
                        .unwrap()
                }
            };
            if file.seek(SeekFrom::Start(start)).is_err() {
                return Response::builder()
                    .status(StatusCode::INTERNAL_SERVER_ERROR)
                    .body(b"seek failed".to_vec())
                    .unwrap();
            }
            // 按实际读到的字芔回填头（文件可能比请求时小了）
            let mut buf = vec![0u8; len];
            let mut filled = 0usize;
            while filled < len {
                match file.read(&mut buf[filled..]) {
                    Ok(0) => break,
                    Ok(n) => filled += n,
                    Err(_) => break,
                }
            }
            buf.truncate(filled);
            if filled == 0 {
                return Response::builder()
                    .status(StatusCode::INTERNAL_SERVER_ERROR)
                    .body(b"read failed".to_vec())
                    .unwrap();
            }
            let actual_end = start + filled as u64 - 1;
            return Response::builder()
                .status(StatusCode::PARTIAL_CONTENT)
                .header(
                    "Content-Range",
                    format!("bytes {start}-{actual_end}/{size}"),
                )
                .header("Accept-Ranges", "bytes")
                .header("Content-Length", filled.to_string())
                .header("Content-Type", mime)
                .body(buf)
                .unwrap();
        }
    }

    // 无 Range：整文件返回
    match std::fs::read(path) {
        Ok(buf) => Response::builder()
            .status(StatusCode::OK)
            .header("Content-Length", size.to_string())
            .header("Content-Type", mime)
            .header("Accept-Ranges", "bytes")
            .body(buf)
            .unwrap(),
        Err(e) => Response::builder()
            .status(StatusCode::INTERNAL_SERVER_ERROR)
            .body(e.to_string().into_bytes())
            .unwrap(),
    }
}

/// local-video://host/C:/Users/.../x.mp4 → C:/Users/.../x.mp4
/// （Windows 盘符前多一层斜杠需去掉；路径用 / 即可被 fs 接受）
pub fn parse_path(uri: &str) -> Option<String> {
    let after_scheme = uri.split_once("://").map(|(_, rest)| rest)?;
    // 去掉 host 部分（到第一个 / 为止）
    let slash = after_scheme.find('/')?;
    let raw = &after_scheme[slash..];
    let decoded = percent_decode(raw.trim_start_matches('/'));
    if decoded.is_empty() {
        return None;
    }
    Some(decoded)
}

fn percent_decode(s: &str) -> String {
    let bytes = s.as_bytes();
    let mut out: Vec<u8> = Vec::with_capacity(bytes.len());
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'%' && i + 2 < bytes.len() {
            if let Ok(b) = u8::from_str_radix(&s[i + 1..i + 3], 16) {
                out.push(b);
                i += 3;
                continue;
            }
        }
        out.push(bytes[i]);
        i += 1;
    }
    String::from_utf8_lossy(&out).replace('\\', "/")
}

/// 解析 "bytes=start-end"（任一端可省），返回 (start, end_inclusive)
pub fn parse_range(header: &str, size: u64) -> Option<(u64, u64)> {
    let spec = header.strip_prefix("bytes=")?;
    let (a, b) = spec.split_once('-')?;
    let start: u64 = if a.is_empty() { 0 } else { a.parse().ok()? };
    let end: u64 = if b.is_empty() {
        size.saturating_sub(1)
    } else {
        b.parse().ok()?
    };
    if size == 0 {
        return None;
    }
    let end = end.min(size - 1);
    if start > end {
        return None;
    }
    Some((start, end))
}

pub fn mime_of(path: &str) -> String {
    let lower = path.to_lowercase();
    if lower.ends_with(".mp4") {
        "video/mp4".into()
    } else if lower.ends_with(".webm") {
        "video/webm".into()
    } else if lower.ends_with(".gif") {
        "image/gif".into()
    } else {
        "application/octet-stream".into()
    }
}

/// 构造 local-video URL（Windows 上 wry 只拦截 `http://local-video.*` 形态；
/// 与渲染层 bridge.ts toLocalVideoUrl 等价 —— 整路径 encodeURIComponent 同款编码）
pub fn to_local_video_url(file_path: &str) -> String {
    let normalized = file_path.replace('\\', "/");
    let encoded: String = normalized
        .bytes()
        .map(|b| match b {
            // encodeURIComponent 的 unescaped 集合：A-Z a-z 0-9 - _ . ! ~ * ' ( )
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'!' | b'~'
            | b'*' | b'\'' | b'(' | b')' => (b as char).to_string(),
            _ => format!("%{b:02X}"),
        })
        .collect();
    format!("http://local-video.localhost/{encoded}")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_windows_path_from_url() {
        let uri = "local-video://localhost/C:/Users/me/视频/x.mp4";
        assert_eq!(parse_path(uri).as_deref(), Some("C:/Users/me/视频/x.mp4"));
        assert_eq!(
            parse_path("local-video:///C:/a.mp4").as_deref(),
            Some("C:/a.mp4")
        );
    }

    #[test]
    fn percent_decoding_roundtrip() {
        let uri = "local-video://localhost/C:/My%20Videos/a%2Bb.mp4";
        assert_eq!(parse_path(uri).as_deref(), Some("C:/My Videos/a+b.mp4"));
    }

    #[test]
    fn helper_url_roundtrips_through_parse_path() {
        // 渲染层/Rust 统一走 percent-encode 形态；wry 拦截 http://local-video.localhost/* 后
        // revert 成 local-video://localhost/* 交给 parse_path —— 两段拼起来必须能还原路径
        let url = to_local_video_url(r"C:\Users\me\视频\a+b (1).mp4");
        assert_eq!(
            url,
            "http://local-video.localhost/C%3A%2FUsers%2Fme%2F%E8%A7%86%E9%A2%91%2Fa%2Bb%20(1).mp4"
        );
        // 模拟 wry revert 后的 URI 形态
        let reverted = url.replacen("http://local-video.", "local-video://", 1);
        assert_eq!(
            parse_path(&reverted).as_deref(),
            Some("C:/Users/me/视频/a+b (1).mp4")
        );
    }

    #[test]
    fn range_parsing_variants() {
        // bytes=0-99 → 0..99
        assert_eq!(parse_range("bytes=0-99", 1000), Some((0, 99)));
        // bytes=500- → 到末尾
        assert_eq!(parse_range("bytes=500-", 1000), Some((500, 999)));
        // 末端越界 → clamp
        assert_eq!(parse_range("bytes=900-99999", 1000), Some((900, 999)));
        // start > end → None
        assert_eq!(parse_range("bytes=900-100", 1000), None);
        // 非法
        assert_eq!(parse_range("items=0-1", 1000), None);
        // 空文件
        assert_eq!(parse_range("bytes=0-10", 0), None);
    }

    #[test]
    fn mime_by_extension() {
        assert_eq!(mime_of("C:/a/b.mp4"), "video/mp4");
        assert_eq!(mime_of("C:/a/b.WEBM"), "video/webm");
        assert_eq!(mime_of("C:/a/b.xyz"), "application/octet-stream");
    }
}
