# 实施计划：AI 岛提问卡逐题推进

日期：2026-08-11
基于：design.md（设计 Validation 通过）

## 总原则

- 后端（agent-server / agent-bridge / ipc-handlers / preload）**零改动**。
- 只改 [ai-island.ts](../../../electron/main/ai-island.ts) 内联 JS；纯逻辑抽成可单测模块
  `electron/main/question-card-utils.ts`，遵循仓库 `hw-encoder.ts`/`conversion-registry.ts`
  范式（零 Electron 依赖，可被纯 Node 测试 import）。

## 任务清单（每个 2–5 分钟）

### Task 1 — TDD Red：写测试 `test-question-card-utils.mjs`
- 新增根目录 `test-question-card-utils.mjs`，仿 `test-conversion-registry.mjs` 范式（`assert`/`eq`、
  `import './electron/main/question-card-utils.ts'`、失败 `process.exit(1)`）。
- 断言四个纯函数：
  1. `resolveQuestionList(q)`：`{questions:[a,b]}` → `[a,b]`；`{questions:[]}`/`undefined` → `[q]`（单题兜底）。
  2. `toQuestionItem(item)`：文本取 `question||header||text`，无标题回落 `问题 N`；
     options 的 label（字符串直接取，对象取 `label||String(o)`）与 desc（`description`，与 label 相同则不显示）。
  3. `buttonLabel(i, total)`：`i<total-1` → `'下一题'`；末题 → `'知道了'`；单题恒 `'知道了'`。
  4. `progressText(i, total)`：`total>1` → `第 i+1/total 题`；`total<=1` → `null`。
- 运行 `node --experimental-strip-types test-question-card-utils.mjs` → **模块不存在，断言失败（Red）**。

### Task 2 — TDD Green：实现 `electron/main/question-card-utils.js`
- 以纯 JS/CommonJS 实现（不是 TS——岛窗口 data: URL 内联脚本运行时须 require 独立文件，
  同 clawd-hook.js 约束），零 Electron 依赖。
- 导出 `resolveQuestionList` / `toQuestionItem` / `buttonLabel` / `progressText`。
- 运行测试 → 全部通过（Green）。

### Task 3 — 发布链路（同 clawd-hook.js）：让岛窗口运行时能找到该文件
1. `vite.config.ts` `copyHtmlFiles()` 添加 `question-card-utils.js` 复制 + `server.watcher.add` + change 回调。
2. `package.json` `extraResources` 添加 `{ from: "electron/main/question-card-utils.js", to: "question-card-utils.js" }`。
3. `ai-island.ts` 添加 `questionCardUtilsPath()`（`app.isPackaged ? resourcesPath : __dirname`），
   注入到内联脚本 `const __QCU_UTILS_PATH__=${JSON.stringify(...)}`，脚本 `require()` 后解构出四个函数。

### Task 4 — 接线到 `ai-island.ts`（内联 HTML/JS）
1. banner 加进度元素 `<span id="questionProgress">`（`margin-left:auto` 靠右），加对应 CSS。
2. 提问卡按钮加 `id="questionBtn"`，`onclick="stepQuestion()"`（替换 `dismissQuestion`）。
3. JS：新增全局 `qIndex`/`qList`；重写 `renderQuestionBody(q)` → `resolveQuestionList` + `renderCurrentQuestion()`；
   新增 `stepQuestion()`（非末题本地推进，末题走 `dismissQuestion`）。
4. `applyQuestion`：重置 `qIndex=0`、重算 `qList`；`applyCard(null)` 同样重置。
5. 保留权限/提问互斥逻辑不变。
- 验证：`npx vue-tsc` 类型检查通过（tsconfig.node.json 覆盖 electron/**/*.ts）。

### Task 4 — 冒烟验证
- 单题、多题首/中/末、被打断重来、无 questions 数组四种输入在测试里覆盖；
  `npm run dev` + 真实 AskUserQuestion 目视验证按钮文案、进度显示、互斥隐藏、重置行为。

## 非目标
- 不加「上一步」回看；不改后端队列/IPC；不注入答案。
