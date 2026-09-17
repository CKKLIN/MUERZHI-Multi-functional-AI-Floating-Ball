// 一键散热 — 移植 electron/main/cooling.ts
// 三档杠杆逐级降级：厂商风扇（Uniwill ECRAM 0x751 bit6 / Lenovo WMI）→ powercfg 功耗限制 → 温度监测。
// 全部通过 powershell -EncodedCommand / powercfg 子进程实现，无原生依赖。
// 状态机：startClocking(cb) → phase active（1s tick + 2.5s 占用率 + 每 3s 温度）→ finish（恢复 + done）。

#![allow(dead_code)]

pub mod lower;
pub mod ps;
pub mod sensors;
pub mod vendor;

use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::Mutex;
use tauri::{AppHandle, Manager};

pub const COOLING_THROTTLE_PCT: u32 = 50;
pub const COOLING_DURATION_MS: u64 = 20_000;
const TICK_MS: u64 = 1000;
const USAGE_INTERVAL_MS: u64 = 2500;
const CAPABILITY_TTL_MS: i64 = 7 * 24 * 3600 * 1000;

#[derive(Debug, Clone, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UsageSample {
    pub cpu: Option<u32>,
    pub gpu: Option<u32>,
    pub disk: Option<u32>,
    pub mem: Option<u32>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CoolingStatus {
    pub phase: String, // "active" | "done"
    pub remain_sec: u64,
    pub temp_c: Option<f64>,
    pub usage: UsageSample,
    pub levers: Levers,
    pub temp_before: Option<f64>,
    pub temp_after: Option<f64>,
}

#[derive(Debug, Clone, Default, Serialize)]
pub struct Levers {
    pub fan: bool,
    pub power: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct CoolingStateFile {
    pub scheme_guid: String,
    pub ac_orig: u32,
    pub dc_orig: Option<u32>,
    pub fan_vendor: Option<String>,
    pub fan_orig_mode: Option<i32>,
    pub started_at: i64,
}

struct Inner {
    phase: String, // idle | active | restoring
    started_at: i64,
    restore_token: u64,
    temp_before: Option<f64>,
    temp_after: Option<f64>,
    current_temp: Option<f64>,
    levers: Levers,
    usage: UsageSample,
    /// 已应用的电源计划（恢复用）
    st: CoolingStateFile,
    /// 进行中搜索（应用前记录原值）
    fan_orig_mode_for_token: Option<i32>,
}

pub struct Cooling {
    inner: Mutex<Inner>,
    active: AtomicBool,
    running: AtomicBool,
    /// 测试注入的时长（默认 20s）
    duration_ms: AtomicU64,
}

impl Cooling {
    pub fn global() -> &'static Cooling {
        use std::sync::OnceLock;
        static S: OnceLock<Cooling> = OnceLock::new();
        S.get_or_init(|| Cooling {
            inner: Mutex::new(Inner {
                phase: "idle".into(),
                started_at: 0,
                restore_token: 0,
                temp_before: None,
                temp_after: None,
                current_temp: None,
                levers: Levers::default(),
                usage: UsageSample::default(),
                st: CoolingStateFile { ac_orig: 100, ..Default::default() },
                fan_orig_mode_for_token: None,
            }),
            active: AtomicBool::new(false),
            running: AtomicBool::new(false),
            duration_ms: AtomicU64::new(COOLING_DURATION_MS),
        })
    }

    pub fn is_active(&self) -> bool {
        self.active.load(Ordering::SeqCst)
    }

    pub fn duration_sec(&self) -> u64 {
        self.duration_ms.load(Ordering::SeqCst) / 1000
    }

    /// 剩余秒数。**不自己加锁**：调用方可能已持有 inner（std::sync::Mutex 不可重入，
    /// 早期版本在此二次 lock 导致整条散热链路死锁）。
    fn remain_sec_locked(&self, started_at: i64) -> u64 {
        let elapsed = crate::modules::todo::store::now_ms() - started_at;
        let dur = self.duration_ms.load(Ordering::SeqCst) as i64;
        let left = (dur - elapsed).max(0);
        ((left + 999) / 1000) as u64
    }

