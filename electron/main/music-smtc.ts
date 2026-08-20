// electron/main/music-smtc.ts
// 系统媒体传输控制（SMTC）桥：经 PowerShell + Windows Runtime 读写系统当前媒体会话。
//
// G6 SPIKE 载体为"辅助进程"（PowerShell），规避 Node 原生模块编译：
//   读：GlobalSystemMediaTransportControlsSessionManager.CurrentSession 的
//         MediaProperties（title/artist/album）+ PlaybackInfo.PlaybackStatus。
//   控：TryPlay/TryPause/TrySkipNext/TrySkipPrevious。
// 关键风险：WinRT 经 PowerShell 调用对系统/版本敏感，故全程零信任——
//   任何异常（PowerShell 缺失、WinRT 加载失败、无会话）都返回可用=false，
//   上层据此降级展示（不阻塞、不报错）。这是 G6 官方 SPIKE，本机未实机验证，
//   正确性以真实跑通为准（见 goal G6 风险表👈）。

import { execFile } from 'child_process'
import log from './logger'

export interface SmtcStatus {
  available: boolean
  playing: boolean
  title: string
  artist: string
  album: string
  /** 是否取到当前会话（null = 未知） */
  hasSession: boolean | null
}

const EMPTY: SmtcStatus = { available: false, playing: false, title: '', artist: '', album: '', hasSession: null }

const PS_READ = `
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$asTaskGeneric=([System.WindowsRuntimeSystemExtensions].GetMethods()|Where-Object{$_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation\`1'})[0]
function Await($t,$rt){$asTask=$asTaskGeneric.MakeGenericMethod($rt);$n=$asTask.Invoke($null,@($t));$n.Wait(-1)|Out-Null;$n.Result}
try{
  [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager,Windows.Media.Control,ContentType=WindowsRuntime]|Out-Null
  $m=Await ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])
  if(-not $m){'{"available":true,"hasSession":false}';exit}
  $s=$m.GetCurrentSession()
  if(-not $s){'{"available":true,"hasSession":false}';exit}
  $p=Await ($s.TryGetMediaPropertiesAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])
  $st=[int]$s.PlaybackInfo.PlaybackStatus
  $title=[string]$p.Title;$artist=[string]$p.Artist;$album=[string]$p.AlbumTitle
  $play=($st -eq 4)
  # 拼 JSON：PowerShell 双引号串不接受 \\" 转义，改单引号字面量 + 变量拼接（歌名含引号属极端，忽略）
  '{' + '"available":true,"hasSession":true,"playing":' + $play.ToString().ToLower() + ',"title":"' + $title + '","artist":"' + $artist + '","album":"' + $album + '"' + '}'
}catch{
  # 任何失败都降级为不可用，不抛异常污染主进程
  '{"available":false,"hasSession":null}'
}
`

// 控制命令映射：PlaybackStatus 枚举 0..6；控制用 Try* 系列
const PS_CTRL: Record<string, string> = {
  play: 'TryPlayAsync',
  pause: 'TryPauseAsync',
  next: 'TrySkipNextAsync',
  prev: 'TrySkipPreviousAsync',
}

const PS_CONTROL = (method: string) => `
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$asTaskGeneric=([System.WindowsRuntimeSystemExtensions].GetMethods()|Where-Object{$_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation\`1'})[0]
function Await($t,$rt){$asTask=$asTaskGeneric.MakeGenericMethod($rt);$n=$asTask.Invoke($null,@($t));$n.Wait(-1)|Out-Null;$n.Result}
try{
  [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager,Windows.Media.Control,ContentType=WindowsRuntime]|Out-Null
  $m=Await ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])
  $s=$m.GetCurrentSession()
  if($s){ $null=Await ($s.${method}()) ([boolean]) }
  '{"ok":true}'
}catch{'{"ok":false}'}
`

function runPs(script: string): Promise<string> {
  return new Promise((resolve) => {
    // 用 powershell.exe -NoProfile -NonInteractive -Command；隐藏窗口，避免弹黑框
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-NoLogo', '-Command', script],
      { windowsHide: true, timeout: 8000, maxBuffer: 4 * 1024 * 1024 },
      (err, stdout) => {
        if (err) { resolve(''); return }
        resolve(stdout.trim())
      },
    )
  })
}

/** 读取系统媒体会话信息（SPIKE 载体：PowerShell/WinRT）；失败降级 EMPTY。 */
export async function getSmtcStatus(): Promise<SmtcStatus> {
  try {
    const out = await runPs(PS_READ)
    const m = out.match(/\{.*\}/s)
    if (!m) return EMPTY
    const parsed = JSON.parse(m[0])
    if (!parsed.available) return EMPTY
    return {
      available: true,
      playing: !!parsed.playing,
      title: parsed.title || '',
      artist: parsed.artist || '',
      album: parsed.album || '',
      hasSession: parsed.hasSession,
    }
  } catch (e) {
    log.warn('[music-smtc] read failed:', (e as Error)?.message ?? e)
    return EMPTY
  }
}

/** 控制：play/pause/next/prev。尽力而为，失败静默。 */
export async function smtcControl(cmd: string): Promise<boolean> {
  const method = PS_CTRL[cmd]
  if (!method) return false
  try {
    const out = await runPs(PS_CONTROL(method))
    return /"ok":true/.test(out)
  } catch {
    return false
  }
}
