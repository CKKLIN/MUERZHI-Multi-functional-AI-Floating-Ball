// cooling.ts —— 悬浮球右键"散热模式"（10 秒）编排核心
//
// Windows 没有公开的通用风扇控制 API（风扇由主板 EC/BIOS 按温度自主调速），应用层想真正
// 动风扇只有厂商专用 WMI（少数机型 + 需厂商驱动/服务在场）或内核驱动直写 EC（杀软拦截 +
// 硬件风险，不随应用分发）。因此本模块按"三档杠杆逐级降级 + UI 文案如实汇报"设计：
//   1. 厂商 WMI 风扇控制 —— 运行时探测（能力缓存 7 天），支持才启用，任何一步失败即放弃
//   2. powercfg 限 CPU 最大频率 —— 全机型真实降温（减热 → 温度实降），10s 后恢复原值
//   3. ACPI 热区温度监测 —— 保底永远可用（读不到则 UI 显示"温度未知"）
// 风扇不受控的机器 UI 显示"功耗散热中"，绝不谎称"风扇已启动"。
//
// 可脱离 Electron 单测：纯函数零依赖；userData 经 setCoolingDataDir 注入（electron 下懒
// require 取）；外部命令执行器经 setCoolingTestHooks 注入假实现——真实 runner 会改系统
// 电源设置，绝不能在单测中执行真命令。遵循 conversion-registry / todo-store 范式。

import { execFile, execFileSync } from 'node:child_process'
import * as fs from 'node:fs'
import { join } from 'node:path'

// === 类型 ===

export interface CoolingLevers {
  /** 厂商 WMI 风扇控制是否已生效 */
  fan: boolean
  /** powercfg 功耗限制是否已生效 */
  power: boolean
}

/** 推给 UI（cooling-overlay 面板 / 悬浮球动画）的状态。tempC=null 表示温度不可读。 */
export interface CoolingStatus {
  phase: 'active' | 'done'
  remainSec: number
  tempC: number | null
  usage: UsageSample
  levers: CoolingLevers
  tempBefore: number | null
  tempAfter: number | null
}

export type CoolingLogger = {
  info: (...a: unknown[]) => void
  warn: (...a: unknown[]) => void
  error: (...a: unknown[]) => void
}

// === 注入点 ===

let logger: CoolingLogger = { info: () => {}, warn: () => {}, error: () => {} }
export function setCoolingLogger(l: CoolingLogger): void {
  logger = l
}

function msg(e: unknown): string {
  return (e as Error)?.message ?? String(e)
}

// 数据目录：单测注入覆盖；electron 下懒 require 取 userData（同 todo-store.ts）
let dataDirOverride: string | null = null
export function setCoolingDataDir(dir: string): void {
  dataDirOverride = dir
}
function dataDir(): string | null {
  if (dataDirOverride) return dataDirOverride
  try {
    // 懒加载 electron，避免纯 node 单测被 import 拖累
    const { app } = require('electron') as typeof import('electron')
    return app.getPath('userData')
  } catch {
    return null
  }
}

/** 外部命令执行器：生产为真实 powercfg / powershell；单测注入假实现。 */
export interface CoolingRunners {
  runPowercfg: (args: string[], timeoutMs?: number) => Promise<string>
  runPowerShell: (script: string, timeoutMs?: number) => Promise<string>
}

let runnerOverride: Partial<CoolingRunners> | null = null
/** 散热时长可注入（单测缩短到几百 ms；生产恒 10s）。 */
let durationOverrideMs: number | null = null
export function setCoolingTestHooks(h: { runners?: Partial<CoolingRunners>; durationMs?: number }): void {
  if (h.runners !== undefined) runnerOverride = h.runners
  if (h.durationMs !== undefined) durationOverrideMs = h.durationMs
}

function durationMs(): number {
  return durationOverrideMs ?? COOLING_DURATION_MS
}

function realRunPowercfg(args: string[], timeoutMs = 4000): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile('powercfg', args, { timeout: timeoutMs, windowsHide: true, encoding: 'utf8' }, (err, stdout) => {
      if (err) reject(err)
      else resolve(stdout)
    })
  })
}

/** 把脚本编码为 -EncodedCommand 参数（base64 UTF-16LE）。为什么不用 -Command：
 *  Node execFile 会把参数里的 `"` 转义成 `\"` 传命令行，PS 5.1 对 `\"` 的解析有坑
 *  （"字符串缺少终止符"）——含 Add-Type C# 引号的复杂载荷必须走 EncodedCommand。 */
function toEncodedCommand(script: string): string {
  return Buffer.from(script, 'utf16le').toString('base64')
}

function realRunPowerShell(script: string, timeoutMs = 4000): Promise<string> {
  return new Promise((resolve, reject) => {
    // -NoProfile 防用户 profile 拖慢/污染输出；-NonInteractive 防任何交互等待挂到超时；
    // windowsHide 防主进程（GUI）起控制台子进程时闪黑框
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-EncodedCommand', toEncodedCommand(script)],
      { timeout: timeoutMs, windowsHide: true, encoding: 'utf8' },
      (err, stdout) => {
        if (err) reject(err)
        else resolve(stdout)
      }
    )
  })
}

const runners: CoolingRunners = {
  runPowercfg: (a, t) => (runnerOverride?.runPowercfg ? runnerOverride.runPowercfg(a, t) : realRunPowercfg(a, t)),
  runPowerShell: (s, t) => (runnerOverride?.runPowerShell ? runnerOverride.runPowerShell(s, t) : realRunPowerShell(s, t)),
}

// === 纯函数（单测目标） ===