    fn remain_sec(&self) -> u64 {
        let started_at = self.inner.lock().unwrap().started_at;
        self.remain_sec_locked(started_at)
    }

    fn snapshot(&self, phase: &str) -> CoolingStatus {
        // 单次持锁内取全部字段（含剩余秒数由 remain_sec_locked 计算，不再二次加锁）
        let inner = self.inner.lock().unwrap();
        let remain = if phase == "done" { 0 } else { self.remain_sec_locked(inner.started_at) };
        CoolingStatus {
            phase: phase.to_string(),
            remain_sec: remain,
            temp_c: inner.current_temp,
            usage: inner.usage.clone(),
            levers: inner.levers.clone(),
            temp_before: inner.temp_before,
            temp_after: if phase == "done" { inner.temp_after } else { None },
        }
    }

    /// 启动散热（对齐 startCooling）：非 idle 直接返回 false（防重入，不重置计时）
    pub fn start(&self, app: &AppHandle) -> bool {
        log::info!("cooling: start() entry, active={}", self.is_active());
        if self.is_active() {
            return false;
        }
        {
            let mut inner = self.inner.lock().unwrap();
            inner.phase = "active".into();
            inner.started_at = crate::modules::todo::store::now_ms();
            inner.restore_token += 1;
            inner.temp_before = None;
            inner.temp_after = None;
            inner.current_temp = None;
            inner.levers = Levers::default();
            inner.usage = UsageSample::default();
            inner.fan_orig_mode_for_token = None;
        }
        self.active.store(true, Ordering::SeqCst);
        self.running.store(true, Ordering::SeqCst);
        log::info!("cooling: state set active, emitting initial status");
        self.emit(app, "active");
        log::info!("cooling: initial status emitted, spawning workers");

        let app2 = app.clone();
        tauri::async_runtime::spawn(async move {
            log::info!("cooling: tick worker started");
            // 1s tick（emit + 每 3s 刷新温度）
            let token = Cooling::global().current_token();
            loop {
                tokio::time::sleep(std::time::Duration::from_millis(TICK_MS)).await;
                if !Cooling::global().running.load(Ordering::SeqCst) {
                    break;
                }
                if Cooling::global().current_token() != token {
                    break;
                }
                let remain = Cooling::global().remain_sec();
                if remain % 3 == 0 {
                    // 先 await 再拿锁（MutexGuard 不能跨 await，否则 future 非 Send）
                    let maybe_temp = sensors::read_temp_c().await;
                    if let Some(t) = maybe_temp {
                        Cooling::global().inner.lock().unwrap().current_temp = Some(t);
                    }
                }
                Cooling::global().emit(&app2, "active");
                if remain == 0 {
                    break;
                }
            }
            Cooling::global().finish(&app2).await;
        });

        let app3 = app.clone();
        tauri::async_runtime::spawn(async move {
            log::info!("cooling: lever worker started");
            let token = Cooling::global().current_token();
            // 立即采一次占用率 + 首帧温度
            Cooling::global().poll_usage_once().await;
            if let Some(t) = sensors::read_temp_c().await {
                let mut inner = Cooling::global().inner.lock().unwrap();
                if inner.restore_token == token {
                    inner.current_temp = Some(t);
                    inner.temp_before = Some(t);
                }
            }
            Cooling::global().emit(&app3, "active");
            log::info!("cooling: initial sample done, applying levers");
            Cooling::global().apply_levers(&app3, token).await;
            log::info!("cooling: levers done");
            // 2.5s 周期采占用率
            while Cooling::global().running.load(Ordering::SeqCst)
                && Cooling::global().current_token() == token
            {
                tokio::time::sleep(std::time::Duration::from_millis(USAGE_INTERVAL_MS)).await;
                if Cooling::global().current_token() != token {
                    break;
                }
                Cooling::global().poll_usage_once().await;
                Cooling::global().emit(&app3, "active");
            }
        });
        true
    }

