<div align="center">

# MUERZHI 万能 AI 悬浮球

**以悬浮球为统一入口的 Windows 桌面效率工具：屏幕录制 · AI 助手 · 待办便签 · 一键散热**

[简体中文](README.md) · [English](README.en.md)

![logo](public/logo.png)

![Windows](https://img.shields.io/badge/Windows-10%2F11-0078D6) ![Tauri](https://img.shields.io/badge/Tauri-2-24C8DB) ![Vue](https://img.shields.io/badge/Vue-3-42B883)

</div>

---

MUERZHI 万能 AI 悬浮球是一款常驻桌面的 Windows 应用。一个可拖拽、可吸附的**悬浮球**是所有功能的统一入口：点开即用、拖拽即走。目前内置四大能力——**屏幕录制**、**AI 助手悬浮岛**（与 Claude Code 集成）、**待办便签**、**一键散热模式**，后续还会持续接入更多功能。

## ✨ 功能总览

| 模块 | 说明 |
|---|---|
| 🎥 屏幕录制 | 全屏 / 区域 / 多屏录制，摄像头画中画，硬件编码加速 |
| 🤖 AI 助手悬浮岛 | 与 Claude Code CLI 深度集成，状态展示 + 权限就地审批 |
| 📝 待办便签 | 待办 / 备忘 / 到期提醒 / 贴屏便签，悬浮球角标提示 |
| 🌬️ 一键散热 | 右键悬浮球：风扇强冷 + 功耗限制 + 实时温度/占用率面板 |
| ⚙️ 悬浮球本体 | 边缘水滴吸附、花瓣菜单、全局快捷键、中英双语、开机自启 |

## 🖥️ 悬浮球本体

- **常驻桌面**：低开销悬浮球，拖拽移动，贴近屏幕边缘自动变成"水滴"贴合吸附
- **花瓣菜单**：点击展开环形花瓣菜单，四大功能一键直达；失焦自动收起
- **待办角标**：右上角红色数字气泡提示待办数量，到期闪烁提醒
- **个性化**：显示/隐藏、始终置顶、开机自启、界面语言（中文 / English）随手切换

## 🎥 屏幕录制

屏幕采集由 **Rust 后端**直接完成（Windows Graphics Capture 抓帧 + MediaFoundation 编码器直出 MP4），音频走 WASAPI 双路采集后交给 FFmpeg 混流——**安装包内置 8MB 裁剪版 ffmpeg**，无需额外安装任何依赖。

- **三种模式** —— 全屏 / 拖拽选区 / 多显示器分别录制
- **摄像头画中画** —— 独立悬浮窗，可拖动、可开关，停止时由 ffmpeg overlay 合成进成品
- **音频采集** —— 麦克风 + 系统声音混录，实时电平显示
- **暂停/继续** —— 采集分段，停止时无损拼接，暂停时长不会出现在成品里
- **硬件编码** —— 自动探测 NVENC / QSV / AMF，不可用自动回退软编码
- **后处理** —— MP4 转码 / 视频裁剪 / GIF 导出 / 多屏画面合并
- **流式回放** —— 自定义 `local-video://` 协议，大文件秒开、拖动即达
- **全局快捷键** —— 录制 / 暂停 / 停止随手控制

## 🤖 AI 助手悬浮岛（Claude Code 集成）

与 [Claude Code CLI](https://claude.com/claude-code) 深度集成，把 AI 的工作状态搬到桌面上：

- **自动接线** —— 自动安装 Claude Code hooks，无需手动配置
- **状态悬浮岛** —— AI 思考中 / 工作中 / 完成一目了然，多会话并行跟踪
- **权限就地审批** —— Claude 请求执行工具时，悬浮岛弹出审批卡片，屏幕上直接允许 / 拒绝，不打断手头工作
- **按会话自动审批** —— 可对单个会话开启自动放行
- **会话标题** —— 悬浮岛同步显示当前会话标题

> 前置条件：本机已安装 Claude Code CLI（`claude` 命令可用）。未使用 AI 功能时该模块完全惰性，不占资源。

## 🌬️ 一键散热模式

**右击悬浮球中央圆圈**触发 20 秒散热，弧形菜单像风扇一样旋转，球旁面板实时展示：

- **风扇强冷** —— 自动探测厂商通道并真实控制风扇：
  - 机械革命 / 同方 / 七彩虹等 **Uniwill ODM 机型**：通过出厂驱动直写 ECRAM，效果等同电竞控制台强冷
  - **联想 Legion** 机型：通过 WMI 接口切换风扇模式
- **功耗限制** —— 不支持风扇直控的机型，自动改用 powercfg 限制 CPU 最大频率辅助降温（结束自动恢复）
- **实时监控面板** —— 倒计时、CPU 温度、CPU / GPU / 磁盘 / 内存占用率、当前生效的散热手段
- **诚实显示** —— 面板如实标注实际生效的杠杆（风扇已全速 / 功耗散热中 / 温度监测中），绝不虚报
- **异常安全** —— 应用崩溃或中途退出，下次启动自动恢复所有被修改的系统设置

## 📝 待办便签

- 待办与自由备忘录，富文本编辑
- 到期提醒：悬浮球角标闪烁 + 通知
- 贴屏便签：重要事项钉在屏幕边缘常驻可见

## 🚀 安装与使用

### 普通用户

1. 前往 [Releases](../../releases) 下载最新的 `MUERZHI-x.x.x-setup.exe`
2. 双击安装（支持自定义安装目录，自动创建桌面 / 开始菜单快捷方式）
3. 启动后悬浮球出现在屏幕中央，右键它试试散热模式 🌬️

### 开发者

**环境要求**：Windows 10/11 x64 · Node.js ≥ 20 · npm · [Rust 工具链](https://rustup.rs/)（MSVC toolchain，需 Visual Studio C++ 生成工具与 Windows SDK）

```bash
git clone https://github.com/CKKLIN/MUERZHI-Multi-functional-AI-Floating-Ball.git
cd MUERZHI-Multi-functional-AI-Floating-Ball
npm install           # 依赖走 npmmirror 镜像（见 .npmrc），国内网络友好
npm run tauri:dev     # 开发模式：vite dev server（21047）+ cargo run，前端与 Rust 双向热重载
```

`npm run dev:web` 只起 vite dev server（纯前端调试样式用）；`tauri:dev` 会自己拉起它，日常开发不用单独跑。

**打包分发**：

```bash
npm run tauri:build   # 产出 NSIS 安装包 → src-tauri/target/release/bundle/nsis/
```

> 打包会自动内置裁剪版 `ffmpeg.exe`、应用图标与 Claude Code hook 脚本（`tauri.conf.json` 的 `bundle.resources`），产物开箱即用。

**测试与类型检查**：

```bash
npx vue-tsc                              # 前端类型检查
cd src-tauri && cargo test --test unit   # Rust 单测（61 项：i18n/设置/待办/Agent 状态机/散热解析/编码器探测/local-video Range/录制参数与 WAV/时区/选区量纲换算）
```

> Windows 上单测必须走显式 test target（`--test unit`）：`cargo test --lib` 会因缺 comctl32 v6 manifest 报 `STATUS_ENTRYPOINT_NOT_FOUND`。

真机冒烟测试（需桌面会话，默认 `#[ignore]`）：

```bash
cd src-tauri && cargo test --test unit -- --ignored --nocapture
```

## 🧱 技术栈

| 层 | 技术 |
|---|---|
| 桌面框架 | Tauri 2（Rust 后端 + WebView2 渲染层） |
| 界面 | Vue 3 + Pinia + vue-router（hash 路由） |
| 构建 | Vite 8 + tauri-bundler（NSIS x64） |
| 屏幕采集 | Windows Graphics Capture（`windows-capture` crate）+ MediaFoundation 编码 |
| 音频采集 | WASAPI（麦克风 + 系统声 loopback）→ WAV → ffmpeg `amix` 混流 |
| 媒体处理 | 内置裁剪版 ffmpeg（转码 / 裁剪 / GIF / 多屏合并 / 画中画合成） |
| 语言 | Rust（后端）+ TypeScript（前端，strict，`vue-tsc` 全量类型检查） |

## 📄 其他

- 界面支持中文 / English 双语，悬浮球设置中切换；本 README 亦提供[英文版](README.en.md)
- 散热模式的风扇直控支持矩阵随厂商驱动而定，未支持机型自动降级为功耗散热，不会误报
- 项目为私有开发，欢迎 Issue 反馈问题与建议

<div align="center">

[简体中文](README.md) · [English](README.en.md) · [回到顶部](#-功能总览)

</div>
