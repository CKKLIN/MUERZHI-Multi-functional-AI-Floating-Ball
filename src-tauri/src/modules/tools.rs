// 自定义工具模块：扫描特定目录（custom-tools）下的 HTML 文件，每一个 HTML 即为一个独立工具
// 支持自适应读取 <title>、<meta> 元数据，并通过 custom-tool:// 自定义协议加载运行在独立原生窗口中。

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::time::UNIX_EPOCH;
use tauri::http::{Request, Response, StatusCode};
use tauri::{AppHandle, Manager};
use tauri_plugin_opener::OpenerExt;

/// 自定义工具元信息
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CustomToolItem {
    pub id: String,
    pub name: String,
    pub file_name: String,
    pub relative_path: String,
    pub absolute_path: String,
    pub description: Option<String>,
    pub icon: Option<String>,
    pub width: Option<f64>,
    pub height: Option<f64>,
    pub modified_time: u64,
    pub file_size: u64,
    pub tool_url: Option<String>,
}

/// 自定义工具根目录：
/// dev 模式放项目根目录下的 custom-tools，生产环境放 %APPDATA%\com.muerzhi.aiball\custom-tools
pub fn tools_dir(app: &AppHandle) -> PathBuf {
    crate::modules::settings::settings_dir(app).join("custom-tools")
}

/// 确保工具目录存在；如果不存在则自动创建，并默认释放一个示例工具
pub fn ensure_tools_dir(app: &AppHandle) -> std::io::Result<PathBuf> {
    let dir = tools_dir(app);
    if !dir.exists() {
        fs::create_dir_all(&dir)?;
        let demo_path = dir.join("calculator.html");
        if !demo_path.exists() {
            let _ = fs::write(&demo_path, DEMO_CALCULATOR_HTML);
        }
    }
    Ok(dir)
}

/// 从 HTML 源码前部提取元数据（title, description, icon, 窗口建议宽高等）
fn parse_html_meta(content: &str) -> (Option<String>, Option<String>, Option<String>, Option<f64>, Option<f64>) {
    let lower = content.to_lowercase();
    
    // 提取 <title>
    let title = if let Some(start_idx) = lower.find("<title") {
        if let Some(tag_end) = lower[start_idx..].find('>') {
            let content_start = start_idx + tag_end + 1;
            if let Some(end_idx) = lower[content_start..].find("</title>") {
                let raw_title = &content[content_start..content_start + end_idx];
                let trimmed = raw_title.trim();
                if !trimmed.is_empty() {
                    Some(trimmed.to_string())
                } else {
                    None
                }
            } else {
                None
            }
        } else {
            None
        }
    } else {
        None
    };

    // 辅助闭包：查找 <meta name="..." content="..."> 或 <meta content="..." name="...">
    let find_meta_val = |target_name: &str| -> Option<String> {
        let mut cur = &lower[..];
        let original = content;
        let mut orig_offset = 0;

        while let Some(meta_idx) = cur.find("<meta") {
            let meta_str = &cur[meta_idx..];
            let end_bracket = meta_str.find('>')?;
            let tag = &meta_str[..end_bracket];
            let orig_tag = &original[orig_offset + meta_idx..orig_offset + meta_idx + end_bracket];

            if tag.contains(target_name) {
                // 提取 content 属性值
                if let Some(content_attr_idx) = tag.find("content=") {
                    let after_content = orig_tag[content_attr_idx + 8..].trim_start();
                    let quote_char = after_content.chars().next()?;
                    if quote_char == '"' || quote_char == '\'' {
                        let val_part = &after_content[1..];
                        if let Some(end_quote) = val_part.find(quote_char) {
                            return Some(val_part[..end_quote].trim().to_string());
                        }
                    }
                }
            }
            let next_start = meta_idx + end_bracket + 1;
            cur = &cur[next_start..];
            orig_offset += next_start;
        }
        None
    };

    let description = find_meta_val("description");
    let icon = find_meta_val("icon");
    let width = find_meta_val("window-width").and_then(|s| s.parse::<f64>().ok());
    let height = find_meta_val("window-height").and_then(|s| s.parse::<f64>().ok());

    (title, description, icon, width, height)
}

