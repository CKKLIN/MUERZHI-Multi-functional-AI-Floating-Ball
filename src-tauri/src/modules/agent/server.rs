// Agent HTTP 服务 — 移植 electron/main/agent-server.ts
// 端点：POST /state（状态上报）/ POST /permission（挂起式审批，回传 decision）/ POST /question / GET /health
// 端口 127.0.0.1:60000-60019 逐个试；成功后写 ~/.erzhi-recording/runtime.json（port+pid）供 hook 发现。
// 审批卡 FIFO 队列：permission 与 question 混排，仅队首展示；队首超时可配（默认 300s）。

use axum::{
    body::Bytes,
    extract::State,
    http::{HeaderMap, HeaderValue, StatusCode},
    response::{IntoResponse, Response},
    routing::{get, post},
    Router,
};
use serde_json::{json, Value};
use std::sync::atomic::{AtomicBool, AtomicU16, Ordering};
use std::sync::{Arc, Mutex};
use tokio::sync::oneshot;

pub const DEFAULT_PORT: u16 = 60000;
pub const MAX_PORT: u16 = 60019;
pub const DEFAULT_HEAD_TIMEOUT_MS: u64 = 300_000;
pub const MAX_BODY_BYTES: usize = 1024 * 1024;
/// 审批卡队列上限：异常客户端连发 /permission 且对应会话从不发 Stop 事件时，
/// 无界 Vec 会变成内存泄漏（单卡最多 1MB tool_input）
pub const MAX_QUEUE: usize = 16;

/// 日志用短 id：按**字符**截断（`&s[..12]` 按字节切会在多字节字符上落到非法 UTF-8
/// 边界直接 panic；/state 是对外 HTTP 端点，session_id 由调用方给，不能假定是 UUID）
pub fn short_id(s: &str) -> String {
    s.chars().take(12).collect()
}

/// 读自动审批设置（全局开关 + 会话白名单命中）。
///
/// 与 app_settings::AgentSettings 同一份数据（agent-settings.json），但 app_settings 的
/// 读取函数需要 AppHandle，而 server 的卡路径只有 session_id —— 经全局 APP_HANDLE 取，
/// 取不到（测试进程）时按「不自动放行」处理。
fn auto_allow_state(session_id: &str) -> (bool, bool) {
    let Some(app) = crate::modules::agent::bridge::app() else {
        return (false, false);
    };
    let s = crate::modules::commands::app_settings::agent_auto_allow_snapshot(&app);
    let selective = s.auto_allow_sessions.iter().any(|id| id == session_id);
    (s.auto_allow, selective)
}

/// 队首卡片（permission / question 混排）
pub struct CardItem {
    pub kind: String, // "permission" | "question"
    pub session_id: String,
    pub tool_name: String,
    pub tool_input: Value,
    pub tool_use_id: Option<String>,
    pub questions: Option<Value>,
    pub answerable: bool,
    /// 回传通道（None = 已被外部/断连处理）
    pub reply: Option<oneshot::Sender<Value>>,
    #[allow(dead_code)]
    pub created_at: i64,
}

impl CardItem {
    /// 对外展示载荷（对齐 AgentCardPayload）
    pub fn to_payload(&self) -> Value {
        if self.kind == "question" {
            json!({
                "kind": "question",
                "sessionId": self.session_id,
                "toolName": self.tool_name,
                "toolInput": self.tool_input,
                "questions": self.questions,
                "answerable": self.answerable,
            })
        } else {
            json!({
                "kind": "permission",
                "sessionId": self.session_id,
                "toolName": self.tool_name,
                "toolInput": self.tool_input,
                "suggestions": Value::Null,
            })
        }
    }
}

pub struct AgentServer {
    pub queue: Arc<Mutex<Vec<CardItem>>>,
    pub port: Arc<AtomicU16>,
    pub running: Arc<AtomicBool>,
    /// 队首超时（ms）；0 = 永不过期
    pub head_timeout_ms: Arc<Mutex<u64>>,
    /// 超时重启计数器（变更后重新计时）
    pub timer_epoch: Arc<Mutex<u64>>,
    /// HTTP 服务停机信号（stop → axum graceful shutdown；原实现只清标志位，
    /// listener 一直占着端口，stop 后再 start 会漂到新端口并残留旧服务）
    pub shutdown_tx: Arc<tokio::sync::watch::Sender<bool>>,
    pub shutdown_rx: tokio::sync::watch::Receiver<bool>,
}

