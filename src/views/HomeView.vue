<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick, computed } from 'vue'
import Layout from '../components/Layout.vue'
import RecordingControls from '../components/RecordingControls.vue'
import RecordingTimer from '../components/RecordingTimer.vue'
import AudioMeter from '../components/AudioMeter.vue'
import CameraOverlay from '../components/CameraOverlay.vue'
import DrawingCanvas from '../components/DrawingCanvas.vue'
import DrawingToolbar from '../components/DrawingToolbar.vue'
import RecordingsList from '../components/RecordingsList.vue'
import VideoPlayer from '../components/VideoPlayer.vue'
import SettingsPanel from '../components/SettingsPanel.vue'
import ConversionDialog from '../components/ConversionDialog.vue'
import { useRecordingStore, type Recording } from '../stores/recording'
import { useSettingsStore } from '../stores/settings'
import { useRecording } from '../composables/useRecording'
import { useAudioCapture } from '../composables/useAudioCapture'

const store = useRecordingStore()
const settingsStore = useSettingsStore()
const recording = useRecording()
const audio = useAudioCapture()

// UI 状态
const activeTab = ref<'record' | 'settings'>('record')
const showVideoPlayer = ref(false)
const showConversion = ref(false)
const playingRecording = ref<Recording | null>(null)
const conversionTarget = ref<'gif'>('gif')
const convertingFile = ref('')

// 悬浮球操作处理映射
const floatingBallActions: Record<string, () => void> = {
  fullscreen: () => handleFullscreen(),
  region: () => handleSelectRegion(),
  screenshot: () => handleScreenshot(),
  settings: () => { activeTab.value = 'settings' },
  record: () => { activeTab.value = 'record' },
}

// 多显示器下拉菜单
const showScreenDropdown = ref(false)
const screens = ref<{ id: number; label: string; isPrimary: boolean; sourceId: string | null; sourceName: string; thumbnail: string }[]>([])
const targetDisplayId = ref<number | undefined>(undefined)

// 预览视频元素
const previewVideoRef = ref<HTMLVideoElement | null>(null)

// 预览音频电平（悬浮岛/工具栏显示时调用，用于试音）
let previewMicTracks: MediaStreamTrack[] = []
let previewSysTracks: MediaStreamTrack[] = []
async function startAudioPreview() {
  await audio.cleanup()
  previewMicTracks = []
  previewSysTracks = []
  if (store.isMicrophoneEnabled) {
    previewMicTracks = await audio.startMicrophone(settingsStore.microphoneDeviceId || undefined)
  }
  if (store.isSystemAudioEnabled && settingsStore.systemAudioSourceId) {
    previewSysTracks = await audio.startSystemAudio(settingsStore.systemAudioSourceId)
  }
  if (previewMicTracks.length > 0 || previewSysTracks.length > 0) {
    audio.startLevelMonitoring(previewMicTracks, previewSysTracks)
  }
}

// 录制事件处理
async function handleStart() {
  if (!store.selectedSource && store.recordingMode !== 'region') return

  try {
    // 清理预览音频，重新获取全新轨道用于录制
    await audio.cleanup()
    previewMicTracks = []
    previewSysTracks = []
    const micTracks: MediaStreamTrack[] = []
    const sysTracks: MediaStreamTrack[] = []

    if (store.isMicrophoneEnabled) {
      micTracks.push(...await audio.startMicrophone(settingsStore.microphoneDeviceId || undefined))
    }
    if (store.isSystemAudioEnabled && settingsStore.systemAudioSourceId) {
      sysTracks.push(...await audio.startSystemAudio(settingsStore.systemAudioSourceId))
    }
    const audioTracks = [...micTracks, ...sysTracks]
    if (audioTracks.length > 0) {
      audio.startLevelMonitoring(micTracks, sysTracks)
    }

    // 摄像头预览由独立的悬浮窗负责，主窗口不需要创建摄像头流

    // 区域模式下获取屏幕源 ID
    let sourceId = store.selectedSource?.id || ''
    const region = store.recordingMode === 'region' ? store.selectedRegion! : undefined
    if (!sourceId && region) {
      const sources = await window.electronAPI.getSources(['screen'])
      if (sources.length > 0) {
        sourceId = sources[0].id
      }
    }

    // 开始录制
    const multiScreen = store.recordingMode === 'allscreens' && store.multiScreenSources.length > 0
      ? store.multiScreenSources
      : undefined
    await recording.startCapture(sourceId, region, audioTracks.length > 0 ? audioTracks : undefined, multiScreen)
  } catch (err: any) {
    alert(err.message)
    audio.cleanup()
    window.electronAPI.hideRegionBorder()
    window.electronAPI.showWindow()
    store.resetState()
  }
}

