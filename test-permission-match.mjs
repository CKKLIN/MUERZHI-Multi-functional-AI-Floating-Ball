// permission-match 单测（纯 node，同 hw-encoder 范式）
// 运行：node --experimental-strip-types test-permission-match.mjs
let failures = 0
function assert(cond, msg) {
  if (cond) { console.log('  ✓', msg) }
  else { console.error('  ✗', msg); failures++ }
}
function eq(actual, expected, msg) { assert(actual === expected, `${msg} (got ${actual}, expected ${expected})`) }

const { findPermissionToResolve, permissionContentSignature } = await import('./electron/main/permission-match.ts')

console.log('permission-match findPermissionToResolve 单测:')

// 卡片工厂：session+kind+toolName+toolInput，toolUseId 默认 null
function perm(session, toolName, toolInput, toolUseId = null, kind = 'permission') {
  return { kind, sessionId: session, toolName, toolInput, toolUseId }
}
// 完成事件工厂
function evt(session, toolName, toolInput, toolUseId = null) {
  return { session_id: session, tool_name: toolName, tool_input: toolInput, tool_use_id: toolUseId }
}

// === 基本命中：内容签名回退（真实场景：卡片无 tool_use_id）===
{
  const cards = [perm('s1', 'Bash', { command: 'ls -la' })]
  eq(findPermissionToResolve(cards, 's1', evt('s1', 'Bash', { command: 'ls -la' })), 0, '同 session + 同工具 + 同入参 → 命中第 0 张')
}
// 不同会话不命中
{
  const cards = [perm('s1', 'Bash', { command: 'ls -la' })]
  eq(findPermissionToResolve(cards, 's2', evt('s2', 'Bash', { command: 'ls -la' })), -1, '不同会话 → 不命中')
}
// 不同工具名不命中
{
  const cards = [perm('s1', 'Bash', { command: 'ls -la' })]
  eq(findPermissionToResolve(cards, 's1', evt('s1', 'Read', { command: 'ls -la' })), -1, '不同工具名 → 不命中')
}
// 不同入参但唯一同名卡 → 惰性对账按名命中（完成事件证明该 tool 的 gate 已 settle，唯一同名卡必是它）
{
  const cards = [perm('s1', 'Bash', { command: 'ls -la' })]
  eq(findPermissionToResolve(cards, 's1', evt('s1', 'Bash', { command: 'pwd' })), 0, '唯一同名卡 + 入参漂移 → 惰性对账按名收起')
}
// 多张同名卡 + 入参都对不上 → 无法去重，不关（交 120s 超时兜底）
{
  const cards = [perm('s1', 'Bash', { command: 'a' }), perm('s1', 'Bash', { command: 'b' })]
  eq(findPermissionToResolve(cards, 's1', evt('s1', 'Bash', { command: 'c' })), -1, '多张同名卡且签名对不上 → 不命中')
}
// 多张同名卡但第一张签名命中 → 仍按 FIFO 命中第一张
{
  const cards = [perm('s1', 'Bash', { command: 'a' }), perm('s1', 'Bash', { command: 'b' })]
  eq(findPermissionToResolve(cards, 's1', evt('s1', 'Bash', { command: 'a' })), 0, '多张同名卡但首张签名命中 → 命中第一张')
}

// === 入参键序不影响匹配（同一工具调用的不同序列化）===
{
  const cards = [perm('s1', 'Write', { file_path: 'a.txt', content: 'hi' })]
  eq(findPermissionToResolve(cards, 's1', evt('s1', 'Write', { content: 'hi', file_path: 'a.txt' })), 0, '入参键序不同也命中')
}
// 深嵌套对象
{
  const cards = [perm('s1', 'Edit', { target: { file: 'x', range: { start: 1 } } })]
  eq(findPermissionToResolve(cards, 's1', evt('s1', 'Edit', { target: { range: { start: 1 }, file: 'x' } })), 0, '深嵌套键序不同也命中')
}

// === tool_use_id 精确匹配优先 ===
{
  const cards = [perm('s1', 'Bash', { command: 'a' }, 'tu-PRECISE') , perm('s1', 'Bash', { command: 'b' })]
  eq(findPermissionToResolve(cards, 's1', evt('s1', 'Bash', { command: 'b' }, 'tu-PRECISE')), 0, 'tool_use_id 精确命中（即便内容更靠后的卡更像）')
}
// 卡片无 ID、事件带 ID → 回退内容匹配（真实场景）
{
  const cards = [perm('s1', 'Bash', { command: 'a' })]
  eq(findPermissionToResolve(cards, 's1', evt('s1', 'Bash', { command: 'a' }, 'tu-real')), 0, '卡片无 ID、事件带 ID → 内容回退命中')
}

// === 提问卡不参与匹配 ===
{
  const cards = [perm('s1', 'AskUserQuestion', { questions: [] }, null, 'question'), perm('s1', 'Bash', { command: 'a' })]
  eq(findPermissionToResolve(cards, 's1', evt('s1', 'Bash', { command: 'a' })), 1, '跳过提问卡，命中其后权限卡')
}

// === FIFO：同会话重复相同调用，取最先入队者 ===
{
  const cards = [perm('s1', 'Bash', { command: 'dupe' }), perm('s1', 'Bash', { command: 'dupe' })]
  eq(findPermissionToResolve(cards, 's1', evt('s1', 'Bash', { command: 'dupe' })), 0, '重复相同调用取最先入队者（FIFO）')
}

// === 空/缺失字段健壮性 ===
{
  eq(findPermissionToResolve([], 's1', evt('s1', 'Bash', {})), -1, '空队列 → -1')
  eq(findPermissionToResolve([perm('s1', 'Bash', {})], 's1', evt('s1', '', {})), -1, '事件无工具名 → 不命中')
  eq(findPermissionToResolve([perm('s1', 'Bash', null)], 's1', {}), -1, '事件缺字段 → 不命中')
  eq(findPermissionToResolve([perm('s1', 'Bash', null)], 's1', evt('s1', 'Bash', null)), 0, '入参都为 null → 命中（null 归一化）')
}

console.log('\npermissionContentSignature:')
eq(permissionContentSignature(undefined), 'null', 'undefined → null 占位')
eq(permissionContentSignature([1, 'x']), '[1,"x"]', '数组保序')

if (failures) { console.error(`${failures} 失败`); process.exit(1) }
console.log('全部通过')