/// 扫描指定路径生成 CustomToolItem
fn build_tool_item(file_path: &Path, rel_path: &str) -> Option<CustomToolItem> {
    let metadata = fs::metadata(file_path).ok()?;
    if !metadata.is_file() {
        return None;
    }

    let file_size = metadata.len();
    let modified_time = metadata
        .modified()
        .ok()
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map(|d| d.as_secs())
        .unwrap_or(0);

    let file_name = file_path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("tool")
        .to_string();

    // 只读取前 16KB 用于提取 meta，避免大文件卡顿
    let mut header_buf = vec![0u8; 16384];
    let bytes_read = match fs::File::open(file_path) {
        Ok(mut f) => {
            use std::io::Read;
            f.read(&mut header_buf).unwrap_or(0)
        }
        Err(_) => 0,
    };
    header_buf.truncate(bytes_read);
    let header_str = String::from_utf8_lossy(&header_buf);

    let (meta_title, description, icon, width, height) = parse_html_meta(&header_str);

    // 如果 HTML 没设置 <title>，回退使用文件名
    let name = meta_title.unwrap_or_else(|| {
        let stem = file_path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("未命名工具");
        if stem.eq_ignore_ascii_case("index") {
            // 如果是 index.html，优先用父目录名作为工具名
            if let Some(parent_name) = file_path.parent().and_then(|p| p.file_name()).and_then(|n| n.to_str()) {
                return parent_name.to_string();
            }
        }
        stem.replace(['-', '_'], " ")
    });

    let id = rel_path.replace(['\\', '/', '.', ' '], "_");
    let clean_rel = rel_path.replace('\\', "/");
    let encoded_rel = clean_rel
        .split('/')
        .map(encode_uri_segment)
        .collect::<Vec<_>>()
        .join("/");
    let port = crate::modules::agent::server::AgentServer::global()
        .get_port()
        .unwrap_or(crate::modules::agent::server::DEFAULT_PORT);
    let tool_url = Some(format!("http://127.0.0.1:{port}/custom-tool/{encoded_rel}"));

    Some(CustomToolItem {
        id,
        name,
        file_name,
        relative_path: clean_rel,
        absolute_path: file_path.to_string_lossy().to_string(),
        description,
        icon,
        width,
        height,
        modified_time,
        file_size,
        tool_url,
    })
}

/// 扫描工具目录，返回所有工具列表
#[tauri::command]
pub async fn list_custom_tools(app: AppHandle) -> Result<Vec<CustomToolItem>, String> {
    tokio::task::spawn_blocking(move || {
        let dir = ensure_tools_dir(&app).map_err(|e| e.to_string())?;
        let mut tools = Vec::new();

        let entries = match fs::read_dir(&dir) {
            Ok(e) => e,
            Err(e) => return Err(e.to_string()),
        };

        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_file() {
                if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
                    let ext_lower = ext.to_lowercase();
                    if ext_lower == "html" || ext_lower == "htm" {
                        if let Some(rel) = path.strip_prefix(&dir).ok().and_then(|p| p.to_str()) {
                            if let Some(tool) = build_tool_item(&path, rel) {
                                tools.push(tool);
                            }
                        }
                    }
                }
            } else if path.is_dir() {
                // 扫描一层子目录内的 index.html / index.htm
                for index_name in &["index.html", "index.htm"] {
                    let index_file = path.join(index_name);
                    if index_file.is_file() {
                        if let Some(rel) = index_file.strip_prefix(&dir).ok().and_then(|p| p.to_str()) {
                            if let Some(tool) = build_tool_item(&index_file, rel) {
                                tools.push(tool);
                            }
                        }
                        break;
                    }
                }
            }
        }

        // 按修改时间倒序排列（最近更新的排前面）
        tools.sort_by(|a, b| b.modified_time.cmp(&a.modified_time));
        Ok(tools)
    })
    .await
    .map_err(|e| e.to_string())?
}