function handlePause() {
  recording.pause()
}

function handleResume() {
  recording.resume()
}

async function handleStop() {
  window.electronAPI.hideRegionBorder()
  recording.stop()
  await audio.cleanup()
  previewMicTracks = []
  previewSysTracks = []
  stopCamera()
  window.electronAPI.showAiIsland()
}

// 摄像头控制
async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: 320,
        height: 240,
        deviceId: settingsStore.cameraDeviceId ? { exact: settingsStore.cameraDeviceId } : undefined,
      },
    })
    recording.cameraStream.value = stream
    store.isCameraEnabled = true
  } catch {
    store.isCameraEnabled = false
    console.warn('摄像头启动失败')
  }
}

function stopCamera() {
  recording.cameraStream.value?.getTracks().forEach(t => t.stop())
  recording.cameraStream.value = null
  store.isCameraEnabled = false
}

async function handleFullscreen() {
  const sources = await window.electronAPI.getSources(['screen'])
  const displays = await window.electronAPI.getAllDisplays()

  if (sources.length <= 1 || displays.length <= 1) {
    // 单屏：直接全屏录制
    if (sources.length > 0) {
      store.selectedSource = { id: sources[0].id, name: '全屏录制', thumbnail: sources[0].thumbnail }
      store.recordingMode = 'full'
      store.selectedRegion = null
      targetDisplayId.value = undefined
      if (store.isCameraEnabled && recording.cameraStream.value) {
        recording.cameraStream.value?.getTracks().forEach(t => t.stop())
        recording.cameraStream.value = null
      }
      window.electronAPI.minimizeWindow()
      await new Promise(r => setTimeout(r, 200))
      window.electronAPI.hideAiIsland()
      await window.electronAPI.showFloatingIsland({ micEnabled: store.isMicrophoneEnabled, sysEnabled: store.isSystemAudioEnabled, cameraEnabled: store.isCameraEnabled, cameraDeviceId: settingsStore.cameraDeviceId })
      if (store.isMicrophoneEnabled || (store.isSystemAudioEnabled && settingsStore.systemAudioSourceId)) {
        startAudioPreview()
      }
    }
  } else {
    // 多屏：显示下拉菜单
    screens.value = displays
    showScreenDropdown.value = !showScreenDropdown.value
  }
}

async function selectScreen(displayId?: number) {
  showScreenDropdown.value = false

  const selectedDisplay = displayId != null
    ? screens.value.find(s => s.id === displayId)
    : null
  const label = selectedDisplay ? selectedDisplay.label : '全部屏幕'

  if (displayId != null) {
    // 单个屏幕
    const sourceId = selectedDisplay?.sourceId || screens.value[0]?.sourceId
    if (!sourceId) return
    store.selectedSource = { id: sourceId, name: `全屏录制 - ${label}`, thumbnail: selectedDisplay?.thumbnail || '' }
    store.recordingMode = 'full'
    store.multiScreenSources = []
  } else {
    // 全部屏幕：收集所有屏幕的 sourceId 和 bounds
    const allSources = screens.value
      .filter(s => s.sourceId)
      .map(s => ({
        sourceId: s.sourceId!,
        bounds: { ...s.bounds },
      }))
    if (allSources.length === 0) return
    store.selectedSource = { id: allSources[0].sourceId, name: `全屏录制 - 全部屏幕`, thumbnail: '' }
    store.recordingMode = 'allscreens'
    store.multiScreenSources = allSources
  }
  store.selectedRegion = null
  targetDisplayId.value = displayId

  if (store.isCameraEnabled && recording.cameraStream.value) {
    recording.cameraStream.value?.getTracks().forEach(t => t.stop())
    recording.cameraStream.value = null
  }
  window.electronAPI.minimizeWindow()
  await new Promise(r => setTimeout(r, 200))

  // 悬浮岛显示在主屏幕（目标显示器或主显示器）
  const islandDisplayId = displayId ?? undefined
  window.electronAPI.hideAiIsland()
  await window.electronAPI.showFloatingIsland(
    { micEnabled: store.isMicrophoneEnabled, sysEnabled: store.isSystemAudioEnabled, cameraEnabled: store.isCameraEnabled, cameraDeviceId: settingsStore.cameraDeviceId },
    islandDisplayId,
  )
  if (store.isMicrophoneEnabled || (store.isSystemAudioEnabled && settingsStore.systemAudioSourceId)) {
    startAudioPreview()
  }
}

