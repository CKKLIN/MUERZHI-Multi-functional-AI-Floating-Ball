import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSettingsStore = defineStore('settings', () => {
  const outputDir = ref('')
  const defaultFormat = ref<'webm' | 'mp4'>('mp4')
  const videoQuality = ref<'low' | 'medium' | 'high'>('high')
  const maxFps = ref(30)
  const cameraDeviceId = ref('')
  const microphoneDeviceId = ref('')
  const systemAudioSourceId = ref('')
  const drawColor = ref('#ff0000')
  const drawWidth = ref(3)
  const shortcuts = ref({
    startStop: 'Ctrl+Shift+R',
    pauseResume: 'Ctrl+Shift+P',
    toggleCamera: 'Ctrl+Shift+C',
    toggleDrawing: 'Ctrl+Shift+D',
  })

  function loadSettings() {
    try {
      const saved = localStorage.getItem('screen-recorder-settings')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.outputDir) outputDir.value = parsed.outputDir
        if (parsed.defaultFormat) defaultFormat.value = parsed.defaultFormat
        if (parsed.videoQuality) videoQuality.value = parsed.videoQuality
        if (parsed.maxFps) maxFps.value = parsed.maxFps
        if (parsed.cameraDeviceId) cameraDeviceId.value = parsed.cameraDeviceId
        if (parsed.microphoneDeviceId) microphoneDeviceId.value = parsed.microphoneDeviceId
        if (parsed.systemAudioSourceId) systemAudioSourceId.value = parsed.systemAudioSourceId
        if (parsed.drawColor) drawColor.value = parsed.drawColor
        if (parsed.drawWidth) drawWidth.value = parsed.drawWidth
        if (parsed.shortcuts) shortcuts.value = { ...shortcuts.value, ...parsed.shortcuts }
      }
    } catch {
      // Use defaults
    }
  }

  function saveSettings() {
    try {
      localStorage.setItem('screen-recorder-settings', JSON.stringify({
        outputDir: outputDir.value,
        defaultFormat: defaultFormat.value,
        videoQuality: videoQuality.value,
        maxFps: maxFps.value,
        cameraDeviceId: cameraDeviceId.value,
        microphoneDeviceId: microphoneDeviceId.value,
        systemAudioSourceId: systemAudioSourceId.value,
        drawColor: drawColor.value,
        drawWidth: drawWidth.value,
        shortcuts: shortcuts.value,
      }))
    } catch {
      // Storage full or unavailable
    }
  }

  async function initOutputDir() {
    if (!outputDir.value) {
      outputDir.value = await window.electronAPI.getDefaultSaveDir()
    }
  }

  return {
    outputDir,
    defaultFormat,
    videoQuality,
    maxFps,
    cameraDeviceId,
    microphoneDeviceId,
    systemAudioSourceId,
    drawColor,
    drawWidth,
    shortcuts,
    loadSettings,
    saveSettings,
    initOutputDir,
  }
})