impl AgentServer {
    pub fn global() -> &'static AgentServer {
        use std::sync::OnceLock;
        static S: OnceLock<AgentServer> = OnceLock::new();
        S.get_or_init(|| {
            let (tx, rx) = tokio::sync::watch::channel(false);
            AgentServer {
                queue: Arc::new(Mutex::new(Vec::new())),
                port: Arc::new(AtomicU16::new(0)),
                running: Arc::new(AtomicBool::new(false)),
                head_timeout_ms: Arc::new(Mutex::new(DEFAULT_HEAD_TIMEOUT_MS)),
                timer_epoch: Arc::new(Mutex::new(0)),
                shutdown_tx: Arc::new(tx),
                shutdown_rx: rx,
            }
        })
    }

    pub fn get_port(&self) -> Option<u16> {
        let p = self.port.load(Ordering::SeqCst);
        if p == 0 {
            None
        } else {
            Some(p)
        }
    }

    pub fn head_payload(&self) -> Option<Value> {
        let q = self.queue.lock().unwrap();
        q.first().map(|c| c.to_payload())
    }

    pub fn session_count(&self) -> usize {
        crate::modules::agent::state_machine::StateMachine::global()
            .sessions_snapshot()
            .len()
    }

    /// 设置队首超时（秒 clamp 由调用方完成）；0 表示不过期
    pub fn set_head_timeout_ms(&self, ms: u64) {
        *self.head_timeout_ms.lock().unwrap() = ms;
        self.schedule_head_timer();
    }

    /// 启动队列头超时计时（epoch 变化时旧计时自然失效）
    ///
    /// ⚠️ 入口必须自增 epoch：这是「单计时器」不变量的等价物（TS 版 clearTimeout(headTimer)）。
    /// 早先只在 set_head_timeout_ms 里 +1，导致队首换人（用户决策/超时/外部完成）时新排程
    /// 与旧 sleep 并存，两者到点都无条件 remove(0) —— 旧计时器会把新队首提前杀掉回 cancel
    /// （实测：前一张卡挂起 100s 被放行、新卡随即入队，新卡只活到前一张的原定到期时刻才被误杀）。
    fn schedule_head_timer(&self) {
        let ms = *self.head_timeout_ms.lock().unwrap();
        let epoch = {
            let mut e = self.timer_epoch.lock().unwrap();
            *e += 1;
            *e
        };
        if ms == 0 {
            return;
        }
        let queue = self.queue.clone();
        let epoch_ref = self.timer_epoch.clone();
        tauri::async_runtime::spawn(async move {
            tokio::time::sleep(std::time::Duration::from_millis(ms)).await;
            // 已被新一轮排程取代 / 队首已换人 → 不处理
            if *epoch_ref.lock().unwrap() != epoch {
                return;
            }
            let expired: Option<CardItem> = {
                let mut q = queue.lock().unwrap();
                if q.is_empty() {
                    None
                } else {
                    Some(q.remove(0))
                }
            };
            if let Some(mut card) = expired {
                if let Some(tx) = card.reply.take() {
                    // permission → cancel；answerable question → deny；只读 → 静默
                    if card.kind == "question" && !card.answerable {
                        // 静默丢弃
                    } else {
                        let _ = tx.send(json!({"__expired": true}));
                    }
                }                crate::modules::agent::bridge::notify_card_change(
                    AgentServer::global().head_payload().unwrap_or(Value::Null),
                );
                // 队首换人：重新计时
                AgentServer::global().schedule_head_timer();
            }
        });
    }

    /// 入队 + 队首计时（对齐 pushCard）
    ///
    /// 自动审批（对齐 Electron 版 setOnCardChange 回调）：权限卡一旦成队首就放行，
    /// 跳过悬浮岛展示（自动允许只作用于权限卡，不影响提问卡）。放行条件 =
    /// 全局 autoAllow，或该卡所属会话在 autoAllowSessions 里（按会话选择性审批）。
    /// ⚠️ Rust 迁移曾把这段整个丢掉 —— 设置读写正常但没人消费，表现为「开了自动审批
    /// 照样弹审批卡」（实测）。
    pub fn push_card(&self, card: CardItem) {
        if card.kind == "permission" {
            let (global, selective) = auto_allow_state(&card.session_id);
            if global || selective {
                log::info!(
                    "[AgentServer] auto-allow permission: tool={}, session={}, global={global}, selective={selective}",
                    card.tool_name,
                    short_id(&card.session_id)
                );
                if let Some(tx) = card.reply.into_iter().next() {
                    let _ = tx.send(json!({"__behavior": "allow"}));
                }
                // 直接放行不入队：卡片已被消费，不需要超时计时与岛端展示
                return;
            }
        }
        let mut q = self.queue.lock().unwrap();
        if q.len() >= MAX_QUEUE {
            drop(q);
            log::warn!(
                "[AgentServer] 审批队列已满（{MAX_QUEUE}），拒绝新卡: tool={}, session={}",
                card.tool_name,
                short_id(&card.session_id)
            );
            if let Some(tx) = card.reply {
                let _ = tx.send(json!({"__cancel": true}));
            }
            return;
        }
        q.push(card);
        let len = q.len();
        drop(q);
        if len == 1 {
            self.schedule_head_timer();
        }
        let payload = self.head_payload().unwrap_or(Value::Null);
        crate::modules::agent::bridge::notify_card_change(payload);
    }

    /// 出队（对齐 shiftHead）
    #[allow(dead_code)]
    pub fn shift_head(&self) {
        {
            let mut q = self.queue.lock().unwrap();
            if q.is_empty() {
                return;
            }
            q.remove(0);
        }
        self.schedule_head_timer();
        let payload = self.head_payload().unwrap_or(Value::Null);
        crate::modules::agent::bridge::notify_card_change(payload);
    }

    /// 移除某会话的全部 permission 卡并取消（对齐 removePermissionsForSession）
    pub fn remove_permissions_for_session(&self, session_id: &str) {
        let removed: Vec<CardItem> = {
            let mut q = self.queue.lock().unwrap();
            let mut kept = Vec::new();
            let mut removed = Vec::new();
            for c in q.drain(..) {
                if c.kind == "permission" && c.session_id == session_id {
                    removed.push(c);
                } else {
                    kept.push(c);
                }
            }
            *q = kept;
            removed
        };
        for mut c in removed {
            if let Some(tx) = c.reply.take() {
                let _ = tx.send(json!({"__cancel": true}));
            }
        }
        if !self.queue.lock().unwrap().is_empty() {
            self.schedule_head_timer();
        }
        let payload = self.head_payload().unwrap_or(Value::Null);
        crate::modules::agent::bridge::notify_card_change(payload);
    }

    /// 移除某会话的全部 question 卡（answerable 的先 reject→deny）
    pub fn remove_questions_for_session(&self, session_id: &str) {
        let removed: Vec<CardItem> = {
            let mut q = self.queue.lock().unwrap();
            let mut kept = Vec::new();
            let mut removed = Vec::new();
            for c in q.drain(..) {
                if c.kind == "question" && c.session_id == session_id {
                    removed.push(c);
                } else {
                    kept.push(c);
                }
            }
            *q = kept;
            removed
        };
        for mut c in removed {
            if c.answerable {
                if let Some(tx) = c.reply.take() {
                    let _ = tx.send(json!({"__deny": true}));
                }
            }
        }
        if !self.queue.lock().unwrap().is_empty() {
            self.schedule_head_timer();
        }
        let payload = self.head_payload().unwrap_or(Value::Null);
        crate::modules::agent::bridge::notify_card_change(payload);
    }

    /// 外部完成匹配（对齐 resolvePermissionByCompletion）
    pub fn resolve_by_completion(
        &self,
        session_id: &str,
        evt: &crate::modules::agent::permission_match::CompletionEvent,
    ) {
        let cards: Vec<crate::modules::agent::permission_match::MatchableCard> = {
            let q = self.queue.lock().unwrap();
            q.iter()
                .map(|c| crate::modules::agent::permission_match::MatchableCard {
                    kind: c.kind.clone(),
                    session_id: c.session_id.clone(),
                    tool_name: Some(c.tool_name.clone()),
                    tool_input: Some(c.tool_input.clone()),
                    tool_use_id: c.tool_use_id.clone(),
                })
                .collect()
        };
        let idx = crate::modules::agent::permission_match::find_permission_to_resolve(
            &cards, session_id, evt,
        );
        if let Some(i) = idx {
            let mut card = {
                let mut q = self.queue.lock().unwrap();
                q.remove(i)
            };
            if let Some(tx) = card.reply.take() {
                let _ = tx.send(json!({"__resolved_in_cli": true}));
            }
            self.schedule_head_timer();
            let payload = self.head_payload().unwrap_or(Value::Null);
            crate::modules::agent::bridge::notify_card_change(payload);
        }
    }

    /// 用户处理队首 permission（对齐 resolvePendingPermission）
    pub fn resolve_pending_permission(&self, behavior: &str) {
        let card = {
            let mut q = self.queue.lock().unwrap();
            if q.first().map(|c| c.kind.as_str()) != Some("permission") {
                return;
            }
            q.remove(0)
        };
        log::info!(
            "[AgentServer] 用户决策 permission: tool={}, behavior={behavior}",
            card.tool_name
        );
        // 「始终允许」= 把该会话加进自动放行白名单并落盘，下次同会话的权限卡直接短路
        // （与设置面板的按会话自动审批是同一份数据）。否则按钮只对本次生效、语义上名不副实。
        if behavior == "always" {
            if let Some(app) = crate::modules::agent::bridge::app() {
                crate::modules::commands::app_settings::agent_set_auto_allow_session(
                    app,
                    card.session_id.clone(),
                    true,
                );
            }
        }
        let mut card = card;
        if let Some(tx) = card.reply.take() {
            let _ = tx.send(json!({"__behavior": behavior}));
        }
        self.shift_after_head();
    }

    /// 提交提问答案（对齐 submitQuestion）
    pub fn submit_question(&self, session_id: &str, answers: Value) {
        let card = {
            let mut q = self.queue.lock().unwrap();
            let head_ok = q
                .first()
                .map(|c| c.answerable && c.session_id == session_id && c.kind == "question")
                .unwrap_or(false);
            if !head_ok {
                log::warn!("submit_question: 队首不是该会话的可作答提问卡，忽略");
                return;
            }
            q.remove(0)
        };
        let mut card = card;
        if let Some(tx) = card.reply.take() {
            let _ = tx.send(json!({"__answers": answers}));
        }
        self.shift_after_head();
    }

    /// 关闭提问/审批卡（对齐 dismissQuestion）
    pub fn dismiss_question(&self) {
        let card = {
            let mut q = self.queue.lock().unwrap();
            if q.first().map(|c| c.kind.as_str()) != Some("question") {
                return;
            }
            q.remove(0)
        };
        let mut card = card;
        if card.answerable {
            if let Some(tx) = card.reply.take() {
                let _ = tx.send(json!({"__deny": true}));
            }
        }
        self.shift_after_head();
    }

    fn shift_after_head(&self) {
        self.schedule_head_timer();
        let payload = self.head_payload().unwrap_or(Value::Null);
        crate::modules::agent::bridge::notify_card_change(payload);
    }

    /// 停止服务：队列全部取消 + 关服务器（runtime.json 有意保留，与 TS 一致）
    pub fn stop(&self) {
        log::info!("[AgentServer] stop: 清空队列并关服务");
        let drained: Vec<CardItem> = {
            let mut q = self.queue.lock().unwrap();
            q.drain(..).collect()
        };
        for mut c in drained {
            if let Some(tx) = c.reply.take() {
                let _ = tx.send(json!({"__stopped": true}));
            }
        }
        self.running.store(false, Ordering::SeqCst);
        self.port.store(0, Ordering::SeqCst);
        // 真正关掉 HTTP 服务（axum graceful shutdown）
        let _ = self.shutdown_tx.send(true);
        crate::modules::agent::bridge::notify_card_change(Value::Null);
    }
}