async function handleSelectRegion() {
  const region = await window.electronAPI.selectRegion()
  if (region) {
    store.selectedRegion = region
    store.recordingMode = 'region'
    store.selectedSource = { id: region.sourceId, name: `区域录制 ${Math.round(region.width)}×${Math.round(region.height)}`, thumbnail: '' }
    // 停止主窗口摄像头流，预览窗口将接管
    if (store.isCameraEnabled && recording.cameraStream.value) {
      recording.cameraStream.value?.getTracks().forEach(t => t.stop())
      recording.cameraStream.value = null
    }
    window.electronAPI.showRegionBorder(region, { micEnabled: store.isMicrophoneEnabled, sysEnabled: store.isSystemAudioEnabled, cameraEnabled: store.isCameraEnabled, cameraDeviceId: settingsStore.cameraDeviceId })
    window.electronAPI.minimizeWindow()
    window.electronAPI.hideAiIsland()
    if (store.isMicrophoneEnabled || (store.isSystemAudioEnabled && settingsStore.systemAudioSourceId)) {
      startAudioPreview()
    }
  }
}

// 截图：截取全屏保存到桌面
async function handleScreenshot() {
  try {
    await window.electronAPI.takeScreenshot()
  } catch (err: any) {
    console.error('截图失败', err)
  }
}

// 录制列表事件
function handlePlayRecording(rec: Recording) {
  window.electronAPI.openPath(rec.filePath)
}

function handleExportGif(rec: Recording) {
  convertingFile.value = rec.filePath
  conversionTarget.value = 'gif'
  showConversion.value = true
}

async function handleDeleteRecording(id: string) {
  const rec = store.recordings.find(r => r.id === id)
  if (rec) {
    await window.electronAPI.deleteFile(rec.filePath)
  }
  store.removeRecording(id)
}

// 绘制标注回调
function handleDrawAnnotations(fn: (ctx: CanvasRenderingContext2D) => void) {
  recording.setDrawAnnotations(fn)
}

// 摄像头位置更新
function handleCameraPositionUpdate(pos: { x: number; y: number; width: number; height: number }) {
  recording.setCameraPosition(pos)
}

// 切换功能
function toggleCamera() {
  store.isCameraEnabled = !store.isCameraEnabled
  if (store.isCameraEnabled) {
    startCamera()
  } else {
    stopCamera()
  }
  // 录制前状态：同步摄像头预览窗口
  if (store.canStart) {
    window.electronAPI.toggleCameraPreview(store.isCameraEnabled, settingsStore.cameraDeviceId)
  }
}

function toggleMic() {
  store.isMicrophoneEnabled = !store.isMicrophoneEnabled
  settingsStore.saveSettings()
  if (store.isMicrophoneEnabled && store.canStart) {
    startAudioPreview()
  }
}

function toggleSystemAudio() {
  store.isSystemAudioEnabled = !store.isSystemAudioEnabled
  settingsStore.saveSettings()
}

function toggleDrawing() {
  store.isDrawingEnabled = !store.isDrawingEnabled
}

// 点击外部关闭下拉菜单
function onClickOutside(e: MouseEvent) {
  if (showScreenDropdown.value) {
    const target = e.target as HTMLElement
    if (!target.closest('.fullscreen-wrapper')) {
      showScreenDropdown.value = false
    }
  }
}

// 全局快捷键
const cleanupShortcut = window.electronAPI.onGlobalShortcut((action: string) => {
  if (action === 'startStop') {
    if (store.canStart) handleStart()
    else if (store.canStop) handleStop()
  } else if (action === 'pauseResume') {
    if (store.canPause) handlePause()
    else if (store.canResume) handleResume()
  }
})

