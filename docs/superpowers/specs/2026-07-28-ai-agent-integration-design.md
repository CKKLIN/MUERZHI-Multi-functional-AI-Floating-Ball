# AI Agent 状态监控与权限审批集成设计

## 概述

在二支录制（screen-capture---texture-tool）的悬浮岛中集成 Claude Code AI 编程助手的**运行状态监控**和**本地权限审批**功能。用户可以在录制过程中实时看到 AI 的工作状态，并直接在悬浮岛中处理权限审批，无需切换窗口。

## 背景

- **二支录制**：一个 Electron + Vue3 + TypeScript 的屏幕录制工具
- **悬浮岛**：录制时悬浮在屏幕顶部的浮动控制栏（BrowserWindow），包含录制控制按钮
- **Claude Code**：Anthropic 的命令行 AI 编程助手，支持 command hook 机制上报状态事件和权限请求
- 本项目内置精简版 Agent Bridge（不依赖 Clawd on Desk），独立管理 Claude Code 集成

## 架构

```text
┌─ 二支录制 Electron 应用 ──────────────────────────────────┐
│                                                           │
│  ┌─ 主进程 ───────────────────────────────────────────┐   │
│  │  Agent Bridge (electron/main/agent-bridge.ts)       │   │
│  │  ├─ Claude Hook Manager                              │   │
│  │  │   ├─ 安装/卸载 command hook                       │   │
│  │  │   ├─ 监视 hook 完整性（auto-repair）              │   │
│  │  │   └─ 安装/卸载 auto-start hook                    │   │
│  │  ├─ HTTP Server (127.0.0.1:23338)                    │   │
│  │  │   ├─ POST /state                                  │   │
│  │  │   ├─ POST /permission                             │   │
│  │  │   └─ GET /health                                  │   │
│  │  ├─ State Machine (精简版)                           │   │
│  │  │   ├─ 会话管理                                     │   │
│  │  │   ├─ 状态优先级                                   │   │
│  │  │   └─ 陈旧会话清理                                 │   │
│  │  └─ IPC → 悬浮岛                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                           │
│  ┌─ 悬浮岛 (BrowserWindow) ───────────────────────────┐   │
│  │  [录制控制] [AI 状态指示器] [权限审批卡片]          │   │
│  └─────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────┘
```

## 功能模块

### 1. Claude Hook 管理

**安装**（`agent-bridge.ts` 的 `installClaudeHooks()`）：

- 读取 `~/.claude/settings.json`
- 在 `hooks` 数组中追加 command hook 条目
- 条目格式：
```json
{
  "name": "erzhi-recording-state",
  "script": "<resourcesDir>/clawd-hook.js",
  "events": ["SessionStart", "SessionEnd", "UserPromptSubmit",
             "PreToolUse", "PostToolUse", "PostToolUseFailure",
             "Stop", "StopFailure", "ApiError", "Notification"]
}
```
- 使用 marker 标记（`name: "erzhi-recording-state"`），不覆盖用户已有 hook
- 和 Clawd 的 hook 条目和平共存

**卸载**（`uninstallClaudeHooks()`）：

- 只移除带 marker 的条目
- 保留用户其他 hook 条目不动

**监视器**（`startClaudeWatcher()`）：

- 监视 `~/.claude/` 目录（盯目录不是文件，防原子替换静默失效）
- hook 被抹掉时自动重装
- 每 5 分钟只读健康巡检
- 同一问题连续 3 次修复失败后停止，标记 `manual-fix-required`

**Auto-Start**（`setClaudeAutoStart(enabled)`）：

- 向 `~/.claude/settings.json` 的 hooks 中添加 SessionStart hook
- Claude Code 启动时自动唤起二支录制主进程

**钩子脚本**（`electron/main/clawd-hook.js`）：

- 零依赖 Node.js 脚本
- 通过 stdin 读取 Claude Code 事件 JSON
- HTTP POST 到 `127.0.0.1:23338/state` 或 `/permission`
- 运行时不阻塞 Claude Code（非阻塞 stdout）

### 2. HTTP 服务

监听 `127.0.0.1:23338-23342`（主端口 23338，冲突时自动尝试下一个）。

**/state POST**：