/** 解析 powercfg /q <guid> SUB_PROCESSOR PROCTHROTTLEMAX 输出中的当前 AC/DC 值。
 *  关键：标签行随系统语言本地化（中文 Windows 是"当前交流/直流电源设置索引"，不是英文），
 *  不能只按英文匹配。分两级：
 *  ① 中/英关键词（覆盖绝大多数用户）；② 按位置兜底——/q 输出结构固定，末两行带 0x 尾值
 *  的行恒为 AC、DC（"可能的设置单位"行为 %，不带 hex）。GUID 与十六进制均为 ASCII，
 *  其余本地化文案即使乱码也不影响（utf8 解码 GBK 只坏中文段）。 */
export function parseThrottleMax(stdout: string): { ac: number; dc: number | null } | null {
  // ① 关键词匹配：AC/DC 行各含其关键词 + 行尾 hex（en: "Current AC Power Setting Index: 0x64"
  //    zh: "当前交流电源设置索引: 0x64"）
  const acKw = stdout.match(/(?:AC|交流)[^\r\n]*?(0x[0-9a-fA-F]+)\s*$/im)
  if (acKw) {
    const dcKw = stdout.match(/(?:DC|直流)[^\r\n]*?(0x[0-9a-fA-F]+)\s*$/im)
    return { ac: parseInt(acKw[1], 16), dc: dcKw ? parseInt(dcKw[1], 16) : null }
  }
  // ② 位置兜底（其他语言）：末两行带 0x 尾值的行恒为 AC、DC
  const vals: number[] = []
  for (const line of stdout.split(/\r?\n/)) {
    const m = line.trim().match(/(0x[0-9a-fA-F]+)$/)
    if (m) vals.push(parseInt(m[1], 16))
  }
  if (vals.length < 2) return null
  return { ac: vals[vals.length - 2], dc: vals[vals.length - 1] }
}

/** ACPI CurrentTemperature 单位 0.1K → ℃，保留 1 位小数。超出物理合理范围（<0 / >120℃）
 *  视为无效读数——热区空闲/未就绪时常吐 ~2732（≈0℃）之类的占位值。 */
export function kelvinToCelsius(rawTenthsKelvin: number): number | null {
  if (!Number.isFinite(rawTenthsKelvin) || rawTenthsKelvin <= 0) return null
  const c = rawTenthsKelvin / 10 - 273.15
  if (c < 0 || c > 120) return null
  return Math.round(c * 10) / 10
}

/** 温度命令输出（每行一个 0.1K 整数，可能多个热区）取最大有效值；全无效 → null。 */
export function pickMaxZoneTemp(stdout: string): number | null {
  let best: number | null = null
  for (const line of stdout.split(/\r?\n/)) {
    const m = line.trim().match(/^(\d+)$/)
    if (!m) continue
    const c = kelvinToCelsius(parseInt(m[1], 10))
    if (c !== null && (best === null || c > best)) best = c
  }
  return best
}

// === 占用率采样（散热面板显示 CPU/GPU/磁盘/内存） ===

export interface UsageSample {
  cpu: number | null
  gpu: number | null
  disk: number | null
  mem: number | null
}

/** 一次 PowerShell 采齐四项：CPU 平均负载、物理内存占用、磁盘活动时间%（_Total）、
 *  GPU 利用率（有 nvidia-smi 才有值，否则空串）。CIM formatted data 免采样等待。 */
const USAGE_POLL_PS =
  `$ErrorActionPreference='Stop';` +
  `$cpu=[int]((Get-CimInstance Win32_Processor | Measure-Object -Property LoadPercentage -Average).Average);` +
  `$os=Get-CimInstance Win32_OperatingSystem;` +
  `$mem=[int]((1-$os.FreePhysicalMemory/$os.TotalVisibleMemorySize)*100);` +
  `$disk=(Get-CimInstance Win32_PerfFormattedData_PerfDisk_PhysicalDisk | ` +
  `Where-Object {$_.Name -eq '_Total'} | Select-Object -First 1).PercentDiskTime;` +
  `$smi=Join-Path $env:windir 'System32\\nvidia-smi.exe';` +
  `$gpu='';` +
  `if(Test-Path $smi){$gpu=(& $smi --query-gpu=utilization.gpu --format=csv,noheader,nounits | Select-Object -First 1)};` +
  `Write-Output "CPU=$cpu;MEM=$mem;DISK=$disk;GPU=$gpu"`

/** 解析 USAGE_POLL_PS 的输出行。GPU 空串 = 无 nvidia-smi → null；磁盘 >100 钳到 100
 *  （PercentDiskTime 多盘聚合可能超百）。整体不匹配 → null。 */
export function parseUsageLine(stdout: string): UsageSample | null {
  const m = stdout.match(/CPU=(\d+);MEM=(\d+);DISK=(\d+);GPU=(\d*)/)
  if (!m) return null
  return {
    cpu: parseInt(m[1], 10),
    mem: parseInt(m[2], 10),
    disk: Math.min(100, parseInt(m[3], 10)),
    gpu: m[4] === '' ? null : parseInt(m[4], 10),
  }
}

/** Win32_PerfFormattedData_Counters_ThermalZoneInformation 的 Temperature 专用解析。
 *  文档单位是 0.1K，但各机型实现混乱（实测有 340 这类值——340×0.1K=34K 显然荒谬，
 *  只能是 340K≈67℃ 或 340×0.1℃=34℃）。按可信度阶梯逐级解释，取第一个物理合理的：
 *  ① 0.1K（文档单位，值 ≥2732 才可能）② 摄氏度 ③ 开尔文。
 *  单位猜错的代价可接受：前后两次读数用同一把尺，温差趋势仍然如实。 */
