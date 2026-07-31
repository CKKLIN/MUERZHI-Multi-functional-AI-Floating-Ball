# 性能与资源优化审计报告

- **日期**：2026-07-30
- **对象**：erzhi-recording（二支录制），Electron 28 + Vue 3 + Pinia + vue-router，Windows 桌面屏幕录制工具
- **范围**：性能、轻量化、资源调用与及时释放、CPU/GPU 占用
- **方法**：主进程 / 渲染层 / 窗口与 AI 子系统三路并行审计 + 关键发现人工核对源码
- **状态**：审计完成，未做任何代码修改

## 项目结构速览

~9,300 行，分两层：

- **主进程** (`electron/main/`)：窗口管理、FFmpeg 转码/裁剪/合并/GIF、desktopCapturer 源枚举、AI agent 子系统（本地 HTTP 服务器 + Claude hook 桥接）、托盘/全局快捷键、IP 上报、悬浮球 / AI 状态岛。
- **渲染层** (`src/`)：录制编排（`useRecording`）、canvas 合成（屏幕 + 摄像头 + 标注）、音频电平、绘图、视频预览。

实际录屏用 `getDisplayMedia` + `MediaRecorder` 在渲染层完成，主进程负责后处理。编码目前**纯软件**（`libx264 -preset ultrafast`），无硬件编码。

---

## 第一梯队 —— 录制 / 退出时的资源泄漏与 CPU 占用（投入产出比最高）

### 1. FFmpeg 子进程无法取消 + 退出时不杀进程

- **位置**：`electron/main/ffmpeg.ts`（全部 `.run()` / `execFile`）；`electron/main/index.ts:129-135`
- **现象**：所有 ffmpeg 转换只靠 `end` / `error` 回调收尾，没有任何 `proc.kill()` / `AbortController` 句柄。`before-quit` 只置 `isQuitting`、注销全局快捷键、销毁 tray、置空窗口引用——**既不杀 ffmpeg、也不关 region/toolbar/island/camera 窗口、也不向渲染层发送 `app-before-quit`**（preload 在 `index.ts:63-67` 让渲染层监听该事件，但 main 从未 emit）。
- **后果**：用户取消转换 / 关窗口 / 退出应用时，`ffmpeg.exe` 成为孤儿进程，被 OS 重新挂载后继续吃满 CPU 编码到结束。这是"关了应用 ffmpeg 还在跑"僵尸进程的根因。同时渲染层的 `MediaRecorder` / 流也收不到退出信号，无法干净停止。
- **修法方向**：保存 ffmpeg command / ChildProcess 句柄（按 id 索引返回给渲染层），加 `cancel-conversion` IPC 调 `cmd.kill('SIGKILL')` / `proc.kill()`；`before-quit` / `will-quit` 里 kill 全部在途进程、关闭所有 overlay 窗口并清其定时器、`mainWindow.webContents.send('app-before-quit')` 后再退出。

### 2. 多屏合并 N 个 remux 并行、失败不短路

- **位置**：`electron/main/ffmpeg.ts:176-198`，最终合并错误删除在 `:257-265`
- **现象**：for 循环同时启动所有 remux，3-4 屏即 4-5 个并发 `ffmpeg.exe` + 每个 `libx264` 最多 8 线程（`NUM_THREADS`），吃满所有核心，与 UI / GPU 进程抢 CPU。`error` 分支也 `remuxDone++` 并继续 `doMerge()`，单个 remux 失败会带着缺失 / 空输入进最终 merge，最终 merge 报错后**删掉所有产物**——静默全丢，用户看不到原因。
- **修法方向**：串行 await 每个 remux；任一 remux 失败即短路返回并清理已生成文件，不进入 `doMerge`。

### 3. 无硬件编码检测

- **位置**：`electron/main/ffmpeg.ts:19,63,132,233`（grep 确认全仓库零 `nvenc` / `qsv` / `amf`）
- **现象**：转码 / 合并全程 `libx264 -preset ultrafast`，CPU 密集。在有 N 卡 / Intel QSV / AMD AMF 的机器上完全没用上硬件编码器。
- **修法方向**：启动时探测一次 `ffmpeg -hwaccels`，按 `nvenc` > `qsv` > `amf` > `libx264` 优先级选择并缓存；re-encode 路径优先用硬编，remux（`-c copy`）保持不变。CPU 占用可从 ~800% 降到个位数 %。

---

## 第二梯队 —— 渲染层持续 CPU/GPU 占用（录制全程）

### 4. `drawFrame` + rAF 全帧重绘 + 死分支

