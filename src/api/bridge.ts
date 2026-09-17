// electronAPI → Tauri 桥（P0 stub 版）
// 目标：在 Tauri/WebView2 环境下提供与 electron/preload/index.ts 完全同名的 window.electronAPI，
// 使 src/ 下渲染层代码零改动。P1 桥阶段逐个把 stub 换成真 invoke/listen 映射。
//
// 实现约定：
// - invoke('<camel-command>', { args })：Rust 侧命令用 snake_case，invoke 用 camelCase 参数名
// - 事件订阅：tauri.event.listen(channel, handler)，退订函数返回 Promise<UnlistenFn>
// - P0 阶段未迁移的子系统返回安全 stub（不抛错，避免 UI 崩），并打一次 console.warn

import { invoke as tauriInvoke } from '@tauri-apps/api/core'
import { listen as tauriListen, type UnlistenFn } from '@tauri-apps/api/event'

type Progress = { percent: number; targetSize: number }

function warnOnce(name: string) {
  const flagged = new Set<string>()
  return (fn: string) => {
    if (!flagged.has(fn)) {
      flagged.add(fn)
      console.warn(`[bridge] ${name}.${fn} 尚未迁移（P1 桥阶段实现），返回 stub 值`)
    }
  }
}
const w = warnOnce('electronAPI')

async function cmd<T>(name: string, args?: Record<string, unknown>): Promise<T> {
  return tauriInvoke(name, args) as Promise<T>
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

const electronAPI = {
  // ===== Screen capture（P4 录制管线迁移）=====
  getSources: (_types?: string[]) => {
    w('getSources')
    return Promise.resolve([])
  },
  getSystemAudioSources: () => {
    w('getSystemAudioSources')
    return Promise.resolve([])
  },

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
  toLocalVideoUrl: (filePath: string) =>
    `local-video:///${filePath.replace(/\\/g, '/')}`,
  readFile: (filePath: string) => cmd<ArrayBuffer>('read_file', { filePath }),
  fileExists: (filePath: string) => cmd<boolean>('file_exists', { filePath }),
  deleteFile: (filePath: string) => cmd<boolean>('delete_file', { filePath }),
  getFileSize: (filePath: string) => cmd<number>('get_file_size', { filePath }),

  // ===== FFmpeg（P3 media 迁移）=====
  convertToMp4: (inputPath: string, outputPath: string, crop?: { x: number; y: number; width: number; height: number }) => {
    w('convertToMp4')
    return cmd<{ success: boolean; outputPath: string; error?: string }>('convert_to_mp4', { inputPath, outputPath, crop })
  },
  cropVideo: (inputPath: string, outputPath: string, crop: { x: number; y: number; width: number; height: number }) => {
    w('cropVideo')
    return cmd<{ success: boolean; outputPath: string; error?: string }>('crop_video', { inputPath, outputPath, crop })
  },
  convertToGif: (inputPath: string, outputPath: string, options?: { width?: number; fps?: number; duration?: number }) => {
    w('convertToGif')
    return cmd<{ success: boolean; outputPath: string; error?: string }>('convert_to_gif', { inputPath, outputPath, options })
  },
  mergeMultiScreen: (inputs: { filePath: string; bounds: { x: number; y: number; width: number; height: number } }[], outputPath: string) => {
    w('mergeMultiScreen')
    return cmd<{ success: boolean; outputPath: string; error?: string }>('merge_multi_screen', { inputs, outputPath })
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
  openPath: async (filePath: string) => {
    try {
      const { openPath } = await import('@tauri-apps/plugin-opener')
      await openPath(filePath)
    } catch (e) {
      console.error('openPath failed', e)
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

  // ===== Screenshot（P4 迁移）=====
  takeScreenshot: () => {
    w('takeScreenshot')
    return cmd<string>('take_screenshot')
  },

  // ===== Region selector（P2 窗口体系迁移）=====
  selectRegion: () => {
    w('selectRegion')
    return cmd<null>('select_region')
  },
  showRegionBorder: (_region: { x: number; y: number; width: number; height: number }, _audioState?: { micEnabled: boolean; sysEnabled: boolean; cameraEnabled?: boolean; cameraDeviceId?: string }) => cmd<void>('show_region_border'),
  hideRegionBorder: () => cmd<void>('hide_region_border'),
  hideBorderOnly: () => cmd<void>('hide_border_only'),
  showFloatingIsland: (_audioState?: { micEnabled: boolean; sysEnabled: boolean; cameraEnabled?: boolean; cameraDeviceId?: string }, _targetDisplayId?: number) => cmd<void>('show_floating_island'),
  hideFloatingIsland: () => cmd<void>('hide_floating_island'),
  showAiIsland: () => cmd<void>('show_ai_island'),
  hideAiIsland: () => cmd<void>('hide_ai_island'),
  getAiIslandSettings: () => cmd<{ flat: boolean }>('get_ai_island_settings'),
  setAiIslandSettings: (patch: Record<string, unknown>) => cmd<{ flat: boolean }>('set_ai_island_settings', { patch }),
  hideCameraPreview: () => cmd<void>('hide_camera_preview'),
  toggleCameraPreview: (show: boolean, cameraDeviceId?: string) => cmd<void>('toggle_camera_preview', { show, cameraDeviceId }),
  setIslandState: (state: 'idle' | 'recording' | 'paused', elapsedSeconds?: number) => cmd<void>('set_island_state', { state, elapsedSeconds }),
  updateToolbarState: (state: 'idle' | 'recording' | 'paused', elapsedSeconds?: number) => cmd<void>('update_toolbar_state', { state, elapsedSeconds }),
  updateAudioLevels: (micLevel: number, sysLevel: number) => { tauriInvoke('update_audio_levels', { micLevel, sysLevel }) },
  onToolbarAction: (callback: (action: string) => void) =>
    on('on-toolbar-action', callback),

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

export function installElectronApiBridge() {
  ;(window as unknown as { electronAPI: unknown }).electronAPI = electronAPI
  console.info('[bridge] electronAPI → Tauri 桥已注入（P0 stub 版）')
}