export function pickMaxPerfCounterTemp(stdout: string): number | null {
  let best: number | null = null
  for (const line of stdout.split(/\r?\n/)) {
    const m = line.trim().match(/^(\d+)$/)
    if (!m) continue
    const v = parseInt(m[1], 10)
    let c: number | null = kelvinToCelsius(v) // ① 0.1K
    if (c === null && v >= 0 && v <= 120) c = v // ② 摄氏度
    if (c === null && v >= 273 && v <= 393) c = Math.round((v - 273.15) * 10) / 10 // ③ 开尔文
    if (c !== null && (best === null || c > best)) best = c
  }
  return best
}

/** 从 powercfg /getactivescheme 输出提取活动 scheme GUID（统一小写便于比较）。 */
export function parseActiveScheme(stdout: string): string | null {
  const m = stdout.match(/([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})/)
  return m ? m[1].toLowerCase() : null
}

// === 功耗杠杆（powercfg） ===

/** 散热期 CPU 最大频率百分比。50% 温和够用（发热大致减半），风扇自然随之回落；
 *  若想更激进降温可调低，但代价是散热期间系统明显卡顿。 */
const COOLING_THROTTLE_PCT = 50

/** 散热总时长。悬浮球的花瓣旋转动画时长与此对齐（CSS 变量由 setCoolingVisual 传入）。 */
const COOLING_DURATION_MS = 20_000

interface PowerLeverState {
  schemeGuid: string
  acOrig: number
  dcOrig: number | null
}
let powerState: PowerLeverState | null = null

/** 启用功耗杠杆。成功 = 已把活动 scheme 的 PROCTHROTTLEMAX 降到 COOLING_THROTTLE_PCT。
 *  任一步失败都返回 false（跳过该杠杆），主流程不中断。 */
async function applyPowerLever(token: number): Promise<boolean> {
  try {
    const schemeOut = await runners.runPowercfg(['/getactivescheme'])
    const guid = parseActiveScheme(schemeOut)
    if (!guid) {
      logger.warn('[Cooling] active scheme GUID not parsed, skip power lever')
      return false
    }
    const qOut = await runners.runPowercfg(['/q', guid, 'SUB_PROCESSOR', 'PROCTHROTTLEMAX'])
    const orig = parseThrottleMax(qOut)
    if (!orig) {
      logger.warn('[Cooling] PROCTHROTTLEMAX query unparsed, skip power lever')
      return false
    }
    const pct = String(COOLING_THROTTLE_PCT)
    await runners.runPowercfg(['/setacvalueindex', guid, 'SUB_PROCESSOR', 'PROCTHROTTLEMAX', pct])
    // DC（电池）值尽力写：台式机无电池时可能报错，单独吞掉不拖累 AC
    try {
      await runners.runPowercfg(['/setdcvalueindex', guid, 'SUB_PROCESSOR', 'PROCTHROTTLEMAX', pct])
    } catch (e) {
      logger.warn('[Cooling] setdcvalueindex failed (desktop without battery?):', msg(e))
    }
    await runners.runPowercfg(['/setactive', guid])
    if (token !== restoreToken || phase !== 'active') {
      // 收尾/退出已在进行：立即回滚本次写入，不留 50% 上限的中间态
      await restorePowerLeverInternal({ schemeGuid: guid, acOrig: orig.ac, dcOrig: orig.dc })
      return false
    }
    powerState = { schemeGuid: guid, acOrig: orig.ac, dcOrig: orig.dc }
    writeStateFile()
    logger.info(`[Cooling] power lever ON: ${guid} PROCTHROTTLEMAX -> ${COOLING_THROTTLE_PCT}% (was AC=${orig.ac}, DC=${orig.dc})`)
    return true
  } catch (e) {
    // 常见于权限不足（个别系统策略禁止标准用户改 power scheme）——如实跳过即可
    logger.warn('[Cooling] power lever unavailable:', msg(e))
    return false
  }
}

/** 恢复功耗：写回原值；仅当记录的 scheme 仍是活动 scheme 时才 /setactive 刷新生效。
 *  为什么不无条件 /setactive：散热期间用户可能切了电源计划，强切回去是二次打扰；
 *  非活动 scheme 写值本身即持久化，等它再次激活时自然生效。 */
async function restorePowerLeverInternal(st: PowerLeverState): Promise<void> {
  try {
    await runners.runPowercfg(['/setacvalueindex', st.schemeGuid, 'SUB_PROCESSOR', 'PROCTHROTTLEMAX', String(st.acOrig)])
    if (st.dcOrig !== null) {
      try {
        await runners.runPowercfg(['/setdcvalueindex', st.schemeGuid, 'SUB_PROCESSOR', 'PROCTHROTTLEMAX', String(st.dcOrig)])
      } catch {
        /* 同 apply：无电池机器尽力而为 */
      }
    }
    const out = await runners.runPowercfg(['/getactivescheme'])
    if (parseActiveScheme(out) === st.schemeGuid) {
      await runners.runPowercfg(['/setactive', st.schemeGuid])
    }
    logger.info('[Cooling] power lever restored')
  } catch (e) {
    // 恢复失败比失败启用严重得多——错误级日志 + 给出人工核查命令
    logger.error('[Cooling] power restore FAILED (check manually: powercfg /q SCHEME_CURRENT SUB_PROCESSOR PROCTHROTTLEMAX):', msg(e))
  }
}

async function restorePowerLever(): Promise<void> {
  const st = powerState
  powerState = null
  if (st) await restorePowerLeverInternal(st)
}

/** before-quit 用的同步尽力恢复：退出路径不能 await，execFileSync 短超时逐条执行。
 *  每条独立 try——最坏拖慢退出几秒，好过留下 50% 频率上限的残留。 */
