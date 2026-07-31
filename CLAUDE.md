# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概览

**MUERZHI万能AI 悬浮球** —— 基于 Electron 28 + Vue 3 + Pinia + vue-router 的 Windows 桌面录屏 + AI 悬浮球工具。录制在渲染层用 `getDisplayMedia`/`MediaRecorder` 完成采集，后处理（转码/裁剪/合并/GIF）在主进程用 `fluent-ffmpeg` 完成。`ffmpeg.exe` 作为 `extraResource` 随安装包分发。

一个核心子系统（"AI 岛" / 悬浮球）是与 Claude Code CLI 的集成：安装 Claude Code hooks、启动本地 HTTP 服务器，在悬浮覆盖窗口里展示 agent 状态与权限审批。悬浮球本身是应用的入口形态与品牌核心。

**命名现状：** 对外品牌名是 **MUERZHI万能AI 悬浮球**；`package.json` 的 `name` 与 electron-builder 的 `productName` 都已统一为 `MUERZHI`；**唯独 `appId` 仍保留历史值 `com.erzhi.recording`** —— 这是 Windows 识别"同一应用"的底层标识，已发版/有用户安装过旧版后不应再改（改了系统会把新版当全新应用，旧版卸载入口残留），故有意保持不动。看到 `com.erzhi.recording` / `erzhi-recording` 指的都是本应用，别误判为不同项目。git 远端仓库名为 `MUERZHI-Multi-functional-AI-Floating-Ball`。

- **App ID / 打包产品名：** `com.erzhi.recording`（历史值，保持不动） / `MUERZHI`
- 仅配置了 **Windows** 构建目标（NSIS，x64），未配置 macOS/Linux。
- npm registry 固定走 npmmirror（`.npmrc`）—— Electron / electron-builder 二进制从那里解析。

## 常用命令

```bash
npm run dev          # vite dev server（渲染层 HMR）+ 通过 vite-plugin-electron 起 electron main/preload
npm run build        # vite build + electron-builder --win  （产出 release/ 下的 NSIS 安装包）
npm run build:dir    # vite build + electron-builder --win --dir  （仅解包目录，更快，用于本地测试）
npm run preview      # 仅 vite preview 构建产物（不起 electron）
```

npm 脚本里**没有** lint 或 `tsc --noEmit`。要类型检查，运行 `npx vue-tsc`（覆盖渲染层；`tsconfig.node.json` 覆盖 `electron/**/*.ts`，开启 `noEmit`、`noUnusedLocals`、`noUnusedParameters`）。

### 运行独立测试

测试是零依赖的 `.mjs` 文件，用 Node 的 experimental type-stripping 直接跑——**没有测试框架、没有构建步骤**。要求 Node ≥ 22.15。

```bash
node --experimental-strip-types test-conversion-registry.mjs   # conversion-registry 单测
node --experimental-strip-types test-hw-encoder.mjs            # hw-encoder 纯函数测试
node --experimental-strip-types test-hw-probe.mjs              # 冒烟：对真实 ffmpeg 探测 nvenc
```

新增测试时遵循现有范式：裸 `assert`/`eq` 辅助函数；对不依赖 Electron 的模块用 `import('./electron/main/<file>.ts')`；失败时 `process.exit(1)`。为单测设计的模块（`conversion-registry.ts`、`hw-encoder.ts`）有意不引入 Electron / electron-log——日志通过 `setRegistryLogger` / `setHwEncoderLogger` 注入，以便在纯 Node 下 import。

## 架构

### 两个进程，三块职责

1. **主进程**（`electron/main/`）：窗口管理、FFmpeg 后处理、`desktopCapturer` 源枚举、AI agent 子系统、托盘/全局快捷键/IP 上报，以及各种 always-on-top 覆盖窗口（选区、录制悬浮岛、摄像头预览、AI 岛、悬浮球）。
2. **渲染层**（`src/`）：录制编排器（`composables/useRecording.ts`）做实际采集——`getDisplayMedia` + `MediaRecorder`、canvas 合成（屏幕 + 摄像头 + 标注）、音频电平、绘图，以及停止后通过 IPC 编排转换。
3. **Preload**（`electron/preload/index.ts`）：通过 `contextBridge` 暴露单一 `window.electronAPI` 接口。`contextIsolation: true`、`nodeIntegration: false`、**`sandbox: false`**（preload 直接用 `node:fs` 写录制文件——见下方 IPC/内存说明）。

### 入口与生命周期（`electron/main/index.ts`）

