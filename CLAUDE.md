# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概览

**MUERZHI万能AI 悬浮球** —— 基于 **Tauri 2（Rust 后端）+ Vue 3 + Pinia + vue-router** 的 Windows 桌面录屏 + AI 悬浮球工具。

**架构（2026-09 完成后端 Rust 化迁移，Electron 已移除）：**
- **后端 `src-tauri/src/modules/`**（Rust）：全部窗口体系（悬浮球/区域选择/AI岛/待办族/散热面板）、Agent HTTP 服务（axum）、待办数据层、一键散热、ffmpeg 转换族、WGC 录制管线
- **前端 `src/`**（Vue）：四个视图（录制/AI/设置/待办）+ 组件；`src/api/bridge.ts` 提供 `window.muerzhiAPI` 桥（Tauri invoke/listen 实现）
- **原生 HTML 窗口 `public/windows/`**：悬浮球/工具条/AI岛等无打包器静态页，经 `window.__TAURI__`（withGlobalTauri）与后端通信
- 录制用 Windows Graphics Capture（`windows-capture` crate）+ MediaFoundation 编码器直出 mp4（`screen-capture` feature）；`ffmpeg.exe` 作为 resource 随安装包分发（仓库内置裁剪版，重建脚本 `vendor/ffmpeg/build-minimal.sh`，需 MSYS2 MinGW64）。**改 `ffmpeg.rs` 的调用就要回看这个白名单**：`--disable-everything` 后逐项开启，漏一项就是运行时才炸（GIF 导出曾是「编了解封装器、滤镜和 muxer，漏了 `--enable-encoder=gif`」→ 两遍都跑完却报 `Default encoder for format gif (codec gif) is probably disabled`，产不出文件）。重建产物要同时覆盖 `vendor/ffmpeg/ffmpeg.exe`（打包源）与 `src-tauri/target/debug/ffmpeg.exe`（dev 态的 resource 目录，`ffmpeg_bin` 优先取它，不覆盖的话 dev 跑的还是旧二进制）

**命名现状：** 对外品牌名是 **MUERZHI万能AI 悬浮球**；`package.json` name 为 `MUERZHI`；Tauri identifier 为 `com.muerzhi.aiball`。历史残留 `com.erzhi.recording` / `erzhi-recording`（Agent 服务 app 名、runtime 目录）仍指本应用，别误判。git 远端仓库名为 `MUERZHI-Multi-functional-AI-Floating-Ball`。

- 仅配置了 **Windows** 构建目标（NSIS，x64）。

## 常用命令

```bash
npm run dev          # Tauri 开发（原 tauri:dev；vite dev server + cargo run 双向热重载）
npm run build        # 产出 NSIS 安装包（原 tauri:build；src-tauri/target/release/bundle/nsis/）
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

**录制辅助窗口不进画面**：边框/工具条/悬浮岛/摄像头预览窗都设了 `set_content_protected(true)`（tao → `WDA_EXCLUDEFROMCAPTURE`），人在屏幕上看得到、WGC 录不到。本段这些辅助窗的内容保护设置对它们各自生效。

**WebView2 媒体权限**：`getUserMedia` 默认弹权限确认框（CDP 里能看到 `edge://permission-request-dialog/`），而预览窗是无边框透明窗、用户点不到 → 表现为「摄像头一直黑」。`region.rs::allow_media_permissions` 挂 `PermissionRequested` 只放行 CAMERA/MICROPHONE（其余仍走默认策略）。

**画笔标注（2026-09 已移除）**：曾用 Rust 透明置顶窗 + 屏幕采集直录实现，现已整体删除（用户明确不需要该功能）——`public/windows/annotation.html`、`toggle_annotation`/`hide_annotation` 命令、`RecordingArea` 登记、渲染层的 isDrawingEnabled/画笔按钮与 Ctrl+Shift+D 快捷键、相关 i18n 词条全部清理。恢复时要重做的三件事：① 那个窗**不能**设 `set_content_protected`（设了笔迹进不了画面）；② 窗口位置尺寸必须按录制实际覆盖区域（物理像素）走 `set_position/set_size`，不能用 builder 的逻辑像素（混合 DPI 下会算错屏）；③ 停止流程要统一收窗。

