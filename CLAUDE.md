# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概览

**MUERZHI万能AI 悬浮球** —— 基于 **Tauri 2（Rust 后端）+ Vue 3 + Pinia + vue-router** 的 Windows 桌面录屏 + AI 悬浮球工具。

**架构（2026-09 完成后端 Rust 化迁移，Electron 已移除）：**
- **后端 `src-tauri/src/modules/`**（Rust）：全部窗口体系（悬浮球/区域选择/AI岛/待办族/散热面板）、Agent HTTP 服务（axum）、待办数据层、一键散热、ffmpeg 转换族、WGC 录制管线
- **前端 `src/`**（Vue）：四个视图（录制/AI/设置/待办）+ 组件；`src/api/bridge.ts` 提供 `window.electronAPI` 兼容桥（Tauri invoke/listen 实现）
- **原生 HTML 窗口 `public/windows/`**：悬浮球/工具条/AI岛等无打包器静态页，经 `window.__TAURI__`（withGlobalTauri）与后端通信
- 录制用 Windows Graphics Capture（`windows-capture` crate）+ MediaFoundation 编码器直出 mp4（`screen-capture` feature）；`ffmpeg.exe` 作为 resource 随安装包分发（仓库内置裁剪版，重建脚本 `vendor/ffmpeg/build-minimal.sh`，需 MSYS2 MinGW64）

**命名现状：** 对外品牌名是 **MUERZHI万能AI 悬浮球**；`package.json` name 为 `MUERZHI`；Tauri identifier 为 `com.muerzhi.aiball`。历史残留 `com.erzhi.recording` / `erzhi-recording`（Agent 服务 app 名、runtime 目录）仍指本应用，别误判。git 远端仓库名为 `MUERZHI-Multi-functional-AI-Floating-Ball`。

- 仅配置了 **Windows** 构建目标（NSIS，x64）。

## 常用命令

```bash
npm run tauri:dev    # Tauri 开发（起 vite dev server + cargo run，双向热重载）
npm run tauri:build  # 产出 NSIS 安装包（src-tauri/target/release/bundle/nsis/）
npm run dev:web      # 仅 vite dev server（调试前端样式用）
npm run build:web    # 仅 vite build（tauri build 的 beforeCommand）
```

- 录制管线默认编译（`screen-capture` 已进 `default` features）；快速跳过 WGC/WASAPI 重编译用 `cargo check --no-default-features`
- 类型检查：`npx vue-tsc`
- Rust 单测：`cd src-tauri && cargo test --test unit`（61 项：i18n/设置/待办/Agent 状态机/散热解析/编码器探测/local-video Range/录制参数与 WAV/时区/选区量纲换算）
- 真机冒烟（需桌面会话，默认 `#[ignore]`）：
  `cargo test --test unit -- --ignored --nocapture`（WGC 录一段 mp4、WASAPI 采两路音频、concat+amix 出带音轨成品、摄像头 webm 叠加与分段拼接）

### 录制管线（P4 已完成）

`src-tauri/src/modules/recording/`：
- `capture.rs`：WGC 帧泵（`windows-capture`）→ MediaFoundation 编码器直出 mp4。**暂停 = 分段**：一张会话只认一个输出文件、且编码器时间轴来自捕获时钟，中途跳帧会在成品里留时间黑洞；改为暂停结束当前段、恢复起新段，停止后 ffmpeg `concat -c copy` 无损拼接（与 Electron 版 `MediaRecorder.pause()` 语义一致）。编码器用 **H264 而非 HEVC**：精简 ffmpeg 有 h264 解码器没有 hevc，裁剪/GIF/多屏都要解码。
- `audio.rs`：WASAPI 麦克风（Capture 设备）+ 系统声（Render 设备 + loopback 标志）各录 48k/16bit 立体声 WAV，**不做 Rust 内实时混音**（两路时钟漂移 + 重采样交给 ffmpeg 的 `amix/aresample`，录制阶段零混音 CPU）；每块 PCM 算 RMS 写全局 atomics。
- `grab.rs`：单帧抓取走 **GDI `BitBlt`**（缩略图 340×200 盒式降采样 → PNG data URL / 全分辨率截图存桌面 / 选区窗底图）。三个必须记住的坑：① DXGI 复制本机实测**首帧全黑**、后续超时；② WGC 是脏区驱动，静止/待机屏可能整段会话只投 1 帧且全黑 —— 所以单帧抓图用 GDI（同步取当前屏幕内容，没有"等帧"这回事），WGC 单帧路径降级为诊断通道；③ GDI/WGC/DXGI 的 32bpp 输出 **alpha 恒为 0**，不显式置 255 编出来的 PNG 是全透明的（data URL 有内容、页面上什么都看不到）；④ GDI 的 `CreateDCW(设备名,设备名,…)` 拿到的是**该显示器自己的 DC**，`BitBlt` 源坐标必须是 `(0,0)` —— 传虚拟桌面坐标只有主屏（0,0）碰巧对，副屏会整块取到界外 → 黑图。
- `mod.rs`：会话编排。停止流程 = 逐显示器分段 concat → 区域 crop（可选）或多屏 overlay 合并 → 摄像头画中画 overlay（可选）→ `mux_audio`（麦克风/系统声各可能多段：多段先 `concat` 滤镜接起来，两路再 `amix`）→ 清理临时文件。电平由 20Hz ticker 推给原生窗口（`win.eval('window.updateMeter')`）与渲染层（`audio-levels` 事件）。

