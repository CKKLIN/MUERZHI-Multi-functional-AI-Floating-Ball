import { randomUUID } from 'node:crypto'

// 转换任务注册表：维护所有正在运行的 ffmpeg 子进程，便于
//   1. 退出 / 关闭应用时统一 kill，避免 ffmpeg.exe 成为孤儿进程继续吃 CPU
//   2. （将来）按 id 取消单个转换任务
//
// 注册时只需提供一个 kill 函数（fluent-ffmpeg 的 command.kill() 或
// child_process 的 proc.kill() 都满足）。注册表本身不关心进程类型，
// 也不依赖 electron / electron-log，因此可以脱离 Electron 单测。
//
// 日志通过 setLogger 注入，避免本模块直接依赖 logger（便于纯 node 测试）。

export type Killer = () => void
export type RegistryLogger = { info: (...a: unknown[]) => void; warn: (...a: unknown[]) => void }

interface ConversionTask {
  id: string
  kill: Killer
}

const tasks = new Map<string, ConversionTask>()
let logger: RegistryLogger = {
  info: () => {},
  warn: () => {},
}

/** 注入日志实现（生产环境在 main 进程入口调用，传入 electron-log 实例）。 */
export function setRegistryLogger(log: RegistryLogger): void {
  logger = log
}

/** 注册一个在途转换任务，返回 id。任务结束后应调用 unregister(id)。 */
export function registerConversion(kill: Killer): string {
  const id = randomUUID()
  tasks.set(id, { id, kill })
  return id
}

/** 注销一个任务（任务正常结束或失败后调用）。id 不存在时静默忽略。 */
export function unregisterConversion(id: string): void {
  tasks.delete(id)
}

/** 当前在途任务数（调试 / 测试用）。 */
export function activeConversionCount(): number {
  return tasks.size
}

/** kill 所有在途转换任务。退出 / 关闭应用时调用。
 *  返回被 kill 的任务数。对每个任务吞掉 kill 抛出的异常（进程可能已退出）。 */
export function killAllConversions(): number {
  const count = tasks.size
  if (count === 0) return 0
  logger.info(`Killing ${count} in-flight conversion(s) on quit`)
  for (const task of tasks.values()) {
    try {
      task.kill()
    } catch (err: any) {
      // 进程可能已自行退出；忽略
      logger.warn(`Conversion kill failed for ${task.id}:`, err?.message ?? err)
    }
  }
  tasks.clear()
  return count
}