// ===== HTTP 服务 =====

pub fn runtime_json_path() -> std::path::PathBuf {
    let home = std::env::var("USERPROFILE")
        .or_else(|_| std::env::var("HOME"))
        .unwrap_or_else(|_| ".".into());
    std::path::PathBuf::from(home)
        .join(".erzhi-recording")
        .join("runtime.json")
}

fn write_runtime_json(port: u16) {
    let path = runtime_json_path();
    if let Some(parent) = path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    let payload = json!({ "port": port, "pid": std::process::id() });
    if let Ok(text) = serde_json::to_string(&payload) {
        let _ = std::fs::write(&path, text);
    }
}

/// 启动服务（逐个端口试，成功后写 runtime.json）
pub async fn start(app: tauri::AppHandle) {
    let server = AgentServer::global();
    if server.running.load(Ordering::SeqCst) {
        return;
    }
    // 复位停机信号（stop 后再 start 的场景）
    let _ = server.shutdown_tx.send(false);
    for port in DEFAULT_PORT..=MAX_PORT {
        match try_listen(app.clone(), port).await {
            Ok(()) => {
                server.port.store(port, Ordering::SeqCst);
                server.running.store(true, Ordering::SeqCst);
                write_runtime_json(port);
                log::info!("Agent server listening on 127.0.0.1:{port}");
                return;
            }
            Err(e) => {
                if e.to_string().contains("address in use") || e.to_string().contains("10048") {
                    continue;
                }
                log::error!("Agent server bind failed on {port}: {e}");
            }
        }
    }
    log::error!("Agent server: no free port in {DEFAULT_PORT}-{MAX_PORT}");
}