### 摄像头画中画（PiP）

摄像头流在 **WebView2** 手里（`getUserMedia`），Rust 侧拿不到，所以由预览窗自己录：

1. `camera-preview.html` 用 `MediaRecorder` 分块（1s timeslice）录 **webm（VP9/VP8）**，经 `append_file` 追加落盘到 `%TEMP%/muerzhi_cam_{id}.webm`；停止时回报 `camera_record_finished`，Rust 等到这个信号才开工（否则 webm 尾部还在写）。
2. `recording_stop` 里 `overlay_camera`（`ffmpeg.rs`）把 webm 叠到主视频：主视频与摄像头编码不同源，**必须重编码**（不能用 `-c copy`），音频 `-map 0:a? -c:a copy` 原样带过。**滤镜链末段必须带输出标签**（`...,format=yuv420p[out]`），否则 `-map [out]` 报 `Output with label 'out' does not exist`。输出帧率要显式 `-r`：摄像头源是 10fps 的 webm，不钉帧率时 overlay 会按摄像头时间基驱动输出（成品掉到 10fps）。
3. 暂停 = 摄像头同样分段（`_p01.webm`…），停止时先 `concat -c copy` 拼成**`.mkv`**——MediaRecorder 的 VP8/VP9 塞不进 mp4（`Could not find tag for codec vp8 in stream #0`），所以 `concat_videos` 按后缀决定是否加 `-movflags +faststart`（matroska 不认这个 flag）。冒烟：`cargo test --test unit -- --ignored camera_overlay`。

**量纲（最容易错的一处）**：选区窗上报的 region 是**逻辑像素**（CSS px），而窗口 `outer_position/outer_size`、`cursor_position`、显示器 `bounds` 都是**物理像素**。`region-selector.html` 在 150% 屏上 `innerWidth=1707`（=2560/1.5），所以选区 (100,100,400,300) 落到物理 (150,150,600,450)。规则：
- `CameraArea` 一律存**物理像素**（`show_region_border` 入口 `region_to_physical` 换算；全屏时直接用显示器 `bounds`，本来就物理）。
- 边框窗/工具条的 `builder.position/inner_size` 吃**逻辑像素**，region 直接喂进去、**不要再除 `display_scale`**（除一次 = 二次换算，红框会缩到 2/3 并整体左上偏移）。摄像头窗相反：位置从物理像素来，必须除缩放比。
- 渲染层算 PiP 的 `cameraRect` 时把原点也统一成物理像素（区域 = 屏原点 + 选区×scale；多屏 = 各屏 bounds 最小值，即 `merge_multi_screen` 的画布原点；单屏 = 该屏 bounds）。修复前拿物理的 `geo.x` 直接减逻辑的 `region.x`，高 DPI 屏上整体偏移。

**设备 id 域**：麦克风下拉走 `list_audio_devices`（WASAPI endpoint id），与 `navigator.mediaDevices` 的 deviceId **不通用**（列表用旧值会静默落到默认设备）。摄像头仍走 WebView2（预览窗 getUserMedia）。

**定速补帧（关键）**：WGC 只在画面**变化**时投帧（脏区驱动），静置桌面可能几秒才来一帧，而 MF 编码器时间戳完全取自帧到达时刻 —— 直接送帧会「录 6 秒得 0.03 秒视频」（实测）。现在帧到达只更新共享缓冲，另一个 pacing 线程按目标 fps 用墙钟时间戳反复推最后一帧，于是动静皆有真实帧率、时长与界面计时器一致。**帧序**：WGC 的 BGRA 是自下而上，送编码器前必须翻转行序。

