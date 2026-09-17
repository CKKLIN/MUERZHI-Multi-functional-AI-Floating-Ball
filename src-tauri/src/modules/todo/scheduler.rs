// 待办到期提醒调度 — 移植 electron/main/todo-scheduler.ts
// 30s 轮询 + 启动即补扫；到期弹提醒窗 + markReminderFired 落库防重复；
// 提醒时若待办窗口不可见 → 悬浮球角标闪烁。

use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{AppHandle, Manager};

const CHECK_INTERVAL_MS: u64 = 30_000;

pub struct SchedulerState {
    pub running: AtomicBool,
}

impl SchedulerState {
    pub fn global() -> &'static SchedulerState {
        use std::sync::OnceLock;
        static S: OnceLock<SchedulerState> = OnceLock::new();
        S.get_or_init(|| SchedulerState { running: AtomicBool::new(false) })
    }
}

/// 启动调度（幂等）：先同步补扫一次，再起 30s 轮询
pub fn start(app: &AppHandle) {
    if SchedulerState::global().running.swap(true, Ordering::SeqCst) {
        return;
    }
    check_reminders(app);
    let app2 = app.clone();
    tauri::async_runtime::spawn(async move {
        loop {
            tokio::time::sleep(std::time::Duration::from_millis(CHECK_INTERVAL_MS)).await;
            if !SchedulerState::global().running.load(Ordering::SeqCst) {
                break;
            }
            check_reminders(&app2);
        }
    });
    log::info!("Todo reminder scheduler started");
}

#[allow(dead_code)] // before-quit 清理（P3 接线）
pub fn stop() {
    SchedulerState::global().running.store(false, Ordering::SeqCst);
}

/// 单次检查（对齐 todo-scheduler.ts checkReminders）
pub fn check_reminders(app: &AppHandle) {
    use crate::modules::todo::store;

    let items = store::load_items(app);
    let now = store::now_iso();
    let due = store::compute_due_reminders(&items, &now);
    if due.is_empty() {
        return;
    }
    for it in &due {
        let text = store::strip_html(&it.content).trim().to_string();
        let title = if it.kind == "memo" && !it.title.trim().is_empty() {
            store::strip_html(&it.title).trim().to_string()
        } else {
            text.chars().take(24).collect::<String>()
        };
        let body: String = text.chars().take(90).collect();
        crate::modules::windows::todo_windows::show_todo_reminder(app, title, body);
        store::mark_reminder_fired(app, &it.id);
    }
    // 待办窗口不可见时闪烁角标提醒
    let visible = app
        .get_webview_window("todo")
        .map(|w| w.is_visible().unwrap_or(false))
        .unwrap_or(false);
    if !visible {
        crate::modules::windows::todo_windows::set_badge_flash(app, true);
    }
}

