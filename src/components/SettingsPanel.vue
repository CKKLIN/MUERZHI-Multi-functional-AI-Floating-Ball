<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useSettingsStore } from '../stores/settings'

const settingsStore = useSettingsStore()

const videoDevices = ref<MediaDeviceInfo[]>([])
const audioDevices = ref<MediaDeviceInfo[]>([])

onMounted(async () => {
  // 请求权限后枚举设备
  try {
    await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
  } catch {
    // 静默失败
  }
  try {
    const devices = await navigator.mediaDevices.enumerateDevices()
    videoDevices.value = devices.filter(d => d.kind === 'videoinput')
    audioDevices.value = devices.filter(d => d.kind === 'audioinput')
  } catch {
    // 静默失败
  }
})


async function selectOutputDir() {
  const result = await window.electronAPI.showOpenDialog({
    title: '选择保存目录',
    defaultPath: settingsStore.outputDir,
    properties: ['openDirectory'],
  })
  if (!result.canceled && result.filePaths?.length > 0) {
    settingsStore.outputDir = result.filePaths[0]
    settingsStore.saveSettings()
  }
}

function save() {
  settingsStore.saveSettings()
}

function showAbout() {
  window.electronAPI.showAboutWindow()
}


</script>

<template>
  <div class="settings-panel">
    <div class="settings-body">
      <!-- 录屏设置 -->
      <div class="settings-group">
        <div class="group-header">录屏设置</div>
        <!-- 输出设置 -->
        <div class="settings-section">
          <h4>输出</h4>
          <div class="setting-row">
            <label>保存目录</label>
            <div class="setting-control">
              <input class="input" :value="settingsStore.outputDir" readonly style="flex:1; min-width: 0;" />
              <button class="btn btn-sm" @click="selectOutputDir">浏览</button>
            </div>
          </div>
          <div class="setting-row">
            <label>默认格式</label>
            <select class="input" v-model="settingsStore.defaultFormat" @change="save">
              <option value="mp4">MP4</option>
              <option value="webm">WebM</option>
            </select>
          </div>
        </div>

        <!-- 视频设置 -->
        <div class="settings-section">
          <h4>视频</h4>
          <div class="setting-row">
            <label>画质</label>
            <select class="input" v-model="settingsStore.videoQuality" @change="save">
              <option value="high">高 (5 Mbps)</option>
              <option value="medium">中 (2.5 Mbps)</option>
              <option value="low">低 (1 Mbps)</option>
            </select>
          </div>
          <div class="setting-row">
            <label>最大帧率</label>
            <select class="input" v-model.number="settingsStore.maxFps" @change="save">
              <option :value="15">15 FPS</option>
              <option :value="24">24 FPS</option>
              <option :value="30">30 FPS</option>
              <option :value="60">60 FPS</option>
            </select>
          </div>
        </div>

        <!-- 音频设置 -->
        <div class="settings-section">
          <h4>音频</h4>
          <div class="setting-row">
            <label>麦克风</label>
            <select class="input" v-model="settingsStore.microphoneDeviceId" @change="save">
              <option value="">默认</option>
              <option v-for="d in audioDevices" :key="d.deviceId" :value="d.deviceId">
                {{ d.label || `麦克风 ${audioDevices.indexOf(d) + 1}` }}
              </option>
            </select>
          </div>
        </div>

        <!-- 摄像头设置 -->
        <div class="settings-section">
          <h4>摄像头</h4>
          <div class="setting-row">
            <label>设备</label>
            <select class="input" v-model="settingsStore.cameraDeviceId" @change="save">
              <option value="">默认</option>
              <option v-for="d in videoDevices" :key="d.deviceId" :value="d.deviceId">
                {{ d.label || `摄像头 ${videoDevices.indexOf(d) + 1}` }}
              </option>
            </select>
          </div>
        </div>

        <!-- 录屏快捷键 -->
        <div class="settings-section">
          <h4>快捷键</h4>
          <div class="shortcut-list">
            <div class="shortcut-item">
              <span>开始/停止录制</span>
              <kbd>{{ settingsStore.shortcuts.startStop }}</kbd>
            </div>
            <div class="shortcut-item">
              <span>暂停/继续</span>
              <kbd>{{ settingsStore.shortcuts.pauseResume }}</kbd>
            </div>
            <div class="shortcut-item">
              <span>切换摄像头</span>
              <kbd>{{ settingsStore.shortcuts.toggleCamera }}</kbd>
            </div>
            <!-- <div class="shortcut-item">
              <span>切换画笔</span>
              <kbd>{{ settingsStore.shortcuts.toggleDrawing }}</kbd>
            </div> -->
          </div>
        </div>
      </div>

      <div class="about-footer">
        <button class="about-btn" @click="showAbout()">关于</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.settings-body {
  overflow-y: auto;
  flex: 1;
  padding: 20px 50px 24px;
}

/* 卡片内的小节标题（输出/视频/音频/...）：壳层 .settings-section 已是全局斜切卡片 */
.settings-section h4 {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 10px;
}

/* 行内控件排版（label + 控件）：壳层 .setting-row 是全局斜切行 */
.setting-row label {
  font-size: 13px;
  color: var(--text-secondary);
  white-space: nowrap;
  min-width: 60px;
}
.setting-control {
  display: flex;
  gap: 6px;
  flex: 1;
  justify-content: flex-end;
}

.shortcut-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.shortcut-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  color: var(--text-secondary);
}
kbd {
  background: linear-gradient(180deg, #f1f1f4 0%, #fafafc 100%);
  border: 1px solid rgba(255, 255, 255, 0.7);
  border-radius: 4px;
  padding: 2px 8px;
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-primary);
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.08);
}

.about-footer {
  padding: 16px 0;
  display: flex;
  justify-content: center;
  flex-shrink: 0;
}

/* 关于按钮：白色斜切（与录屏标准一致） */
.about-btn {
  padding: 10px 28px;
  background: var(--surface-grad);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.7);
  border-top-color: rgba(255, 255, 255, 0.9);
  border-left-color: rgba(255, 255, 255, 0.85);
  border-right-color: rgba(200, 200, 210, 0.4);
  border-bottom-color: rgba(190, 190, 200, 0.5);
  border-radius: 12px;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s var(--bevel-ease);
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.5);
  box-shadow: var(--bevel-shadow);
}

.about-btn:hover {
  background: var(--surface-grad-hover);
  border-top-color: rgba(255, 255, 255, 0.95);
  color: var(--text-primary);
  box-shadow: var(--bevel-shadow-hover);
  transform: translate(-1px, -1px);
}

.about-btn:active {
  background: var(--surface-grad-active);
  border-color: rgba(175, 175, 190, 0.5);
  border-top-color: rgba(190, 190, 205, 0.6);
  box-shadow: var(--bevel-shadow-active);
  transform: translate(1px, 1px);
}
</style>