/// 服务存活兜底：发现「标志正常但端口没有真正监听」时重启服务并重装 hooks。
///
/// hooks 的每一次上报都是到本服务的一次 POST，服务一死悬浮岛就整片失联，而旧版
/// 只有 hooks 形态看护（5min 一次、只看 settings.json 的写法），从不检查服务本身 ——
/// 真正的静默失效（见 try_listen 的 version 坑）完全隐身。这里补一条自愈：
/// 失败时指数退避（2s → 60s 封顶），恢复成功后把 hooks 对齐到**实际端口**。
pub fn ensure_running(app: tauri::AppHandle) {
    static RECOVERING: AtomicBool = AtomicBool::new(false);
    if RECOVERING.swap(true, Ordering::SeqCst) {
        return;
    }
    tauri::async_runtime::spawn(async move {
        let mut delay = 2u64;
        loop {
            let s = AgentServer::global();
            if !(s.running.load(Ordering::SeqCst) && s.get_port().is_some()) {
                // 标志可能「running=true 但 port=0」地卡住（半失效）：start() 入口见到
                // running 就早退，不先复位的话这里会永远重试而不真正重绑
                if s.running.load(Ordering::SeqCst) {
                    s.stop();
                }
                log::warn!("Agent server 未在监听，正在重启…");
                start(app.clone()).await;
            }
            let s = AgentServer::global();
            if s.running.load(Ordering::SeqCst) && s.get_port().is_some() {
                // 端口可能漂移过：按实际端口重装 hooks，否则 URL 指向死端口
                if let Err(e) = crate::modules::agent::hooks::install(&app) {
                    log::warn!("Agent server 恢复后重装 hooks 失败: {e}");
                }
                log::info!("Agent server 恢复监听 127.0.0.1:{:?}", s.get_port());
                break;
            }
            log::warn!("Agent server 重启失败，{delay}s 后重试");
            tokio::time::sleep(std::time::Duration::from_secs(delay)).await;
            delay = (delay * 2).min(60);
        }
        RECOVERING.store(false, Ordering::SeqCst);
    });
}

