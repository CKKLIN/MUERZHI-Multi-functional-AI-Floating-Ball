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

- 录制管线要完整编译：`cargo check --features screen-capture`（`npm run tauri:dev` 需在 Cargo.toml default features 或命令行带 `--features`）
- 类型检查：`npx vue-tsc`
- Rust 单测：`cd src-tauri && cargo test --test unit`（42 项，覆盖 i18n/设置/待办/Agent 状态机/散热解析/编码器探测/local-video Range）

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
- 录制的区域裁剪/麦克风/多屏/摄像头画笔合成：P4 后续迭代（WGC 主屏全屏录制已实测通过）

## 详细文档

- `docs/superpowers/`：specs/（性能审计、AI集成设计、待办设计）+ plans/
- `goal.md`：G1-G8 里程碑历史
