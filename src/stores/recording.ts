import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export type RecordingState = 'idle' | 'selecting' | 'recording' | 'paused' | 'converting'

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

export const useRecordingStore = defineStore('recording', () => {
  const state = ref<RecordingState>('idle')
  const recordings = ref<Recording[]>([])
  const selectedSource = ref<{ id: string; name: string; thumbnail: string } | null>(null)
  const recordingMode = ref<'full' | 'region' | 'allscreens'>('full')
  const multiScreenSources = ref<{ sourceId: string; bounds: { x: number; y: number; width: number; height: number } }[]>([])
  const selectedRegion = ref<{ x: number; y: number; width: number; height: number } | null>(null)
  const isCameraEnabled = ref(false)
  const isSystemAudioEnabled = ref(false)
  const isMicrophoneEnabled = ref(false)
  const isDrawingEnabled = ref(false)
  const elapsedSeconds = ref(0)
  const conversionProgress = ref(0)
  const currentOutputPath = ref('')

  const isRecording = computed(() => state.value === 'recording')
  const isPaused = computed(() => state.value === 'paused')
  const canStart = computed(() => state.value === 'idle')
  const canPause = computed(() => state.value === 'recording')
  const canResume = computed(() => state.value === 'paused')
  const canStop = computed(() => state.value === 'recording' || state.value === 'paused')

  function setState(newState: RecordingState) {
    state.value = newState
  }

  function resetState() {
    state.value = 'idle'
    elapsedSeconds.value = 0
    conversionProgress.value = 0
    currentOutputPath.value = ''
    selectedSource.value = null
    recordingMode.value = 'full'
    selectedRegion.value = null
    multiScreenSources.value = []
    isCameraEnabled.value = false
    isDrawingEnabled.value = false
  }

  async function addRecording(recording: Recording) {
    recordings.value.unshift(recording)
    saveRecordings()
  }

  async function removeRecording(id: string) {
    recordings.value = recordings.value.filter(r => r.id !== id)
    saveRecordings()
  }

  function loadRecordings() {
    try {
      const saved = localStorage.getItem('screen-recorder-recordings')
      if (saved) {
        recordings.value = JSON.parse(saved)
      }
    } catch {
      recordings.value = []
    }
  }

  function saveRecordings() {
    try {
      localStorage.setItem('screen-recorder-recordings', JSON.stringify(recordings.value))
    } catch {
      // Storage full
    }
  }

  return {
    state,
    recordings,
    selectedSource,
    recordingMode,
    multiScreenSources,
    selectedRegion,
    isCameraEnabled,
    isSystemAudioEnabled,
    isMicrophoneEnabled,
    isDrawingEnabled,
    elapsedSeconds,
    conversionProgress,
    currentOutputPath,
    isRecording,
    isPaused,
    canStart,
    canPause,
    canResume,
    canStop,
    setState,
    resetState,
    addRecording,
    removeRecording,
    loadRecordings,
    saveRecordings,
  }
})