// 边框工具栏按钮事件
const cleanupToolbar = window.electronAPI.onToolbarAction((action: string) => {
  if (action === 'start' && store.canStart) handleStart()
  else if (action === 'pause' && store.canPause) handlePause()
  else if (action === 'resume' && store.canResume) handleResume()
  else if (action === 'stop' && store.canStop) handleStop()
  else if (action === 'toggle-mic' && store.canStart) toggleMic()
  else if (action === 'toggle-sys' && store.canStart) toggleSystemAudio()
  else if (action === 'toggle-camera' && store.canStart) toggleCamera()
  else if (action === 'close') {
    window.electronAPI.hideFloatingIsland()
    window.electronAPI.hideRegionBorder()
    if (store.canStop) {
      handleStop()
    } else {
      window.electronAPI.showWindow()
      store.resetState()
      window.electronAPI.showAiIsland()
    }
  }
})

// 应用内快捷键
function onKeyDown(e: KeyboardEvent) {
  if (e.ctrlKey && e.shiftKey && e.key === 'R') {
    e.preventDefault()
    if (store.canStart) handleStart()
    else if (store.canStop) handleStop()
  }
  if (e.ctrlKey && e.shiftKey && e.key === 'P') {
    e.preventDefault()
    if (store.canPause) handlePause()
    else if (store.canResume) handleResume()
  }
  if (e.ctrlKey && e.shiftKey && e.key === 'C') {
    e.preventDefault()
    if (store.canStart) toggleCamera()
  }
  if (e.ctrlKey && e.shiftKey && e.key === 'D') {
    e.preventDefault()
    if (store.canStart) toggleDrawing()
  }
  if (e.key === 'Escape') {
    if (showVideoPlayer.value) showVideoPlayer.value = false
  }
}

// 录制状态变化时同步更新边框工具栏和悬浮岛
watch(() => store.state, (state) => {
  if (state === 'recording') {
    window.electronAPI.updateToolbarState('recording', store.elapsedSeconds)
    window.electronAPI.setIslandState('recording', store.elapsedSeconds)
  } else if (state === 'paused') {
    window.electronAPI.updateToolbarState('paused')
    window.electronAPI.setIslandState('paused')
  } else {
    window.electronAPI.updateToolbarState('idle')
    window.electronAPI.hideFloatingIsland()
    window.electronAPI.showAiIsland()
  }
})

onMounted(() => {
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('click', onClickOutside)
  const cleanupBeforeQuit = window.electronAPI.onBeforeQuit(() => {
    recording.stop()
    stopCamera()
    audio.cleanup()
    window.electronAPI.hideRegionBorder()
    window.electronAPI.hideFloatingBall()
  })

  // 显示系统级悬浮球
  window.electronAPI.showFloatingBall()

  // 监听悬浮球操作
  const cleanupBallAction = window.electronAPI.onFloatingBallAction((action: string) => {
    const handler = floatingBallActions[action]
    if (handler) handler()
  })

  // 定时将音频电平转发给工具栏窗口（仅在音频激活时）
  const audioLevelInterval = setInterval(() => {
    if (store.state === 'idle' && !store.isMicrophoneEnabled && !store.isSystemAudioEnabled) return
    // 主窗口最小化/隐藏时（录制中常见），转发电平无意义，跳过
    if (document.hidden) return
    window.electronAPI.updateAudioLevels(
      store.isMicrophoneEnabled ? audio.micLevel.value : -1,
      store.isSystemAudioEnabled ? audio.sysLevel.value : -1
    )
  }, 50)
  onUnmounted(() => clearInterval(audioLevelInterval))

  // 暴露清理函数供 onUnmounted 使用
  onUnmounted(() => cleanupBallAction())
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('click', onClickOutside)
  cleanupShortcut()
  cleanupToolbar()
  cleanupBeforeQuit()
  audio.cleanup()
  window.electronAPI.hideFloatingIsland()
  window.electronAPI.hideFloatingBall()
  recording.stop()
  stopCamera()
  window.electronAPI.hideRegionBorder()
})

// 录制时主窗口保持原样，不切换到预览视图
const isRecordingView = ref(false)

// 转换进度气泡
const showBubble = ref(false)
const isConverting = computed(() => store.state === 'converting')
let bubbleTimer: ReturnType<typeof setTimeout> | null = null
let bubbleMaxTimer: ReturnType<typeof setTimeout> | null = null

watch(() => isConverting.value, (val) => {
  if (val) {
    showBubble.value = true
    if (bubbleTimer) { clearTimeout(bubbleTimer); bubbleTimer = null }
    if (bubbleMaxTimer) { clearTimeout(bubbleMaxTimer); bubbleMaxTimer = null }
    bubbleMaxTimer = setTimeout(() => {
      showBubble.value = false
      bubbleMaxTimer = null
    }, 60000)
  } else if (showBubble.value) {
    if (bubbleMaxTimer) { clearTimeout(bubbleMaxTimer); bubbleMaxTimer = null }
    bubbleTimer = setTimeout(() => { showBubble.value = false }, 3000)
  }
})
</script>

