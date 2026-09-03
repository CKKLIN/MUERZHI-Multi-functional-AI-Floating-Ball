<div align="center">

# MUERZHI Universal AI Floating Ball

**A Windows desktop utility with a floating ball as its single entry point: screen recording · AI assistant · todo notes · one-click cooling**

[简体中文](README.md) · [English](README.en.md)

![logo](public/logo.png)

![Windows](https://img.shields.io/badge/Windows-10%2F11-0078D6) ![Electron](https://img.shields.io/badge/Electron-28-47848F) ![Vue](https://img.shields.io/badge/Vue-3-42B883)

</div>

---

MUERZHI Universal AI Floating Ball is a resident Windows desktop app. A draggable, edge-snapping **floating ball** is the unified entry point for everything: click to use, drag to move. It ships with four built-in capabilities — **screen recording**, the **AI assistant island** (Claude Code integration), **todo notes**, and **one-click cooling** — with more on the way.

## ✨ Features at a Glance

| Module | Description |
|---|---|
| 🎥 Screen Recording | Full-screen / region / multi-display capture, camera PiP, hardware-accelerated encoding |
| 🤖 AI Assistant Island | Deep Claude Code CLI integration: live status + in-place permission approval |
| 📝 Todo Notes | Todos / memos / due reminders / edge-pinned sticky notes, badge on the ball |
| 🌬️ One-Click Cooling | Right-click the ball: real fan boost + power capping + live temp/usage panel |
| ⚙️ The Ball Itself | Edge water-drop snapping, petal menu, global shortcuts, bilingual UI, autostart |

## 🖥️ The Floating Ball

- **Always on your desktop**: lightweight ball, drag it anywhere, snaps to screen edges as a "water drop"
- **Petal menu**: click to bloom a radial menu — one click to every module; auto-collapses on blur
- **Todo badge**: red counter bubble on the top-right corner, flashes when a reminder is due
- **Personal touch**: show/hide, always-on-top, launch at login, UI language (中文 / English)

## 🎥 Screen Recording

Capture runs in the renderer (`getDisplayMedia` + `MediaRecorder`); post-processing runs in the main process via FFmpeg — **the installer bundles an 8 MB trimmed ffmpeg build**, nothing else to install.

- **Three modes** — full-screen / draggable region / per-display multi-monitor capture
- **Camera PiP** — camera preview as a separate draggable floating window
- **Audio capture** — microphone + system audio mixed, with live level meters
- **Drawing annotations** — draw directly on the frame while recording
- **Hardware encoding** — auto-detects NVENC / QSV, falls back to software encoding
- **Post-processing** — MP4 transcode / trimming / GIF export / multi-screen compositing
- **Streaming playback** — custom `local-video://` protocol: instant open and instant seek on large files
- **Global shortcuts** — record / pause / stop at your fingertips

## 🤖 AI Assistant Island (Claude Code Integration)

Deep integration with the [Claude Code CLI](https://claude.com/claude-code) — it puts the AI's working state right on your desktop:

- **Automatic wiring** — installs Claude Code hooks for you, zero manual configuration
- **Status island** — thinking / working / done at a glance, multiple sessions tracked in parallel
- **In-place permission approval** — when Claude asks to run a tool, an approval card pops up on the island; allow or deny without leaving your work
- **Per-session auto-approval** — optionally auto-allow everything for a given session
- **Session titles** — the island shows the current session's title

> Prerequisite: the Claude Code CLI must be installed locally (the `claude` command). When unused, this module stays fully idle.

## 🌬️ One-Click Cooling

**Right-click the center circle of the floating ball** to start a 20-second cooling session. The radial menu spins like a fan while a compact panel shows:

- **Real fan boost** — auto-detects your vendor channel and actually controls the fans:
  - **Uniwill ODM machines** (MECHREVO / TongFang / Colorful, etc.): writes the EC RAM directly through the factory driver — same effect as the vendor gaming console's cooling mode
  - **Lenovo Legion** machines: switches fan mode via WMI
- **Power capping** — on machines without fan control, it falls back to powercfg CPU frequency limiting to cut heat (auto-restored afterwards)
- **Live monitoring panel** — countdown, CPU temperature, CPU / GPU / disk / memory usage, and which levers actually engaged
- **Honest reporting** — the panel states exactly what engaged (fans at full speed / power-limited cooling / monitoring only), never overclaims
- **Crash-safe** — if the app crashes or quits mid-cooling, every modified system setting is restored on next launch

## 📝 Todo Notes

- Todos and free-form memos with rich-text editing
- Due reminders: badge flash on the ball + notifications
- Sticky notes: pin important items to the edge of your screen

## 🚀 Installation & Usage

### End users

1. Grab the latest `MUERZHI-x.x.x-setup.exe` from [Releases](../../releases)
2. Run the installer (choose the install directory; desktop / start-menu shortcuts created automatically)
3. After launch the ball appears at the center of your screen — right-click it to try the cooling mode 🌬️

### Developers

**Requirements**: Windows 10/11 x64 · Node.js ≥ 20 · npm

```bash
git clone https://github.com/CKKLIN/MUERZHI-Multi-functional-AI-Floating-Ball.git
cd MUERZHI-Multi-functional-AI-Floating-Ball
npm install          # dependencies resolve via the npmmirror registry (see .npmrc) — CN-network friendly
npm run dev          # development: Vite HMR + hot-restarting Electron
```

**Build & distribute**:

```bash
npm run build        # produces the NSIS installer → release/MUERZHI-x.x.x-setup.exe
npm run build:dir    # unpacked build only (no installer), for quick local verification
```

> The build bundles the trimmed `ffmpeg.exe`, app icons, and the Claude Code hook script (extraResources) — the artifact works out of the box.

**Tests & type checking**:

```bash
node --experimental-strip-types test-cooling.mjs   # cooling module unit tests (zero-dep, Node ≥ 22.15)
npx vue-tsc                                        # type checks renderer + main process
```

## 🧱 Tech Stack

| Layer | Technology |
|---|---|
| Desktop | Electron 28 (main / renderer / preload three-layer architecture) |
| UI | Vue 3 + Pinia + vue-router (hash routing) |
| Build | Vite 8 + vite-plugin-electron + electron-builder (NSIS x64) |
| Media | MediaRecorder + fluent-ffmpeg (bundled trimmed ffmpeg) |
| Language | TypeScript (strict, full `vue-tsc` type checking) |

## 📄 Misc

- The UI supports 中文 / English, switchable in the ball's settings; this README also has a [Chinese version](README.md)
- Fan-control support depends on your vendor's driver; unsupported machines degrade gracefully to power-limited cooling — never overclaimed
- Private project — issues and feedback are welcome

<div align="center">

[简体中文](README.md) · [English](README.en.md) · [Back to top](#-features-at-a-glance)

</div>