**录制中开关麦克风/摄像头（工具条按钮常显）**：区域录制工具条与全屏岛的 mic/cam 按钮**录制中也保留可点**（曾按 body.recording CSS 隐藏；工具条最小宽度 240 保证装得下）。录制中点按走 `recording_set_mic`/`recording_set_camera` 实时增停采集段：麦克风按**会话时间轴**（不含暂停）跟踪各段区间，停止时 `build_mic_timeline` 对段间隙生成静音 WAV（48k/16bit/立体声全零，`write_silence_wav`）插入 concat——段内容才对得回成品时间线；摄像头段由 `build_camera_windows` 换算成 [start,end] 窗口，**有间隙时走 `overlay_camera_multi`**（每段 setpts 平移 + overlay enable=between(t,…)），无间隙（暂停分段）仍走 concat -c copy 老路径。暂停/恢复只翻 mic_on/cam_on 标志，恢复时按标志起段；`SessionInner.audio` 是 **Arc**（开关命令在锁外 join 音频线程，锁内等会卡状态轮询）。

**区域录制支持副屏**：`region_selected` 按选区中心点推导显示器下标，事件载荷带 `sourceId: "screen:{n}"`（曾硬编码 screen:0——在屏幕 2 上框选会录成屏幕 1 的内容，crop 坐标按屏 1 原点平移后落进屏 1 画面）。渲染层 selectRegion 原样透传 → `targetDisplayId` 贯通 WGC 采集/裁剪/PiP。画中画换算原点 = 选区左上角本身（虚拟桌面物理坐标），与落在哪块屏无关。选区底图抓取走 `grab_data_url_awake`：副屏刚被唤醒时 GDI 首抓常为全黑帧，按平均亮度检测、350ms×5 次重试（真·关闭的屏仍返回黑图，与旧行为一致）。

**AI 悬浮岛窗口尺寸 == 可见内容尺寸（无透明缓冲带）**：Electron 版留了 +20 右侧缓冲与 +28 底部气泡带（给 tooltip 用），Tauri 版页面没有任何 tooltip，那两条缓冲就是凭空一块「看不见但吃点击」的窗口 —— 全靠 120ms 光标轮询调 `set_ignore_cursor_events` 才穿透，轮询一断（窗口重建竞态 / 脱离管理的孤儿窗）可见岛下方 28px 就永久吞掉下方应用的点击（实测反馈「AI 悬浮岛底下的区域没办法点击」）。现在 `resize_ai_island` 直接按页面上报的 `offsetWidth/offsetHeight`（border box）设窗口，指针在任何位置都无需猜测，穿透轮询退化为兜底。页面上报宽度也必须用 `offsetWidth`（`scrollWidth` 是 padding box，少 2px 会裁掉右边框）。

**选区页必须是完整 HTML**：`public/windows/region-selector.html` 曾只有 CSS+JS 片段（缺 `<!DOCTYPE>/<body>`），浏览器当纯文本渲染 → 内联脚本永不执行 → 点「区域录制」毫无反应。改动该文件时务必保持完整文档结构。

**原生页必须声明 `<meta charset="utf-8">`**：`public/windows/*.html` 是手写页面，WebView2 **不认 HTTP 头的 charset**（dev server 返回 `text/html;charset=utf-8` 也没用）—— 页面里没有 meta 时按系统区域编码解码（中文 Windows = GBK），UTF-8 的 emoji/中文全变乱码（实测悬浮岛按钮显示成 `馃帣`）。2026-09 修过 island/toolbar/camera-preview/region-border 四页；新增原生页务必带上，且 meta 必须落在文档前 1024 字节内。图标一律用内联 SVG 而不是 emoji，顺带彻底避开这类编码/字体问题。

**悬浮岛自动收起 + 悬停唤出**（全屏/多屏录制的 island.html）：录制一开始 Rust `hide_island_ui` 给页面加 `.hidden-island`（只做透明+上移，窗口留在原地），同时 `set_ignore_cursor_events(true)` 放行鼠标穿透（否则那条看不见的窗会把用户点击吃掉）；`spawn_island_hover_watch`（120ms）拿 `cursor_position()` 与 `outer_position()` 比（都是**物理像素**）判断鼠标是否在岛矩形内 → 进则 `show`、出则 `hide`。开窗时把麦克风/摄像头开关经 **URL 查询参数**带入（`?mic=1&cam=0`），不要 build 完立刻 eval —— 页面脚本还没定义 `applyIslandControls`，参数会丢。区域录制的工具条是同一个 label，走 `ISLAND_AUTO_HIDE=false` 保持常显。