接收 Claude Code 状态事件，规范化后传入状态机。

必选字段：`session_id`、`state`、`event`
可选字段：`source_pid`、`tool_name`、`tool_input`、`cwd`、`context_usage`、`model`、`permission_suspect`

响应：`200 { "ok": true, "app": "erzhi-recording" }`

**/permission POST**：

接收 Claude Code 权限请求（阻塞式 HTTP hook，保持长连接）。

请求体包含：`tool_name`、`tool_input`、`session_id`、`permission_suggestions`

处理流程：
1. 收到请求 → IPC 通知悬浮岛显示权限卡片
2. 等待用户决策（Allow / Deny / Always allow）
3. 用户点击 → IPC 通知主进程 → 构造 HTTP 响应返回

响应：`200 { "behavior": "allow" | "deny" }`

超时处理：120 秒无响应返回 `{ "behavior": "cancel" }`，Claude Code 回退到终端提示。

**/health GET**：

健康检查，返回服务器运行状态。

### 3. 状态机

**会话结构**：

```typescript
interface AgentSession {
  sessionId: string
  agentId: string          // "claude-code"
  state: string            // "idle" | "thinking" | "working" | "error" | "notification"
  event: string            // 最后一个事件名
  updatedAt: number
  toolName?: string
  toolInput?: any
  contextUsage?: { used: number; limit: number }
  model?: string
}
```

**状态优先级**：
```
error(4) > notification(3) > working(2) > thinking(1) > idle(0)
```

**核心方法**：

- `updateSession(sessionId, state, event, opts)` — 更新或创建会话，触发状态决议
- `resolveDisplayState()` — 遍历所有会话取最高优先级
- `cleanStaleSessions()` — 每 10 秒清理过期会话（10 分钟无更新删除，working 5 分钟无更新降级）

### 4. 悬浮岛 UI

#### 4.1 AI 状态指示器

在悬浮岛工具栏右侧新增 AI 状态区域：

| 状态 | 显示 | 行为 |
|------|------|------|
| idle | 灰色圆点 `●` | 静态 |
| thinking | 🟡 黄色呼吸动画 | 缓慢闪烁 |
| working | 🔵 蓝色旋转/闪烁 | 快速脉冲 |
| error | 🔴 红色常亮 | 静态 |
| notification | 🟣 紫色脉冲 | 闪烁+微振动 |
| done | 🟢 绿色闪烁 | 2 秒后回 idle |

AI 状态圆点可点击：
- 悬浮提示显示当前 Agent 名、状态文字、工具名、上下文用量
- 点击打开 Dashboard 小窗口（显示活跃会话列表）

#### 4.2 权限审批卡片

当有权限请求时，悬浮岛**动态扩展宽度和信息区域**：

**收起态**：悬浮岛保持现有尺寸，AI 状态指示器变为紫色脉冲

**展开态**：悬浮岛扩展，在底部或右侧展开权限卡片，内容包含：
- Agent 标识（Claude Code）
- 请求的工具操作描述（如"写入文件"）
- 目标信息（如文件路径）
- 三个操作按钮：Allow / Deny / Always allow

**交互流程**：
1. 收到 PermissionRequest → IPC 通知悬浮岛
2. 悬浮岛从当前宽度平滑扩展到显示权限卡片
3. 用户点击 Allow/Deny → IPC → HTTP 响应
4. 卡片收起，恢复原尺寸
5. 多个权限请求：后到的覆盖当前的，新卡片替换旧卡片（不堆叠）

**权限卡片布局**（展开后悬浮岛额外增加约 100-120px 高度）：

```
┌─ 悬浮岛 ──────────────────────────────────────────────────┐
│ [●] 02:30  [🎤][📷]  │  [暂停]  [■]  │  (AI ● working)   │
│ ┌─ 权限请求 ───────────────────────────────────────────┐   │
│ │ Claude Code 请求执行操作                              │   │
│ │ 📄 写入文件: src/main.ts                             │   │
│ │ 模型: claude-sonnet-4-20250514                       │   │
│ │                                                      │   │
│ │  [✅ 允许]  [❌ 拒绝]  [📌 始终允许]                  │   │
│ └──────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────┘
```

#### 4.3 无录制时的悬浮岛