function restorePowerLeverSync(st: PowerLeverState): void {
  const opts = { timeout: 3000, windowsHide: true, stdio: 'ignore' as const }
  try {
    execFileSync('powercfg', ['/setacvalueindex', st.schemeGuid, 'SUB_PROCESSOR', 'PROCTHROTTLEMAX', String(st.acOrig)], opts)
  } catch (e) {
    logger.warn('[Cooling] sync AC restore failed:', msg(e))
  }
  if (st.dcOrig !== null) {
    try {
      execFileSync('powercfg', ['/setdcvalueindex', st.schemeGuid, 'SUB_PROCESSOR', 'PROCTHROTTLEMAX', String(st.dcOrig)], opts)
    } catch {
      /* 无电池机器尽力而为 */
    }
  }
  try {
    const out = execFileSync('powercfg', ['/getactivescheme'], { timeout: 3000, windowsHide: true, encoding: 'utf8' })
    if (parseActiveScheme(out) === st.schemeGuid) {
      execFileSync('powercfg', ['/setactive', st.schemeGuid], opts)
    }
    logger.info('[Cooling] power lever restored (sync, quit path)')
  } catch {
    /* setactive 只是让恢复即时生效；值已写回，失败可容忍 */
  }
}

// === 厂商风扇杠杆 ===
// 每家协议不同且需厂商驱动/服务在场；统一"探测 → 应用 → 读回验证 → 恢复"防御式封装，
// 任何一步失败即放弃该杠杆（不影响功耗杠杆与温度监测）。签名置信度见各项注释，
// 数值参数全部集中在常量——真机校正只改这里。

/** 联想 Legion 智能风扇：root/wmi LENOVO_GAMEZONE_DATA 的 Get/SetSmartFanMode。
 *  类名/方法名可信度高（社区 Legion 工具广泛使用）；mode 数值语义随机型有出入，
 *  2（野兽/性能）为最常见映射。用读回验证保证"确实生效"才认账，否则自动回滚。 */
const LENOVO_CLASS = 'LENOVO_GAMEZONE_DATA'
const LENOVO_FULL_MODE = 2

// --- Uniwill ECRAM 风扇控制（机械革命/同方/七彩虹等 Uniwill ODM 机型） ---
// 来源：对出厂"电竞控制台"（GCUService.exe，MyFanManager_RamFan1p5 系）的 IL 逆向 + 本机实测：
// - 设备：\\.\ACPIDriver（UWACPIDriver.sys，ACPI\INOU0000，出厂自带、standard user 可开）
// - 通道：IOCTL_GPD_ACPI_ECREAD/ECWRITE（0x9C40A488/8C），输入为 int[]{addr} / int[]{addr,val}
// - 控制：ECRAM 0x751 的 bit6(0x40) = 风扇 BOOST——置位后 EC 固件自行把双风扇 duty 拉满
//   （实测 duty 65→200、RPM 明显上升），清零即回自动曲线。与厂商 SetFanMode(BOOST) 完全一致。
// 注意：0-255 的旧 EC 页里 0xDF 等是只读镜像，直写无效——必须走 16 位 ECRAM 地址。
const UNIWILL_ECRAM_FAN_CTL = 0x751
const UNIWILL_FAN_BOOST_BITS = 0x40

// 公共前缀：打开设备 + 定义 ECRAM 读写函数（R/W 参数为 16 位 ECRAM 地址）
const UNIWILL_PS_PREAMBLE =
  `$ErrorActionPreference='Stop';` +
  `Add-Type -TypeDefinition 'using System;using System.Runtime.InteropServices;public class UWC{` +
  `[DllImport("kernel32",SetLastError=true,CharSet=CharSet.Ansi)]public static extern IntPtr CreateFile(string n,uint a,uint s,IntPtr sa,uint d,uint f,IntPtr t);` +
  `[DllImport("kernel32",SetLastError=true)]public static extern bool DeviceIoControl(IntPtr h,uint c,byte[] i,uint n,byte[] o,uint osz,out uint r,IntPtr ov);}';` +
  `;$h=[UWC]::CreateFile('\\\\.\\ACPIDriver',[uint32]3221225472,[uint32]3,[IntPtr]::Zero,[uint32]3,[uint32]0,[IntPtr]::Zero);` +
  `if($h -eq [IntPtr](-1) -or $h -eq [IntPtr]::Zero){throw 'no UWACPIDriver device'};` +
  `function UwR($reg){$o=New-Object byte[] 4;$n=[uint32]0;[void][UWC]::DeviceIoControl($h,[uint32]'0x9C40A488',[BitConverter]::GetBytes([int]$reg),4,$o,4,[ref]$n,[IntPtr]::Zero);return [BitConverter]::ToInt32($o,0)};` +
  // 函数名不用单字母：PS 内建别名 r=Invoke-History 会截胡（"R 1873"变成回滚历史）
  `function UwW($reg,$val){$b=New-Object byte[] 8;[BitConverter]::GetBytes([int]$reg).CopyTo($b,0);[BitConverter]::GetBytes([int]$val).CopyTo($b,4);$o=New-Object byte[] 4;$n=[uint32]0;return [UWC]::DeviceIoControl($h,[uint32]'0x9C40A48C',$b,8,$o,4,[ref]$n,[IntPtr]::Zero)}`
const UNIWILL_PROBE_PS =
  UNIWILL_PS_PREAMBLE +
  `;$v=UwR ${UNIWILL_ECRAM_FAN_CTL};$d=UwR 0x75B;if($v -lt 0 -or $v -gt 255 -or $d -lt 0 -or $d -gt 255){throw 'bad ECRAM reading'};Write-Output 'OK'`
