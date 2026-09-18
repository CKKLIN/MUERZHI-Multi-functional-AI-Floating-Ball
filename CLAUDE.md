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
- Rust 单测：`cd src-tauri && cargo test --test unit`（58 项：i18n/设置/待办/Agent 状态机/散热解析/编码器探测/local-video Range/录制参数与 WAV/时区）
- 真机冒烟（需桌面会话，默认 `#[ignore]`）：
  `cargo test --test unit -- --ignored --nocapture`（WGC 录一段 mp4、WASAPI 采两路音频、concat+amix 出带音轨成品）

### 录制管线（P4 已完成）

`src-tauri/src/modules/recording/`：
- `capture.rs`：WGC 帧泵（`windows-capture`）→ MediaFoundation 编码器直出 mp4。**暂停 = 分段**：一张会话只认一个输出文件、且编码器时间轴来自捕获时钟，中途跳帧会在成品里留时间黑洞；改为暂停结束当前段、恢复起新段，停止后 ffmpeg `concat -c copy` 无损拼接（与 Electron 版 `MediaRecorder.pause()` 语义一致）。编码器用 **H264 而非 HEVC**：精简 ffmpeg 有 h264 解码器没有 hevc，裁剪/GIF/多屏都要解码。
- `audio.rs`：WASAPI 麦克风（Capture 设备）+ 系统声（Render 设备 + loopback 标志）各录 48k/16bit 立体声 WAV，**不做 Rust 内实时混音**（两路时钟漂移 + 重采样交给 ffmpeg 的 `amix/aresample`，录制阶段零混音 CPU）；每块 PCM 算 RMS 写全局 atomics。
- `grab.rs`：DXGI 复制抓单帧（缩略图 340×200 盒式降采样 → PNG data URL / 全分辨率截图存桌面）。缩略图不用 WGC——抓一帧要起会话等首帧，DXGI `AcquireNextFrame` 本身就是「取当前桌面一帧」。
- `mod.rs`：会话编排。停止流程 = 逐显示器分段 concat → 区域 crop（可选）或多屏 overlay 合并 → `mux_audio`（麦克风/系统声各可能多段：多段先 `concat` 滤镜接起来，两路再 `amix`）→ 清理临时文件。电平由 20Hz ticker 推给原生窗口（`win.eval('window.updateMeter')`）与渲染层（`audio-levels` 事件）。

**设备 id 域**：麦克风下拉走 `list_audio_devices`（WASAPI endpoint id），与 `navigator.mediaDevices` 的 deviceId **不通用**（列表用旧值会静默落到默认设备）。摄像头仍走 WebView2（预览窗 getUserMedia）。

**录制辅助窗口不进画面**：边框/工具条/悬浮岛/摄像头预览窗都设了 `set_content_protected(true)`（tao → `WDA_EXCLUDEFROMCAPTURE`），人在屏幕上看得到、WGC 录不到。**未接线**：画笔标注（`setDrawAnnotations` 是空实现，笔迹不进成品）。

### cargo test 注意（Windows）

测试 harness 需要 comctl32 v6 manifest（TaskDialogIndirect），`cargo test --lib` 会报 STATUS_ENTRYPOINT_NOT_FOUND——必须走显式 test target `cargo test --test unit`（`tests/unit.rs` 用 include! 引入 lib.rs，build.rs 用 `rustc-link-arg-tests` 补 resource.lib）。

### Agent 子系统（与 Claude Code CLI 集成）

`src-tauri/src/modules/agent/`：
- `server.rs`：axum HTTP 服务，127.0.0.1:60000-60019 递增选口；`/state` `/permission`（挂起式审批）/`/question` `/health`
- `state_machine.rs`：多会话状态机（优先级 error>notification>working>thinking>idle；Stop 触发 2s done 闪烁；僵尸回收）
- `hooks.rs`：向 `~/.claude/settings.json` 注入 12 事件 hooks（PermissionRequest 走 http 直连本地服务，其余走 powershell 调 `src-tauri/resources/clawd-hook.js`），5 分钟健康看护
- `session_title.rs`：读 `~/.claude/sessions/*.json` 会话标题（5s 缓存，真实标题优先）

## 迁移遗留

- `public/about.html`：Electron 版静态关于页（已迁 Vue hash 路由 /about，此文件待删）
- 画笔标注合成：渲染层 `useDrawingCanvas` 能画，但笔迹未进成品（需 ffmpeg overlay 合成 strokes）
- 摄像头画中画合成：主窗口预览窗与录制合成未接线（录制时画面里没有摄像头小窗）
- 窗口捕获（`types:['window']`）：`get_sources` 只支持 `screen`，窗口源返回空

## 详细文档

- `docs/superpowers/`：specs/（性能审计、AI集成设计、待办设计）+ plans/
- `goal.md`：G1-G8 里程碑历史