<template>
  <Layout>
    <div class="home">
      <!-- 标签栏 -->
      <div class="tab-bar">
        <button class="tab-btn" :class="{ active: activeTab === 'record' }" @click="activeTab = 'record'">录屏</button>
        <button class="tab-btn" :class="{ active: activeTab === 'settings' }" @click="activeTab = 'settings'">设置</button>
      </div>

      <!-- 录屏标签页 -->
      <template v-if="activeTab === 'record'">
        <!-- 转换进度气泡 -->
        <Transition name="bubble">
          <div v-if="showBubble" class="convert-bubble">
            <div class="bubble-icon" :class="{ done: !isConverting }">
              <svg v-if="isConverting" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/>
              </svg>
              <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <div class="bubble-body">
              <span class="bubble-label">{{ isConverting ? '转换中' : '转换完成' }}</span>
              <div class="bubble-bar">
                <div class="bubble-bar-fill" :class="{ done: !isConverting }" :style="{ width: (isConverting ? store.conversionProgress : 100) + '%' }"/>
              </div>
            </div>
            <span class="bubble-percent">{{ isConverting ? store.conversionProgress : 100 }}%</span>
          </div>
        </Transition>

        <div v-if="isRecordingView" class="recording-view">
        <div class="preview-container">
          <video ref="previewVideoRef" class="preview-video" muted autoplay playsinline/>
          <CameraOverlay v-if="store.isCameraEnabled" :stream="recording.cameraStream" @position-update="handleCameraPositionUpdate"/>
          <DrawingCanvas v-if="store.isDrawingEnabled" @draw="handleDrawAnnotations"/>
          <DrawingToolbar v-if="store.isDrawingEnabled"/>
        </div>
        <div class="recording-header">
          <RecordingTimer/>
          <AudioMeter v-if="store.isMicrophoneEnabled" :level="audio.micLevel.value" label="麦克风"/>
        </div>
        <RecordingControls @start="handleStart" @pause="handlePause" @resume="handleResume" @stop="handleStop" @toggle-camera="toggleCamera" @toggle-mic="toggleMic" @toggle-drawing="toggleDrawing"/>
      </div>

      <div v-else class="idle-view">
        <div class="source-buttons">
          <div class="fullscreen-wrapper">
            <button class="source-btn" @click="handleFullscreen">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
              <span>全屏录制</span>
            </button>
            <Transition name="dropdown">
              <div v-if="showScreenDropdown" class="screen-dropdown">
                <button v-for="s in screens" :key="s.id" class="screen-option" @click="selectScreen(s.id)">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
                  <span>{{ s.label }}</span>
                  <span v-if="s.isPrimary" class="primary-tag">主</span>
                </button>
              </div>
            </Transition>
          </div>
          <button class="source-btn" @click="handleSelectRegion">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" stroke-dasharray="4 2"/><line x1="3" y1="9" x2="3" y2="3" stroke-width="2.5"/><line x1="3" y1="3" x2="9" y2="3" stroke-width="2.5"/><line x1="15" y1="21" x2="21" y2="21" stroke-width="2.5"/><line x1="21" y1="15" x2="21" y2="21" stroke-width="2.5"/></svg>
            <span>自定义区域</span>
          </button>
        </div>

        <RecordingControls @start="handleStart" @pause="handlePause" @resume="handleResume" @stop="handleStop" @toggle-camera="toggleCamera" @toggle-mic="toggleMic" @toggle-drawing="toggleDrawing"/>
        <RecordingsList @play="handlePlayRecording" @export-gif="handleExportGif" @delete="handleDeleteRecording"/>
      </div>
      </template>

      <!-- 设置标签页 -->
      <div v-else class="settings-tab">
        <SettingsPanel />
      </div>
    </div>

    <VideoPlayer v-if="showVideoPlayer && playingRecording" :recording="playingRecording" @close="showVideoPlayer = false"/>
    <ConversionDialog v-if="showConversion" :file-path="convertingFile" :target="conversionTarget" @close="showConversion = false"/>
  </Layout>
</template>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  height: calc(100vh - var(--titlebar-height));
  overflow: hidden;
}

