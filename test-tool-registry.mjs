// tool-registry 单测（纯 node，无新依赖；用 stub 适配器，验证注册表的隔离与状态计算）
// 运行：node --experimental-strip-types test-tool-registry.mjs
let failures = 0
function assert(cond, msg) {
  if (cond) { console.log('  ✓', msg) }
  else { console.error('  ✗', msg); failures++ }
}
function eq(actual, expected, msg) { assert(actual === expected, `${msg} (got ${actual}, expected ${expected})`) }

const { createToolRegistry } = await import('./electron/main/agent-tools/registry.ts')

console.log('tool-registry 单测:')

// 正常适配器：running + working 会话
{
  const reg = createToolRegistry([{
    id: 'codex',
    nameKey: 'tools.codex',
    approval: 'none',
    probeRunning: () => true,
    fetchSessions: () => [{ sessionId: 'codex:1', agentId: 'codex', state: 'working', updatedAt: Date.now() }],
  }])
  reg.pollOnce()
  const st = reg.getStatus()[0]
  eq(st.running, true, 'probeRunning 反映到 status.running')
  eq(st.working, true, 'running 且有非 idle 会话 ⇒ working')
  eq(st.approval, 'none', '审批降级为 none')
  eq(st.error, false, '正常探测无错误标记')
  reg.stop()
}

// 探测抛异常 → 隔离：不抛出、标记 error、保留状态
{
  let calls = 0
  const reg = createToolRegistry([{
    id: 'codex',
    nameKey: 'tools.codex',
    approval: 'none',
    probeRunning: () => { throw new Error('boom') },
    fetchSessions: () => [],
  }])
  // 不应抛
  let threw = false
  try { reg.pollOnce() } catch { threw = true }
  eq(threw, false, '单工具探测抛异常不拖垮整体（pollOnce 不抛出）')
  const st = reg.getStatus()[0]
  eq(st.error, true, '异常被标记为 error')
  eq(st.running, false, '异常时 running 回退 false（默认值）')
  reg.stop()
}

// working 判定：running 但全 idle 会话 → 非 working
{
  const reg = createToolRegistry([{
    id: 'codex',
    nameKey: 'tools.codex',
    approval: 'none',
    probeRunning: () => true,
    fetchSessions: () => [{ sessionId: 'codex:1', agentId: 'codex', state: 'idle', updatedAt: Date.now() }],
  }])
  reg.pollOnce()
  eq(reg.getStatus()[0].working, false, 'running 但会话全 idle ⇒ 非 working')
  reg.stop()
}

// 未运行 + 空会话 → 非 working
{
  const reg = createToolRegistry([{
    id: 'codex',
    nameKey: 'tools.codex',
    approval: 'none',
    probeRunning: () => false,
    fetchSessions: () => [],
  }])
  reg.pollOnce()
  eq(reg.getStatus()[0].working, false, '未运行且无会话 ⇒ 非 working')
  reg.stop()
}

if (failures === 0) { console.log('\n全部通过 ✓'); process.exit(0) }
else { console.error(`\n${failures} 个断言失败`); process.exit(1) }