const UNIWILL_APPLY_PS =
  UNIWILL_PS_PREAMBLE +
  `;$orig=UwR ${UNIWILL_ECRAM_FAN_CTL};$boosted=$orig -bor ${UNIWILL_FAN_BOOST_BITS};` +
  `[void](UwW ${UNIWILL_ECRAM_FAN_CTL} $boosted);$chk=UwR ${UNIWILL_ECRAM_FAN_CTL};` +
  `Write-Output "ORIG=$orig;BOOSTED=$boosted;NOW=$chk"`
function uniwillRestorePs(orig: number): string {
  return UNIWILL_PS_PREAMBLE + `;[void](UwW ${UNIWILL_ECRAM_FAN_CTL} ${orig});$chk=UwR ${UNIWILL_ECRAM_FAN_CTL};Write-Output "NOW=$chk"`
}

/** 华硕 AsusACPI（DeviceSet 风扇设备）：参数签名置信度低，默认禁用，待真机验证后开启
 *  （探测仍会跑并打日志，便于在华硕机型上确认类是否存在；验证通过再把开关改 true）。 */
const ASUS_LEVER_ENABLED = false
const ASUS_CLASS = 'AsusACPI'

interface VendorProbeResult {
  uniwill: boolean
  lenovo: boolean
  asus: boolean
  probedAt: number
}

let capability: VendorProbeResult | null = null

const CAPABILITY_FILE = 'cooling-capability.json'
const CAPABILITY_TTL_MS = 7 * 24 * 3600 * 1000

/** 探测厂商风扇控制能力。探测冷启动可达数秒，结果落盘缓存 7 天
 *  （驱动安装状态变化的周期远大于此）。 */
async function probeVendors(): Promise<VendorProbeResult> {
  const res: VendorProbeResult = { uniwill: false, lenovo: false, asus: false, probedAt: Date.now() }
  // Uniwill：设备在场且 0x751/0x75B 可读（0-255）即认为支持
  try {
    const out = await runners.runPowerShell(UNIWILL_PROBE_PS, 8000)
    res.uniwill = /OK/.test(out)
  } catch {
    res.uniwill = false
  }
  try {
    const out = await runners.runPowerShell(
      `$ErrorActionPreference='Stop'; $c=Get-CimClass -Namespace root/wmi -ClassName ${LENOVO_CLASS}; ($c.CimClassMethods | ForEach-Object { $_.Name }) -join ','`,
      8000
    )
    res.lenovo = /GetSmartFanMode/i.test(out) && /SetSmartFanMode/i.test(out)
  } catch {
    res.lenovo = false
  }
  try {
    const out = await runners.runPowerShell(
      `$ErrorActionPreference='Stop'; Get-CimClass -Namespace root/wmi -ClassName ${ASUS_CLASS} | Out-Null; 'ok'`,
      8000
    )
    res.asus = /ok/.test(out)
  } catch {
    res.asus = false
  }
  logger.info(`[Cooling] vendor probe: uniwill=${res.uniwill} lenovo=${res.lenovo} asus=${res.asus}`)
  writeCapabilityFile(res)
  return res
}

async function ensureCapability(): Promise<VendorProbeResult> {
  if (capability && Date.now() - capability.probedAt < CAPABILITY_TTL_MS) return capability
  const cached = readCapabilityFile()
  if (cached && Date.now() - cached.probedAt < CAPABILITY_TTL_MS) {
    capability = cached
    return cached
  }
  capability = await probeVendors()
  return capability
}

function writeCapabilityFile(res: VendorProbeResult): void {
  const dir = dataDir()
  if (!dir) return
  try {
    fs.writeFileSync(join(dir, CAPABILITY_FILE), JSON.stringify(res), 'utf-8')
  } catch {
    /* 缓存写失败只影响下次多探测一次，可容忍 */
  }
}

function readCapabilityFile(): VendorProbeResult | null {
  const dir = dataDir()
  if (!dir) return null
  try {
    const parsed = JSON.parse(fs.readFileSync(join(dir, CAPABILITY_FILE), 'utf-8'))
    // 必须含 uniwill 字段才认——旧版缓存（无此字段）直接视为过期重探
    if (
      typeof parsed?.probedAt === 'number' &&
      typeof parsed?.uniwill === 'boolean' &&
      typeof parsed?.lenovo === 'boolean' &&
      typeof parsed?.asus === 'boolean'
    ) {
      return parsed as VendorProbeResult
    }
  } catch {
    /* 缺失/损坏 → 重新探测 */
  }
  return null
}

interface FanLeverState {
  vendor: string
  origMode: number
}
let fanState: FanLeverState | null = null

/** 读回验证后启用风扇杠杆。一次 PowerShell 完成"读原值 → 置位 → 读回"，
 *  输出 ORIG/NOW 由 Node 侧裁决——把签名不确定性压缩到"要么生效要么放弃"，不留半态。 */
