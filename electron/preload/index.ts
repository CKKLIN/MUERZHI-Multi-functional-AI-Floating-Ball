import { contextBridge, ipcRenderer } from 'electron'
import { writeFile as fsWriteFile, mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'

const electronAPI = {
  // Screen capture
  getSources: (types?: string[]) => ipcRenderer.invoke('get-sources', types),
  getSystemAudioSources: () => ipcRenderer.invoke('get-system-audio-sources'),

  // File dialogs
  showSaveDialog: (options?: {
    title?: string
    defaultPath?: string
    filters?: { name: string; extensions: string[] }[]
  }) => ipcRenderer.invoke('show-save-dialog', options),
  showOpenDialog: (options?: {
    title?: string
    defaultPath?: string
    filters?: { name: string; extensions: string[] }[]
    properties?: string[]
  }) => ipcRenderer.invoke('show-open-dialog', options),
  getDefaultSaveDir: () => ipcRenderer.invoke('get-default-save-dir'),

  // File I/O —— 直接在 preload 用 fs 写，绕过 IPC（避免 ArrayBuffer 跨进程复制
  // ≥2 次及主进程堆尖峰）。sandbox=false 允许 preload 使用 node 模块。
  writeFile: async (data: ArrayBuffer, filePath: string) => {
    try {
      await mkdir(dirname(filePath), { recursive: true })
      await fsWriteFile(filePath, new Uint8Array(data))
      return { success: true, filePath }
    } catch (err: any) {
      console.error('保存文件失败', filePath, err?.message)
      return { success: false, filePath, error: err?.message }
    }
  },
  // 本地视频流式播放 URL（local-video:// 协议，主进程注册），避免读整文件进内存
  toLocalVideoUrl: (filePath: string) =>
    `local-video:///${filePath.replace(/\\/g, '/')}`,
  readFile: (filePath: string) =>
    ipcRenderer.invoke('read-file', filePath),
  fileExists: (filePath: string) =>
    ipcRenderer.invoke('file-exists', filePath),
  deleteFile: (filePath: string) =>
    ipcRenderer.invoke('delete-file', filePath),
  getFileSize: (filePath: string) =>
    ipcRenderer.invoke('get-file-size', filePath),

  // FFmpeg
  convertToMp4: (inputPath: string, outputPath: string, crop?: { x: number; y: number; width: number; height: number }) =>
    ipcRenderer.invoke('convert-to-mp4', inputPath, outputPath, crop),
  cropVideo: (inputPath: string, outputPath: string, crop: { x: number; y: number; width: number; height: number }) =>
    ipcRenderer.invoke('crop-video', inputPath, outputPath, crop),
  convertToGif: (inputPath: string, outputPath: string, options?: {
    width?: number
    fps?: number
    duration?: number
  }) => ipcRenderer.invoke('convert-to-gif', inputPath, outputPath, options),
  mergeMultiScreen: (inputs: { filePath: string; bounds: { x: number; y: number; width: number; height: number } }[], outputPath: string) =>
    ipcRenderer.invoke('merge-multi-screen', inputs, outputPath),

  // Events
  onConversionProgress: (callback: (progress: { percent: number; targetSize: number }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, progress: any) => callback(progress)
    ipcRenderer.on('on-conversion-progress', handler)
    return () => ipcRenderer.removeListener('on-conversion-progress', handler)
  },
  onGlobalShortcut: (callback: (action: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, action: string) => callback(action)
    ipcRenderer.on('on-global-shortcut', handler)
    return () => ipcRenderer.removeListener('on-global-shortcut', handler)
  },
  onMainProcessMessage: (callback: (message: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, message: string) => callback(message)
    ipcRenderer.on('main-process-message', handler)
    return () => ipcRenderer.removeListener('main-process-message', handler)
  },
  onBeforeQuit: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('app-before-quit', handler)
    return () => ipcRenderer.removeListener('app-before-quit', handler)
  },

  // Shell
  openFileLocation: (filePath: string) => ipcRenderer.invoke('open-file-location', filePath),
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
  openPath: (filePath: string) => ipcRenderer.invoke('open-path', filePath),

  // App info
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  showAboutWindow: () => ipcRenderer.send('show-about-window'),
  closeAboutWindow: () => ipcRenderer.send('close-about-window'),

  // Window
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  showWindow: () => ipcRenderer.invoke('show-window'),
  maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),

  // Tray notifications
  notifyConversionStart: () => ipcRenderer.send('notify-conversion-start'),
  notifyConversionDone: (filePath: string) => ipcRenderer.send('notify-conversion-done', filePath),

  // Screen info
  getScreenScaleFactor: () => ipcRenderer.invoke('get-screen-scale-factor'),
  getScreenBounds: () => ipcRenderer.invoke('get-screen-bounds'),
  getAllDisplays: () => ipcRenderer.invoke('get-all-displays'),

  // Screenshot
  takeScreenshot: () => ipcRenderer.invoke('take-screenshot'),

  // Region selector
  selectRegion: () => ipcRenderer.invoke('select-region'),
  showRegionBorder: (region: { x: number; y: number; width: number; height: number }, audioState?: { micEnabled: boolean; sysEnabled: boolean; cameraEnabled?: boolean; cameraDeviceId?: string }) =>
    ipcRenderer.invoke('show-region-border', region, audioState),
  hideRegionBorder: () => ipcRenderer.invoke('hide-region-border'),
  hideBorderOnly: () => ipcRenderer.invoke('hide-border-only'),
  showFloatingIsland: (audioState?: { micEnabled: boolean; sysEnabled: boolean; cameraEnabled?: boolean; cameraDeviceId?: string }, targetDisplayId?: number) =>
    ipcRenderer.invoke('show-floating-island', audioState, targetDisplayId),
  hideFloatingIsland: () => ipcRenderer.invoke('hide-floating-island'),
  showAiIsland: () => ipcRenderer.invoke('show-ai-island'),
  hideAiIsland: () => ipcRenderer.invoke('hide-ai-island'),
  getAiIslandSettings: () => ipcRenderer.invoke('get-ai-island-settings'),
  setAiIslandSettings: (patch: Record<string, unknown>) => ipcRenderer.invoke('set-ai-island-settings', patch),
  hideCameraPreview: () => ipcRenderer.invoke('hide-camera-preview'),
  toggleCameraPreview: (show: boolean, cameraDeviceId?: string) =>
    ipcRenderer.invoke('toggle-camera-preview', show, cameraDeviceId),
  setIslandState: (state: 'idle' | 'recording' | 'paused', elapsedSeconds?: number) => ipcRenderer.invoke('set-island-state', state, elapsedSeconds),
  updateToolbarState: (state: 'idle' | 'recording' | 'paused', elapsedSeconds?: number) =>
    ipcRenderer.invoke('update-toolbar-state', state, elapsedSeconds),
  updateAudioLevels: (micLevel: number, sysLevel: number) =>
    ipcRenderer.send('update-audio-levels', micLevel, sysLevel),
  onToolbarAction: (callback: (action: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, action: string) => callback(action)
    ipcRenderer.on('on-toolbar-action', handler)
    return () => ipcRenderer.removeListener('on-toolbar-action', handler)
  },

  // Media devices
  getMediaDevices: () => {
    if (!navigator.mediaDevices?.enumerateDevices) return Promise.resolve([])
    return navigator.mediaDevices.enumerateDevices().then(
      devices => devices.map(d => ({
        deviceId: d.deviceId,
        kind: d.kind,
        label: d.label,
      }))
    )
  },

  // Recordings persistence
  loadRecordings: () => ipcRenderer.invoke('load-recordings'),
  saveRecordings: (recordings: unknown[]) => ipcRenderer.invoke('save-recordings', recordings),

  // Floating ball
  showFloatingBall: () => ipcRenderer.invoke('show-floating-ball'),
  hideFloatingBall: () => ipcRenderer.invoke('hide-floating-ball'),
  toggleFloatingBall: () => ipcRenderer.invoke('toggle-floating-ball'),
  onFloatingBallAction: (callback: (action: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, action: string) => callback(action)
    ipcRenderer.on('on-floating-ball-action', handler)
    return () => ipcRenderer.removeListener('on-floating-ball-action', handler)
  },

  // Agent bridge
  agentGetStatus: () => ipcRenderer.invoke('agent-get-status'),
  agentInstallHooks: () => ipcRenderer.invoke('agent-install-hooks'),
  agentUninstallHooks: () => ipcRenderer.invoke('agent-uninstall-hooks'),
  agentResolvePermission: (behavior: string) => ipcRenderer.invoke('agent-resolve-permission', behavior),
  agentDismissQuestion: () => ipcRenderer.invoke('agent-dismiss-question'),
  agentSubmitQuestion: (sessionId: string, answers: Record<string, unknown>) => ipcRenderer.invoke('agent-submit-question', sessionId, answers),
  agentSetAutoAllow: (enabled: boolean) => ipcRenderer.invoke('agent-set-auto-allow', enabled),
  agentGetAutoAllow: () => ipcRenderer.invoke('agent-get-auto-allow'),
  onAgentStateUpdate: (callback: (data: any) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: any) => callback(data)
    ipcRenderer.on('agent-state-update', handler)
    return () => ipcRenderer.removeListener('agent-state-update', handler)
  },
  onAgentPermissionRequest: (callback: (data: any) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: any) => callback(data)
    ipcRenderer.on('agent-permission-request', handler)
    return () => ipcRenderer.removeListener('agent-permission-request', handler)
  },
  showAiWindow: () => ipcRenderer.invoke('show-ai-window'),
  showSettingsWindow: () => ipcRenderer.invoke('show-settings-window'),
  showMainWindow: () => ipcRenderer.invoke('show-main-window'),
  getFloatingBallSettings: () => ipcRenderer.invoke('get-floating-ball-settings'),
  setFloatingBallSettings: (patch: Partial<{ visible: boolean; alwaysOnTop: boolean; openAtLogin: boolean }>) =>
    ipcRenderer.invoke('set-floating-ball-settings', patch),
  resetFloatingBallPosition: () => ipcRenderer.invoke('reset-floating-ball-position'),

  // Todo / 待办便签
  todoGet: () => ipcRenderer.invoke('todo-get'),
  todoCreate: (input: { type: 'todo' | 'memo'; title?: string; content?: string; priority?: string; reminder?: string | null; done?: boolean }) =>
    ipcRenderer.invoke('todo-create', input),
  todoUpdate: (id: string, patch: Record<string, unknown>) => ipcRenderer.invoke('todo-update', id, patch),
  todoDelete: (id: string) => ipcRenderer.invoke('todo-delete', id),
  todoToggleDone: (id: string) => ipcRenderer.invoke('todo-toggle-done', id),
  showTodoWindow: () => ipcRenderer.invoke('todo-show-window'),
  closeTodoWindow: () => ipcRenderer.invoke('todo-close-window'),
  todoWindowVisible: () => ipcRenderer.invoke('todo-window-visible'),
  todoToggleAlwaysOnTop: () => ipcRenderer.invoke('todo-toggle-always-on-top'),
  todoGetSettings: () => ipcRenderer.invoke('todo-get-settings'),
  todoSetSettings: (patch: Record<string, unknown>) => ipcRenderer.invoke('todo-set-settings', patch),
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)