**录制停录统一收辅助窗**：`recording_stop` 里依次收 摄像头预览窗（`hide_camera_preview`，先等 webm 落盘再关）、悬浮岛 —— 它们是「录制中才需要」的窗，留着会一直挂在桌面上（实测「摄像头预览窗口停止后不消失」）。主窗口的恢复走 `show_window`：必须 `unminimize()` 再 `show()`，Windows 的 SW_SHOW 对最小化窗无效（不 unminimize 用户看到的是「录完窗口没回来」）。

**录制历史点击 → 系统播放器**：走 Rust 命令 `open_local_path`（`app.opener().open_path`），**不要**用前端的 `@tauri-apps/plugin-opener` `openPath` —— 它是 JS 命令，受 capabilities 的 opener scope 约束：`opener:default` 只含 allow-open-url/allow-reveal-item-in-dir，`open_path` 的命令作用域没配条目时**一律 ForbiddenPath**，表现是「点历史列表毫无反应」（前端 catch 里静默吞掉）。

**日志目标禁止加 TargetKind::Webview（2026-10-08 安装版 P0）**：lib.rs 的 plugin-log 曾配置三个 target 含 Webview —— 它把每条日志 emit("log://log") 给所有窗口，而 Tauri 事件投递 = evaluate_script，tauri_runtime_wry 对 eval 失败又 log::error! → 「eval 失败 → 记日志 → emit → 再 eval 失败」自激死循环。安装版实测每次启动刷 5k-13k 行/秒，2MB 日志 2 秒滚满、同秒轮转堆出 74 个文件/147MB（插件 KeepSome 清理不认 .log.bak 后缀），数分钟内进程 AppHangB1 挂死、后续启动被单实例 mutex 卡住「点了没反应」。已移除该 target（前端从未消费 log://log），并加 cleanup_stale_log_files 启动兜底裁剪。再加任何「日志 → eval → 日志」回路前先想清楚闭环。

### cargo test 注意（Windows）

测试 harness 需要 comctl32 v6 manifest（TaskDialogIndirect），`cargo test --lib` 会报 STATUS_ENTRYPOINT_NOT_FOUND——必须走显式 test target `cargo test --test unit`（`tests/unit.rs` 用 include! 引入 lib.rs，build.rs 用 `rustc-link-arg-tests` 补 resource.lib）。

### Agent 子系统（与 Claude Code CLI 集成）

`src-tauri/src/modules/agent/`：
- `server.rs`：axum HTTP 服务，127.0.0.1:60000-60019 递增选口；`/state` `/permission`（挂起式审批）/`/question` `/health`
- `state_machine.rs`：多会话状态机（优先级 error>notification>working>thinking>idle；Stop 触发 2s done 闪烁；僵尸回收）
- `hooks.rs`：向 `~/.claude/settings.json` 注入 12 事件 hooks（PermissionRequest 走 http 直连本地服务，其余走 powershell 调 `src-tauri/resources/clawd-hook.js`），5 分钟健康看护
- `session_title.rs`：读 `~/.claude/sessions/*.json` 会话标题（5s 缓存，真实标题优先）

## 迁移遗留

（画笔标注已整体移除：P4 曾以 Rust 透明置顶窗落地，2026-09 按用户要求删除，详见上方「画笔标注（2026-09 已移除）」段。）
- 窗口捕获（`types:['window']`）：`get_sources` 只支持 `screen`，窗口源返回空
- 副屏缩略图全黑：若副显示器处于**待机/关闭**状态，抓到的就是黑图（GDI 与 WGC 一致，
  连 .NET `CopyFromScreen` 抓整块虚拟桌面也是黑的）—— 属系统真实状态，不是缺陷。
  排查方法：`cargo test --test unit -- --ignored --nocapture probe_gdi_paths`

## 详细文档

- `docs/superpowers/`：specs/（性能审计、AI集成设计、待办设计）+ plans/
- `goal.md`：G1-G8 里程碑历史