- **位置**：`src/composables/useRecording.ts:140-171`（drawFrame）、`:321-369`（captureStream + rAF 循环）、`:358-367`
- **现象**：canvas 合成挂在固定 rAF 上，每帧 `drawImage` 整屏 + 每帧重画摄像头（含 `clip` + `stroke`），即使画面未变；`captureStream(fps)` 又叠加了自己的采样时钟；rAF 在 120Hz 屏上每帧唤醒做时间判断。`useRecording.ts:143-149` 有冗余嵌套 `if (captureRegion){ if(captureRegion){…}else{…} }`，内层 else（`:147`）永不可达。
- **后果**：录制全程持续高填充率 GPU blit + CPU 编码负载，是 canvas 模式下编码端的主要负担来源。
- **修法方向**：用 `screenVideo.requestVideoFrameCallback()` 驱动 + `compositeCanvas.captureStream(0)` + `track.requestFrame()`，只在真正有新视频帧时重绘；摄像头 blit 以 `cameraVideo` 是否推进新帧为门控；删除死分支。

### 5. 音频电平 rAF 无条件运行 + 20Hz IPC 转发

- **位置**：`src/composables/useAudioCapture.ts:94-109`；`src/views/HomeView.vue:431-437`
- **现象**：`updateLevel` 的 rAF 在静音 / 窗口最小化时也持续运行，每帧 `getByteFrequencyData`（GPU→CPU 回读）并写两个 reactive ref（`micLevel` / `sysLevel`）；HomeView 再以 50ms 间隔把这两个 ref 通过 IPC 转发给工具栏窗口。录制时主窗口被 minimize，等于在最小化窗口里跑 60Hz rAF + 20Hz IPC。
- **修法方向**：改 ~15-20Hz 定时器；加死区（计算出的 level 与上次差值小于阈值就不写 ref，避免无意义的响应式通知）；`document.hidden` 时暂停；与下游 IPC 转发共用同一个节流源。

### 6. DrawingCanvas 每次鼠标移动全画布清空 + 重画所有笔触

- **位置**：`src/components/DrawingCanvas.vue:35-45` + `src/composables/useDrawingCanvas.ts:85-142`
- **现象**：画笔时每个 mousemove（60-125Hz）都 `clearRect` 整个画布再 `redraw` 全部历史笔触，N 笔时是 O(N) × mousemove/秒的全画布重绘。
- **修法方向**：只增量画当前正在画的那一笔（`lineTo` 最近两点），`mouseup` / undo / clear 时才全量 `redraw`；或用离屏 canvas 缓存已提交笔触，主画布只 blit 缓存 + 画当前活跃笔触。

---

## 第三梯队 —— 后台窗口与启动开销（轻量化）

### 7. AI 岛 + agent 服务器 + 悬浮球全部在启动时无条件创建

- **位置**：`electron/main/index.ts:77-91`
- **现象**：`whenReady` 即 `agentBridge.start()` + `showAiIsland()` + `showFloatingBall()`，加主窗口 = 启动后立刻 3-4 个渲染进程 + 一个监听端口的 HTTP 服务器，即使用户从不用 AI。AI 岛创建后直到退出才销毁（`ai-island.ts:176-189`）。
- **修法方向**：AI 岛与 agent server 改为首次使用时懒创建（首次 `agent-state-update` 非 idle / 首次权限请求 / 首次 `show-ai-window`），状态回到 idle 持续 N 秒后销毁；`before-quit` 调 `agentBridge.stop()` + `hideAiIsland()`（`agentBridge.stop()` 已存在且能关服务器 + 清 3 个定时器 + 清 runtime.json，但 quit 时从未调用）。

### 8. `backgroundThrottling:false` 关掉了隐藏窗口节流

- **位置**：`electron/main/index.ts:44,161`
- **现象**：主窗口与 AI 窗口被隐藏后仍全速运行 rAF / timer。录制类应用在录制期间确实需要节流关闭（避免定时器被降频影响采集），但主窗口在 idle 时是隐藏的（`window-all-closed` 不退出、走托盘），此时不应关节流。
- **修法方向**：按场景区分——录制中保留 `backgroundThrottling:false`，idle 隐藏时用默认 true；或动态切换。

### 9. AI 岛 / 录制岛 `backdrop-filter` + 空闲时的无限动画

- **位置**：`electron/main/ai-island.ts:20,33-40`；`electron/main/region-selector.ts:238,264`（录制岛同理）
- **现象**：透明 always-on-top 窗口 + `backdrop-filter:blur()` 在 Windows 上是持续的 GPU 合成开销，大部分时间只显示"AI 待机"却一直做合成；`.ai-dot` 的 `breathe`/`pulse`/`flash` 无限动画在非激活状态也常驻。
- **修法方向**：去掉 `backdrop-filter`（改实色 / 半透明 rgba 背景）；动画类只在状态真正激活时挂，idle 时移除。

### 10. 其他后台定时器 / 轮询

