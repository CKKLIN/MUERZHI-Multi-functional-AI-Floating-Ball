<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick, computed } from 'vue'
import Layout from '../components/Layout.vue'
import RecordingControls from '../components/RecordingControls.vue'
import RecordingTimer from '../components/RecordingTimer.vue'
import AudioMeter from '../components/AudioMeter.vue'
import CameraOverlay from '../components/CameraOverlay.vue'
import RecordingsList from '../components/RecordingsList.vue'
import VideoPlayer from '../components/VideoPlayer.vue'
import SettingsPanel from '../components/SettingsPanel.vue'
import ConversionDialog from '../components/ConversionDialog.vue'
import { useRecordingStore, type Recording } from '../stores/recording'
import { useSettingsStore } from '../stores/settings'
import { useRecording } from '../composables/useRecording'
import { useAudioCapture } from '../composables/useAudioCapture'
import { t } from '../stores/i18n'
import log from '../log'

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
    // P4：音频（麦克风/系统声）由 Rust 侧 WASAPI 采集，这里不再把轨道交给录制 ——
    // 只关掉试音预览流，避免录制期间麦克风被两个消费者同时打开（共享模式虽允许，
    // 但双重打开会让两套电平表在各自时钟上跳动）。
    await audio.cleanup()
    previewMicTracks = []
    previewSysTracks = []

    // 区域模式下取屏幕源 ID（区域录制同样按显示器寻址，sourceId 只承载显示器下标）
    let sourceId = store.selectedSource?.id || ''
    const region = store.recordingMode === 'region' ? store.selectedRegion! : undefined
    if (!sourceId && region) {
      const sources = await window.muerzhiAPI.getSources(['screen'])
      if (sources.length > 0) {
        sourceId = sources[0].id
      }
    }

    // 开始录制（Rust：WGC 分段采集 + WASAPI 音频，停止后 ffmpeg 拼接/裁剪/混音）
    const multiScreen = store.recordingMode === 'allscreens' && store.multiScreenSources.length > 0
      ? store.multiScreenSources
      : undefined
    await recording.startCapture(sourceId, region, undefined, multiScreen)
  } catch (err: any) {
    alert(err.message)
    audio.cleanup()
    window.muerzhiAPI.hideRegionBorder()
    window.muerzhiAPI.showWindow()
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
  window.muerzhiAPI.hideRegionBorder()
  recording.stop() // 不 await：正常停止后立即释放摄像头/音频，Rust 侧 ffmpeg 合成在后台进行
  await audio.cleanup()
  previewMicTracks = []
  previewSysTracks = []
  stopCamera()
  window.muerzhiAPI.showAiIsland()
}