/// 打开自定义工具存放目录（系统资源管理器）
#[tauri::command]
pub async fn open_custom_tools_dir(app: AppHandle) -> Result<(), String> {
    let dir = ensure_tools_dir(&app).map_err(|e| e.to_string())?;
    let path_str = dir.to_string_lossy().to_string();
    app.opener()
        .open_path(&path_str, None::<&str>)
        .map_err(|e| e.to_string())
}

/// 在文件资源管理器中定位并选中指定工具文件
#[tauri::command]
pub async fn locate_custom_tool(app: AppHandle, relative_path: String) -> Result<(), String> {
    let dir = tools_dir(&app);
    let target = dir.join(&relative_path);
    if !target.exists() {
        return Err("文件不存在".to_string());
    }
    app.opener()
        .reveal_item_in_dir(target)
        .map_err(|e| e.to_string())
}

/// 在默认浏览器中直接打开工具
#[tauri::command]
pub async fn open_custom_tool_in_browser(app: AppHandle, relative_path: String) -> Result<(), String> {
    let dir = tools_dir(&app);
    let target = dir.join(&relative_path);
    if !target.exists() {
        return Err("文件不存在".to_string());
    }
    let target_str = target.to_string_lossy().to_string();
    app.opener()
        .open_path(&target_str, None::<&str>)
        .map_err(|e| e.to_string())
}

/// 删除指定工具
#[tauri::command]
pub async fn delete_custom_tool(app: AppHandle, relative_path: String) -> Result<(), String> {
    tokio::task::spawn_blocking(move || {
        let dir = tools_dir(&app);
        let target = dir.join(&relative_path);
        
        // 安全检查：目标必须在 tools_dir 内
        let canonical_dir = dir.canonicalize().map_err(|e| e.to_string())?;
        let canonical_target = target.canonicalize().map_err(|e| e.to_string())?;
        if !canonical_target.starts_with(&canonical_dir) {
            return Err("非法的文件路径".to_string());
        }

        if canonical_target.is_file() {
            fs::remove_file(canonical_target).map_err(|e| e.to_string())?;
            Ok(())
        } else {
            Err("指定的工具不是有效文件".to_string())
        }
    })
    .await
    .map_err(|e| e.to_string())?
}

