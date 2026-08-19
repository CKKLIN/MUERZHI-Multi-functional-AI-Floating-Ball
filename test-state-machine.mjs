// agent-state-machine 单测（纯 node，无新依赖、无 loader hook）
//
// 覆盖 G2：多会话时"AI 待机中"误判。根因是 WORKING_STALE_MS(5min) 把
// 「长思考/长工具执行而静默 >5min 的活跃会话」误降级为 idle。修复用
// isClaudeRunning 注入做旁证：claude 进程存活时不降级，仅 claude 全退出时
// 才把静默的非 idle 会话当僵尸按 5min 回收。
//
// 运行：node --experimental-strip-types test-state-machine.mjs

let failures = 0
function assert(cond, msg) {
  if (cond) { console.log('  ✓', msg) }
  else { console.error('  ✗', msg); failures++ }
}
function eq(actual, expected, msg) { assert(actual === expected, `${msg} (got ${actual}, expected ${expected})`) }

const { createAgentStateMachine } = await import('./electron/main/agent-state-machine.ts')

// 直接把会话的 updatedAt 往前拨，模拟时间流逝，再跑一次清理
function ageSessions(sm, byMs) {
  for (const s of sm.getSessions()) s.updatedAt -= byMs
}

console.log('agent-state-machine 单测:')

// 用例 1：2 会话并行，其一结束、另一继续工作 >5min（claude 存活）→ 整体保持 working，不显示待机
{
  let claudeRunning = true
  const sm = createAgentStateMachine({ isClaudeRunning: () => claudeRunning })
  sm.updateSession('a', 'working', 'PreToolUse', {})
  sm.updateSession('b', 'working', 'PreToolUse', {})
  sm.updateSession('a', 'idle', 'Stop', {})          // 会话 A 结束
  ageSessions(sm, 6 * 60 * 1000)                     // 6 分钟后：B 已静默 >5min
  sm.cleanStaleSessions()
  eq(sm.resolveDisplayState(), 'working', 'claude 存活时静默 >5min 的 working 会话不降级 → 整体仍 working（不误判待机）')
  eq(sm.getSessions().length, 2, '两个会话条目都还在（A 空闲未到 10min 清理线，B 保持 working）')
  sm.stop()
}

// 用例 2：真僵尸（claude 已全部退出）→ 静默 working 按 5min stale 降级回 idle（DoD：仍能 5min 回收）
{
  let claudeRunning = false
  const sm = createAgentStateMachine({ isClaudeRunning: () => claudeRunning })
  sm.updateSession('z', 'working', 'PreToolUse', {})
  ageSessions(sm, 6 * 60 * 1000)
  sm.cleanStaleSessions()
  eq(sm.resolveDisplayState(), 'idle', 'claude 全退出时静默 working 会话按 5min stale 降级回 idle')
  eq(sm.getSessions()[0].state, 'idle', '僵尸会话已被置为 idle（随后可被 10min 空闲清理）')
  sm.stop()
}

// 用例 3：claude 存活且静默 <5min 的 working 会话 → 不受影响
{
  const sm = createAgentStateMachine({ isClaudeRunning: () => true })
  sm.updateSession('c', 'working', 'PreToolUse', {})
  ageSessions(sm, 4 * 60 * 1000)
  sm.cleanStaleSessions()
  eq(sm.resolveDisplayState(), 'working', 'claude 存活且静默 <5min 的 working 会话保持 working')
  sm.stop()
}

// 用例 4：空闲会话仍按 10min 清理（回归保护：不破坏既有 idle 清理）
{
  const sm = createAgentStateMachine({ isClaudeRunning: () => true })
  sm.updateSession('i', 'idle', 'Stop', {})
  ageSessions(sm, 11 * 60 * 1000)
  sm.cleanStaleSessions()
  eq(sm.getSessions().length, 0, '空闲会话超 10min 被清理（idle 清理回归保护）')
  // Stop 带来的 2s "done" 闪烁定时器此时可能仍挂着，先 stop() 清掉再断言空态
  sm.stop()
  eq(sm.resolveDisplayState(), 'idle', '无会话且无 done 闪烁时显示 idle')
}

// 用例 5：未注入 isClaudeRunning → 走旧行为兜底（5min 降级），不会挂尸
{
  const sm = createAgentStateMachine()
  sm.updateSession('n', 'working', 'PreToolUse', {})
  ageSessions(sm, 6 * 60 * 1000)
  sm.cleanStaleSessions()
  eq(sm.resolveDisplayState(), 'idle', '未注入 liveness 时兜底走旧行为（5min 降级 idle）')
  sm.stop()
}

// 用例 6：多会话取最大优先级仍正确（error > working > thinking > idle）
{
  const sm = createAgentStateMachine({ isClaudeRunning: () => true })
  sm.updateSession('x', 'idle', 'Stop', {})
  sm.updateSession('y', 'thinking', 'UserPromptSubmit', {})
  eq(sm.resolveDisplayState(), 'thinking', '两会话取最大优先级 thinking')
  sm.updateSession('z', 'working', 'PreToolUse', {})
  eq(sm.resolveDisplayState(), 'working', '三会话取最大优先级 working')
  sm.updateSession('y', 'error', 'ApiError', {})
  eq(sm.resolveDisplayState(), 'error', 'error 优先级最高')
  sm.stop()
}

if (failures === 0) { console.log('\n全部通过 ✓'); process.exit(0) }
else { console.error(`\n${failures} 个断言失败`); process.exit(1) }
