import { contextBridge, ipcRenderer } from 'electron'

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

  // File I/O
  writeFile: (data: ArrayBuffer, filePath: string) =>
    ipcRenderer.invoke('write-file', Buffer.from(data), filePath),
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
  showMainWindow: () => ipcRenderer.invoke('show-main-window'),
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)