// 释放主（录屏）窗口占用的全部资源：录制中先落盘停止，再清掉摄像头/音频/预览流/贴边取景框
// 与悬浮岛。窗口关闭只是 hide（非 destroy），onUnmounted 不会触发，因此关窗口时必须显式走这里。
let releasingRecording = false
async function releaseRecordingResources() {
  if (releasingRecording) return // 重入保护：转换还在途时又被关闭，不叠加第二段释放
  releasingRecording = true
  try {
    if (store.canStop) {
      // 正在录制：完整走停止流程（含落盘保存），复用 handleStop 的资源释放逻辑。
      // 但这是"窗口被关闭"的停止，须抑制录制停止后自动重开主窗口（否则关掉的窗口又弹回来）
      recording.setReopenOnStop(false)
      // 显式 await 落盘：正常停止(fire-and-forget)后 handleRecordingStop 自己会读 elapsedSeconds；
      // 但关闭路径随后要 resetState()，若 stop 未被 await，resetState 会抢先清零 elapsedSeconds，
      // 而 handleRecordingStop 保存时长时读到 0 → 这次关闭的录制时长会被记成 0。
      window.muerzhiAPI.hideRegionBorder()
      await recording.stop()
      await audio.cleanup()
      previewMicTracks = []
      previewSysTracks = []
      stopCamera()
    } else {
      // 未在录制：仅释放已开启的预览资源（摄像头/试音流）
      await audio.cleanup()
      previewMicTracks = []
      previewSysTracks = []
      stopCamera()
    }
    // 无论是否录制中，都关掉录制用 overlay（取景框/悬浮岛/摄像头预览）
    window.muerzhiAPI.hideCameraPreview()
    window.muerzhiAPI.hideRegionBorder()
    window.muerzhiAPI.hideFloatingIsland()
    store.resetState()
  } catch (err: any) {
    console.warn('释放录屏窗口资源失败:', err?.message)
  } finally {
    releasingRecording = false
  }
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

// 切到设置页时录制页 UI 已卸载，摄像头流若继续持有就是"隐形占用设备"（灯亮着却无任何画面）。
// 停轨释放但保留 isCameraEnabled 记忆（与 handleFullscreen 的停轨不翻开关同款），
// 回到录制页再按开关状态重新拉起。录制中 canStart=false 直接跳过：录制的画面合成需要摄像头。
watch(activeTab, (tab) => {
  if (!store.canStart) return
  if (tab !== 'record') {
    recording.cameraStream.value?.getTracks().forEach(t => t.stop())
    recording.cameraStream.value = null
    window.muerzhiAPI.hideCameraPreview()
  } else if (store.isCameraEnabled && !recording.cameraStream.value) {
    startCamera()
    window.muerzhiAPI.toggleCameraPreview(true, settingsStore.cameraDeviceId)
  }
})

async function handleFullscreen() {
  const sources = await window.muerzhiAPI.getSources(['screen'])
  const displays = await window.muerzhiAPI.getAllDisplays()

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
      window.muerzhiAPI.minimizeWindow()
      await new Promise(r => setTimeout(r, 200))
      window.muerzhiAPI.hideAiIsland()
      await window.muerzhiAPI.showFloatingIsland({ micEnabled: store.isMicrophoneEnabled, sysEnabled: store.isSystemAudioEnabled, cameraEnabled: store.isCameraEnabled, cameraDeviceId: settingsStore.cameraDeviceId })
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
  window.muerzhiAPI.minimizeWindow()
  await new Promise(r => setTimeout(r, 200))

  // 悬浮岛显示在主屏幕（目标显示器或主显示器）
  const islandDisplayId = displayId ?? undefined
  window.muerzhiAPI.hideAiIsland()
  await window.muerzhiAPI.showFloatingIsland(
    { micEnabled: store.isMicrophoneEnabled, sysEnabled: store.isSystemAudioEnabled, cameraEnabled: store.isCameraEnabled, cameraDeviceId: settingsStore.cameraDeviceId },
    islandDisplayId,
  )
  if (store.isMicrophoneEnabled || (store.isSystemAudioEnabled && settingsStore.systemAudioSourceId)) {
    startAudioPreview()
  }
}

async function handleSelectRegion() {
  const region = await window.muerzhiAPI.selectRegion()
  if (region) {
    store.selectedRegion = region
    store.recordingMode = 'region'
    store.selectedSource = { id: region.sourceId, name: `区域录制 ${Math.round(region.width)}×${Math.round(region.height)}`, thumbnail: '' }
    // 停止主窗口摄像头流，预览窗口将接管
    if (store.isCameraEnabled && recording.cameraStream.value) {
      recording.cameraStream.value?.getTracks().forEach(t => t.stop())
      recording.cameraStream.value = null
    }
    window.muerzhiAPI.showRegionBorder(region, { micEnabled: store.isMicrophoneEnabled, sysEnabled: store.isSystemAudioEnabled, cameraEnabled: store.isCameraEnabled, cameraDeviceId: settingsStore.cameraDeviceId })
    window.muerzhiAPI.minimizeWindow()
    window.muerzhiAPI.hideAiIsland()
    if (store.isMicrophoneEnabled || (store.isSystemAudioEnabled && settingsStore.systemAudioSourceId)) {
      startAudioPreview()
    }
  } else {
    // 取消选区：进选区时主窗口已被最小化（start_region_select），这里必须恢复 ——
    // 否则取消后主窗口一直缩在任务栏，用户以为应用没反应。
    window.muerzhiAPI.showWindow()
  }
}

// 截图：截取全屏保存到桌面
async function handleScreenshot() {
  try {
    await window.muerzhiAPI.takeScreenshot()
  } catch (err: any) {
    console.error('截图失败', err)
  }
}

// 录制列表事件
function handlePlayRecording(rec: Recording) {
  window.muerzhiAPI.openPath(rec.filePath)
}

function handleExportGif(rec: Recording) {
  convertingFile.value = rec.filePath
  conversionTarget.value = 'gif'
  showConversion.value = true
}

async function handleDeleteRecording(id: string) {
  const rec = store.recordings.find(r => r.id === id)
  if (rec) {
    await window.muerzhiAPI.deleteFile(rec.filePath)
  }
  store.removeRecording(id)
}

// 摄像头位置更新
function handleCameraPositionUpdate(pos: { x: number; y: number; width: number; height: number }) {
  recording.setCameraPosition(pos)
}

// 切换功能
async function toggleCamera() {
  // 录制/暂停中：走 Rust 实时开关（停/起预览窗的 MediaRecorder 分段，
  // 成品按时间窗口叠画中画），不触碰本地预览流
  if (store.canStop) {
    const next = !store.isCameraEnabled
    try {
      await window.muerzhiAPI.recordingSetCamera(next, settingsStore.cameraDeviceId)
    } catch (err) {
      log.error('切换摄像头失败', err)
      return
    }
    store.isCameraEnabled = next
    pushAudioStateToIslands()
    return
  }
  store.isCameraEnabled = !store.isCameraEnabled
  if (store.isCameraEnabled) {
    startCamera()
  } else {
    stopCamera()
  }
  // 录制前状态：同步摄像头预览窗口
  if (store.canStart) {
    window.muerzhiAPI.toggleCameraPreview(store.isCameraEnabled, settingsStore.cameraDeviceId)
  }
  // 把新状态推回工具条/悬浮岛：它们的按钮亮灭是**建窗时**从 URL 初值取的，
  // 之后没有任何回推通道 —— 在工具条上点麦克风/摄像头，按钮自己不会变亮/熄灭
  // （用户反馈「开关时那两个按钮要有状态显示」）。
  pushAudioStateToIslands()
}

async function toggleMic() {
  // 录制/暂停中：走 Rust 实时开关（增停麦克风采集段，成品按时间轴补静音），
  // 不动本地试音流
  if (store.canStop) {
    const next = !store.isMicrophoneEnabled
    try {
      await window.muerzhiAPI.recordingSetMic(next)
    } catch (err) {
      log.error('切换麦克风失败', err)
      return
    }
    store.isMicrophoneEnabled = next
    pushAudioStateToIslands()
    return
  }
  store.isMicrophoneEnabled = !store.isMicrophoneEnabled
  settingsStore.saveSettings()
  if (store.canStart) {
    if (store.isMicrophoneEnabled) {
      startAudioPreview()
    } else {
      // 关麦：只释放麦克风轨道，系统声保持不变（audio.cleanup 会把 sys 也停掉，
      // 用户只关麦克风却连带静音系统声是错的）。停掉后重建一次预览，让仍开启的
      // 系统声继续有电平；两者都关时 startAudioPreview 内部自然收敛为空。
      previewMicTracks.forEach(t => t.stop())
      previewMicTracks = []
      if (previewSysTracks.length > 0) {
        startAudioPreview()
      } else {
        audio.stopLevelMonitoring()
      }
    }
  }
  pushAudioStateToIslands()
}

/** 把当前麦克风/摄像头开关状态推给工具条与悬浮岛（点亮/熄灭对应按钮） */
function pushAudioStateToIslands() {
  window.muerzhiAPI.pushIslandAudioState({
    micEnabled: store.isMicrophoneEnabled,
    cameraEnabled: store.isCameraEnabled,
  })
}

function toggleSystemAudio() {
  store.isSystemAudioEnabled = !store.isSystemAudioEnabled
  settingsStore.saveSettings()
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
const cleanupShortcut = window.muerzhiAPI.onGlobalShortcut((action: string) => {
  if (action === 'startStop') {
    if (store.canStart) handleStart()
    else if (store.canStop) handleStop()
  } else if (action === 'pauseResume') {
    if (store.canPause) handlePause()
    else if (store.canResume) handleResume()
  }
})

// 边框工具栏按钮事件
const cleanupToolbar = window.muerzhiAPI.onToolbarAction((action: string) => {
  if (action === 'start' && store.canStart) handleStart()
  else if (action === 'pause' && store.canPause) handlePause()
  else if (action === 'resume' && store.canResume) handleResume()
  else if (action === 'stop' && store.canStop) handleStop()
  // 设备开关录制中同样响应（按钮录制中保留可点，走 Rust 实时增停段）
  else if (action === 'toggle-mic' && (store.canStart || store.canStop)) toggleMic()
  else if (action === 'toggle-sys' && store.canStart) toggleSystemAudio()
  else if (action === 'toggle-camera' && (store.canStart || store.canStop)) toggleCamera()
  else if (action === 'close') {
    window.muerzhiAPI.hideFloatingIsland()
    window.muerzhiAPI.hideRegionBorder()
    if (store.canStop) {
      handleStop()
    } else {
      window.muerzhiAPI.showWindow()
      store.resetState()
      // 未开启录制就关闭悬浮岛：resetState 只清 isCameraEnabled 布尔，不会停掉渲染层
      // 已acquired的 rendering.cameraStream 硬件流 —— 须显式 stopCamera()，否则摄像头不释放。
      stopCamera()
      window.muerzhiAPI.showAiIsland()
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
  if (e.key === 'Escape') {
    if (showVideoPlayer.value) showVideoPlayer.value = false
  }
}

// 录制状态变化时同步更新边框工具栏和悬浮岛
watch(() => store.state, (state) => {
  if (state === 'recording') {
    window.muerzhiAPI.updateToolbarState('recording', store.elapsedSeconds)
    window.muerzhiAPI.setIslandState('recording', store.elapsedSeconds)
  } else if (state === 'paused') {
    // 暂停必须显式带上当前时长：不带的话 Rust 侧收到 None（页面收到 null 保持现值是
    // 兜底），但页面计时器已停、UI 上显示的就是这个值 —— 传真值让暂停期间显示正确时长
    window.muerzhiAPI.updateToolbarState('paused', store.elapsedSeconds)
    window.muerzhiAPI.setIslandState('paused', store.elapsedSeconds)
  } else {
    window.muerzhiAPI.updateToolbarState('idle')
    window.muerzhiAPI.hideFloatingIsland()
    window.muerzhiAPI.showAiIsland()
  }
})

// 卸载清理链的句柄必须放 setup 顶层：onUnmounted 回调引用 onMounted 作用域里的
// 局部变量会直接 ReferenceError，其后所有清理（监听器退订/音频流/计时器）全部中断
let cleanupBeforeQuit: (() => void) | null = null

onMounted(() => {
  // 录制历史只在这里加载（原先在 App.vue 全局加载，导致每个辅助窗口都整份拷贝）
  store.loadRecordings()
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('click', onClickOutside)
  cleanupBeforeQuit = window.muerzhiAPI.onBeforeQuit(() => {
    recording.stop()
    stopCamera()
    audio.cleanup()
    window.muerzhiAPI.hideRegionBorder()
    window.muerzhiAPI.hideFloatingBall()
  })

  // 主（录屏）窗口关闭：释放所有与录屏窗口相关的资源。
  // 窗口 hide 而非 destroy，vue onUnmounted 不会触发，故须在此显式释放。
  const cleanupMainWindowClose = window.muerzhiAPI.onMainWindowClose(() => {
    releaseRecordingResources()
  })
  onUnmounted(() => cleanupMainWindowClose())

  // 显示系统级悬浮球
  window.muerzhiAPI.showFloatingBall()

  // 监听悬浮球操作
  const cleanupBallAction = window.muerzhiAPI.onFloatingBallAction((action: string) => {
    const handler = floatingBallActions[action]
    if (handler) handler()
  })

  // 音频电平：录制中由 Rust 侧 WASAPI 上报（onAudioLevels 事件，主窗口最小化也在推）；
  // 空闲试音时才走渲染层本地分析器。两者共用 AudioMeter 的 level。
  // 事件是 20Hz 的：加死区，变化低于阈值不写 ref，避免无意义的响应式更新
  const LEVEL_DEADBAND = 0.01
  const cleanupAudioLevels = window.muerzhiAPI.onAudioLevels(({ mic, sys }) => {
    if (Math.abs(mic - audio.micLevel.value) >= LEVEL_DEADBAND) audio.micLevel.value = mic
    if (Math.abs(sys - audio.sysLevel.value) >= LEVEL_DEADBAND) audio.sysLevel.value = sys
  })
  onUnmounted(() => cleanupAudioLevels())
  // 暴露清理函数供 onUnmounted 使用
  onUnmounted(() => cleanupBallAction())
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('click', onClickOutside)
  cleanupShortcut()
  cleanupToolbar()
  cleanupBeforeQuit?.()
  if (bubbleTimer) { clearTimeout(bubbleTimer); bubbleTimer = null }
  if (bubbleMaxTimer) { clearTimeout(bubbleMaxTimer); bubbleMaxTimer = null }
  audio.cleanup()
  window.muerzhiAPI.hideFloatingIsland()
  window.muerzhiAPI.hideFloatingBall()
  recording.stop()
  stopCamera()
  window.muerzhiAPI.hideRegionBorder()
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
        <button class="tab-btn" :class="{ active: activeTab === 'record' }" @click="activeTab = 'record'">{{ t('record.homeTab') }}</button>
        <button class="tab-btn" :class="{ active: activeTab === 'settings' }" @click="activeTab = 'settings'">{{ t('record.settingsTab') }}</button>
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
              <span class="bubble-label">{{ isConverting ? t('record.converting') : t('record.convertDone') }}</span>
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
        </div>
        <div class="recording-header">
          <RecordingTimer/>
          <AudioMeter v-if="store.isMicrophoneEnabled" :level="audio.micLevel.value" :label="t('record.mic')"/>
        </div>
        <RecordingControls @start="handleStart" @pause="handlePause" @resume="handleResume" @stop="handleStop" @toggle-camera="toggleCamera" @toggle-mic="toggleMic"/>
      </div>

      <div v-else class="idle-view">
        <div class="source-buttons">
          <div class="fullscreen-wrapper">
            <button class="source-btn" @click="handleFullscreen">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
              <span>{{ t('record.fullscreen') }}</span>
            </button>
            <Transition name="dropdown">
              <div v-if="showScreenDropdown" class="screen-dropdown">
                <button v-for="s in screens" :key="s.id" class="screen-option" @click="selectScreen(s.id)">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
                  <span>{{ s.label }}</span>
                  <span v-if="s.isPrimary" class="primary-tag">{{ t('record.primary') }}</span>
                </button>
              </div>
            </Transition>
          </div>
          <button class="source-btn" @click="handleSelectRegion">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" stroke-dasharray="4 2"/><line x1="3" y1="9" x2="3" y2="3" stroke-width="2.5"/><line x1="3" y1="3" x2="9" y2="3" stroke-width="2.5"/><line x1="15" y1="21" x2="21" y2="21" stroke-width="2.5"/><line x1="21" y1="15" x2="21" y2="21" stroke-width="2.5"/></svg>
            <span>{{ t('record.customRegion') }}</span>
          </button>
        </div>

        <RecordingControls @start="handleStart" @pause="handlePause" @resume="handleResume" @stop="handleStop" @toggle-camera="toggleCamera" @toggle-mic="toggleMic"/>
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