async fn try_listen(
    app: tauri::AppHandle,
    port: u16,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let router = Router::new()
        .route("/state", post(handle_state))
        .route("/permission", post(handle_permission))
        .route("/question", post(handle_question))
        .route("/health", get(handle_health))
        .with_state(app);
    let listener = tokio::net::TcpListener::bind(("127.0.0.1", port)).await?;
    let mut shutdown_rx = AgentServer::global().shutdown_rx.clone();
    // ⚠️ 必须先吞掉历史版本再去 await changed()。
    //
    // start() 入口为了「stop 之后再 start」复位过停机信号（`shutdown_tx.send(false)`），
    // 那一次 send 已经把全局 receiver 的 version 推进了 1；而 Receiver::clone 出来的是
    // **已消费版本**的副本，首次 `changed()` 只等「版本 > 自己见过的版本」—— 于是它
    // 立刻返回 Ok，with_graceful_shutdown 随即 resolve，axum::serve 绑上端口后马上关掉。
    // 表现极具迷惑性：日志照写 “Agent server listening on 127.0.0.1:60000”、
    // running/port 两个标志都正常、hooks 也装好了，但端口实际没人监听 ——
    // 所有 hook 上报 ECONNREFUSED，悬浮岛永远停在「空闲」（实测「AI 助手完全不工作」）。
    // borrow_and_update() 把克隆体的版本对齐到现在，之后只对**真正的新**停机信号响应。
    shutdown_rx.borrow_and_update();
    tauri::async_runtime::spawn(async move {
        let _ = axum::serve(listener, router)
            .with_graceful_shutdown(async move {
                let _ = shutdown_rx.changed().await;
            })
            .await;
    });
    Ok(())
}

