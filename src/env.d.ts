export interface CaptureSource {
  id: string
  name: string
  display_id: string
  appIcon: string | null
  thumbnail: string
}

export interface FloatingBallSettings {
  visible: boolean
  alwaysOnTop: boolean
  openAtLogin: boolean
}

export interface AiIslandSettings {
  flat: boolean
}

export type TodoType = 'todo' | 'memo'
export type TodoPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface TodoItem {
  id: string
  type: TodoType
  title: string
  content: string
  priority: TodoPriority
  reminder: string | null
  reminderFired: boolean
  done: boolean
  createdAt: number
  updatedAt: number
}

export interface TodoSettings {
  badgeVisible: boolean
  windowAlwaysOnTop: boolean
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
  toLocalVideoUrl: (filePath: string) => string
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
  agentResolvePermission: (behavior: string) => Promise<void>
  agentDismissQuestion: () => Promise<void>
  agentSubmitQuestion: (sessionId: string, answers: Record<string, unknown>) => Promise<void>
  agentSetAutoAllow: (enabled: boolean) => Promise<void>
  agentGetAutoAllow: () => Promise<boolean>
  onAgentStateUpdate: (callback: (data: AgentStatePayload) => void) => () => void
  onAgentPermissionRequest: (callback: (data: AgentPermissionPayload) => void) => () => void
  showAiWindow: () => Promise<void>
  showSettingsWindow: () => Promise<void>
  showMainWindow: () => Promise<void>
  getFloatingBallSettings: () => Promise<FloatingBallSettings>
  setFloatingBallSettings: (patch: Partial<FloatingBallSettings>) => Promise<FloatingBallSettings>
  resetFloatingBallPosition: () => Promise<void>
  showAiIsland: () => Promise<void>
  hideAiIsland: () => Promise<void>
  getAiIslandSettings: () => Promise<AiIslandSettings>
  setAiIslandSettings: (patch: Partial<AiIslandSettings>) => Promise<AiIslandSettings>

  // Todo / 待办便签
  todoGet: () => Promise<TodoItem[]>
  todoCreate: (input: Partial<TodoItem> & Pick<TodoItem, 'type'>) => Promise<TodoItem[]>
  todoUpdate: (id: string, patch: Partial<Omit<TodoItem, 'id' | 'createdAt'>>) => Promise<TodoItem[]>
  todoDelete: (id: string) => Promise<TodoItem[]>
  todoToggleDone: (id: string) => Promise<TodoItem[]>
  showTodoWindow: () => Promise<void>
  closeTodoWindow: () => Promise<void>
  todoWindowVisible: () => Promise<boolean>
  todoToggleAlwaysOnTop: () => Promise<boolean>
  todoGetSettings: () => Promise<TodoSettings>
  todoSetSettings: (patch: Partial<TodoSettings>) => Promise<TodoSettings>
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

export type AgentCardPayload =
  | ({ kind: 'permission' } & AgentPermissionPayload)
  | { kind: 'question'; sessionId: string; toolName: string; toolInput: any; questions: any[] | null; answerable: boolean }

export interface AgentBridgeStatus {
  serverRunning: boolean
  port: number | null
  hookInstalled: boolean | null
  displayState: string
  currentCard: AgentCardPayload | null
  sessionCount: number
  claudeRunning: boolean
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}