async function applyVendorLever(token: number): Promise<boolean> {
  const cap = await ensureCapability()
  // Uniwill ECRAM 优先：单字节 BOOST 位，EC 固件自治执行，最干净。
  // 厂商 SetFanBoost 是读-改-写（OR 0x40）——0x751 上还有其他标志位（如自定义模式 0x10），
  // 必须保留，不能整字节覆盖。
  if (cap.uniwill) {
    try {
      const out = await runners.runPowerShell(UNIWILL_APPLY_PS, 8000)
      const m = out.match(/ORIG=(\d+);BOOSTED=(\d+);NOW=(\d+)/)
      if (!m) throw new Error('unparsed output: ' + out.trim())
      const origMode = parseInt(m[1], 10)
      const boosted = parseInt(m[2], 10)
      const nowMode = parseInt(m[3], 10)
      if (nowMode !== boosted) {
        // 读回不符（置位未生效）：尽力把原值写回，再放弃该杠杆
        await runners.runPowerShell(uniwillRestorePs(origMode), 6000)
        throw new Error(`readback mismatch (now=${nowMode}, want ${boosted})`)
      }
      if (token !== restoreToken || phase !== 'active') {
        await runners.runPowerShell(uniwillRestorePs(origMode), 6000) // 收尾/退出已在进行：立即回滚
        return false
      }
      fanState = { vendor: 'uniwill', origMode }
      writeStateFile()
      logger.info(`[Cooling] uniwill ECRAM 0x751: ${origMode} -> ${boosted} (fan boost)`)
      return true
    } catch (e) {
      logger.warn('[Cooling] uniwill fan lever failed:', msg(e))
    }
  }
  if (cap.lenovo) {
    try {
      const script = [
        `$ErrorActionPreference='Stop'`,
        `$obj = Get-CimInstance -Namespace root/wmi -ClassName ${LENOVO_CLASS} | Select-Object -First 1`,
        `$o = Invoke-CimMethod -InputObject $obj -MethodName GetSmartFanMode`,
        `$origVal = [int]$(if ($null -ne $o.Data) { $o.Data } else { $o.mode })`,
        `Invoke-CimMethod -InputObject $obj -MethodName SetSmartFanMode -Arguments @{ mode = ${LENOVO_FULL_MODE} } | Out-Null`,
        `$n = Invoke-CimMethod -InputObject $obj -MethodName GetSmartFanMode`,
        `$nowVal = [int]$(if ($null -ne $n.Data) { $n.Data } else { $n.mode })`,
        `Write-Output "ORIG=$origVal;NOW=$nowVal"`,
      ].join('; ')
      const out = await runners.runPowerShell(script, 6000)
      const m = out.match(/ORIG=(-?\d+);NOW=(-?\d+)/)
      if (!m) throw new Error('unparsed output: ' + out.trim())
      const origMode = parseInt(m[1], 10)
      const nowMode = parseInt(m[2], 10)
      if (nowMode !== LENOVO_FULL_MODE) {
        // 读回不符（参数名对但语义不对/未生效）：尽力把原值写回，再放弃该杠杆
        await restoreFanMode(LENOVO_CLASS, origMode)
        throw new Error(`readback mismatch (now=${nowMode}, want ${LENOVO_FULL_MODE})`)
      }
      if (token !== restoreToken || phase !== 'active') {
        await restoreFanMode(LENOVO_CLASS, origMode) // 收尾/退出已在进行：立即回滚
        return false
      }
      fanState = { vendor: 'lenovo', origMode }
      writeStateFile()
      logger.info(`[Cooling] lenovo fan mode ${origMode} -> ${LENOVO_FULL_MODE}`)
      return true
    } catch (e) {
      logger.warn('[Cooling] lenovo fan lever failed:', msg(e))
    }
  }
  if (cap.asus && !ASUS_LEVER_ENABLED) {
    logger.info('[Cooling] asus AsusACPI class present; lever disabled until on-device verification')
  }
  return false
}

async function restoreFanMode(className: string, origMode: number): Promise<void> {
  try {
    await runners.runPowerShell(
      `$ErrorActionPreference='Stop'; $obj = Get-CimInstance -Namespace root/wmi -ClassName ${className} | Select-Object -First 1; ` +
        `Invoke-CimMethod -InputObject $obj -MethodName SetSmartFanMode -Arguments @{ mode = ${origMode} } | Out-Null`,
      6000
    )
    logger.info(`[Cooling] ${className} fan mode restored to ${origMode}`)
  } catch (e) {
    logger.error('[Cooling] fan restore FAILED — fan mode may stay changed until manual reset:', msg(e))
  }
}

async function restoreVendorLever(): Promise<void> {
  const st = fanState
  fanState = null
  if (!st) return
  if (st.vendor === 'uniwill') {
    try {
      const out = await runners.runPowerShell(uniwillRestorePs(st.origMode), 6000)
      const m = out.match(/NOW=(\d+)/)
      if (!m || parseInt(m[1], 10) !== st.origMode) {
        logger.error(`[Cooling] uniwill fan restore verify mismatch (got ${m ? m[1] : 'unparsable'}, want ${st.origMode})`)
        return
      }
      logger.info(`[Cooling] uniwill ECRAM 0x751 restored to ${st.origMode}`)
    } catch (e) {
      logger.error('[Cooling] uniwill fan restore FAILED — fan may stay boosted until manual reset:', msg(e))
    }
    return
  }
  if (st.vendor === 'lenovo') await restoreFanMode(LENOVO_CLASS, st.origMode)
}

function restoreVendorLeverSync(): void {
  const st = fanState
  fanState = null
  if (!st) return
  try {
    const script =
      st.vendor === 'uniwill'
        ? uniwillRestorePs(st.origMode)
        : // lenovo
          `$ErrorActionPreference='Stop'; $obj = Get-CimInstance -Namespace root/wmi -ClassName ${LENOVO_CLASS} | Select-Object -First 1; ` +
          `Invoke-CimMethod -InputObject $obj -MethodName SetSmartFanMode -Arguments @{ mode = ${st.origMode} } | Out-Null`
    execFileSync(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-EncodedCommand', toEncodedCommand(script)],
      { timeout: 4000, windowsHide: true, stdio: 'ignore' }
    )
    logger.info(`[Cooling] ${st.vendor} fan mode restored (sync, quit path)`)
  } catch (e) {
    logger.error('[Cooling] sync fan restore failed:', msg(e))
  }
}

