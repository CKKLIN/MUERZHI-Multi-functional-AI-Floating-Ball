# 设计：AI 岛提问卡从「竖排全量」改为「逐题推进」

日期：2026-08-11
状态：Design Validation 待确认

## 背景与目标

现状（见 [agent-server.ts](../../../electron/main/agent-server.ts) 与 [ai-island.ts](../../../electron/main/ai-island.ts)）：
AskUserQuestion 的 N 个问题被打包成**一张** `QuestionCard`（`questions` 数组）推入统一的 FIFO
卡片队列；悬浮岛 [renderQuestionBody](../../../electron/main/ai-island.ts#L166-L191)
一次性把**所有**问题及其选项竖排进同一个 `questionBody`，底部一个「知道了」按钮直接
`agent-dismiss-question` 把整张卡弹出队列。

用户想要的：岛上**一次只显示一个问题**，处理完（按按钮）后出现下一个，而不是堆成一屏。

约束：Claude Code 的 hook 无法向岛上注入答案（代码注释已明确：这是**只读通知**卡，答案须回
Claude 主界面作答）。因此「推进」只能是**手动按钮推进**语义，不涉及任何回包/审批。

## 已拍板的决策（用户确认）

1. **按钮=下一步**：非最后一个问题时按钮显示「下一题」，点击仅本地推进到下一个问题
   （不触发任何 IPC、不动后端队列）；到最后一个问题时按钮变回「知道了」，点击才真正
   `agent-dismiss-question` 关闭整张卡。
2. **显示进度**：当问题总数 > 1 时，卡上显示「第 X/N 题」。
3. **从第 1 题重新开始**：进度只存在岛上 JS 局部变量；每次 `applyCard` 重新渲染时
   **重置回第 1 题**。后端队列/IPC 零改动。

## 方案（最小改动 = 只改 ai-island.ts 内联 HTML/JS + 1 个纯逻辑文件）

后端（agent-server.ts / agent-bridge.ts / ipc-handlers.ts / preload）**完全不动**。
`QuestionCard` 仍持完整 `questions` 数组；岛只是把它「切成一个个窗口」来展示。

> **实现偏差（相对初稿）**：纯逻辑抽成 `electron/main/question-card-utils.js`（**纯 JS/CommonJS**，
> 不是 TS）。原因：AI 岛用 `data:` URL 加载内联 HTML，内联 `<script>` 只能在运行时
> `require()` 一个独立文件（拿不到 vite 打包进 index.cjs 的 TS 模块），与 `clawd-hook.js`
> 相同约束。故走其同款发布链路：vite dev 复制到 `dist-electron/main/`（`__dirname`）、
> electron-builder `extraResources`（`process.resourcesPath`）。测试直接 import 该 `.js`。

### 3.1 渲染只展示当前题

修改 `renderCurrentQuestion()`（取代原 `renderQuestionBody`）：不再遍历全部，只渲染
`qList[qIndex]`（`qList = resolveQuestionList(q)`），并保留 `[q]` 单题兜底。
banner 右侧新增 `<span id="questionProgress">` 显示进度「第 X/N 题」，仅当总数 > 1。
JS 变量 `qIndex`（当前题，从 0 起）与 `qList`（当前卡题目数组）持有状态。

### 3.2 推进函数

新增 `stepQuestion()`：
- 若 `qIndex < qList.length - 1`：`qIndex++`，重渲染当前题 + 更新进度 + 更新按钮文案 + `resizeIsland()`；
- 否则：走原 `dismissQuestion()`（隐藏卡 + `agent-dismiss-question` IPC）。

按钮改为 `onclick="stepQuestion()"`，文案由渲染逻辑设置：
- 非末题：「下一题」
- 末题：「知道了」

### 3.3 重置与互斥

- `applyQuestion(q)` 在每次应用提问卡时把 `qIndex` 重置为 0 并重新渲染，
  满足「从第 1 题重新开始」。权限/提问互斥逻辑（`applyPermission` 内部收起提问卡、
  `applyQuestion` 内部收起权限卡）保持不变。
- `applyCard(null)` 清空时同样重置 `qIndex = 0`。

## 边界情况

- **单问题**：`qList.length === 1` → 按钮恒为「知道了」，不显示进度，行为与现状完全一致。
- **被打断重来**：权限卡抢占队首 → 提问卡回到队首 → `applyCard` 重新应用 → `qIndex` 重置为 0
  （符合决策 3）。
- **无 `questions` 数组**：按单题兜底处理。
- **懒创建补拉**：`initStatus()` 里 `applyCard(s.currentCard)` 走同一路径，天然重置为第 1 题。

## 非目标（YAGNI）

- 不在后端记录进度、不改 `SafeCard`/IPC 载荷、不加「上一步」回看导航（用户选了「按钮=下一步」）。
- 不在岛上注入答案（本来就做不到）。

## 验证方式

- 该项无独立测试框架可覆盖内联 HTML/JS（纯渲染逻辑，无 Electron 单测先例）。
  采用**人工验证 + 代码评审**：核对单题/多题三态（首题/中间题/末题）按钮文案、进度显示、
  互斥隐藏、重置行为，并跑 `npm run dev` 用真实 AskUserQuestion 观察。
