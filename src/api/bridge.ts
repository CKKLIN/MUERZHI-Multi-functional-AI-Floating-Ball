// muerzhiAPI → Tauri 桥
// 目标：渲染层统一通过 window.muerzhiAPI 调用后端能力（invoke + 事件订阅）；
// 原生 HTML 窗口页直接用 window.__TAURI__。
//
// 实现约定：
// - invoke('<camel-command>', { args })：Rust 侧命令用 snake_case，invoke 用 camelCase 参数名
// - 事件订阅：tauri.event.listen(channel, handler)，退订函数返回 Promise<UnlistenFn>
//
// 历史：P0/P1 阶段未迁移的方法曾返回安全 stub（warnOnce 提示），P4 已全部替换为真实现，
// 故 stub 与 warnOnce 一并移除 —— 若将来再出现「渲染层调了但没接」的方法，直接让它
// 抛 Uncaught (in promise) 比静默返回空值更容易在开发期暴露。

import { invoke as tauriInvoke } from '@tauri-apps/api/core'
import { listen as tauriListen, type UnlistenFn } from '@tauri-apps/api/event'
import log from '../log'

type Progress = { percent: number; targetSize: number }

type CaptureSourceLike = {
  id: string
  name: string
  display_id: string
  appIcon: string | null
  thumbnail: string
}

// 每一次 invoke 都留痕（命令名 + 参数 + 结果/错误）：渲染层视角的完整操作时间线，
// 与 Rust 侧 log::info! 落同一份日志文件。参数可能很大（writeFile 的字节列表、
// saveRecordings 的全量历史）——按 300 字符截断，够定位调用又不刷屏。
function brief(v: unknown): string {
  if (v === undefined) return ''
  try {
    const s = JSON.stringify(v)
    if (s === undefined) return String(v)
    return s.length > 300 ? `${s.slice(0, 300)}…(${s.length})` : s
  } catch {
    return String(v)
  }
}

const TRACE_ARGS: Record<string, (args?: Record<string, unknown>) => unknown> = {
  // 二进制/大对象参数不落日志（writeFile 的 data 是几十万长度的数字数组）
  write_file: (args) => ({ filePath: args?.filePath, bytes: (args?.data as unknown[])?.length }),
  read_file: (args) => ({ filePath: args?.filePath }),
  append_file: (args) => ({ filePath: args?.filePath, bytes: (args?.data as unknown[])?.length, reset: args?.reset }),
  load_recordings: () => undefined,
  save_recordings: (args) => ({ count: (args?.recordings as unknown[])?.length }),
}

// 轮询/查询类命令：只在出错时留日志（成功打点每 5s 一条，会把日志刷成噪声）
const QUIET_COMMANDS = new Set([
  'agent_get_status', // AiSettingsPanel 5s 轮询
  'recording_get_status',
  'get_app_i18n',
  'get_floating_ball_settings',
  'todo_get',
  'todo_get_settings',
  'get_ai_island_settings',
  'get_app_version',
  // 试音电平以 20Hz 上报（useAudioCapture.updateLevel）：静默路径上每条 invoke 打 2 条
  // 日志、每条日志又一次 plugin-log IPC + 文件追加，试音期间约 40 条/秒写盘
  'emit_preview_audio_level',
])

async function cmd<T>(name: string, args?: Record<string, unknown>): Promise<T> {
  const quiet = QUIET_COMMANDS.has(name)
  if (!quiet) {
    const detail = TRACE_ARGS[name] ? brief(TRACE_ARGS[name](args)) : brief(args)
    log.info(`[invoke] ${name} ${detail}`)
  }
  try {
    const result = await tauriInvoke(name, args)
    if (!quiet) log.info(`[invoke] ${name} ✓`)
    return result as T
  } catch (e) {
    log.error(`[invoke] ${name} ✗`, e)
    throw e
  }
}