// === 温度读取 ===

const TEMP_ZONE_PS =
  "Get-CimInstance -Namespace root/wmi -ClassName MSAcpi_ThermalZoneTemperature -ErrorAction Stop | Select-Object -ExpandProperty CurrentTemperature"
// 降级：性能计数器热区（同样 0.1K 单位；部分机器只有这个可读）
const TEMP_PERF_PS =
  "Get-CimInstance Win32_PerfFormattedData_Counters_ThermalZoneInformation -ErrorAction Stop | Select-Object -ExpandProperty Temperature"

async function readTempC(): Promise<number | null> {
  try {
    const c = pickMaxZoneTemp(await runners.runPowerShell(TEMP_ZONE_PS))
    if (c !== null) return c
  } catch {
    /* 落到降级 */
  }
  try {
    const c = pickMaxPerfCounterTemp(await runners.runPowerShell(TEMP_PERF_PS))
    if (c !== null) return c
  } catch {
    /* 两路都不可用 → 温度未知 */
  }
  return null
}

// === 崩溃残留状态文件 ===
// 散热生效期间把"改了什么"落盘；正常恢复即删。应用被强杀/断电没恢复时，
// 启动时 recoverCoolingResidue 据此把电源设置与风扇模式写回原值。

const STATE_FILE = 'cooling-state.json'

interface CoolingStateFile {
  schemeGuid: string
  acOrig: number
  dcOrig: number | null
  fanVendor: string | null
  fanOrigMode: number | null
  startedAt: number
}

/** 把当前两档杠杆的"改动前原值"序列化落盘（每档杠杆提交后都重写一次，内容幂等）。 */
function writeStateFile(): void {
  const dir = dataDir()
  if (!dir) return
  const payload: CoolingStateFile = {
    schemeGuid: powerState?.schemeGuid ?? '',
    acOrig: powerState?.acOrig ?? 100,
    dcOrig: powerState?.dcOrig ?? null,
    fanVendor: fanState?.vendor ?? null,
    fanOrigMode: fanState?.origMode ?? null,
    startedAt,
  }
  try {
    fs.writeFileSync(join(dir, STATE_FILE), JSON.stringify(payload), 'utf-8')
  } catch (e) {
    logger.warn('[Cooling] write state file failed:', msg(e))
  }
}

function deleteStateFile(): void {
  const dir = dataDir()
  if (!dir) return
  try {
    fs.unlinkSync(join(dir, STATE_FILE))
  } catch {
    /* 不存在即目标态 */
  }
}

/** 启动时崩溃残留修复：cooling-state.json 在场 → 把电源设置/风扇模式写回原值后删文件。
 *  电源 scheme 只写值；仅当它仍是活动 scheme 才 /setactive——用户崩溃后可能已手动换了
 *  电源计划，强切回去是二次打扰；非活动 scheme 写值即持久化，再次激活自然生效。 */
export function recoverCoolingResidue(): void {
  const dir = dataDir()
  if (!dir) return
  const f = join(dir, STATE_FILE)
  let st: CoolingStateFile | null = null
  try {
    st = JSON.parse(fs.readFileSync(f, 'utf-8')) as CoolingStateFile
  } catch {
    return
  }
  if (!st || typeof st.schemeGuid !== 'string' || !st.schemeGuid) {
    try {
      fs.unlinkSync(f)
    } catch {}
    return
  }
  logger.warn('[Cooling] residue found from previous crash, restoring power/fan settings')
  const opts = { timeout: 3000, windowsHide: true, stdio: 'ignore' as const }
  try {
    execFileSync('powercfg', ['/setacvalueindex', st.schemeGuid, 'SUB_PROCESSOR', 'PROCTHROTTLEMAX', String(st.acOrig)], opts)
    if (typeof st.dcOrig === 'number') {
      try {
        execFileSync('powercfg', ['/setdcvalueindex', st.schemeGuid, 'SUB_PROCESSOR', 'PROCTHROTTLEMAX', String(st.dcOrig)], opts)
      } catch {
        /* 无电池机器尽力而为 */
      }
    }
    const out = execFileSync('powercfg', ['/getactivescheme'], { timeout: 3000, windowsHide: true, encoding: 'utf8' })
    if (parseActiveScheme(out) === st.schemeGuid) {
      execFileSync('powercfg', ['/setactive', st.schemeGuid], opts)
    }
    logger.info('[Cooling] residue power restore done')
  } catch (e) {
    logger.error('[Cooling] residue power restore failed:', msg(e))
  }
  if (typeof st.fanOrigMode === 'number' && (st.fanVendor === 'lenovo' || st.fanVendor === 'uniwill')) {
    const script =
      st.fanVendor === 'uniwill'
        ? uniwillRestorePs(st.fanOrigMode)
        : `$ErrorActionPreference='Stop'; $obj = Get-CimInstance -Namespace root/wmi -ClassName ${LENOVO_CLASS} | Select-Object -First 1; ` +
          `Invoke-CimMethod -InputObject $obj -MethodName SetSmartFanMode -Arguments @{ mode = ${st.fanOrigMode} } | Out-Null`
    try {
      execFileSync(
        'powershell.exe',
        ['-NoProfile', '-NonInteractive', '-EncodedCommand', toEncodedCommand(script)],
        { timeout: 4000, windowsHide: true, stdio: 'ignore' }
      )
      logger.info(`[Cooling] residue ${st.fanVendor} fan restore done`)
    } catch (e) {
      logger.warn('[Cooling] residue fan restore failed:', msg(e))
    }
  }
  try {
    fs.unlinkSync(f)
  } catch {}
}