用户未录制时，AI 状态仍可显示。此时悬浮岛缩小为仅 AI 状态指示器（或可独立存在的小窗口），常驻屏幕边缘。

第一期不做独立 AI 窗口，AI 状态仅在录制悬浮岛中显示。

### 5. 设置页

在设置面板（`SettingsPanel.vue`）新增"AI 助手"标签页：

| 设置项 | 类型 | 默认值 |
|--------|------|--------|
| Claude Code 集成 | 开关 | 关（开启时自动安装 hooks） |
| 显示 AI 状态 | 开关 | 开 |
| 权限审批气泡 | 开关 | 开 |
| Claude Code 自动启动 | 开关 | 关 |
| 端口号 | 数字（只读显示） | 23338 |

### 6. 文件变更清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `electron/main/agent-bridge.ts` | **新建** | Agent Bridge 入口，协调各模块 |
| `electron/main/clawd-hook.js` | **新建** | 零依赖 Node hook 脚本 |
| `electron/main/agent-state-machine.ts` | **新建** | 精简状态机 |
| `electron/main/agent-server.ts` | **新建** | HTTP 服务端 |
| `electron/main/claude-hook-manager.ts` | **新建** | Claude hook 安装/卸载/监视 |
| `electron/main/region-selector.ts` | **修改** | 悬浮岛加载扩展内容 + 新增 API |
| `electron/main/index.ts` | **修改** | 启动 Agent Bridge |
| `electron/main/ipc-handlers.ts` | **修改** | 注册 Agent Bridge IPC |
| `electron/preload/index.ts` | **修改** | 暴露 Agent 相关 API |
| `src/views/HomeView.vue` | **修改** | 处理 Agent 相关事件 |
| `src/components/SettingsPanel.vue` | **修改** | 新增 AI 设置页 |
| `src/env.d.ts` | **修改** | 添加 Agent API 类型声明 |

## 数据流

### 状态同步流

```
Claude Code 触发事件
  → hooks/clawd-hook.js（stdin 读取事件 JSON）
    → HTTP POST 127.0.0.1:23338/state
      → agent-server.ts 解析 body
        → agent-state-machine.ts updateSession()
          → 状态决议 resolveDisplayState()
            → IPC 通知悬浮岛: agent-state-update
              → 悬浮岛更新 AI 状态指示器
```

### 权限审批流

```
Claude Code PermissionRequest
  → hooks/clawd-hook.js（stdin 读取）
    → HTTP POST 127.0.0.1:23338/permission（长连接）
      → agent-server.ts 解析 body
        → IPC 通知悬浮岛: permission-request
          → 悬浮岛展开权限卡片
        → 用户点击 Allow/Deny
          → IPC: permission-decision
            → HTTP 响应 { behavior: "allow" }
              → Claude Code 执行对应操作
        → 超时（120 秒）
          → HTTP 响应 { behavior: "cancel" }
            → 悬浮岛收起卡片
```

## 边界情况处理

### 端口冲突

- 默认端口 23338 被占用时自动尝试 23339-23342
- 全部被占用时：禁用 AI 集成，提示用户
- 启动时保存端口到 `~/.erzhi-recording/runtime.json`

### 与 Clawd 共存

- hook 条目各自带不同的 marker 标识（`name` 字段）
- 二支录制只安装/卸载/管理自己的条目
- 不冲突，不覆盖

### 悬浮岛不可用

- 未录制时，AI 权限请求通过系统托盘通知提示用户
- 用户点击通知 → 打开主窗口 → 悬浮岛显示权限卡片

### 二支录制退出

- 退出时不卸载 Claude Code hooks（其他应用可能还在用）
- 停止 watcher、清理定时器、关闭 HTTP 服务
- 保存运行时状态

### Claude Code 未安装

- 启动时检测 `~/.claude/settings.json` 是否存在
- 不存在时静默降级，设置页显示"Claude Code 未安装"提示
- 不生成错误弹窗

## 后续可扩展

- 支持 Codex CLI（不同 hook 协议）
- 支持 Cursor Agent（IDE hooks）
- 支持多个 Agent 同时追踪
- 独立 AI 状态窗口（不依赖录制悬浮岛）