// 事件订阅统一封装：渲染层拿到同步的退订函数（Electron 语义），内部异步解绑
function on(channel: string, handler: (payload: unknown) => void): () => void {
  let unlisten: UnlistenFn | null = null
  let disposed = false
  tauriListen(channel, (event) => handler(event.payload)).then((un) => {
    if (disposed) un()
    else unlisten = un
  })
  return () => {
    disposed = true
    unlisten?.()
  }
}

const muerzhiAPI = {
  // ===== Screen capture（P4：Rust 侧 DXGI 抓帧出缩略图；sourceId 为 `screen:下标`）=====
  getSources: (types?: string[]) => cmd<CaptureSourceLike[]>('get_sources', { types }),
  getSystemAudioSources: () => cmd<{ id: string; name: string }[]>('get_system_audio_sources'),
  /** WASAPI 输入设备（设置页麦克风下拉；id 与 recordingStart 的 micDeviceId 同域）*/
  listAudioDevices: () => cmd<{ deviceId: string; label: string }[]>('list_audio_devices'),

  // ===== File dialogs =====
  showSaveDialog: async (options?: {
    title?: string
    defaultPath?: string
    filters?: { name: string; extensions: string[] }[]
  }) => {
    try {
      const { save } = await import('@tauri-apps/plugin-dialog')
      const path = await save({
        title: options?.title,
        defaultPath: options?.defaultPath,
        filters: options?.filters?.map(f => ({ name: f.name, extensions: f.extensions })),
      })
      return { canceled: path === null, filePath: path }
    } catch (e) {
      console.error('showSaveDialog failed', e)
      return { canceled: true, filePath: null }
    }
  },
  showOpenDialog: async (options?: {
    title?: string
    defaultPath?: string
    filters?: { name: string; extensions: string[] }[]
    properties?: string[]
  }) => {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog')
      const multiple = options?.properties?.includes('multiSelections')
      const result = await open({
        title: options?.title,
        defaultPath: options?.defaultPath,
        filters: options?.filters?.map(f => ({ name: f.name, extensions: f.extensions })),
        multiple,
        directory: options?.properties?.includes('openDirectory'),
      })
      if (result === null) return { canceled: true, filePaths: [] }
      return { canceled: false, filePaths: Array.isArray(result) ? result : [result] }
    } catch (e) {
      console.error('showOpenDialog failed', e)
      return { canceled: true, filePaths: [] }
    }
  },
  getDefaultSaveDir: () => cmd<string>('get_default_save_dir'),

  // ===== File I/O（preload 直写 fs 的替代，走 Rust 命令）=====
  writeFile: (data: ArrayBuffer, filePath: string) =>
    cmd<{ success: boolean; filePath: string; error?: string }>('write_file', {
      data: Array.from(new Uint8Array(data)),
      filePath,
    }),
  // Windows 上 wry 只拦截 `http://local-video.*`（自定义协议的官方映射形态，
  // 与 @tauri-apps/api 的 convertFileSrc 同构）；直接用 local-video:/// 开头
  // 不匹配 WebResourceRequested 的过滤器 → 请求无人应答 → 播放黑屏。
  // 整路径 encodeURIComponent，Rust 侧 parse_path 解码回原路径。
  toLocalVideoUrl: (filePath: string) =>
    `http://local-video.localhost/${encodeURIComponent(filePath.replace(/\\/g, '/'))}`,
  readFile: (filePath: string) => cmd<ArrayBuffer>('read_file', { filePath }),
  fileExists: (filePath: string) => cmd<boolean>('file_exists', { filePath }),
  deleteFile: (filePath: string) => cmd<boolean>('delete_file', { filePath }),
  getFileSize: (filePath: string) => cmd<number>('get_file_size', { filePath }),

  // ===== FFmpeg（P3 media 迁移）=====
  convertToMp4: (inputPath: string, outputPath: string, crop?: { x: number; y: number; width: number; height: number }) => {
    return cmd<{ success: boolean; outputPath: string; error?: string }>('media_convert_to_mp4', {
      inputPath,
      outputPath,
      crop: crop ? [crop.x, crop.y, crop.width, crop.height] : undefined,
    })
  },
  cropVideo: (inputPath: string, outputPath: string, crop: { x: number; y: number; width: number; height: number }) => {
    return cmd<{ success: boolean; outputPath: string; error?: string }>('media_crop_video', {
      inputPath,
      outputPath,
      crop: [crop.x, crop.y, crop.width, crop.height],
    })
  },
  convertToGif: (inputPath: string, outputPath: string, options?: { width?: number; fps?: number; duration?: number }) => {
    return cmd<{ success: boolean; outputPath: string; error?: string }>('media_convert_to_gif', { inputPath, outputPath, options })
  },
  mergeMultiScreen: (inputs: { filePath: string; bounds: { x: number; y: number; width: number; height: number } }[], outputPath: string) => {
    return cmd<{ success: boolean; outputPath: string; error?: string }>('media_merge_multi_screen', { inputs, outputPath })
  },

  // ===== Events =====
  onConversionProgress: (callback: (progress: Progress) => void) =>
    on('on-conversion-progress', callback),
  onGlobalShortcut: (callback: (action: string) => void) =>
    on('on-global-shortcut', callback),
  onMainProcessMessage: (callback: (message: string) => void) =>
    on('main-process-message', callback),
  onBeforeQuit: (callback: () => void) =>
    on('app-before-quit', callback),
  onMainWindowClose: (callback: () => void) =>
    on('app-main-window-close', callback),

  // ===== Shell =====
  openFileLocation: async (filePath: string) => {
    try {
      const { revealItemInDir } = await import('@tauri-apps/plugin-opener')
      await revealItemInDir(filePath)
    } catch (e) {
      console.error('openFileLocation failed', e)
    }
  },
  openExternal: async (url: string) => {
    try {
      const { openUrl } = await import('@tauri-apps/plugin-opener')
      await openUrl(url)
    } catch (e) {
      console.error('openExternal failed', e)
    }
  },
  // 用系统默认程序打开本地文件（录制历史整行点击 → 系统视频播放器）。
  // 走 Rust 命令而非 plugin-opener 的 openPath：后者是 JS 命令，受 capabilities 的
  // opener scope 限制，`opener:default` 不含 allow-open-path 时会静默 ForbiddenPath。
  openPath: async (filePath: string) => {
    try {
      await cmd<void>('open_local_path', { path: filePath })
    } catch (e) {
      console.error('openPath failed', e)
    }
  },
  /** 在文件管理器中打开日志目录（定位到当前日志文件；设置页「打开日志目录」用）*/
  openLogDir: async () => {
    try {
      await cmd<void>('open_log_dir')
    } catch (e) {
      console.error('openLogDir failed', e)
    }
  },

  // ===== App info =====
  getAppVersion: () => cmd<string>('get_app_version'),
  showAboutWindow: () => { tauriInvoke('show_about_window') },
  closeAboutWindow: () => { tauriInvoke('close_about_window') },

  // ===== Window（P2 窗口体系迁移）=====
  minimizeWindow: () => cmd<void>('minimize_window'),
  showWindow: () => cmd<void>('show_window'),
  maximizeWindow: () => cmd<void>('maximize_window'),
  closeWindow: () => cmd<void>('close_window'),

  // ===== Tray notifications =====
  notifyConversionStart: () => { tauriInvoke('notify_conversion_start') },
  notifyConversionDone: (filePath: string) => { tauriInvoke('notify_conversion_done', { filePath }) },

  // ===== Screen info =====
  getScreenScaleFactor: () => cmd<number>('get_screen_scale_factor'),
  getScreenBounds: () => cmd<{ x: number; y: number; width: number; height: number }>('get_screen_bounds'),
  getAllDisplays: () =>
    cmd<{
      id: number
      label: string
      bounds: { x: number; y: number; width: number; height: number }
      scaleFactor: number
      size: { width: number; height: number }
      isPrimary: boolean
      sourceId: string | null
      sourceName: string
      thumbnail: string
    }[]>('get_all_displays'),

  // ===== Screenshot（P4 实装：Rust DXGI 抓帧存桌面）=====
  takeScreenshot: () => cmd<{ success: boolean; filePath?: string; error?: string }>('take_screenshot'),

  // ===== 录制会话（P4：WGC + WASAPI 全在 Rust 侧，渲染层只下指令）=====
  recordingStart: (options: Record<string, unknown>) => cmd<string>('recording_start', { options }),
  recordingPause: () => cmd<void>('recording_pause'),
  recordingResume: () => cmd<void>('recording_resume'),
  recordingStop: () =>
    cmd<{ outputPath: string; thumbnail?: string | null }>('recording_stop'),
  /** 录制中开关麦克风（工具条按钮录制中保留可点）：Rust 实时增停音频段 */
  recordingSetMic: (on: boolean) => cmd<boolean>('recording_set_mic', { on }),
  /** 录制中开关摄像头：停/起预览窗的 MediaRecorder 分段，成品按时间窗口叠画中画 */
  recordingSetCamera: (on: boolean, deviceId?: string) =>
    cmd<boolean>('recording_set_camera', { on, deviceId: deviceId ?? null }),
  recordingGetStatus: () =>
    cmd<{ state: 'idle' | 'recording' | 'paused' | 'converting'; frames: number; tracks: number; elapsedSec: number }>(
      'recording_get_status',
    ),
  onRecordingState: (callback: (data: { state: string; id?: string; tracks?: number }) => void) =>
    on('recording-state', callback),
  onRecordingStopped: (callback: (data: { id: string; outputPath: string; elapsed: number; fileName: string; thumbnail?: string | null }) => void) =>
    on('recording-stopped', callback),
  /** Rust 侧 WASAPI 实时电平（20Hz）——录制中主窗口被最小化时，渲染层的本地分析器拿不到数据 */
  onAudioLevels: (callback: (data: { mic: number; sys: number }) => void) =>
    on('audio-levels', callback),

  // ===== Region selector（P2 窗口体系：windows/region.rs + public/windows/*.html）=====
  // 选区走事件驱动：start_region_select 起全屏窗，用户在 region-selector.html 画框后
  // invoke('region_selected'/'region_cancelled')，这里等对应事件并 resolve 真实选区。
  // ⚠️ 必须 resolve 真实坐标：调用方（HomeView.handleSelectRegion）拿它填 store.selectedRegion
  // 并立刻 showRegionBorder —— 之前实现把两种结果都 resolve(null)，导致选区数据丢失。
  selectRegion: () =>
    new Promise<{ x: number; y: number; width: number; height: number; sourceId: string } | null>((resolve) => {
      let settled = false
      let offSelected: (() => void) | null = null
      let offCancelled: (() => void) | null = null
      const finish = (result: { x: number; y: number; width: number; height: number; sourceId: string } | null) => {
        if (settled) return
        settled = true
        offSelected?.()
        offCancelled?.()
        resolve(result)
      }
      offSelected = on('region-selected', (payload) => {
        // sourceId 由 Rust 按选区中心所在显示器推导（screen:{下标}）：
        // 曾硬编码 screen:0，在屏幕 2 上框选会录成屏幕 1 的内容
        const r = payload as { x: number; y: number; width: number; height: number; sourceId?: string }
        finish({ x: r.x, y: r.y, width: r.width, height: r.height, sourceId: r.sourceId || 'screen:0' })
      })
      offCancelled = on('region-cancelled', () => finish(null))
      tauriInvoke('start_region_select').catch(() => finish(null))
      // 兜底：选区窗异常退出（崩溃/强关）时两个事件都到不了——不设超时的话
      // 两个监听器与未 settle 的 Promise 永久滞留，多次触发会持续累积
      setTimeout(() => finish(null), 120_000)
    }),
  showRegionBorder: (region: { x: number; y: number; width: number; height: number }, audioState?: { micEnabled: boolean; sysEnabled: boolean; cameraEnabled?: boolean; cameraDeviceId?: string }) =>
    cmd<void>('show_region_border', { region, audioState }),
  hideRegionBorder: () => cmd<void>('hide_region_border'),
  hideBorderOnly: () => cmd<void>('hide_border_only'),
  showFloatingIsland: (audioState?: { micEnabled: boolean; sysEnabled: boolean; cameraEnabled?: boolean; cameraDeviceId?: string }, targetDisplayId?: number) =>
    cmd<void>('show_floating_island', { audioState, targetDisplayId }),
  hideFloatingIsland: () => cmd<void>('hide_floating_island'),
  showAiIsland: () => cmd<void>('show_ai_island'),
  hideAiIsland: () => cmd<void>('hide_ai_island'),
  getAiIslandSettings: () => cmd<{ flat: boolean }>('get_ai_island_settings'),
  setAiIslandSettings: (patch: Record<string, unknown>) => cmd<{ flat: boolean }>('set_ai_island_settings', { patch }),
  hideCameraPreview: () => cmd<void>('hide_camera_preview'),
  /** 摄像头预览窗当前几何（物理像素；合成画中画时换算位置用）*/
  cameraGeometry: () =>
    cmd<{ x: number; y: number; width: number; height: number } | null>('camera_geometry_cmd'),
  toggleCameraPreview: (show: boolean, cameraDeviceId?: string) => cmd<void>('toggle_camera_preview', { show, cameraDeviceId }),
  setIslandState: (state: 'idle' | 'recording' | 'paused', elapsedSeconds?: number) => cmd<void>('set_island_state', { state, elapsedSeconds }),
  updateToolbarState: (state: 'idle' | 'recording' | 'paused', elapsedSeconds?: number) => cmd<void>('update_toolbar_state', { state, elapsedSeconds }),
  // 预览电平上报：录制中由 Rust WASAPI ticker 推；**未录制**时那条链路没人往 atomics 写，
  // 电平恒 0，工具条音量表不动。渲染层的 WebView2 试音流自己算 RMS，经此命令转给
  // 原生工具条/悬浮岛（见 useAudioCapture.updateLevel）。
  emitPreviewAudioLevel: (level: number) => cmd<void>('emit_preview_audio_level', { level }),
  // 麦克风/摄像头开关状态 → 工具条与悬浮岛按钮的点亮/熄灭。
  // 它们的按钮亮灭是**建窗时**从 URL 初值取的，之后没有回推通道：在工具条上点开关，
  // 按钮自己不变（用户反馈「开关时那两个按钮要有状态显示」）。
  pushIslandAudioState: (state: { micEnabled: boolean; cameraEnabled: boolean }) =>
    cmd<void>('push_island_audio_state', { state }),
  onToolbarAction: (callback: (action: string) => void) =>
    on('toolbar-action', callback),

  // ===== Media devices =====
  getMediaDevices: () => {
    const md = (navigator as unknown as {
      mediaDevices?: { enumerateDevices?: () => Promise<Array<{ deviceId: string; kind: string; label: string }>> }
    }).mediaDevices
    if (!md?.enumerateDevices) return Promise.resolve([])
    return md.enumerateDevices().then(
      devices => devices.map(d => ({
        deviceId: d.deviceId,
        kind: d.kind,
        label: d.label,
      }))
    )
  },

  // ===== Recordings persistence =====
  loadRecordings: () => cmd<unknown[]>('load_recordings'),
  saveRecordings: (recordings: unknown[]) => cmd<boolean>('save_recordings', { recordings }),
  /** 为既有 mp4 记录补抽首帧缩略图（返回 base64 data URL；非 mp4/失败返回 null） */
  generateThumbnail: (filePath: string) => cmd<string | null>('generate_thumbnail', { filePath }),

  // ===== Floating ball（P2 已实装：ball_* 命令 + floating-ball.html）=====
  showFloatingBall: () => cmd<void>('show_floating_ball'),
  hideFloatingBall: () => cmd<void>('hide_floating_ball'),
  toggleFloatingBall: () => cmd<void>('toggle_floating_ball'),
  onFloatingBallAction: (callback: (action: string) => void) =>
    on('on-floating-ball-action', callback),

  // ===== Agent bridge（P3 agent 迁移）=====
  agentGetStatus: () => cmd<null>('agent_get_status'),
  agentInstallHooks: () => cmd<null>('agent_install_hooks'),
  agentUninstallHooks: () => cmd<null>('agent_uninstall_hooks'),
  agentResolvePermission: (behavior: string) => cmd<void>('agent_resolve_permission', { behavior }),
  agentDismissQuestion: () => cmd<void>('agent_dismiss_question'),
  agentSubmitQuestion: (sessionId: string, answers: Record<string, unknown>) => cmd<void>('agent_submit_question', { sessionId, answers }),
  agentSetAutoAllow: (enabled: boolean) => cmd<void>('agent_set_auto_allow', { enabled }),
  agentGetAutoAllow: () => cmd<boolean>('agent_get_auto_allow'),
  agentGetAutoAllowSessions: () => cmd<string[]>('agent_get_auto_allow_sessions'),
  agentSetAutoAllowSession: (sessionId: string, enabled: boolean) => cmd<string[]>('agent_set_auto_allow_session', { sessionId, enabled }),
  agentGetCardExpiry: () => cmd<{ enabled: boolean; seconds: number }>('agent_get_card_expiry'),
  agentSetCardExpiry: (enabled: boolean, seconds: number) => cmd<void>('agent_set_card_expiry', { enabled, seconds }),
  onAgentStateUpdate: (callback: (data: unknown) => void) =>
    on('agent-state-update', callback),
  // 历史遗留死通道（主进程从未发送，见迁移盘点）；保留空实现防解构报错
  onAgentPermissionRequest: (_callback: (data: unknown) => void) => () => {},
  showAiWindow: () => cmd<void>('show_ai_window'),
  showSettingsWindow: () => cmd<void>('show_settings_window'),
  showMainWindow: () => cmd<void>('show_main_window'),
  getFloatingBallSettings: () => cmd<Record<string, unknown>>('get_floating_ball_settings'),
  setFloatingBallSettings: (patch: Record<string, unknown>) => cmd<Record<string, unknown>>('set_floating_ball_settings', { patch }),
  resetFloatingBallPosition: () => cmd<void>('reset_floating_ball_position'),

  // ===== i18n =====
  getAppI18n: () => cmd<{ locale: string; messages: Record<string, string> }>('get_app_i18n'),
  onAppLocaleChanged: (callback: (data: { locale: string }) => void) =>
    on('app-locale-changed', callback),

  // ===== Todo / 待办便签（P3 迁移）=====
  todoGet: () => cmd<unknown[]>('todo_get'),
  todoCreate: (input: Record<string, unknown>) => cmd<unknown[]>('todo_create', { input }),
  todoUpdate: (id: string, patch: Record<string, unknown>) => cmd<unknown[]>('todo_update', { id, patch }),
  todoDelete: (id: string) => cmd<unknown[]>('todo_delete', { id }),
  todoToggleDone: (id: string) => cmd<unknown[]>('todo_toggle_done', { id }),
  todoTogglePin: (id: string) => cmd<unknown[]>('todo_toggle_pin', { id }),
  /** 拖动排序：ids 为期望的全量顺序 */
  todoReorder: (ids: string[]) => cmd<unknown[]>('todo_reorder', { ids }),
  onTodoFocusItem: (callback: (id: string) => void) =>
    on('todo-focus-item', callback),
  onTodoDataChanged: (callback: (items: unknown[]) => void) =>
    on('todo-data-changed', callback),
  showTodoWindow: () => cmd<void>('todo_show_window'),
  closeTodoWindow: () => cmd<void>('todo_close_window'),
  todoWindowVisible: () => cmd<boolean>('todo_window_visible'),
  todoToggleAlwaysOnTop: () => cmd<boolean>('todo_toggle_always_on_top'),
  todoGetSettings: () => cmd<Record<string, unknown>>('todo_get_settings'),
  todoSetSettings: (patch: Record<string, unknown>) => cmd<Record<string, unknown>>('todo_set_settings', { patch }),
}

export function installApiBridge() {
  ;(window as unknown as { muerzhiAPI: unknown }).muerzhiAPI = muerzhiAPI
  log.info('[bridge] muerzhiAPI → Tauri 桥已注入')
}