/* 标签栏 */
.tab-bar {
  display: flex;
  gap: 6px;
  padding: 8px 16px;
  flex-shrink: 0;
}

.tab-btn {
  flex: 1;
  padding: 9px 16px;
  background: linear-gradient(135deg, #ffffff 0%, #e8e8f0 100%);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.7);
  border-top-color: rgba(255, 255, 255, 0.9);
  border-left-color: rgba(255, 255, 255, 0.85);
  border-right-color: rgba(200, 200, 210, 0.4);
  border-bottom-color: rgba(190, 190, 200, 0.5);
  border-radius: var(--radius);
  color: var(--text-muted);
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all var(--transition);
  text-align: center;
  box-shadow:
    4px 4px 12px rgba(0, 0, 0, 0.1),
    1px 1px 3px rgba(0, 0, 0, 0.06),
    inset 1px 1px 2px rgba(255, 255, 255, 0.9),
    inset -1px -1px 0 rgba(0, 0, 0, 0.04);
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.5);
}

.tab-btn:hover {
  color: var(--text-secondary);
  background: linear-gradient(135deg, #ffffff 0%, #ededf4 100%);
  border-top-color: rgba(255, 255, 255, 0.95);
  border-left-color: rgba(255, 255, 255, 0.9);
  box-shadow:
    6px 6px 18px rgba(0, 0, 0, 0.12),
    2px 2px 5px rgba(0, 0, 0, 0.08),
    inset 1px 1px 2px rgba(255, 255, 255, 0.95),
    inset -1px -1px 0 rgba(0, 0, 0, 0.03);
  transform: translate(-1px, -1px);
}

.tab-btn.active {
  color: var(--text-primary);
  background: linear-gradient(135deg, #ebebf0 0%, #dedee6 100%);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border-color: rgba(175, 175, 190, 0.5);
  border-top-color: rgba(190, 190, 205, 0.6);
  border-left-color: rgba(185, 185, 200, 0.55);
  border-right-color: rgba(160, 160, 175, 0.45);
  border-bottom-color: rgba(155, 155, 170, 0.5);
  box-shadow:
    inset 3px 3px 8px rgba(0, 0, 0, 0.15),
    inset 1px 1px 3px rgba(0, 0, 0, 0.1),
    inset -1px -1px 1px rgba(255, 255, 255, 0.2);
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.25);
  transform: translate(1px, 1px);
}

/* 设置标签页 */
.settings-tab {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.idle-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

/* 录制源选择按钮 */
.source-buttons {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  justify-content: center;
  flex-shrink: 0;
}

.source-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 22px;
  background: linear-gradient(135deg, #ffffff 0%, #e8e8f0 100%);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.7);
  border-top-color: rgba(255, 255, 255, 0.9);
  border-left-color: rgba(255, 255, 255, 0.85);
  border-right-color: rgba(200, 200, 210, 0.4);
  border-bottom-color: rgba(190, 190, 200, 0.5);
  border-radius: 14px;
  color: var(--text-primary);
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow:
    4px 4px 12px rgba(0, 0, 0, 0.1),
    1px 1px 3px rgba(0, 0, 0, 0.06),
    inset 1px 1px 2px rgba(255, 255, 255, 0.9),
    inset -1px -1px 0 rgba(0, 0, 0, 0.04);
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.5);
}

.source-btn:hover {
  background: linear-gradient(135deg, #ffffff 0%, #ededf4 100%);
  border-top-color: rgba(255, 255, 255, 0.95);
  border-left-color: rgba(255, 255, 255, 0.9);
  box-shadow:
    6px 6px 18px rgba(0, 0, 0, 0.12),
    2px 2px 5px rgba(0, 0, 0, 0.08),
    inset 1px 1px 2px rgba(255, 255, 255, 0.95),
    inset -1px -1px 0 rgba(0, 0, 0, 0.03);
  transform: translate(-1px, -1px);
}

.source-btn:active {
  background: linear-gradient(135deg, #ebebf0 0%, #dedee6 100%);
  border-color: rgba(175, 175, 190, 0.5);
  border-top-color: rgba(190, 190, 205, 0.6);
  border-left-color: rgba(185, 185, 200, 0.55);
  border-right-color: rgba(160, 160, 175, 0.45);
  border-bottom-color: rgba(155, 155, 170, 0.5);
  box-shadow:
    inset 3px 3px 8px rgba(0, 0, 0, 0.15),
    inset 1px 1px 3px rgba(0, 0, 0, 0.1),
    inset -1px -1px 1px rgba(255, 255, 255, 0.2);
  transform: translate(1px, 1px);
}

.source-btn svg {
  flex-shrink: 0;
  color: var(--accent);
  filter: drop-shadow(0 1px 1px rgba(233, 69, 96, 0.2));
}

/* 全屏录制下拉菜单 */
.fullscreen-wrapper {
  position: relative;
}

.dropdown-arrow {
  flex-shrink: 0;
  color: var(--text-muted);
  transition: transform 0.2s;
}

.screen-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%);
  min-width: 160px;
  background: var(--surface-grad);
  border: 1px solid rgba(255, 255, 255, 0.7);
  border-top-color: rgba(255, 255, 255, 0.9);
  border-left-color: rgba(255, 255, 255, 0.85);
  border-right-color: rgba(200, 200, 210, 0.4);
  border-bottom-color: rgba(190, 190, 200, 0.5);
  border-radius: var(--radius);
  box-shadow:
    4px 4px 12px rgba(0, 0, 0, 0.1),
    1px 1px 3px rgba(0, 0, 0, 0.06),
    inset 1px 1px 2px rgba(255, 255, 255, 0.9);
  padding: 4px;
  z-index: 100;
}

.screen-option {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 10px;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: var(--text-primary);
  cursor: pointer;
  font-size: 13px;
  transition: background 0.15s;
  white-space: nowrap;
}

.screen-option:hover {
  background: var(--bg-hover);
}

.screen-option svg {
  flex-shrink: 0;
  color: var(--accent);
}

.primary-tag {
  font-size: 10px;
  padding: 1px 5px;
  background: var(--accent);
  color: #fff;
  border-radius: 4px;
  margin-left: auto;
  font-weight: 600;
}

.dropdown-divider {
  height: 1px;
  background: var(--border);
  margin: 4px 0;
}

.dropdown-enter-active { transition: all 0.2s ease; }
.dropdown-leave-active { transition: all 0.15s ease; }
.dropdown-enter-from { opacity: 0; transform: translateX(-50%) translateY(-6px); }
.dropdown-leave-to { opacity: 0; transform: translateX(-50%) translateY(-4px); }

/* 录制视图 */
.recording-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #000;
}