// === 编排状态机 ===
// idle → active（右键触发，UI 立即出现，杠杆后台并行启用）→ restoring（20s 到点/退出）
// → idle。防重入：active/restoring 中再次右键直接返回 false（UI 据此 shake 提示），
// 且不重置计时——否则功耗限制可被无限延长。

type Phase = 'idle' | 'active' | 'restoring'
let phase: Phase = 'idle'
/** 收尾/取消时自增，让在途的杠杆 apply 知道要立即回滚（防异步竞态写回中间态） */
let restoreToken = 0
let startedAt = 0
let coolingTimer: NodeJS.Timeout | null = null
let tickTimer: NodeJS.Timeout | null = null
let usageTimer: NodeJS.Timeout | null = null
let onUpdateCb: ((s: CoolingStatus) => void) | null = null
let tempBefore: number | null = null
let tempAfter: number | null = null
let currentTempC: number | null = null
let levers: CoolingLevers = { fan: false, power: false }
let usage: UsageSample = { cpu: null, gpu: null, disk: null, mem: null }

function clearTimers(): void {
  if (coolingTimer) {
    clearTimeout(coolingTimer)
    coolingTimer = null
  }
  if (tickTimer) {
    clearInterval(tickTimer)
    tickTimer = null
  }
  if (usageTimer) {
    clearInterval(usageTimer)
    usageTimer = null
  }
}

function remainSec(): number {
  return Math.max(0, Math.ceil((durationMs() - (Date.now() - startedAt)) / 1000))
}

function emit(extra?: Partial<CoolingStatus>): void {
  if (!onUpdateCb) return
  onUpdateCb({
    phase: 'active',
    remainSec: remainSec(),
    tempC: currentTempC,
    usage: { ...usage },
    levers: { ...levers },
    tempBefore,
    tempAfter: null,
    ...extra,
  })
}

/** 散热是否进行中（active/restoring）。悬浮球据此在散热动画期间挂起收起逻辑，
 *  避免旋转中的花瓣被 blur/外部点击打断——转完由散热完成回调按原状态复位。 */
export function isCoolingActive(): boolean {
  return phase !== 'idle'
}

/** 散热总时长（秒）。花瓣旋转动画时长与之对齐（setCoolingVisual 传给渲染层）。 */
export function getCoolingDurationSec(): number {
  return Math.round(durationMs() / 1000)
}

/** 采一轮占用率并推送（每 2.5 秒一次；失败保持上次值）。 */
async function pollUsage(): Promise<void> {
  try {
    const parsed = parseUsageLine(await runners.runPowerShell(USAGE_POLL_PS, 6000))
    if (parsed) usage = parsed
  } catch {
    /* 采样失败保持上次值（null = 面板显示 --） */
  }
  if (phase === 'active') emit()
}

/** 启动 20 秒散热。返回 false = 已在散热中（UI 据此提示，不重复启动/不重置计时）。 */
export function startCooling(onUpdate: (s: CoolingStatus) => void): boolean {
  if (phase !== 'idle') {
    logger.info('[Cooling] re-entry ignored (phase =', phase + ')')
    return false
  }
  phase = 'active'
  restoreToken++
  startedAt = Date.now()
  tempBefore = null
  tempAfter = null
  currentTempC = null
  levers = { fan: false, power: false }
  usage = { cpu: null, gpu: null, disk: null, mem: null }
  onUpdateCb = onUpdate
  emit()
  coolingTimer = setTimeout(() => {
    void finishCooling()
  }, durationMs())
  tickTimer = setInterval(() => {
    emit()
    // 温度节流刷新：每 3 秒一次——每次读取都是一个 PowerShell 子进程，不值得更频
    const r = remainSec()
    if (r > 0 && r % 3 === 0) void refreshTempC()
  }, 1000)
  usageTimer = setInterval(() => {
    void pollUsage()
  }, 2500)
  void pollUsage()
  void beginLevers()
  return true
}

/** 后台并行启用两档杠杆；每档落定即时 emit，UI 文案随之从"监测中"变为实际生效杠杆。 */
async function beginLevers(): Promise<void> {
  const token = restoreToken
  currentTempC = await readTempC()
  tempBefore = currentTempC
  emit()
  if (token !== restoreToken) return
  levers.power = await applyPowerLever(token)
  emit()
  if (token !== restoreToken) return
  levers.fan = await applyVendorLever(token)
  emit()
}

async function refreshTempC(): Promise<void> {
  const t = await readTempC()
  if (phase !== 'active') return
  currentTempC = t
  emit()
}

/** 20s 到点：停表 → 读结束温度 → 逐档恢复原值 → 上报 done（UI 展示前后对比后自关）。 */
async function finishCooling(): Promise<void> {
  if (phase !== 'active') return
  phase = 'restoring'
  restoreToken++
  clearTimers()
  tempAfter = await readTempC()
  await restorePowerLever()
  await restoreVendorLever()
  deleteStateFile()
  phase = 'idle'
  const cb = onUpdateCb
  onUpdateCb = null
  cb?.({
    phase: 'done',
    remainSec: 0,
    tempC: tempAfter,
    usage: { ...usage },
    levers: { ...levers },
    tempBefore,
    tempAfter,
  })
}

/** before-quit 同步收尾：清定时器 + 同步尽力恢复电源/风扇（退出路径不能 await）。 */
export function cancelCooling(): void {
  restoreToken++
  clearTimers()
  if (phase === 'idle') return
  logger.info('[Cooling] cancel on quit')
  phase = 'restoring'
  const st = powerState
  powerState = null
  if (st) restorePowerLeverSync(st)
  restoreVendorLeverSync()
  deleteStateFile()
  phase = 'idle'
  onUpdateCb = null
}
