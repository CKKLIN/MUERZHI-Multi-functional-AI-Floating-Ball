// conversion-registry 单测（纯 node，无新依赖、无 loader hook）
//
// 注册表本身零外部依赖（日志通过 setRegistryLogger 注入），所以可直接 import。
// .ts 由 Node 的 --experimental-strip-types 处理。
//
// 运行：node --experimental-strip-types test-conversion-registry.mjs

let failures = 0
function assert(cond, msg) {
  if (cond) { console.log('  ✓', msg) }
  else { console.error('  ✗', msg); failures++ }
}
function eq(actual, expected, msg) { assert(actual === expected, `${msg} (got ${actual}, expected ${expected})`) }

const { registerConversion, unregisterConversion, killAllConversions, activeConversionCount } =
  await import('./electron/main/conversion-registry.ts')

console.log('conversion-registry 单测:')

const id1 = registerConversion(() => {})
eq(activeConversionCount(), 1, '注册一个任务后计数为 1')

unregisterConversion(id1)
eq(activeConversionCount(), 0, '注销后计数为 0')

let killedA = 0, killedB = 0
registerConversion(() => { killedA++ })
registerConversion(() => { killedB++ })
const n = killAllConversions()
eq(n, 2, 'killAll 返回被 kill 的任务数 2')
eq(killedA, 1, '任务 A 的 kill 被调用一次')
eq(killedB, 1, '任务 B 的 kill 被调用一次')
eq(activeConversionCount(), 0, 'killAll 后注册表清空')

let called = 0
registerConversion(() => { called++; throw new Error('already dead') })
const n2 = killAllConversions()
eq(n2, 1, 'kill 仍计入返回数即使抛异常')
eq(called, 1, '抛异常的 kill 仍被调用')
eq(activeConversionCount(), 0, '异常后注册表仍清空')

unregisterConversion('nope')
eq(activeConversionCount(), 0, '注销不存在的 id 静默忽略')

eq(killAllConversions(), 0, '空表 killAll 返回 0')

if (failures === 0) { console.log('\n全部通过 ✓'); process.exit(0) }
else { console.error(`\n${failures} 个断言失败`); process.exit(1) }