    fn current_token(&self) -> u64 {
        self.inner.lock().unwrap().restore_token
    }

    /// 应用三档杠杆：功耗（powercfg）→ 厂商风扇（Uniwill/Lenovo）
    async fn apply_levers(&self, app: &AppHandle, token: u64) {
        log::info!("cooling: probing vendor capability...");
        let cap = vendor::ensure_capability(app).await;
        log::info!("cooling: capability ready (uniwill={} lenovo={})", cap.uniwill, cap.lenovo);
        // 功耗杠杆
        log::info!("cooling: applying power lever...");
        let applied = lower::apply_power_lever().await;
        log::info!("cooling: power lever result={}", applied.is_some());
        if let Some(st) = applied {
            let stale = {
                let mut inner = self.inner.lock().unwrap();
                if inner.restore_token != token || inner.phase != "active" {
                    true
                } else {
                    inner.st = st.clone();
                    inner.levers.power = true;
                    false
                }
            };
            if stale {
                lower::restore_power_lever(&st).await;
                return;
            }
            self.emit(app, "active");
        }
        // 厂商风扇
        log::info!("cooling: applying vendor fan lever...");
        let (fan, orig) = vendor::apply_vendor_lever(&cap).await;
        log::info!("cooling: vendor lever applied={fan}");
        let vendor_name = vendor::applied_vendor_name();
        let stale = {
            let mut inner = self.inner.lock().unwrap();
            if inner.restore_token != token || inner.phase != "active" {
                true
            } else {
                inner.levers.fan = fan;
                if let Some(o) = orig {
                    inner.st.fan_orig_mode = Some(o);
                    inner.st.fan_vendor = vendor_name;
                }
                false
            }
        };
        if stale {
            if let Some((v, mode)) = vendor::applied_vendor_info() {
                vendor::restore_fan_mode(&v, mode).await;
            }
            return;
        }
        self.emit(app, "active");
    }

    async fn poll_usage_once(&self) {
        if let Some(u) = sensors::poll_usage().await {
            self.inner.lock().unwrap().usage = u;
        }
    }

    /// 结束散热（对齐 finishCooling）：恢复电源/风扇 + 删 state 文件 + phase=done
    async fn finish(&self, app: &AppHandle) {
        let should_run = {
            let mut inner = self.inner.lock().unwrap();
            if inner.phase != "active" {
                false
            } else {
                inner.phase = "restoring".into();
                inner.restore_token += 1;
                true
            }
        };
        if !should_run {
            return;
        }
        self.running.store(false, Ordering::SeqCst);
        // 恢复前再读一次温度作为 tempAfter
        let after = sensors::read_temp_c().await;
        {
            let mut inner = self.inner.lock().unwrap();
            inner.temp_after = after;
            inner.current_temp = after.or(inner.current_temp);
        }
        let st = self.inner.lock().unwrap().st.clone();
        lower::restore_power_lever(&st).await;
        vendor::restore_vendor_lever(&st).await;
        self.delete_state_file(app);
        {
            let mut inner = self.inner.lock().unwrap();
            inner.phase = "idle".into();
        }
        self.active.store(false, Ordering::SeqCst);
        self.emit(app, "done");
    }

    /// 同步取消（before-quit / 托盘退出路径，对齐 cancelCooling）
    pub fn cancel(&self, app: &AppHandle) {
        let st = {
            let mut inner = self.inner.lock().unwrap();
            inner.restore_token += 1;
            if inner.phase == "idle" {
                return;
            }
            inner.phase = "restoring".into();
            inner.st.clone()
        };
        self.running.store(false, Ordering::SeqCst);
        lower::restore_power_lever_sync(&st);
        vendor::restore_vendor_lever_sync(&st);
        self.delete_state_file(app);
        self.inner.lock().unwrap().phase = "idle".into();
        self.active.store(false, Ordering::SeqCst);
    }

