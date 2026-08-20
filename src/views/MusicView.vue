// src/views/MusicView.vue —— 音乐窗口（G6）
// 与其余 Vue 窗口同风格（Layout 标题栏）。能力：
//   6a  SMTC 信息（歌名/歌手/专辑/状态）+ 控制（播放/暂停/上/下一首）——经主进程 PowerShell/WinRT，
//       SMTC 不可用/无会话时降级展示。
//   6c  频谱指示器：系统音频回环（getUserMedia desktop audio + Analyser）→ canvas 逐帧频谱。
//   6b  桌面歌词：本窗口内嵌歌词面板（含高亮行）；LRC 数据源尚未配置，展示占位（goal 6b 待定歌词源）。
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import Layout from '../components/Layout.vue'
import { t } from '../stores/i18n'

interface SmtcStatus {
  available: boolean
  playing: boolean
  title: string
  artist: string
  album: string
  hasSession: boolean | null
}

const status = ref<SmtcStatus>({ available: false, playing: false, title: '', artist: '', album: '', hasSession: null })
const loopOn = ref(false)
const loopFail = ref(false)

// === 6a: SMTC 轮询 ===
let smtcTimer: ReturnType<typeof setInterval> | null = null
let smtcInFlight = false // 防重叠：上次 PowerShell 未返回前不再发起新一轮（超时 8s > 轮询间隔）
async function pollSmtc() {
  if (smtcInFlight) return
  // 页面隐藏时不轮询（每次轮询会拉起一个 powershell 子进程，是持续开销，G7 节流）
  if (document.hidden) return
  smtcInFlight = true
  try {
    const s = await window.electronAPI.musicGetStatus()
    if (s) status.value = s
  } catch { /* 轮询失败保持上次展示 */ }
  finally { smtcInFlight = false }
}
function ctrl(cmd: 'play' | 'pause' | 'next' | 'prev') {
  window.electronAPI.musicControl(cmd).catch(() => {})
  // 控制后立即回读一次，尽快反映状态变化
  smtcInFlight = false
  setTimeout(pollSmtc, 500)
}

// === 6c: 系统音频回环 → 频谱 ===
let audioCtx: AudioContext | null = null
let sourceNode: MediaAudioSourceNode | null = null
let analyser: AnalyserNode | null = null
let stream: MediaStream | null = null
let rafId = 0
const canvasRef = ref<HTMLCanvasElement | null>(null)

async function toggleLoop() {
  if (loopOn.value) {
    stopLoop()
    return
  }
  loopFail.value = false
  try {
    // 复用录屏系统音频采集路径：desktopCapturer 枚举 loopback 源，getUserMedia 取之
    const sources = await window.electronAPI.getSystemAudioSources()
    const src = sources?.[0]
    if (!src) { loopFail.value = true; return }
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: src.id } } as any,
      video: false,
    })
    audioCtx = new AudioContext()
    analyser = audioCtx.createAnalyser()
    analyser.fftSize = 256
    analyser.smoothingTimeConstant = 0.8
    sourceNode = audioCtx.createMediaStreamSource(stream)
    sourceNode.connect(analyser)
    loopOn.value = true
    drawLoop()
  } catch (e) {
    console.warn('[MusicView] loopback fail:', e)
    loopFail.value = true
    stopLoop()
  }
}

function drawLoop() {
  const canvas = canvasRef.value
  if (!canvas || !analyser) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const W = canvas.width = canvas.clientWidth * (window.devicePixelRatio || 1)
  const H = canvas.height = canvas.clientHeight * (window.devicePixelRatio || 1)
  const data = new Uint8Array(analyser.frequencyBinCount)
  const bars = 48
  function frame() {
    if (!analyser || !ctx) return
    analyser.getByteFrequencyData(data)
    ctx.clearRect(0, 0, W, H)
    const bw = W / bars
    for (let i = 0; i < bars; i++) {
      // 取低频到中频段，视觉更贴近节拍
      const idx = Math.floor((i / bars) * data.length * 0.6)
      const v = data[idx] / 255
      const bh = Math.max(2, v * H * 0.9)
      const grad = ctx.createLinearGradient(0, H - bh, 0, H)
      grad.addColorStop(0, '#34d399')
      grad.addColorStop(1, '#4e5cd4')
      ctx.fillStyle = grad
      ctx.globalAlpha = 0.4 + v * 0.6
      ctx.fillRect(i * bw + 1, H - bh, bw - 2, bh)
    }
    ctx.globalAlpha = 1
    rafId = requestAnimationFrame(frame)
  }
  frame()
}

function stopLoop() {
  if (rafId) cancelAnimationFrame(rafId)
  rafId = 0
  stream?.getTracks().forEach(t => t.stop())
  stream = null
  sourceNode = null
  analyser = null
  if (audioCtx && audioCtx.state !== 'closed') audioCtx.close().catch(() => {})
  audioCtx = null
  loopOn.value = false
}

onMounted(() => {
  pollSmtc()
  // 3s 轮询每次会拉起一个 powershell 子进程，是持续子进程开销（G7）；加密轮询间隔到 5s 减少进程 churn
  smtcTimer = setInterval(pollSmtc, 5000)
})

onUnmounted(() => {
  if (smtcTimer) clearInterval(smtcTimer)
  stopLoop()
})
</script>