fn cors_headers() -> HeaderMap {
    let mut h = HeaderMap::new();
    h.insert("Access-Control-Allow-Origin", HeaderValue::from_static("*"));
    h.insert(
        "Access-Control-Allow-Headers",
        HeaderValue::from_static("Content-Type"),
    );
    h.insert(
        "Access-Control-Allow-Methods",
        HeaderValue::from_static("POST, GET, OPTIONS"),
    );
    h
}

fn json_response(status: StatusCode, body: Value) -> Response {
    let mut resp = (status, axum::Json(body)).into_response();
    for (k, v) in cors_headers() {
        if let Some(k) = k {
            resp.headers_mut().insert(k, v);
        }
    }
    resp
}

fn parse_body(bytes: &Bytes) -> Result<Value, Response> {
    if bytes.len() > MAX_BODY_BYTES {
        return Err(json_response(
            StatusCode::PAYLOAD_TOO_LARGE,
            json!({"error": "Payload too large"}),
        ));
    }
    if bytes.is_empty() {
        return Ok(json!({}));
    }
    serde_json::from_slice(bytes)
        .map_err(|_| json_response(StatusCode::BAD_REQUEST, json!({"error": "Invalid JSON"})))
}

/// 取 snake/camel 双写字段
fn field<'a>(v: &'a Value, snake: &str, camel: &str) -> Option<&'a Value> {
    v.get(snake).or_else(|| v.get(camel))
}

async fn handle_health(State(app): State<tauri::AppHandle>) -> Response {
    let _ = app;
    let s = AgentServer::global();
    json_response(
        StatusCode::OK,
        json!({
            "ok": true,
            "app": "erzhi-recording",
            "port": s.get_port(),
            "sessionCount": s.session_count(),
        }),
    )
}

async fn handle_state(State(app): State<tauri::AppHandle>, body: Bytes) -> Response {
    let v = match parse_body(&body) {
        Ok(v) => v,
        Err(r) => return r,
    };
    let session_id = field(&v, "session_id", "sessionId")
        .and_then(|x| x.as_str())
        .unwrap_or("");
    let state = v.get("state").and_then(|x| x.as_str()).unwrap_or("");
    let event = v.get("event").and_then(|x| x.as_str()).unwrap_or("");
    if session_id.is_empty() || state.is_empty() || event.is_empty() {
        log::warn!("[AgentServer] /state 400: session_id/state/event 缺失");
        return json_response(
            StatusCode::BAD_REQUEST,
            json!({"error": "Missing required fields: session_id, state, event"}),
        );
    }
    let tool_name = field(&v, "tool_name", "toolName")
        .and_then(|x| x.as_str())
        .map(|s| s.to_string());
    log::info!(
        "[AgentServer] /state: session={}, state={state}, event={event}, tool={}",
        short_id(&session_id),
        tool_name.as_deref().unwrap_or("-")
    );

    let tool_input = field(&v, "tool_input", "toolInput").cloned();
    let tool_use_id = field(&v, "tool_use_id", "toolUseId")
        .and_then(|x| x.as_str())
        .map(|s| s.to_string());
    let context_usage = field(&v, "context_usage", "contextUsage").cloned();
    let model = v
        .get("model")
        .and_then(|x| x.as_str())
        .map(|s| s.to_string());
    let prompt = v
        .get("prompt")
        .and_then(|x| x.as_str())
        .map(|s| s.to_string());
    let agent_id = field(&v, "agent_id", "agentId")
        .and_then(|x| x.as_str())
        .map(|s| s.to_string());

    let sm = crate::modules::agent::state_machine::StateMachine::global();
    sm.update_session(
        session_id,
        state,
        event,
        crate::modules::agent::state_machine::SessionOpts {
            agent_id,
            tool_name: tool_name.clone(),
            tool_input: tool_input.clone(),
            context_usage,
            model,
            prompt,
        },
    );

    // Claude 官方会话标题覆盖（对齐 agent-bridge 的 getClaudeSessionTitle 优先）
    sm.apply_claude_title(session_id);

    // 事件副作用（对齐 agent-server.ts 的三组事件表）
    const COMPLETION: [&str; 6] = [
        "PostToolUse",
        "PostToolUseFailure",
        "Stop",
        "StopFailure",
        "SessionEnd",
        "ApiError",
    ];
    const SESSION_END: [&str; 3] = ["Stop", "StopFailure", "SessionEnd"];
    const EXTERNAL_RESOLUTION: [&str; 3] =
        ["PostToolUse", "PostToolUseFailure", "PermissionDenied"];

    let server = AgentServer::global();
    if COMPLETION.contains(&event) {
        server.remove_questions_for_session(session_id);
    }
    if SESSION_END.contains(&event) {
        server.remove_permissions_for_session(session_id);
    }
    if EXTERNAL_RESOLUTION.contains(&event) {
        server.resolve_by_completion(
            session_id,
            &crate::modules::agent::permission_match::CompletionEvent {
                tool_use_id,
                tool_name,
                tool_input,
            },
        );
    }
    let _ = app;
    json_response(
        StatusCode::OK,
        json!({"ok": true, "app": "erzhi-recording"}),
    )
}

