// 在途转换进程注册表 — 移植 electron/main/conversion-registry.ts
// 每个转换任务注册 kill 闭包，退出时 killAll 防止 ffmpeg.exe 变孤儿继续吃 CPU。

use std::collections::HashMap;
use std::sync::Mutex;

#[allow(dead_code)]
pub type Kill = Box<dyn Fn() + Send + Sync>;

static TASKS: Mutex<Option<HashMap<String, Kill>>> = Mutex::new(None);

fn with_tasks<R>(f: impl FnOnce(&mut HashMap<String, Kill>) -> R) -> R {
    let mut guard = TASKS.lock().unwrap();
    let map = guard.get_or_insert_with(HashMap::new);
    f(map)
}

/// 注册一个转换任务，返回任务 id
pub fn register_conversion(kill: impl Fn() + Send + Sync + 'static) -> String {
    let id = crate::modules::agent::state_machine::new_uuid_like();
    with_tasks(|m| m.insert(id.clone(), Box::new(kill)));
    id
}

/// 注销（幂等，不存在静默）
pub fn unregister_conversion(id: &str) {
    with_tasks(|m| {
        m.remove(id);
    });
}

pub fn active_conversion_count() -> usize {
    with_tasks(|m| m.len())
}

/// 杀掉全部在途转换，返回被杀数量（幂等：清空后再调返回 0）
pub fn kill_all_conversions() -> usize {
    let count = with_tasks(|m| m.len());
    if count == 0 {
        return 0;
    }
    with_tasks(|m| {
        for (_, kill) in m.drain() {
            kill();
        }
    });
    log::info!("conversion-registry: killed {count} in-flight conversions");
    count
}

#[cfg(test)]
mod tests {
    use super::*;

    /// 两个用例共用一个全局注册表，并行跑必然互踩（A 注册后 B 的 kill_all 会把 A 的条目
    /// 一起清掉 → A 的数量断言变成 0）。cargo test 默认多线程，故用例内显式串行。
    static TEST_LOCK: Mutex<()> = Mutex::new(());

    /// 前一个用例 panic 也不让后一个用例跟着挂在锁毒化上（断言信息才是有用的）
    fn lock() -> std::sync::MutexGuard<'static, ()> {
        TEST_LOCK.lock().unwrap_or_else(|e| e.into_inner())
    }

    #[test]
    fn register_kill_unregister_roundtrip() {
        let _guard = lock();
        // 先清空保证隔离
        kill_all_conversions();
        let killed = std::sync::Arc::new(std::sync::atomic::AtomicUsize::new(0));
        let k = killed.clone();
        let id = register_conversion(move || {
            k.fetch_add(1, std::sync::atomic::Ordering::SeqCst);
        });
        assert_eq!(active_conversion_count(), 1);
        // 注销后 killAll 不应触发它
        unregister_conversion(&id);
        assert_eq!(active_conversion_count(), 0);
        assert_eq!(kill_all_conversions(), 0);
        assert_eq!(killed.load(std::sync::atomic::Ordering::SeqCst), 0);
    }

    #[test]
    fn kill_all_is_idempotent_and_counts() {
        let _guard = lock();
        kill_all_conversions();
        let c = std::sync::Arc::new(std::sync::atomic::AtomicUsize::new(0));
        for _ in 0..3 {
            let k = c.clone();
            register_conversion(move || {
                k.fetch_add(1, std::sync::atomic::Ordering::SeqCst);
            });
        }
        assert_eq!(kill_all_conversions(), 3);
        assert_eq!(c.load(std::sync::atomic::Ordering::SeqCst), 3);
        // 幂等
        assert_eq!(kill_all_conversions(), 0);
    }
}