<template>
  <Layout>
    <div class="music-view">
      <div class="status-card" :class="{ active: status.playing }">
        <div class="cover" :class="{ playing: status.playing }">
          <span class="cover-icon">♪</span>
        </div>
        <div class="status-info">
          <div class="title">{{ status.title || t('music.noSession') }}</div>
          <div class="artist">{{ status.artist || (status.available ? t('music.unknownArtist') : t('music.unsupported')) }}</div>
          <div class="album" v-if="status.album">{{ status.album }}</div>
          <div class="state" :class="status.playing ? 'on' : 'off'">
            {{ status.playing ? t('music.playing') : t('music.paused') }}
          </div>
        </div>
      </div>

      <!-- 传输控制（SMTC）：无会话/不可用时禁用 -->
      <div class="controls">
        <button class="ctl" :disabled="!status.available" :title="t('music.prev')" @click="ctrl('prev')">⏮</button>
        <button class="ctl main" :disabled="!status.available || !status.hasSession" :title="status.playing ? t('music.pause') : t('music.play')" @click="ctrl(status.playing ? 'pause' : 'play')">
          {{ status.playing ? '⏸' : '▶' }}
        </button>
        <button class="ctl" :disabled="!status.available" :title="t('music.next')" @click="ctrl('next')">⏭</button>
      </div>

      <!-- 6c 频谱指示器：系统音频回环 -->
      <div class="panel">
        <div class="panel-head">
          <span>{{ t('music.indicator') }}</span>
          <button class="toggle" :class="{ on: loopOn }" @click="toggleLoop">
            {{ loopOn ? t('music.disableLoop') : t('music.enableLoop') }}
          </button>
        </div>
        <div class="panel-desc">{{ t('music.indicatorDesc') }}</div>
        <p v-if="loopFail" class="warn">{{ t('music.loopFail') }}</p>
        <canvas ref="canvasRef" class="spectrum" v-if="loopOn"></canvas>
      </div>

      <!-- 6b 歌词面板（LRC 源待配置） -->
      <div class="panel lyrics">
        <div class="panel-head"><span>{{ t('music.lyrics') }}</span></div>
        <div class="lyrics-body">
          <p class="lyrics-empty">{{ t('music.noLyrics') }}</p>
        </div>
      </div>
    </div>
  </Layout>
</template>

<style scoped>
.music-view {
  height: calc(100vh - var(--titlebar-height));
  overflow-y: auto;
  padding: 16px 18px;
  background: linear-gradient(180deg, #f0f0f4 0%, #e4e4ea 100%);
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.status-card {
  display: flex;
  gap: 14px;
  align-items: center;
  background: var(--surface-grad);
  border: 1px solid rgba(255, 255, 255, 0.7);
  border-top-color: rgba(255, 255, 255, 0.9);
  border-left-color: rgba(255, 255, 255, 0.85);
  border-radius: 16px;
  box-shadow: 4px 4px 14px rgba(0, 0, 0, 0.1), inset 1px 1px 2px rgba(255, 255, 255, 0.9);
  padding: 16px;
}
.cover {
  width: 64px; height: 64px; border-radius: 14px;
  background: linear-gradient(135deg, #6a8cff 0%, #4a6cf7 100%);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; color: #fff; font-size: 28px;
  box-shadow: 0 4px 10px rgba(74, 108, 247, 0.3);
}
.cover.playing { animation: breathe 1.6s ease-in-out infinite; }
@keyframes breathe { 0%,100% { transform: scale(1);} 50% { transform: scale(1.06);} }
.status-info { min-width: 0; }
.title { font-size: 15px; font-weight: 700; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.artist { font-size: 12px; color: var(--text-secondary); margin-top: 3px; }
.album { font-size: 11px; color: var(--text-muted); }
.state { font-size: 11px; font-weight: 600; margin-top: 6px; }
.state.on { color: #34d399; }
.state.off { color: var(--text-muted); }
.controls { display: flex; justify-content: center; gap: 14px; }
.ctl {
  width: 46px; height: 46px; border-radius: 50%;
  background: var(--surface-grad);
  border: 1px solid rgba(255, 255, 255, 0.7);
  border-top-color: rgba(255, 255, 255, 0.9);
  color: var(--text-primary); font-size: 18px; cursor: pointer;
  box-shadow: var(--bevel-shadow);
  transition: all 0.2s var(--bevel-ease);
}
.ctl:hover:not(:disabled) { transform: translate(-1px, -1px); }
.ctl.main {
  background: linear-gradient(135deg, #34d399 0%, #10b981 100%);
  color: #fff; width: 54px; height: 54px; border: none;
  box-shadow: 0 4px 12px rgba(52, 211, 153, 0.4);
}
.ctl:disabled { opacity: 0.35; cursor: default; }
.panel {
  background: var(--surface-grad);
  border: 1px solid rgba(255, 255, 255, 0.7);
  border-radius: 14px;
  box-shadow: 3px 3px 10px rgba(0, 0, 0, 0.08), inset 1px 1px 2px rgba(255, 255, 255, 0.9);
  padding: 12px 14px;
}
.panel-head { display: flex; align-items: center; justify-content: space-between; font-size: 12.5px; font-weight: 600; color: var(--text-primary); }
.panel-desc { font-size: 10.5px; color: var(--text-muted); margin-top: 4px; }
.warn { font-size: 11px; color: #e94560; margin-top: 6px; }
.toggle {
  padding: 3px 10px; border: none; border-radius: 8px; font-size: 11px; font-weight: 600; cursor: pointer;
  background: var(--bg-hover); color: var(--text-secondary);
}
.toggle.on { background: linear-gradient(135deg, #34d399 0%, #10b981 100%); color: #fff; }
.spectrum { width: 100%; height: 74px; margin-top: 10px; display: block; }
.lyrics { min-height: 120px; }
.lyrics-body { margin-top: 10px; }
.lyrics-empty { font-size: 11.5px; color: var(--text-muted); }
</style>