**录制辅助窗口不进画面**：边框/工具条/悬浮岛/摄像头预览窗都设了 `set_content_protected(true)`（tao → `WDA_EXCLUDEFROMCAPTURE`），人在屏幕上看得到、WGC 录不到。画笔标注走独立透明窗（见下方「画笔标注」段），本段这些辅助窗的内容保护设置对它**不适用**。

**WebView2 媒体权限**：`getUserMedia` 默认弹权限确认框（CDP 里能看到 `edge://permission-request-dialog/`），而预览窗是无边框透明窗、用户点不到 → 表现为「摄像头一直黑」。`region.rs::allow_media_permissions` 挂 `PermissionRequested` 只放行 CAMERA/MICROPHONE（其余仍走默认策略）。

**画笔标注（与旧版实现完全不同）**：不开渲染层画布、也不用 strokes.webm 后期合成 —— Rust 开一个**覆盖录制区域的透明置顶窗**（`public/windows/annotation.html`），笔迹直接画在桌面上，WGC 顺手把它录进成品：零后期成本、零坐标对齐误差，工具条（笔/橡皮/箭头/矩形/颜色/粗细/撤销/清空）全在这个窗内自绘，可拖动、可隐藏（隐藏后右上角留恢复按钮）。三个必须记住的点：① 这个窗**故意不设** `set_content_protected`（与边框/工具条/摄像头预览窗相反）——设了笔迹就进不了画面；② 窗口位置尺寸必须用 `RecordingArea`（录制会话按目标显示器/选区登记的**物理像素**矩形）走 `set_position/set_size`，不能用 builder 的逻辑像素 —— 混合 DPI 机器上按主屏缩放比换算会算错屏（实测 150% 副屏录制时窗跑到了主屏，笔迹全落在画面外）；③ 录制停止流程统一 `hide_annotation` 收窗。

**选区页必须是完整 HTML**：`public/windows/region-selector.html` 曾只有 CSS+JS 片段（缺 `<!DOCTYPE>/<body>`），浏览器当纯文本渲染 → 内联脚本永不执行 → 点「区域录制」毫无反应。改动该文件时务必保持完整文档结构。

### cargo test 注意（Windows）

测试 harness 需要 comctl32 v6 manifest（TaskDialogIndirect），`cargo test --lib` 会报 STATUS_ENTRYPOINT_NOT_FOUND——必须走显式 test target `cargo test --test unit`（`tests/unit.rs` 用 include! 引入 lib.rs，build.rs 用 `rustc-link-arg-tests` 补 resource.lib）。

### Agent 子系统（与 Claude Code CLI 集成）

`src-tauri/src/modules/agent/`：
- `server.rs`：axum HTTP 服务，127.0.0.1:60000-60019 递增选口；`/state` `/permission`（挂起式审批）/`/question` `/health`
- `state_machine.rs`：多会话状态机（优先级 error>notification>working>thinking>idle；Stop 触发 2s done 闪烁；僵尸回收）
- `hooks.rs`：向 `~/.claude/settings.json` 注入 12 事件 hooks（PermissionRequest 走 http 直连本地服务，其余走 powershell 调 `src-tauri/resources/clawd-hook.js`），5 分钟健康看护
- `session_title.rs`：读 `~/.claude/sessions/*.json` 会话标题（5s 缓存，真实标题优先）

## 迁移遗留

（画笔标注已在 P4 落地，实现方式与旧 Electron 版完全不同 —— 见下方「画笔标注」段；旧版的 `DrawingCanvas.vue`/`DrawingToolbar.vue`/`useDrawingCanvas.ts` 已删除。）
- 窗口捕获（`types:['window']`）：`get_sources` 只支持 `screen`，窗口源返回空
- 副屏缩略图全黑：若副显示器处于**待机/关闭**状态，抓到的就是黑图（GDI 与 WGC 一致，
  连 .NET `CopyFromScreen` 抓整块虚拟桌面也是黑的）—— 属系统真实状态，不是缺陷。
  排查方法：`cargo test --test unit -- --ignored --nocapture probe_gdi_paths`

## 详细文档

- `docs/superpowers/`：specs/（性能审计、AI集成设计、待办设计）+ plans/
- `goal.md`：G1-G8 里程碑历史