/// POST /permission：挂起式审批（持住连接直到用户决定/超时/断连）
async fn handle_permission(State(_app): State<tauri::AppHandle>, body: Bytes) -> Response {
    let v = match parse_body(&body) {
        Ok(v) => v,
        Err(r) => return r,
    };
    let tool_name = field(&v, "tool_name", "toolName")
        .and_then(|x| x.as_str())
        .unwrap_or("")
        .to_string();
    let tool_input = field(&v, "tool_input", "toolInput")
        .cloned()
        .unwrap_or(Value::Null);
    let session_id = field(&v, "session_id", "sessionId")
        .and_then(|x| x.as_str())
        .unwrap_or("")
        .to_string();
    let tool_use_id = field(&v, "tool_use_id", "toolUseId")
        .and_then(|x| x.as_str())
        .map(|s| s.to_string());

    // AskUserQuestion 走 /permission 通道才可回传答案
    let is_question = tool_name == "AskUserQuestion";
    log::info!(
        "[AgentServer] /permission 入队: kind={}, tool={tool_name}, session={}",
        if is_question {
            "question"
        } else {
            "permission"
        },
        short_id(&session_id)
    );
    let questions = if is_question {
        tool_input.get("questions").cloned()
    } else {
        None
    };

    let (tx, rx) = oneshot::channel::<Value>();
    let card = CardItem {
        kind: if is_question {
            "question".into()
        } else {
            "permission".into()
        },
        session_id: session_id.clone(),
        tool_name: tool_name.clone(),
        tool_input: tool_input.clone(),
        tool_use_id,
        questions,
        answerable: is_question,
        reply: Some(tx),
        created_at: crate::modules::todo::store::now_ms(),
    };
    // 入队即置 notification（对齐 TS：handlePermission 入队前 updateSession("notification",
    // "PermissionRequest")，handleAskUserQuestionPermission 同理置 AskUserQuestion）。
    // 缺这一步审批挂起期间岛灯停留在 PreToolUse 的绿色「工作中」，看不出正在等审批。
    // auto-allow 短路的权限卡不入队，通知无意义且会被紧随其后的 idle 覆盖 —— 跳过。
    // 提问卡与 auto-allow 无关（push_card 只对 permission 卡短路），照常更新。
    let auto_allowed_permission = !is_question
        && {
            let (global, selective) = auto_allow_state(&session_id);
            global || selective
        };
    if !auto_allowed_permission {
        crate::modules::agent::state_machine::StateMachine::global().update_session(
            &session_id,
            "notification",
            if is_question {
                "AskUserQuestion"
            } else {
                "PermissionRequest"
            },
            crate::modules::agent::state_machine::SessionOpts {
                tool_name: Some(tool_name.clone()),
                tool_input: Some(tool_input.clone()),
                ..Default::default()
            },
        );
    }
    AgentServer::global().push_card(card);

    // 等待决策（用户点击 / 超时 / 会话结束 / 停止）
    let decision = rx.await.unwrap_or_else(|_| json!({"__cancel": true}));

    let behavior = if let Some(b) = decision.get("__behavior").and_then(|x| x.as_str()) {
        // always 语义上等同 allow（持久化由 autoAllow 机制负责）
        if b == "always" {
            "allow"
        } else {
            b
        }
    } else if decision.get("__answers").is_some() {
        "allow"
    } else if decision.get("__deny").is_some() || is_question {
        // 提问卡（非 allow/answers 路径）一律 deny，对齐 TS 的 q.catch（超时/外部完成/停止
        // 都要干净关掉挂起的 /permission）。早先与权限卡共用 cancel 分支，与 TS 不一致。
        "deny"
    } else {
        "cancel"
    };
    log::info!(
        "[AgentServer] /permission 决策: tool={tool_name}, session={}, behavior={behavior}",
        short_id(&session_id)
    );

    let mut hook_output = json!({
        "hookSpecificOutput": {
            "hookEventName": "PermissionRequest",
            "decision": { "behavior": behavior }
        }
    });
    // 提问卡答案：questions 必须原样回显模型输入（重建会丢 header / 压扁 options）
    if let Some(answers) = decision.get("__answers") {
        if let Some(obj) = hook_output
            .get_mut("hookSpecificOutput")
            .and_then(|x| x.get_mut("decision"))
            .and_then(|x| x.as_object_mut())
        {
            let questions_echo = tool_input.get("questions").cloned().unwrap_or(Value::Null);
            obj.insert(
                "updatedInput".into(),
                json!({ "questions": questions_echo, "answers": answers }),
            );
        }
    }

    // 决策后会话回落 idle（对齐 updateSession(sessionId,'idle',...))
    crate::modules::agent::state_machine::StateMachine::global().update_session(
        &session_id,
        "idle",
        if decision.get("__answers").is_some() {
            "QuestionAnswered"
        } else {
            "PermissionResolved"
        },
        Default::default(),
    );

    json_response(StatusCode::OK, hook_output)
}