| 位置 | 现象 | 修法 |
|---|---|---|
| `region-selector.ts:818-822` | `keepTopInterval` 每 5s 对 3 个窗口重设 `setAlwaysOnTop`，但该属性本身是粘性的，纯浪费 + Win32 z 序调用 | 创建时设一次，display 变化时再设 |
| `region-selector.ts:516-534` | `islandMouseCheckInterval` 每 250ms 同步调 `screen.getCursorScreenPoint()` 整段录制 | 改事件驱动（透明全屏被动窗口的 pointermove），或仅岛屿可见时轮询 |
| `index.ts:116` | `setInterval(retryPending, 30_000)` 永不清，且 `retryPending` 做同步 `writeFileSync` | 存句柄、`before-quit` 清；失败后指数退避 |
| `agent-bridge.ts:113-121` | `checkClaudeRunning` 每 5s 同步 spawn `tasklist`（2s 超时阻塞主线程） | 缓存结果带 TTL（10-30s），或改 `exec` 异步 |
| `claude-hook-manager.ts:291-295` | hook watcher 每 5min 同步 `readFileSync` + `existsSync`，AI 关闭时也跑 | 仅在 hook 已安装 / 集成开启时启动 |
| `ai-island.ts:103-104,108,110,133,159` | ResizeObserver 已覆盖尺寸变化，仍冗余 `setTimeout(resizeIsland,50)` | 删冗余 setTimeout |

---

## 第四梯队 —— IPC 内存放大与内存泄漏

### 11. 整文件 ArrayBuffer 走 IPC

- **位置**：`electron/main/ipc-handlers.ts:91-110`；`electron/preload/index.ts:23-24`
- **现象**：`write-file` / `read-file` 把整段录制 ArrayBuffer 先 `Buffer.from` 再跨 IPC 序列化，几百 MB 的 webm 被复制 ≥2 次（渲染层 `Buffer.from` 一次 + IPC 结构化克隆一次），主进程堆瞬时尖峰。
- **修法方向**：渲染层用 `Blob` + `URL.createObjectURL` 直接写，或只传路径让渲染层流式写；至少避免 `Buffer.from(ArrayBuffer)` 这层额外拷贝。

### 12. VideoPlayer 整文件读进内存 + 无 `onUnmounted` 清理

- **位置**：`src/components/VideoPlayer.vue:17-28,30-41`
- **现象**：预览时把整个视频文件读成 ArrayBuffer → Blob → objectURL 常驻渲染层堆，且只有点关闭按钮（`onClose`）才 revoke；父组件 `v-if` 切换关闭时不触发 `onClose`，Blob + objectURL + 视频解码器全部泄漏。
- **修法方向**：改用 `file://` / 自定义协议流式播放；加 `onUnmounted` revoke URL + `video.pause()` + 清空 `src`。

### 13. `agent-server` 请求体无大小上限

- **位置**：`electron/main/agent-server.ts:39-48`
- **现象**：`parseBody` 无限 `body += c` 累积，本地任意进程发个超大 body 即可 OOM 主进程（CORS `*`、绑定 127.0.0.1）。
- **修法方向**：加 1MB 上限，超出返回 413 并中止。

---

## 附：顺带发现的真实 bug（非性能）

`src/components/CameraOverlay.vue:2` 只 import 了 `ref, watch, onUnmounted, type ShallowRef`，但 `:43` 调用了 `onMounted(...)` —— setup 阶段会抛 `ReferenceError`，摄像头拖拽的 `mousemove`/`mouseup` 监听器从未注册，`onUnmounted` 里 `removeEventListener` 移除的是从未添加的监听器。目前被 `src/views/HomeView.vue:459` 的 `isRecordingView = ref(false)` 死分支挡住没崩溃，但说明那整块"录制预览视图"（`previewVideoRef`、`CameraOverlay`、`DrawingCanvas`、`AudioMeter`）是**死代码**——`previewStream` / `previewVideoRef` 从未接线。需二选一：删掉死分支与未接线的预览基础设施，或真正接通。

---

## 维度归口

| 维度 | 主要条目 |
|---|---|
| 性能 | 1、2、3、4、6 |
| 轻量化 | 7、8、9、10（另：vue-router 对 2 视图应用偏重，可考虑条件渲染替代） |
| 资源调用与及时释放 | 1、7、11、12（`before-quit` 缺口是核心） |
| CPU/GPU 占用 | 3、4、5、9 |

## 推荐推进顺序

1. **先做第一梯队**（1 / 2 / 3）：直接消除"僵尸 ffmpeg 吃满 CPU"与"多屏合并卡死全丢"两个最痛问题，投入产出比最高。
2. **再做第二梯队**（4 / 5 / 6）：降低录制全程的稳态 CPU/GPU。
3. **第三 / 四梯队**按需排期，其中 7（AI 子系统懒加载）与 12（VideoPlayer 泄漏）单独收益明显。