    fn emit(&self, app: &AppHandle, phase: &str) {
        let status = self.snapshot(phase);
        crate::modules::windows::todo_windows::update_cooling_overlay(
            app,
            serde_json::to_value(&status).unwrap_or(serde_json::Value::Null),
        );
    }

    // ===== 状态文件（崩溃残留恢复）=====

    fn state_path(app: &AppHandle) -> std::path::PathBuf {
        crate::modules::settings::settings_file(app, "cooling-state.json")
    }

    fn write_state_file(&self, app: &AppHandle) {
        let st = self.inner.lock().unwrap().st.clone();
        if let Ok(text) = serde_json::to_string(&st) {
            let _ = std::fs::write(Self::state_path(app), text);
        }
    }

    fn delete_state_file(&self, app: &AppHandle) {
        let _ = std::fs::remove_file(Self::state_path(app));
    }

    /// 崩溃残留恢复（启动时调用）：上次散热中被强杀 → 把 powercfg/风扇模式写回原值
    pub fn recover_residue(app: &AppHandle) {
        let path = Self::state_path(app);
        let Ok(text) = std::fs::read_to_string(&path) else { return };
        let Ok(st) = serde_json::from_str::<CoolingStateFile>(&text) else {
            let _ = std::fs::remove_file(&path);
            return;
        };
        if st.scheme_guid.is_empty() {
            let _ = std::fs::remove_file(&path);
            return;
        }
        log::info!("Recovering cooling residue: {:?}", st.scheme_guid);
        lower::restore_power_lever_sync(&st);
        if st.fan_orig_mode.is_some() && st.fan_vendor.is_some() {
            vendor::restore_vendor_lever_sync(&st);
        }
        let _ = std::fs::remove_file(&path);
    }

    /// 让 write_state_file 在杠杆应用后被调用（保持与 TS 一致：应用成功后落盘）
    pub fn persist_state(&self, app: &AppHandle) {
        self.write_state_file(app);
    }
}

// ===== tauri command =====

#[tauri::command]
pub async fn start_cooling(app: AppHandle) -> bool {
    let started = Cooling::global().start(&app);
    if started {
        Cooling::global().persist_state(&app);
    }
    started
}

#[tauri::command]
pub fn is_cooling_active() -> bool {
    Cooling::global().is_active()
}

#[tauri::command]
pub fn get_cooling_duration_sec() -> u64 {
    Cooling::global().duration_sec()
}

#[tauri::command]
pub fn cancel_cooling(app: AppHandle) {
    Cooling::global().cancel(&app);
}

/// 悬浮球右键入口：启动散热 + 面板 + 花瓣旋转（对齐 floating-ball-cooling 分支）
///
/// ⚠️ 本函数被 Tauri 事件监听器调用（监听器回调在主线程），因此不能直接建窗——
/// WebviewWindowBuilder::build() 需要事件循环处理创建消息，与主线程互等会死锁
/// （与 region.rs::start_region_select 同一坑）。故整体 spawn 到异步线程池。
pub fn trigger_from_ball(app: &AppHandle) {
    let app = app.clone();
    tauri::async_runtime::spawn(async move {
        let started = Cooling::global().start(&app);
        if !started {
            crate::modules::windows::todo_windows::shake_cooling_overlay(&app);
            return;
        }
        crate::modules::windows::floating_ball::set_cooling_visual(&app, true);
        let center = crate::modules::windows::floating_ball::ball_center_for_overlay(&app);
        crate::modules::windows::todo_windows::show_cooling_overlay(&app, center);
    });
}

/// 散热中拖动悬浮球：面板跟随
pub fn follow_ball(app: &AppHandle) {
    if !Cooling::global().is_active() {
        return;
    }
    let center = crate::modules::windows::floating_ball::ball_center_for_overlay(app);
    crate::modules::windows::todo_windows::reposition_cooling_overlay(app, center);
}

/// 让 Manager import 被使用
#[allow(dead_code)]
fn _use(app: &AppHandle) {
    let _ = app.get_webview_window("noop");
}