/// POST /question（PreToolUse 通知）：不建卡，仅更新会话状态
async fn handle_question(State(app): State<tauri::AppHandle>, body: Bytes) -> Response {
    let v = match parse_body(&body) {
        Ok(v) => v,
        Err(r) => return r,
    };
    let session_id = field(&v, "session_id", "sessionId")
        .and_then(|x| x.as_str())
        .unwrap_or("");
    crate::modules::agent::state_machine::StateMachine::global().update_session(
        session_id,
        "notification",
        "AskUserQuestion",
        crate::modules::agent::state_machine::SessionOpts {
            tool_name: Some("AskUserQuestion".into()),
            tool_input: field(&v, "tool_input", "toolInput").cloned(),
            ..Default::default()
        },
    );
    let _ = app;
    json_response(
        StatusCode::OK,
        json!({"ok": true, "app": "erzhi-recording"}),
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn short_id_truncates_by_chars_not_bytes() {
        assert_eq!(short_id("abcdefghijklmnop"), "abcdefghijkl");
        // 多字节字符按字符数截断，不落到非法 UTF-8 边界（早先 &s[..12] 在此 panic）
        let cn = "会话会话会话会话会话会话";
        let t = short_id(cn);
        assert_eq!(t.chars().count(), 12);
        assert!(cn.starts_with(&t));
    }

    #[test]
    fn rescheduling_head_timer_invalidates_previous_epoch() {
        let s = AgentServer::global();
        // 每次排程都应推进 epoch（单计时器不变量的等价物：旧 sleep 到点后必须自行失效）
        let e0 = *s.timer_epoch.lock().unwrap();
        s.schedule_head_timer();
        let e1 = *s.timer_epoch.lock().unwrap();
        s.schedule_head_timer();
        let e2 = *s.timer_epoch.lock().unwrap();
        assert!(e1 > e0, "首次排程推进 epoch");
        assert!(e2 > e1, "二次排程继续推进 epoch");
    }
}
