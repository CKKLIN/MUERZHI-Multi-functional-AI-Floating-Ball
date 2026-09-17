// PowerShell / powercfg 子进程封装 — 移植 cooling.ts 的 execFile 调用方式
// PowerShell 一律 -EncodedCommand（UTF-16LE + base64 标准字母表），绕开 PS 5.1 的引号解析坑。

use std::process::Command;
use std::time::Duration;

/// UTF-16LE → 标准 base64（与 Node Buffer.toString('base64') 一致，含 = padding）
pub fn to_encoded_command(script: &str) -> String {
    let mut bytes = Vec::with_capacity(script.len() * 2);
    for unit in script.encode_utf16() {
        bytes.push((unit & 0xff) as u8);
        bytes.push((unit >> 8) as u8);
    }
    base64_encode(&bytes)
}

fn base64_encode(data: &[u8]) -> String {
    const TABLE: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut out = String::with_capacity((data.len() + 2) / 3 * 4);
    for chunk in data.chunks(3) {
        let b = [chunk[0], *chunk.get(1).unwrap_or(&0), *chunk.get(2).unwrap_or(&0)];
        let n = ((b[0] as u32) << 16) | ((b[1] as u32) << 8) | b[2] as u32;
        out.push(TABLE[((n >> 18) & 63) as usize] as char);
        out.push(TABLE[((n >> 12) & 63) as usize] as char);
        out.push(if chunk.len() > 1 { TABLE[((n >> 6) & 63) as usize] as char } else { '=' });
        out.push(if chunk.len() > 2 { TABLE[(n & 63) as usize] as char } else { '=' });
    }
    out
}

/// 运行 PowerShell 脚本，返回 stdout（失败返回 None）
pub async fn run_powershell(script: &str, timeout_ms: u64) -> Option<String> {
    let encoded = to_encoded_command(script);
    let script_owned = script.to_string();
    let out = tokio::time::timeout(
        Duration::from_millis(timeout_ms),
        tokio::task::spawn_blocking(move || {
            #[cfg(windows)]
            use std::os::windows::process::CommandExt;
            let mut cmd = Command::new("powershell.exe");
            cmd.args(["-NoProfile", "-NonInteractive", "-EncodedCommand", &encoded]);
            #[cfg(windows)]
            cmd.creation_flags(0x0800_0000); // CREATE_NO_WINDOW（对应 windowsHide: true）
            cmd.output()
        }),
    )
    .await;

    match out {
        Ok(Ok(Ok(o))) => {
            if o.status.success() {
                Some(String::from_utf8_lossy(&o.stdout).to_string())
            } else {
                let err = String::from_utf8_lossy(&o.stderr).to_string();
                log::warn!("powershell failed ({}): {}", err.trim(), summary(&script_owned));
                None
            }
        }
        Ok(Ok(Err(e))) => {
            log::warn!("powershell spawn failed: {e}");
            None
        }
        Ok(Err(e)) => {
            log::warn!("powershell join failed: {e}");
            None
        }
        Err(_) => {
            log::warn!("powershell timeout ({timeout_ms}ms): {}", summary(&script_owned));
            None
        }
    }
}

/// 同步版（退出路径用，对齐 execFileSync）
pub fn run_powershell_sync(script: &str, timeout_ms: u64) -> Option<String> {
    let encoded = to_encoded_command(script);
    #[cfg(windows)]
    use std::os::windows::process::CommandExt;
    let mut cmd = Command::new("powershell.exe");
    cmd.args(["-NoProfile", "-NonInteractive", "-EncodedCommand", &encoded]);
    #[cfg(windows)]
    cmd.creation_flags(0x0800_0000);
    let child = cmd.spawn().ok()?;
    // 简易超时：轮询 wait
    let start = std::time::Instant::now();
    let mut child = child;
    loop {
        match child.try_wait() {
            Ok(Some(status)) => {
                if !status.success() {
                    return None;
                }
                let out = child.wait_with_output().ok()?;
                return Some(String::from_utf8_lossy(&out.stdout).to_string());
            }
            Ok(None) => {
                if start.elapsed().as_millis() as u64 > timeout_ms {
                    let _ = child.kill();
                    return None;
                }
                std::thread::sleep(Duration::from_millis(50));
            }
            Err(_) => return None,
        }
    }
}

/// 运行 powercfg（argv 数组）
pub async fn run_powercfg(args: &[&str], timeout_ms: u64) -> Option<String> {
    let args: Vec<String> = args.iter().map(|s| s.to_string()).collect();
    let out = tokio::time::timeout(
        Duration::from_millis(timeout_ms),
        tokio::task::spawn_blocking(move || {
            #[cfg(windows)]
            use std::os::windows::process::CommandExt;
            let mut cmd = Command::new("powercfg");
            cmd.args(&args);
            #[cfg(windows)]
            cmd.creation_flags(0x0800_0000);
            cmd.output()
        }),
    )
    .await;
    match out {
        Ok(Ok(Ok(o))) => Some(String::from_utf8_lossy(&o.stdout).to_string()),
        _ => None,
    }
}

/// 同步 powercfg（恢复路径）
pub fn run_powercfg_sync(args: &[&str], timeout_ms: u64) {
    #[cfg(windows)]
    use std::os::windows::process::CommandExt;
    let mut cmd = Command::new("powercfg");
    cmd.args(args);
    #[cfg(windows)]
    cmd.creation_flags(0x0800_0000);
    let Ok(mut child) = cmd.spawn() else { return };
    let start = std::time::Instant::now();
    loop {
        match child.try_wait() {
            Ok(Some(_)) => return,
            Ok(None) => {
                if start.elapsed().as_millis() as u64 > timeout_ms {
                    let _ = child.kill();
                    return;
                }
                std::thread::sleep(Duration::from_millis(50));
            }
            Err(_) => return,
        }
    }
}

fn summary(script: &str) -> String {
    let s: String = script.chars().take(80).collect();
    s.replace('\n', " ")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn encoded_command_is_utf16le_base64() {
        // PowerShell 的 -EncodedCommand 约定：UTF-16LE + base64
        let enc = to_encoded_command("echo hi");
        // 'e'(0x65) 'c' 相邻 → UTF-16LE 字节 65 00 63 00 ... → base64 以 'ZQBj' 开头
        assert!(enc.starts_with("ZQBj"), "got: {enc}");
        // 无 padding 时长度应为 4 的倍数
        assert_eq!(enc.len() % 4, 0);
    }

    #[test]
    fn base64_padding_for_short_input() {
        assert_eq!(base64_encode(b"f"), "Zg==");
        assert_eq!(base64_encode(b"fo"), "Zm8=");
        assert_eq!(base64_encode(b"foo"), "Zm9v");
    }
}