- `registerLocalVideoScheme()` **必须**在 `app.ready` 之前调用（privileged scheme 注册）。`registerLocalVideoProtocol()` 在 ready 之后调用。
- ready 时：启动 Agent Bridge → 注册 IPC → 创建主窗口 → 托盘 → 全局快捷键 → 悬浮球 → IP 上报。
- `window-all-closed` **不退出**——应用常驻托盘。退出由托盘 / `before-quit` 驱动。
- `before-quit` 是统一的清理点：置 `isQuitting`、向所有渲染层广播 `app-before-quit`（让它们停 MediaRecorder）、拆覆盖窗口、`agentBridge.stop()`、`hideAiIsland()`、**`killAllConversions()`**（杀在途 ffmpeg）、注销快捷键、销毁托盘。任何新的"退出时需杀"的资源都应在这里接线。
- 主窗口创建时设 `backgroundThrottling: false`——这是**有意为之**：录制期间主窗口被 minimize，若开节流会把 MediaRecorder/captureStream/音频采样降到 ~1Hz 破坏录制。不要在不区分"录制中 vs idle"的情况下全局"修复"它。

### 录制流程（`src/composables/useRecording.ts`）

三种采集模式，全在渲染层：
- **全屏 / 区域（单屏）：** `getDisplayMedia` → 仅在启用画笔时 `needsCanvas` 才经过离屏 `<canvas>` 合成 → `MediaRecorder`。无 canvas 路径直接录原始流。
- **多屏（`allscreens`）：** 每个显示器一个 `MediaRecorder`，无 canvas，最后由主进程 `mergeMultiScreen` 按各屏 bounds 合成到一张画布。
- 绘制循环由 **`requestVideoFrameCallback` 驱动**，配合 `compositeCanvas.captureStream(0)` + 手动 `canvasTrack.requestFrame()`——只在屏幕视频真正有新帧时重绘（避免 120Hz 下的空 rAF 唤醒）。rVFC 不可用时回退到固定 fps 的 rAF 节流。修改 `drawFrame`/`startDrawLoop` 时请保留这个门控。
- 停止时：blob → `electronAPI.writeFile`（渲染层用 `fs` 直写，绕过 IPC 的 ArrayBuffer 结构化克隆）→ 按需经 IPC 调 `convertToMp4` / `cropVideo` / `mergeMultiScreen`。`getSupportedMimeType()` 优先 H.264 webm/mp4 以走硬件编码路径。

### FFmpeg / 硬件编码（`electron/main/ffmpeg.ts`、`hw-encoder.ts`）

- `hw-encoder.ts` 探测一次 `ffmpeg -encoders`（进程内缓存），按 `h264_nvenc` > `h264_qsv` > `h264_amf` > `libx264` 选编码器。**re-encode 路径先试硬编器，失败回退 `libx264`**（裁剪、带裁剪转码、多屏合并都这么做）。remux 路径（`-c copy`）不编码，不受影响。
- `conversion-registry.ts` 按 id 跟踪每个在途 ffmpeg 子进程。每个 `fluent-ffmpeg` command 和 `execFile` 调用都注册一个 `kill` 函数，完成时注销。`before-quit` 调 `killAllConversions()` 防止 `ffmpeg.exe` 成为孤儿进程退出后仍占 CPU。**任何新加的 ffmpeg 调用都必须 `registerConversion`/`unregisterConvers​ion`。**
- 多屏合并对每个输入**串行** remux，且**任一失败即短路**（清临时文件、返回错误）——不要改成并行；并行 remux 曾是"合并吃满所有核然后静默全丢"的根因。

### IPC 与内存（`electron/preload/index.ts`、`electron/main/ipc-handlers.ts`）

- 大录制 ArrayBuffer **在 preload 里用 `node:fs` 直写**（`electronAPI.writeFile`），不走 IPC——避免 ≥2 次结构化克隆拷贝和主进程堆尖峰。主进程的 `write-file` IPC handler 仍在，但不用于录制 blob。
- 视频预览用 **`local-video://` 自定义协议**（`local-video-protocol.ts`）做流式 / Range seek 播放，而不是把整文件读进渲染层堆。`toLocalVideoUrl(path)` 构造 URL。
- 转换进度通过 `on-conversion-progress` 推给发起请求的窗口（用 `safeSend`——窗口可能在发送中途被销毁）。

### AI Agent 子系统（可选，懒创建）

