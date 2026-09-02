// test-cooling.mjs — cooling 模块单测（纯 node，无新依赖、无 loader hook）
//
// 纯函数直测；编排逻辑经 setCoolingTestHooks 注入假 runner + 缩短时长跑完整周期。
// 铁律：真实 runner 会改系统电源设置（powercfg setacvalueindex），绝不能在单测里跑真命令；
// before-quit 同步恢复（cancelCooling → execFileSync）与崩溃残留恢复（recoverCoolingResidue
// → execFileSync）走真命令，不进单测，由 dev 手动验证覆盖。
//
// 运行：node --experimental-strip-types test-cooling.mjs
import { mkdtempSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

let fails = 0
function eq(actual, expected, msg) {
  const a = JSON.stringify(actual)
  const e = JSON.stringify(expected)
  if (a !== e) {
    fails++
    console.error(`✗ ${msg}\n  actual:   ${a}\n  expected: ${e}`)
  } else {
    console.log(`✓ ${msg}`)
  }
}
function ok(cond, msg) {
  if (!cond) { fails++; console.error(`✗ ${msg}`) } else { console.log(`✓ ${msg}`) }
}
// 温度值经 0.1K 换算含二进制浮点误差，用容差断言（函数自身保留 1 位小数，容差 0.11）
function near(actual, expected, msg, eps = 0.11) {
  ok(actual !== null && Math.abs(actual - expected) <= eps, `${msg} (got ${actual}, want ${expected})`)
}
const sleep = (ms) => new Promise(r => setTimeout(r, ms))

const {
  parseThrottleMax, kelvinToCelsius, pickMaxZoneTemp, pickMaxPerfCounterTemp, parseActiveScheme,
  parseUsageLine,
  setCoolingLogger, setCoolingDataDir, setCoolingTestHooks, startCooling,
} = await import('./electron/main/cooling.ts')

// 与 powercfg 真实输出同构的样本
const SCHEME_GUID = '381b4222-f694-41f0-9685-ff5bb260df2e'
const GET_SCHEME_SAMPLE = `Power Scheme GUID: ${SCHEME_GUID}  (Balanced)`
// 英文 /q 输出（AC=100% DC=90%；"可能的设置单位"行为 %，不带 hex——真实如此）
const Q_SAMPLE = [
  `Power Scheme GUID: ${SCHEME_GUID}  (Balanced)`,
  '  Subgroup GUID: 54533251-82be-4824-96c1-47b60b740d00  (Processor power management)',
  '    Power Setting GUID: bc5038f7-23e0-4960-96da-33abaf5935ec  (Maximum processor state)',
  '      Minimum Possible Setting: 0x00000000',
  '      Maximum Possible Setting: 0x00000064',
  '      Possible Settings increment: 0x00000001',
  '      Possible Settings units: %',
  '    Current AC Power Setting Index: 0x00000064',
  '    Current DC Power Setting Index: 0x0000005a',
].join('\n')
// 中文 /q 输出（标签行本地化，实测如此；utf8 环境下关键词路径生效）
const Q_SAMPLE_ZH = [
  `电源计划 GUID: ${SCHEME_GUID}  (平衡)`,
  '  子组 GUID: 54533251-82be-4824-96c1-47b60b740d00  (处理器电源管理)',
  '    电源设置 GUID: bc5038f7-23e0-4960-96da-33abaf5935ec  (最大处理器状态)',
  '      最小可能的设置: 0x00000000',
  '      最大可能的设置: 0x00000064',
  '      可能的设置增量: 0x00000001',
  '      可能的设置单位: %',
  '    当前交流电源设置索引: 0x00000064',
  '    当前直流电源设置索引: 0x0000005a',
].join('\n')
// 第三语言（德语无 AC/DC/交流/直流 字样）→ 关键词失配，按位置兜底
const Q_SAMPLE_DE = [
  `Leistungsschema-GUID: ${SCHEME_GUID}`,
  '      Mindestens moegliche Einstellung: 0x00000000',
  '      Hoechstmogliche Einstellung: 0x00000064',
  '    Aktuelle Netzbetrieb-Einstellung: 0x00000063',
  '    Aktuelle Akkubetrieb-Einstellung: 0x0000005a',
].join('\n')

console.log('cooling 纯函数单测:')

// --- parseThrottleMax ---
{
  const r = parseThrottleMax(Q_SAMPLE)
  ok(r !== null, '英文 powercfg /q 输出可解析')
  eq(r.ac, 100, 'AC 0x64 → 100')
  eq(r.dc, 90, 'DC 0x5a → 90')

  const rz = parseThrottleMax(Q_SAMPLE_ZH)
  ok(rz !== null && rz.ac === 100 && rz.dc === 90, '中文标签输出（当前交流/直流…）同样可解析')

  const rd = parseThrottleMax(Q_SAMPLE_DE)
  ok(rd !== null && rd.ac === 99 && rd.dc === 90, '第三语言关键词失配 → 按位置兜底（末两行 hex）')

  const acOnly = parseThrottleMax('    Current AC Power Setting Index: 0x00000000')
  ok(acOnly !== null && acOnly.ac === 0 && acOnly.dc === null, '仅 AC 行 → dc=null，0x0 → 0')

  eq(parseThrottleMax(''), null, '空输出 → null')
  // 模拟中文 Windows GBK→utf8 乱码：关键词失配 + GUID 行无尾随 hex → null
  eq(parseThrottleMax(`电源计划 GUID: ${SCHEME_GUID}  (��)`), null, '无任何 hex 行 → null')
}

// --- kelvinToCelsius ---
{
  near(kelvinToCelsius(3010), 27.9, '3010×0.1K ≈ 27.9℃')
  near(kelvinToCelsius(2960), 22.9, '2960×0.1K ≈ 22.9℃')
  eq(kelvinToCelsius(0), null, '0 → null')
  eq(kelvinToCelsius(-5), null, '负数 → null')
  eq(kelvinToCelsius(2500), null, '250K(-23℃) 物理不合理 → null')
  eq(kelvinToCelsius(3932), null, '3932(120.05℃) 超上限 → null')
  near(kelvinToCelsius(3931), 120, '3931(119.95℃) 仍在范围内')
  eq(kelvinToCelsius(NaN), null, 'NaN → null')
}

// --- pickMaxZoneTemp（MSAcpi 主路径，严格 0.1K） ---
{
  near(pickMaxZoneTemp('3002\n3010\n\nxxxx\n'), 27.9, '多热区取最大有效值')
  near(pickMaxZoneTemp('2960'), 22.9, '单行解析')
  eq(pickMaxZoneTemp(''), null, '空输出 → null')
  eq(pickMaxZoneTemp('garbage\nnothing'), null, '全无效行 → null')
  eq(pickMaxZoneTemp('340'), null, '340(文档单位下 34K) 荒谬 → null（perf 计数器走阶梯解析）')
}

// --- pickMaxPerfCounterTemp（fallback 计数器，单位阶梯：0.1K → ℃ → K） ---
{
  near(pickMaxPerfCounterTemp('340'), 66.9, '340：0.1K 荒谬 → 开尔文解释 66.9℃')
  eq(pickMaxPerfCounterTemp('34'), 34, '34：开尔文太低 → 摄氏度解释 34℃')
  near(pickMaxPerfCounterTemp('3010'), 27.9, '3010：先按文档单位 0.1K → 27.9℃')
  near(pickMaxPerfCounterTemp('300'), 26.9, '300：开尔文解释 26.9℃')
  near(pickMaxPerfCounterTemp('340\n34\n'), 66.9, '多行取最大有效值')
  eq(pickMaxPerfCounterTemp(''), null, '空输出 → null')
  eq(pickMaxPerfCounterTemp('garbage'), null, '全无效行 → null')
}

// --- parseActiveScheme ---
{
  eq(parseActiveScheme('电源计划 GUID: 381B4222-F694-41F0-9685-FF5BB260DF2E  (平衡)'),
     '381b4222-f694-41f0-9685-ff5bb260df2e', 'GUID 提取并小写化')
  eq(parseActiveScheme('Power Scheme GUID: AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE  (Balanced)'),
     'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', '英文输出同样可解析')
  eq(parseActiveScheme('no guid here'), null, '无 GUID → null')
  eq(parseActiveScheme(''), null, '空输出 → null')
}

// --- parseUsageLine ---
{
  const r = parseUsageLine('CPU=23;MEM=57;DISK=112;GPU=34')
  ok(r !== null, '标准占用率输出可解析')
  eq(r.cpu, 23, 'CPU 23')
  eq(r.mem, 57, '内存 57')
  eq(r.disk, 100, '磁盘 112 超百 → 钳到 100')
  eq(r.gpu, 34, 'GPU 34')

  const noGpu = parseUsageLine('CPU=15;MEM=40;DISK=5;GPU=')
  ok(noGpu !== null && noGpu.gpu === null, 'GPU 空串（无 nvidia-smi）→ null')

  eq(parseUsageLine('garbage'), null, '不匹配 → null')
  eq(parseUsageLine(''), null, '空输出 → null')
}

// ==================== 编排逻辑（假 runner + 缩短时长） ====================

console.log('cooling 编排单测（假 runner + 250ms 时长）:')

const dir = mkdtempSync(join(tmpdir(), 'cooling-test-'))
setCoolingDataDir(dir)
setCoolingLogger({ info: () => {}, warn: () => {}, error: () => {} })

const psCalls = []
const pcCalls = []
setCoolingTestHooks({
  durationMs: 250,
  runners: {
    runPowercfg: async (args) => {
      pcCalls.push(args)
      if (args[0] === '/q') return Q_SAMPLE
      if (args[0] === '/getactivescheme') return GET_SCHEME_SAMPLE
      return 'ok'
    },
    runPowerShell: async (script) => {
      psCalls.push(script)
      if (script.includes('ACPIDriver')) {
        // Uniwill ECRAM 通道（含 probe/apply/restore——probe 无 ORIG/BOOSTED/NOW 输出）
        if (script.includes('ORIG=')) return 'ORIG=0;BOOSTED=64;NOW=64' // apply：原 0 → OR 0x40 = 64 生效
        if (script.includes('NOW=')) return 'NOW=0'                     // restore：写回 0
        return 'OK'                                                     // probe：设备在场 + 0x751/0x75B 可读
      }
      if (script.includes('Win32_Processor')) return 'CPU=23;MEM=57;DISK=12;GPU=34' // 占用率采样
      if (script.includes('CimClass')) {
        // 探测：联想类存在且方法齐全；华硕类不存在（模拟 throw → 不支持）
        if (script.includes('LENOVO_GAMEZONE_DATA')) return 'GetSmartFanMode,SetSmartFanMode'
        throw new Error('not found')
      }
      if (script.includes('MSAcpi_ThermalZoneTemperature')) return '3010\n3002\n'
      if (script.includes('GetSmartFanMode')) return 'ORIG=1;NOW=2' // 原模式 1 → 全速 2 读回一致
      return ''
    },
  },
})

// 跑一轮完整周期：start → 收集状态 → done 到达（超时兜底不断言失败原因，只 ok）
async function runCycle() {
  const statuses = []
  const doneP = new Promise((resolve) => {
    const started = startCooling((s) => {
      statuses.push(s)
      if (s.phase === 'done') resolve()
    })
    ok(started, '启动返回 true')
    if (!started) process.exit(1)
  })
  await Promise.race([doneP, sleep(5000)])
  ok(statuses.some(s => s.phase === 'done'), 'done 在超时前到达')
  return statuses
}

// --- 周期 1：完整 start → done ---
{
  const statusesPromise = runCycle()
  // startCooling 同步置 active，随后的重入调用必须被拒（不能重置计时）
  eq(startCooling(() => {}), false, '散热中再次启动被拒绝（防重入）')
  const statuses = await statusesPromise

  const init = statuses[0]
  ok(init.remainSec >= 1, '初始倒计时 ≥ 1s')
  eq(init.levers, { fan: false, power: false }, '初始两档杠杆均未生效')
  eq(init.tempC, null, '初始温度尚未读出')

  const done = statuses[statuses.length - 1]
  eq(done.phase, 'done', '最终状态为 done')
  near(done.tempBefore, 27.9, '起始温度（多热区最大 3010）')
  near(done.tempAfter, 27.9, '结束温度')
  eq(done.levers, { fan: true, power: true }, '两档杠杆均生效（假 runner 均支持）')

  // 功耗限制确实下发过 50%，且恢复写回了原值 100 / DC 90
  ok(pcCalls.some(a => a[0] === '/setacvalueindex' && a[4] === '50'), '散热期 PROCTHROTTLEMAX=50 下发')
  ok(pcCalls.some(a => a[0] === '/setacvalueindex' && a[4] === '100'), '恢复写回 AC 原值 100')
  ok(pcCalls.some(a => a[0] === '/setdcvalueindex' && a[4] === '90'), '恢复写回 DC 原值 90')
  ok(pcCalls.filter(a => a[0] === '/setactive').length >= 2, 'apply 与 restore 各 setactive 一次')

  // Uniwill ECRAM 风扇杠杆：BOOST 位按厂商读-改-写（OR 0x40）下发 + 恢复写回原值
  ok(psCalls.some(s => s.includes('-bor 64') && s.includes('1873')), '散热期 ECRAM 0x751 OR 0x40（风扇 BOOST）下发')
  ok(psCalls.some(s => s.includes('UwW 1873 0') && !s.includes('-bor')), '恢复写回 0x751 原值 0')

  // 占用率采样进入状态推送
  const doneUsage = done.usage
  eq(doneUsage.cpu, 23, 'done 状态携带 CPU 占用')
  eq(doneUsage.gpu, 34, 'done 状态携带 GPU 占用')

  ok(!existsSync(join(dir, 'cooling-state.json')), '结束后崩溃残留状态文件已删除')
}

// --- 周期 2：done 后可再次启动（restoring → idle 转换正确）+ 能力缓存免重探 ---
{
  const probesBefore = psCalls.filter(s => s.includes('CimClass')).length
  ok(probesBefore >= 1, '首轮探测过厂商能力')
  const uniProbesBefore = psCalls.filter(s => s.includes('ACPIDriver') && !s.includes('ORIG=') && !s.includes('NOW=')).length
  ok(uniProbesBefore >= 1, '首轮探测过 Uniwill 设备')

  const statuses = []
  const doneP = new Promise((resolve) => {
    const okStart = startCooling((s) => {
      statuses.push(s)
      if (s.phase === 'done') resolve()
    })
    eq(okStart, true, 'done 后可再次启动（状态机回到 idle）')
    if (!okStart) process.exit(1)
  })
  // 假 runner 在微任务内即时落定：稍候片刻杠杆已生效，中途状态文件应在场
  await sleep(80)
  ok(existsSync(join(dir, 'cooling-state.json')), '散热中途崩溃残留状态文件在场')
  await Promise.race([doneP, sleep(5000)])
  ok(statuses.some(s => s.phase === 'done'), '周期 2 done 到达')

  const probesAfter = psCalls.filter(s => s.includes('CimClass')).length
  eq(probesAfter, probesBefore, '能力缓存生效：第二轮未重新探测厂商 WMI')
  const uniProbesAfter = psCalls.filter(s => s.includes('ACPIDriver') && !s.includes('ORIG=') && !s.includes('NOW=')).length
  eq(uniProbesAfter, uniProbesBefore, 'Uniwill 探测同样走缓存')
  ok(!existsSync(join(dir, 'cooling-state.json')), '第二轮结束状态文件再次清理')
}

rmSync(dir, { recursive: true, force: true })

if (fails) { console.error(`\n${fails} failure(s)`); process.exit(1) }
console.log('\nALL PASS')