/// 快速创建一个示例小工具（若已存在同名工具则自动递增序号）
#[tauri::command]
pub async fn create_demo_custom_tool(app: AppHandle) -> Result<CustomToolItem, String> {
    tokio::task::spawn_blocking(move || {
        let dir = ensure_tools_dir(&app).map_err(|e| e.to_string())?;
        let mut idx = 1;
        let mut file_name = "clock_timer.html".to_string();
        while dir.join(&file_name).exists() {
            idx += 1;
            file_name = format!("clock_timer_{idx}.html");
        }

        let full_path = dir.join(&file_name);
        fs::write(&full_path, DEMO_CLOCK_HTML).map_err(|e| e.to_string())?;

        build_tool_item(&full_path, &file_name).ok_or_else(|| "生成工具元信息失败".to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}

static LAST_OPENED_TOOL: std::sync::OnceLock<std::sync::Mutex<Option<CustomToolItem>>> =
    std::sync::OnceLock::new();

pub fn set_last_tool(tool: CustomToolItem) {
    let mutex = LAST_OPENED_TOOL.get_or_init(|| std::sync::Mutex::new(None));
    *mutex.lock().unwrap() = Some(tool);
}

#[tauri::command]
pub fn get_initial_tool_tab() -> Option<CustomToolItem> {
    LAST_OPENED_TOOL.get()?.lock().unwrap().clone()
}

/// 在共用多标签原生桌面窗口中运行自定义工具（所有工具共用同一个窗口，顶部 Tab 来回切换）
#[tauri::command]
pub async fn open_custom_tool(app: AppHandle, relative_path: String) -> Result<(), String> {
    use tauri::Emitter;

    let dir = ensure_tools_dir(&app).map_err(|e| e.to_string())?;
    let target = dir.join(&relative_path);
    if !target.is_file() {
        return Err("工具文件不存在".to_string());
    }

    // 提取工具 meta
    let tool_item = build_tool_item(&target, &relative_path)
        .ok_or_else(|| "读取工具信息失败".to_string())?;

    set_last_tool(tool_item.clone());

    // 打开或聚焦共用窗口 tool-runner
    crate::modules::windows::open_or_focus(&app, "tool-runner", "/tool-runner");

    // 向前台广播打开该工具标签（app 广播 + win 单播双重保障）
    let payload = serde_json::to_value(&tool_item).unwrap_or_default();
    let _ = app.emit("open-tool-tab", payload.clone());
    if let Some(win) = app.get_webview_window("tool-runner") {
        let _ = win.emit("open-tool-tab", payload);
    }

    Ok(())
}

/// 读取工具的完整文本内容（供前端加载或调试备用）
#[tauri::command]
pub async fn read_custom_tool_content(
    app: AppHandle,
    relative_path: String,
) -> Result<String, String> {
    tokio::task::spawn_blocking(move || {
        let dir = tools_dir(&app);
        let target = dir.join(&relative_path);
        let canonical_dir = dir.canonicalize().map_err(|e| e.to_string())?;
        let canonical_target = target.canonicalize().map_err(|e| e.to_string())?;
        if !canonical_target.starts_with(&canonical_dir) || !canonical_target.is_file() {
            return Err("非法的文件路径或文件不存在".to_string());
        }
        fs::read_to_string(canonical_target).map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}

/// custom-tool:// 自定义协议处理器
pub fn handle_custom_tool(app: &AppHandle, request: Request<Vec<u8>>) -> Response<Vec<u8>> {
    let uri = request.uri().to_string();
    let decoded_path = match parse_uri_path(&uri) {
        Some(p) => p,
        None => {
            return Response::builder()
                .status(StatusCode::BAD_REQUEST)
                .body(b"Bad Request".to_vec())
                .unwrap();
        }
    };

    let base_dir = tools_dir(app);
    let target = base_dir.join(&decoded_path);

    // 安全检查：防目录穿越
    let canonical_base = match base_dir.canonicalize() {
        Ok(b) => b,
        Err(_) => {
            return Response::builder()
                .status(StatusCode::NOT_FOUND)
                .body(b"Tools directory not found".to_vec())
                .unwrap();
        }
    };

    let canonical_target = match target.canonicalize() {
        Ok(t) => t,
        Err(_) => {
            return Response::builder()
                .status(StatusCode::NOT_FOUND)
                .body(format!("File not found: {decoded_path}").into_bytes())
                .unwrap();
        }
    };

    if !canonical_target.starts_with(&canonical_base) || !canonical_target.is_file() {
        return Response::builder()
            .status(StatusCode::FORBIDDEN)
            .body(b"Forbidden".to_vec())
            .unwrap();
    }

    let mime = tool_mime_of(&canonical_target);

    match fs::read(&canonical_target) {
        Ok(data) => Response::builder()
            .status(StatusCode::OK)
            .header("Content-Type", mime)
            .header("Access-Control-Allow-Origin", "*")
            .body(data)
            .unwrap(),
        Err(e) => Response::builder()
            .status(StatusCode::INTERNAL_SERVER_ERROR)
            .body(e.to_string().into_bytes())
            .unwrap(),
    }
}

/// 为 Agent HTTP 服务提供 /custom-tool/* 静态文件响应
pub fn serve_tool_file_http(app: &AppHandle, raw_path: &str) -> axum::response::Response {
    use axum::response::IntoResponse;

    let decoded_path = percent_decode(raw_path.trim_start_matches('/'));
    let base_dir = tools_dir(app);
    let target = base_dir.join(&decoded_path);

    // 安全检查：防目录穿越
    let canonical_base = match base_dir.canonicalize() {
        Ok(b) => b,
        Err(_) => {
            return (
                axum::http::StatusCode::NOT_FOUND,
                "Tools directory not found",
            )
                .into_response();
        }
    };

    let canonical_target = match target.canonicalize() {
        Ok(t) => t,
        Err(_) => {
            return (
                axum::http::StatusCode::NOT_FOUND,
                format!("File not found: {decoded_path}"),
            )
                .into_response();
        }
    };

    if !canonical_target.starts_with(&canonical_base) || !canonical_target.is_file() {
        return (axum::http::StatusCode::FORBIDDEN, "Forbidden").into_response();
    }

    let mime = tool_mime_of(&canonical_target);

    match fs::read(&canonical_target) {
        Ok(data) => {
            let mut resp = (axum::http::StatusCode::OK, data).into_response();
            if let Ok(val) = axum::http::HeaderValue::from_str(mime) {
                resp.headers_mut().insert(axum::http::header::CONTENT_TYPE, val);
            }
            resp.headers_mut().insert(
                axum::http::header::ACCESS_CONTROL_ALLOW_ORIGIN,
                axum::http::HeaderValue::from_static("*"),
            );
            resp
        }
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            e.to_string(),
        )
            .into_response(),
    }
}

/// 解析 custom-tool://localhost/{path}
fn parse_uri_path(uri: &str) -> Option<String> {
    let after_scheme = uri.split_once("://").map(|(_, rest)| rest)?;
    let slash = after_scheme.find('/')?;
    let raw = &after_scheme[slash + 1..];
    let decoded = percent_decode(raw);
    let trimmed = decoded.trim_start_matches('/').to_string();
    if trimmed.is_empty() {
        None
    } else {
        Some(trimmed)
    }
}

/// 简单且健壮的 percent decode
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

/// 对 URL 单段进行编码
fn encode_uri_segment(seg: &str) -> String {
    seg.bytes()
        .map(|b| match b {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                (b as char).to_string()
            }
            _ => format!("%{b:02X}"),
        })
        .collect()
}

/// 常见工具文件 MIME 类型判断
fn tool_mime_of(path: &Path) -> &'static str {
    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();
    match ext.as_str() {
        "html" | "htm" => "text/html; charset=utf-8",
        "css" => "text/css; charset=utf-8",
        "js" | "mjs" => "text/javascript; charset=utf-8",
        "json" => "application/json; charset=utf-8",
        "svg" => "image/svg+xml",
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "ico" => "image/x-icon",
        "txt" => "text/plain; charset=utf-8",
        "wasm" => "application/wasm",
        _ => "application/octet-stream",
    }
}

/// 默认内置示例小工具 1：极简拟物计算器
const DEMO_CALCULATOR_HTML: &str = r#"<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>快捷拟物计算器</title>
  <meta name="description" content="简洁高效的极简拟物计算器小工具，支持键盘快捷键">
  <meta name="window-width" content="360">
  <meta name="window-height" content="520">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; user-select: none; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #f4f5f8;
      display: flex;
      flex-direction: column;
      height: 100vh;
      padding: 16px;
      color: #2c3e50;
    }
    .header {
      font-size: 13px;
      font-weight: 600;
      color: #7f8c8d;
      margin-bottom: 8px;
      display: flex;
      justify-content: space-between;
    }
    .display {
      background: #ffffff;
      border-radius: 14px;
      padding: 16px;
      text-align: right;
      box-shadow: 0 4px 12px rgba(0,0,0,0.04), inset 0 1px 2px rgba(0,0,0,0.02);
      margin-bottom: 16px;
      flex: 0 0 84px;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
    }
    .history { font-size: 13px; color: #95a5a6; height: 18px; overflow: hidden; }
    .screen { font-size: 32px; font-weight: 700; color: #2c3e50; overflow: hidden; text-overflow: ellipsis; }
    .keys {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      flex: 1;
    }
    button {
      border: none;
      border-radius: 12px;
      font-size: 18px;
      font-weight: 600;
      cursor: pointer;
      background: #ffffff;
      color: #34495e;
      box-shadow: 0 2px 6px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02);
      transition: all 0.1s ease;
    }
    button:hover { background: #f8f9fa; transform: translateY(-1px); }
    button:active { transform: translateY(1px); box-shadow: none; }
    button.op { background: #eef2f7; color: #6876A4; font-weight: 700; }
    button.op:hover { background: #e2e8f0; }
    button.equal { background: #6876A4; color: #ffffff; }
    button.equal:hover { background: #576591; }
    button.clear { background: #fee2e2; color: #ef4444; }
    button.clear:hover { background: #fecaca; }
  </style>
</head>
<body>
  <div class="header">
    <span>快捷计算器</span>
    <span>MUERZHI 工具</span>
  </div>
  <div class="display">
    <div class="history" id="history"></div>
    <div class="screen" id="screen">0</div>
  </div>
  <div class="keys">
    <button class="clear" onclick="clearAll()">C</button>
    <button class="op" onclick="deleteLast()">DEL</button>
    <button class="op" onclick="inputOp('%')">%</button>
    <button class="op" onclick="inputOp('/')">÷</button>

    <button onclick="inputNum('7')">7</button>
    <button onclick="inputNum('8')">8</button>
    <button onclick="inputNum('9')">9</button>
    <button class="op" onclick="inputOp('*')">×</button>

    <button onclick="inputNum('4')">4</button>
    <button onclick="inputNum('5')">5</button>
    <button onclick="inputNum('6')">6</button>
    <button class="op" onclick="inputOp('-')">-</button>

    <button onclick="inputNum('1')">1</button>
    <button onclick="inputNum('2')">2</button>
    <button onclick="inputNum('3')">3</button>
    <button class="op" onclick="inputOp('+')">+</button>

    <button onclick="inputNum('0')">0</button>
    <button onclick="inputNum('.')">.</button>
    <button class="equal" style="grid-column: span 2;" onclick="calculate()">=</button>
  </div>

  <script>
    let cur = '0', prev = '', op = '';
    const screen = document.getElementById('screen');
    const hist = document.getElementById('history');

    function update() {
      screen.textContent = cur;
      hist.textContent = op ? `${prev} ${op}` : '';
    }
    function inputNum(n) {
      if (cur === '0' && n !== '.') cur = n;
      else if (n === '.' && cur.includes('.')) return;
      else cur += n;
      update();
    }
    function inputOp(o) {
      if (op && prev) calculate();
      op = o; prev = cur; cur = '0';
      update();
    }
    function clearAll() { cur = '0'; prev = ''; op = ''; update(); }
    function deleteLast() {
      cur = cur.length > 1 ? cur.slice(0, -1) : '0';
      update();
    }
    function calculate() {
      if (!op || !prev) return;
      let a = parseFloat(prev), b = parseFloat(cur), res = 0;
      if (op === '+') res = a + b;
      else if (op === '-') res = a - b;
      else if (op === '*') res = a * b;
      else if (op === '/') res = b !== 0 ? a / b : '错误';
      else if (op === '%') res = a % b;
      cur = String(res); prev = ''; op = '';
      update();
    }
    window.addEventListener('keydown', (e) => {
      if (e.key >= '0' && e.key <= '9') inputNum(e.key);
      else if (e.key === '.') inputNum('.');
      else if (['+', '-', '*', '/'].includes(e.key)) inputOp(e.key);
      else if (e.key === 'Enter' || e.key === '=') calculate();
      else if (e.key === 'Backspace') deleteLast();
      else if (e.key === 'Escape') clearAll();
    });
  </script>
</body>
</html>
"#;

/// 默认内置示例小工具 2：极简番茄钟与灵感时钟
const DEMO_CLOCK_HTML: &str = r#"<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>极简桌面时钟 & 番茄钟</title>
  <meta name="description" content="美观柔和的莫兰迪风格桌面时钟与专注番茄钟">
  <meta name="window-width" content="420">
  <meta name="window-height" content="360">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; user-select: none; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: linear-gradient(135deg, #f5f6f9 0%, #e9ecf2 100%);
      color: #333d47;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      text-align: center;
      padding: 20px;
    }
    .date { font-size: 14px; font-weight: 500; color: #8893a4; margin-bottom: 6px; }
    .clock { font-size: 52px; font-weight: 700; color: #2c3642; font-variant-numeric: tabular-nums; margin-bottom: 20px; }
    .card {
      background: rgba(255, 255, 255, 0.85);
      backdrop-filter: blur(8px);
      padding: 16px 24px;
      border-radius: 16px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.05);
      width: 100%;
      max-width: 320px;
    }
    .timer-title { font-size: 13px; font-weight: 600; color: #6876A4; margin-bottom: 8px; }
    .timer-time { font-size: 28px; font-weight: 700; color: #434c56; margin-bottom: 12px; }
    .btn-group { display: flex; gap: 8px; justify-content: center; }
    button {
      border: none;
      padding: 6px 14px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      background: #6876A4;
      color: #fff;
      transition: all 0.2s;
    }
    button:hover { background: #55628d; }
    button.secondary { background: #e2e6ea; color: #495057; }
    button.secondary:hover { background: #d5dae0; }
  </style>
</head>
<body>
  <div class="date" id="date">2026年11月25日 星期三</div>
  <div class="clock" id="clock">00:00:00</div>
  <div class="card">
    <div class="timer-title">⏱️ 专注番茄钟 (25分钟)</div>
    <div class="timer-time" id="timer">25:00</div>
    <div class="btn-group">
      <button id="startBtn" onclick="toggleTimer()">开始专注</button>
      <button class="secondary" onclick="resetTimer()">重置</button>
    </div>
  </div>

  <script>
    function updateClock() {
      const now = new Date();
      document.getElementById('clock').textContent = now.toTimeString().split(' ')[0];
      const opt = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
      document.getElementById('date').textContent = now.toLocaleDateString('zh-CN', opt);
    }
    setInterval(updateClock, 1000);
    updateClock();

    let timeLeft = 25 * 60;
    let timerId = null;
    function renderTimer() {
      const m = String(Math.floor(timeLeft / 60)).padStart(2, '0');
      const s = String(timeLeft % 60).padStart(2, '0');
      document.getElementById('timer').textContent = `${m}:${s}`;
    }
    function toggleTimer() {
      const btn = document.getElementById('startBtn');
      if (timerId) {
        clearInterval(timerId);
        timerId = null;
        btn.textContent = '继续';
      } else {
        btn.textContent = '暂停';
        timerId = setInterval(() => {
          if (timeLeft > 0) {
            timeLeft--;
            renderTimer();
          } else {
            clearInterval(timerId);
            timerId = null;
            btn.textContent = '开始专注';
            alert('🎉 恭喜完成一次番茄钟专注！');
          }
        }, 1000);
      }
    }
    function resetTimer() {
      if (timerId) clearInterval(timerId);
      timerId = null;
      timeLeft = 25 * 60;
      renderTimer();
      document.getElementById('startBtn').textContent = '开始专注';
    }
    renderTimer();
  </script>
</body>
</html>
"#;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_html_metadata() {
        let sample = r#"<!DOCTYPE html>
<html>
<head>
  <title>我的小工具</title>
  <meta name="description" content="测试小工具的简介">
  <meta name="icon" content="🚀">
  <meta name="window-width" content="640">
  <meta name="window-height" content="480">
</head>
<body><h1>Hello</h1></body>
</html>"#;
        let (title, desc, icon, w, h) = parse_html_meta(sample);
        assert_eq!(title.as_deref(), Some("我的小工具"));
        assert_eq!(desc.as_deref(), Some("测试小工具的简介"));
        assert_eq!(icon.as_deref(), Some("🚀"));
        assert_eq!(w, Some(640.0));
        assert_eq!(h, Some(480.0));
    }

    #[test]
    fn parses_uri_path_correctly() {
        let uri = "custom-tool://localhost/sub/my-tool.html";
        assert_eq!(parse_uri_path(uri).as_deref(), Some("sub/my-tool.html"));

        let uri_encoded = "custom-tool://localhost/%E6%B5%8B%E8%AF%95.html";
        assert_eq!(parse_uri_path(uri_encoded).as_deref(), Some("测试.html"));
    }

    #[test]
    fn detects_mime_types() {
        assert_eq!(tool_mime_of(Path::new("index.html")), "text/html; charset=utf-8");
        assert_eq!(tool_mime_of(Path::new("style.css")), "text/css; charset=utf-8");
        assert_eq!(tool_mime_of(Path::new("app.js")), "text/javascript; charset=utf-8");
        assert_eq!(tool_mime_of(Path::new("icon.png")), "image/png");
        assert_eq!(tool_mime_of(Path::new("logo.svg")), "image/svg+xml");
    }
}

