# 待办便签 · 实现计划

日期：2026-08-14
依据设计：`docs/superpowers/specs/2026-08-14-todo-notes-design.md`

## 任务清单

### Phase A —— 纯数据层（可 node 单测）
- [ ] A1 `electron/main/todo-store.ts`：类型 + load/save + CRUD（create/update/remove/toggleDone），logger 注入、fs 容错
- [ ] A2 `test-todo-store.mjs` 单测（红绿）
- [ ] A3 `electron/main/todo-reminders.ts`：`computeDueReminders` 纯函数
- [ ] A4 `test-todo-reminders.mjs` 单测

### Phase B —— 主进程接线
- [ ] B1 `electron/main/todo-badge.ts`：计数 + 推送悬浮球（count/flash）
- [ ] B2 `electron/main/todo-window.ts`：`showTodoWindow` + 置顶开关 + 到期确认
- [ ] B3 `electron/main/todo-scheduler.ts`：30s 轮询 + Notification + 闪烁
- [ ] B4 悬浮球 HTML/JS：badge DOM + `setBadge/setBadgeFlash` 全局函数；`index.ts` 路由 `/todo` + process 事件 + before-quit 清理

### Phase C —— IPC + preload
- [ ] C1 `electron/main/ipc-handlers.ts`：注册 todo IPC 通道
- [ ] C2 `electron/preload/index.ts`：`electronAPI.todo.*` 命名空间

### Phase D —— 渲染层 Vue
- [ ] D1 安装 `quill`；`router` 加 `/todo`
- [ ] D2 `src/stores/todo.ts`（Pinia）
- [ ] D3 `src/views/TodoView.vue` + `src/components/TodoApp.vue`（列表/Tab/新增/删除/完成）
- [ ] D4 `src/components/TodoEditor.vue`（Quill 富文本 + 字段表单）
- [ ] D5 置顶标题栏按钮 + 气泡显隐设置项（并入设置面板或 TodoApp 内）

### Phase E —— 验证
- [ ] E1 `vue-tsc` 类型检查；node 单测全绿
- [ ] E2 `npm run dev` 手工冒烟
- [ ] E3 code review（严重问题清零）

## 关键接线点（file:line 参考）

- 路由：`src/router/index.ts` 加 `{ path:'/todo', component: TodoView }`
- 窗口：`electron/main/index.ts` 仿 `showSettingsWindow`（228 行）加 `showTodoWindow`；registerIpcHandlers 传 todo 模块；process.on('clawd-show-todo-window')
- 悬浮球 action：`forwardAction` case 'todo' → `process.emit('clawd-show-todo-window')`
- badge：`buildFloatingBallHtml` 的 `<script>` 增加 `setBadge/setBadgeFlash`；`todo-badge.ts` 用一个导出函数在数据变更后调用
- before-quit：`index.ts` 清 `todoScheduler.stop()`、拆 `todoWindow`

## 分文件职责

- **todo-store.ts**：`TodoItem`/`TodoType`/`TodoPriority` 类型导出；`loadTodos()/saveTodos()`、`getTodoFilePath()`；`createTodo/updateTodo/deleteTodo/toggleDone`（返回全量 items）。推断并派生 `incompleteTodoCount(items)`。
- **todo-reminders.ts**：`computeDueReminders(items: TodoItem[], now: number): TodoItem[]`。
- **todo-badge.ts**：`pushBadge()` 读 store → 算 count → 悬浮球 executeJavaScript `setBadge`；`setBadgeFlash(on)`。
- **todo-window.ts**：`showTodoWindow()/closeTodoWindow()/toggleTodoAlwaysOnTop()/acknowledgeReminders()`。
- **todo-scheduler.ts**：`start()/stop()`；interval 内 compute due → Notification + flash + save reminderFired。

## 验证命令

```bash
node --experimental-strip-types test-todo-store.mjs
node --experimental-strip-types test-todo-reminders.mjs
npx vue-tsc
```