五个文件构成 app 与 Claude Code CLI 之间的自包含桥接：
- `clawd-hook.js`——**纯 JS，零依赖**（仅 Node 内置模块）。由 Claude Code 以 `node clawd-hook.js <EventName>` 调用，从 stdin 读事件 JSON，POST 到本地 HTTP 服务器的 `/state` 或 `/permission`。端口从 `~/.erzhi-recording/runtime.json` 读取。
- `claude-hook-manager.ts`——向 `~/.claude/settings.json` 安装/卸载按事件分的 hooks（新格式，带 marker 不会覆盖其他应用的 hook）。`PermissionRequest` 用 HTTP hook；其他事件用 `shell: "powershell"` 的 `command` hook（Windows 需要 `&` 前缀）。跑 5min 健康看护，自动修复（最多 3 次）。**退出时不卸载 hooks**——有意为之，避免影响其他应用。
- `agent-server.ts`——`http.Server` 绑定 `127.0.0.1`，端口 `60000`–`60019`（`EADDRINUSE` 时递增尝试）。把绑定端口 + pid 写到 `~/.erzhi-recording/runtime.json`。端点：`POST /state`、`POST /permission`、`GET /health`。请求体上限 1MB（超出返回 413）防本地 OOM。CORS `*`。
- `agent-state-machine.ts`——跟踪 sessions，按优先级解析展示状态（`idle|thinking|working|error|notification|done`），清理过期 session（10min / working 5min），并在 `Stop` 时发 2s "done" 闪烁。
- `agent-bridge.ts`——组合上面三者的门面；暴露 `start/stop/getStatus/resolvePermission/setAutoAllow/...`。`checkClaudeRunning`（`tasklist` spawn）缓存 30s，避免阻塞主线程。

接线在 `ipc-handlers.ts`：bridge 的 state/permission 监听器向**所有**窗口广播（`agent-state-update`、`agent-permission-request`），且只在有活动（非 idle 或有待审批权限）时懒 `showAiIsland()`——AI 岛不在启动时创建（轻量化）。悬浮 AI 岛窗口（`ai-island.ts`）通过 `data:` URL 加载内联 HTML，`nodeIntegration: true` + `contextIsolation: false`（它是受信任的覆盖层）。权限按钮调 `agent-resolve-permission` → `server.resolvePendingPermission`，返回 Claude Code 要求的 `hookSpecificOutput.decision.behavior` JSON（`always` 映射为 `allow`）。

### 覆盖窗口（`electron/main/region-selector.ts`、`ai-island.ts`、`floating-ball.ts`）

`region-selector.ts` 很大，因为它管理多个 always-on-top 透明覆盖窗口（选区、录制悬浮岛、区域边框、摄像头预览）——每个都带自己的内联 HTML/JS。它们通过 IPC（`island-action`、`toolbar-action`、`resize-ai-island` 等）回传。`setMainWindow()` 在 `index.ts` 调用，让覆盖层能 minimize/restore 主窗口。悬浮球位置持久化到 `floating-ball-pos.json`。

### 渲染层状态

两个 Pinia store 持久化到 `localStorage`（`screen-recorder-settings`、`screen-recorder-recordings`），并镜像到主进程（`save-recordings` → `userData/recordings.json`）。`useRecordingStore` 持有录制状态机（`idle|selecting|recording|paused|converting`）和采集开关。录制历史以 store 为准；主进程 `recordings.json` 是备份镜像。

### 路由

Hash history（`createWebHashHistory`）——因为打包后从 `file://` 加载，这是必须的。两个路由：`/`（HomeView，主录制 UI）和 `/ai`（AiView，AI 设置，通过 `show-ai-window` IPC 作为独立窗口打开，带 `#/ai?t=<timestamp>` 破缓存）。

## 值得知道的约定

- **注释是中文的**，密度高，常解释某个非显然选择的*原因*（尤其是性能/泄漏守卫）。编辑这些区域时请匹配此风格——这些注释是承重文档。
- 不强依赖 Electron 的新主进程模块（如 ffmpeg 编排、纯逻辑）写成可在纯 Node 单测：在函数内部 `require('electron')` 懒加载，注入 logger 而非直接 `import './logger'`。以 `conversion-registry.ts` / `hw-encoder.ts` 为模板。
- `index.ts` 的 `before-quit` 是单一清理咽喉——新增长生命周期资源（定时器、子进程、覆盖窗口、HTTP server）时，把它的 teardown 接到这里。
- 打包 vs dev 的路径不同：`app.isPackaged ? path.join(process.resourcesPath, ...) : ...`。`ffmpeg.exe`、`logo.ico`、`clawd-hook.js` 都作为 `extraResources` 发布，按此方式定位。

## 仓库内参考文档

- `docs/superpowers/specs/2026-07-30-performance-audit.md`——详细的性能/资源审计报告，带 file:line 发现与修复方向。其中很多修复（ffmpeg kill 注册表、硬件编码、串行合并、rVFC 绘制循环、AI 岛懒加载、`local-video://` 流式播放、`app-before-quit` 广播）**已经落地**——查代码前先别假定审计项仍未修。
- `docs/superpowers/plans/2026-07-28-ai-agent-integration-plan.md` 与 `specs/2026-07-28-ai-agent-integration-design.md`——AI Agent Bridge 的设计与逐任务实现计划。
