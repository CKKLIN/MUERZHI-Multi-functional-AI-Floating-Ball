<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useSettingsStore } from '../stores/settings'
import { t } from '../stores/i18n'

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
    title: t('settings.chooseDir'),
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
        <div class="group-header">{{ t('settings.recordingTitle') }}</div>
        <!-- 输出设置 -->
        <div class="settings-section">
          <h4>{{ t('settings.output') }}</h4>
          <div class="setting-row">
            <label>{{ t('settings.saveDir') }}</label>
            <div class="setting-control">
              <input class="input" :value="settingsStore.outputDir" readonly style="flex:1; min-width: 0;" />
              <button class="btn btn-sm" @click="selectOutputDir">{{ t('settings.browse') }}</button>
            </div>
          </div>
          <div class="setting-row">
            <label>{{ t('settings.defaultFormat') }}</label>
            <select class="input" v-model="settingsStore.defaultFormat" @change="save">
              <option value="mp4">MP4</option>
              <option value="webm">WebM</option>
            </select>
          </div>
        </div>

        <!-- 视频设置 -->
        <div class="settings-section">
          <h4>{{ t('settings.video') }}</h4>
          <div class="setting-row">
            <label>{{ t('settings.quality') }}</label>
            <select class="input" v-model="settingsStore.videoQuality" @change="save">
              <option value="high">{{ t('settings.qualityHigh') }}</option>
              <option value="medium">{{ t('settings.qualityMedium') }}</option>
              <option value="low">{{ t('settings.qualityLow') }}</option>
            </select>
          </div>
          <div class="setting-row">
            <label>{{ t('settings.maxFps') }}</label>
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
          <h4>{{ t('settings.audio') }}</h4>
          <div class="setting-row">
            <label>{{ t('settings.mic') }}</label>
            <select class="input" v-model="settingsStore.microphoneDeviceId" @change="save">
              <option value="">{{ t('settings.default') }}</option>
              <option v-for="d in audioDevices" :key="d.deviceId" :value="d.deviceId">
                {{ d.label || `${t('settings.mic')} ${audioDevices.indexOf(d) + 1}` }}
              </option>
            </select>
          </div>
        </div>

        <!-- 摄像头设置 -->
        <div class="settings-section">
          <h4>{{ t('settings.camera') }}</h4>
          <div class="setting-row">
            <label>{{ t('settings.device') }}</label>
            <select class="input" v-model="settingsStore.cameraDeviceId" @change="save">
              <option value="">{{ t('settings.default') }}</option>
              <option v-for="d in videoDevices" :key="d.deviceId" :value="d.deviceId">
                {{ d.label || `${t('settings.camera')} ${videoDevices.indexOf(d) + 1}` }}
              </option>
            </select>
          </div>
        </div>

        <!-- 录屏快捷键 -->
        <div class="settings-section">
          <h4>{{ t('settings.shortcuts') }}</h4>
          <div class="shortcut-list">
            <div class="shortcut-item">
              <span>{{ t('settings.shortcutStart') }}</span>
              <kbd>{{ settingsStore.shortcuts.startStop }}</kbd>
            </div>
            <div class="shortcut-item">
              <span>{{ t('settings.shortcutPause') }}</span>
              <kbd>{{ settingsStore.shortcuts.pauseResume }}</kbd>
            </div>
            <div class="shortcut-item">
              <span>{{ t('settings.shortcutCamera') }}</span>
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
        <button class="about-btn" @click="showAbout()">{{ t('settings.about') }}</button>
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
