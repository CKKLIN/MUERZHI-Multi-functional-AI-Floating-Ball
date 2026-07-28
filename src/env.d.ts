export interface CaptureSource {
  id: string
  name: string
  display_id: string
  appIcon: string | null
  thumbnail: string
}

export interface ConversionProgress {
  percent: number
  targetSize: number
}

export interface Recording {
  id: string
  filePath: string
  fileName: string
  duration: number
  fileSize: number
  createdAt: number
  thumbnail?: string
  width?: number
  height?: number
}

export interface SaveDialogOptions {
  title?: string
  defaultPath?: string
  filters?: { name: string; extensions: string[] }[]
}

export interface SaveDialogResult {
  canceled: boolean
  filePath: string | null
}

export interface ElectronAPI {
  // Screen capture
  getSources: (types?: string[]) => Promise<CaptureSource[]>
  getSystemAudioSources: () => Promise<{ id: string; name: string }[]>

  // File dialogs
  showSaveDialog: (options?: SaveDialogOptions) => Promise<SaveDialogResult>
  showOpenDialog: (options?: SaveDialogOptions) => Promise<{ canceled: boolean; filePaths: string[] }>
  getDefaultSaveDir: () => Promise<string>

  // File I/O
  writeFile: (data: ArrayBuffer, filePath: string) => Promise<{ success: boolean; filePath: string }>
  readFile: (filePath: string) => Promise<ArrayBuffer>
  fileExists: (filePath: string) => Promise<boolean>
  deleteFile: (filePath: string) => Promise<boolean>
  getFileSize: (filePath: string) => Promise<number>

  // FFmpeg
  convertToMp4: (inputPath: string, outputPath: string) => Promise<{
    success: boolean
    outputPath: string
    error?: string
  }>
  convertToGif: (inputPath: string, outputPath: string, options?: {
    width?: number
    fps?: number
    duration?: number
  }) => Promise<{ success: boolean; outputPath: string; error?: string }>
  mergeMultiScreen: (inputs: { filePath: string; bounds: { x: number; y: number; width: number; height: number } }[], outputPath: string) => Promise<{ success: boolean; outputPath: string; error?: string }>

  // Events
  onConversionProgress: (callback: (progress: ConversionProgress) => void) => () => void
  onGlobalShortcut: (callback: (action: string) => void) => () => void
  onMainProcessMessage: (callback: (message: string) => void) => () => void
  onBeforeQuit: (callback: () => void) => () => void

  // Shell
  openFileLocation: (filePath: string) => Promise<void>
  openExternal: (url: string) => Promise<void>
  openPath: (filePath: string) => Promise<void>

  // App info
  getAppVersion: () => Promise<string>
  showAboutWindow: () => void

  // Screen info
  getScreenScaleFactor: () => Promise<number>
  getScreenBounds: () => Promise<{ x: number; y: number; width: number; height: number }>
  getAllDisplays: () => Promise<{ id: number; label: string; bounds: { x: number; y: number; width: number; height: number }; scaleFactor: number; size: { width: number; height: number }; isPrimary: boolean; sourceId: string | null; sourceName: string; thumbnail: string }[]>

  // Window
  minimizeWindow: () => Promise<void>
  showWindow: () => Promise<void>
  maximizeWindow: () => Promise<void>
  closeWindow: () => Promise<void>

  // Tray notifications
  notifyConversionStart: () => void
  notifyConversionDone: (filePath: string) => void

  // Region selector
  selectRegion: () => Promise<{ x: number; y: number; width: number; height: number; sourceId: string } | null>
  showRegionBorder: (region: { x: number; y: number; width: number; height: number }, audioState?: { micEnabled: boolean; sysEnabled: boolean }) => Promise<void>
  hideRegionBorder: () => Promise<void>
  hideBorderOnly: () => Promise<void>
  showFloatingIsland: (audioState?: { micEnabled: boolean; sysEnabled: boolean }, targetDisplayId?: number) => Promise<void>
  hideFloatingIsland: () => Promise<void>
  setIslandState: (state: 'idle' | 'recording' | 'paused', elapsedSeconds?: number) => Promise<void>
  updateToolbarState: (state: 'idle' | 'recording' | 'paused', elapsedSeconds?: number) => Promise<void>
  updateAudioLevels: (micLevel: number, sysLevel: number) => void
  onToolbarAction: (callback: (action: string) => void) => () => void

  // Media devices
  getMediaDevices: () => Promise<MediaDeviceInfo[]>

  // Recordings persistence
  loadRecordings: () => Promise<Recording[]>
  saveRecordings: (recordings: Recording[]) => Promise<boolean>

  // Scheduled recording
  onScheduledRecording: (callback: () => void) => () => void

  // Agent bridge
  agentGetStatus: () => Promise<AgentBridgeStatus | null>
  agentInstallHooks: () => Promise<AgentBridgeStatus | null>
  agentUninstallHooks: () => Promise<AgentBridgeStatus | null>
  agentSetAutoStart: (enabled: boolean) => Promise<void>
  agentResolvePermission: (behavior: string) => Promise<void>
  showSettingsWindow: () => Promise<void>
  onAgentStateUpdate: (callback: (data: AgentStatePayload) => void) => () => void
  onAgentPermissionRequest: (callback: (data: AgentPermissionPayload) => void) => () => void
}

export interface AgentStatePayload {
  state: string
  sessions: {
    sessionId: string
    agentId: string
    state: string
    toolName?: string
    contextUsage?: { used: number; limit: number }
    model?: string
    updatedAt: number
  }[]
}

export interface AgentPermissionPayload {
  sessionId: string
  toolName: string
  toolInput: any
  suggestions: string[] | null
}

export interface AgentBridgeStatus {
  serverRunning: boolean
  port: number | null
  hookInstalled: boolean | null
  displayState: string
  pendingPermission: AgentPermissionPayload | null
  sessionCount: number
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}
