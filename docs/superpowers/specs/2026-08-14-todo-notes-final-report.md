# 待办便签 · 最终交付报告

日期：2026-08-14

## 交付摘要
在 MUERZHI 悬浮球中实现了「待办便签」完整功能：点击悬浮球菜单 ☑ 打开待办列表窗口，支持
待办/备忘录两种类型、富文本图文编辑、优先级、定时提醒、悬浮球右上角数字气泡及其全局显隐开关。

## 功能清单（对应需求逐条）
| 需求 | 实现 |
|---|---|
| 点击菜单「待办便签」出现待办列表窗口 | 悬浮球 action → `clawd-show-todo-window` → 独立 BrowserWindow 加载 `/todo` |
| 每条可修改 / 设置优先级 / 定时提醒 | 列表点击编辑进入富文本面板；优先级4档；datetime-local 提醒，主进程 30s 轮询触发 |
| 图文、标题、下划线加粗等常用功能 | Quill 富文本（加粗/斜体/下划线/删除线/标题/列表/引用/链接/图片插入 dataURL） |
| 待办与备忘录两种类型 | `type: 'todo' | 'memo'`，Tab 切换 |
| 待办数量在悬浮球右上方数字气泡 | 未完成待办数 → `#ballBadge` 红色数字胶囊（备忘不计）；到期闪烁 |
| 气泡可统一设置隐藏/显示 | 面板工具行「气泡 开/关」→ `todo-settings.json` 持久化 |

## 新增文件
主进程：`todo-store.ts`、`todo-reminders.ts`、`todo-text.ts`、`todo-badge.ts`、`todo-window.ts`、`todo-scheduler.ts`
渲染层：`stores/todo.ts`、`views/TodoView.vue`、`components/TodoApp.vue`、`components/TodoEditor.vue`
单测：`test-todo-store.mjs`、`test-todo-reminders.mjs`（`node --experimental-strip-types`）
文档：`docs/superpowers/` 下 design/plan/review

## 改动文件
`floating-ball.ts`（badge DOM/函数/case todo）、`index.ts`（scheduler/window/process/quit）
`ipc-handlers.ts`、`preload/index.ts`、`src/env.d.ts`、`src/router/index.ts`、
`package.json`（+quill 2.0.3）、`package-lock.json`

## 验证
- 单测 2/2 全绿（含新增"改期重置提醒"用例）
- `vue-tsc` 通过；electron 类型检查无新增错误
- `vite build` 成功；`npm run dev` 主进程正常启动

## 建议人工冒烟步骤
1. `npm run dev`
2. 点悬浮球菜单 ☑ → 待办窗口打开
3. 新增一条待办（含图片/加粗）、设优先级与 1~2 分钟后的提醒 → 保存
4. 观察悬浮球右上角数字气泡出现；到点后系统通知 + 气泡闪烁；打开窗口后停止闪烁
5. 面板「气泡 关」→ 气泡隐藏（重启仍保持）