.recording-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 12px;
  background: rgba(0, 0, 0, 0.6);
  flex-shrink: 0;
}

.preview-container {
  flex: 1;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-video {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

/* 转换进度气泡 */
.convert-bubble {
  position: fixed;
  top: 44px;
  right: 12px;
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--surface-grad);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.7);
  border-top-color: rgba(255, 255, 255, 0.9);
  border-left-color: rgba(255, 255, 255, 0.85);
  border-right-color: rgba(200, 200, 210, 0.4);
  border-bottom-color: rgba(190, 190, 200, 0.5);
  border-radius: 10px;
  box-shadow:
    4px 4px 12px rgba(0, 0, 0, 0.1),
    1px 1px 3px rgba(0, 0, 0, 0.06),
    inset 1px 1px 2px rgba(255, 255, 255, 0.9);
  min-width: 160px;
}

.bubble-icon {
  color: var(--info);
  display: flex;
  align-items: center;
  animation: spin 1.2s linear infinite;
}

.bubble-icon.done {
  color: var(--success);
  animation: none;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.bubble-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.bubble-label {
  font-size: 11px;
  color: var(--text-secondary);
}

.bubble-bar {
  height: 3px;
  background: linear-gradient(180deg, #e2e2e8 0%, #f2f2f5 100%);
  border-radius: 2px;
  overflow: hidden;
  box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.12);
}

.bubble-bar-fill {
  height: 100%;
  background: var(--info);
  border-radius: 2px;
  transition: width 0.3s ease;
}

.bubble-bar-fill.done {
  background: var(--success);
}

.bubble-percent {
  font-size: 11px;
  font-family: var(--font-mono);
  color: var(--text-primary);
  font-weight: 600;
  min-width: 28px;
  text-align: right;
}

.bubble-enter-active { transition: all 0.3s ease; }
.bubble-leave-active { transition: all 0.2s ease; }
.bubble-enter-from { opacity: 0; transform: translateY(-12px) scale(0.95); }
.bubble-leave-to { opacity: 0; transform: translateY(-8px) scale(0.95); }
</style>
