# 待办便签 · 设计文档

日期：2026-08-14
状态：待评审

## 需求一句话

点击悬浮球菜单「待办便签」，打开一个待办列表窗口；每条内容支持富文本（图文、标题、加粗、下划线等）、优先级、定时提醒；分「待办」与「备忘录」两种类型；悬浮球右上角显示待办数量的数字气泡，气泡可全局开关显隐。

## 已确认的用户决策

| 决策点 | 选择 |
|---|---|
| 窗口形态 | 跟随 AI 设置窗口的无边框圆角窗口（独立 BrowserWindow + Vue hash 路由） |
| 富文本方案 | **Quill** 富文本库（新前端依赖） |
| 提醒方式 | 系统通知 Notification **+** 悬浮球角标闪烁（两者都做） |
| 置顶 | 默认 alwaysOnTop，窗口内提供置顶开关 |

## 范围与非目标

**做：**
- 待办列表窗口（Vue 路由 `/todo`，独立 BrowserWindow）
- 待办/备忘录数据模型与持久化（userData 下 JSON 文件）
- 富文本编辑（Quill：加粗/斜体/下划线/删除线/标题/列表/引用/链接/图片插入）
- 优先级（低/中/高/紧急，四档，可设可排序过滤）
- 定时提醒（防抖到期检查 → 系统通知 + 角标闪烁）
- 悬浮球右上角数字气泡 + 全局显隐开关（设置）

**不做（YAGNI）：**
- 不引入日历/重复提醒
- 不做云端同步
- 不做拖拽排序（先按置顶+优先级+时间排序）
- 不做多窗口同时编辑冲突处理（单例窗口）

## 架构总览

```
┌─ 悬浮球窗口 (floating-ball.html) ──────────────┐
│  右上角数字气泡 <span id="ballBadge">           │  ← 主进程推送 count + flash
└─────────────────────────────────────────────────┘
              ▲  IPC: todo-badge-update
┌─ 主进程 (electron/main) ────────────────────────┐
│  todo-store.ts     纯数据层 CRUD（可 node 单测） │
│  todo-reminders.ts  纯函数：到期计算（可单测）   │
│  todo-window.ts     封装 BrowserWindow 创建     │
│  todo-badge.ts      聚合计数→推送悬浮球角标     │
│  todo-scheduler.ts  定时检查提醒 + Notification  │
│  index.ts / ipc-handlers.ts 接线                │
└─────────────────────────────────────────────────┘
              ▲  IPC: get-todos / create-todo / update-todo / ...
┌─ 渲染层 Vue (src/) ─────────────────────────────┐
│  router: /todo → TodoView.vue                   │
│  components/TodoApp.vue（列表+详情编排）         │
│  components/TodoEditor.vue（Quill 富文本）       │
│  stores/todo.ts（Pinia，镜像主进程数据）         │
└─────────────────────────────────────────────────┘
```

数据流原则：**主进程 JSON 文件为唯一真相源**，渲染层经 IPC 读写；渲染层 store 只做内存镜像与 UI 乐观更新，最终以 IPC 结果落库。这符合本仓库「主进程文件为真相源」（floating-ball-settings / recordings）的既有约定。

## 数据模型

```ts
// 类型
type TodoType = 'todo' | 'memo'                    // 待办 / 备忘录
type TodoPriority = 'low' | 'medium' | 'high' | 'urgent'

interface TodoItem {
  id: string                                        // crypto.randomUUID()
  type: TodoType
  title: string                                     // 富文本标题（含 HTML）
  content: string                                   // 富文本正文（含 HTML / 图片 dataURL）
  priority: TodoPriority
  reminder: string | null                           // ISO 时间戳；null=无提醒
  reminderFired: boolean                            // 是否已触发（避免重复通知）
  done: boolean                                     // 仅 todo 有效（备忘录无完成态）
  createdAt: number                                 // epoch ms
  updatedAt: number
}
```

**图片存储**：Quill 粘贴/插入的图片以 `data:` URL（base64）存进 `content`。对本地便签工具可接受；若将来体积过大再迁移到 `userData/todo-media/`。记录在 `docs/superpowers` 备注即可，不实现迁移。

**清单（主进程文件）**：`todo-notes.json`，结构 `{ items: TodoItem[], meta: { schemaVersion: 1 } }`。开发环境路径 `join(__dirname,'..','..')`，打包后 `app.getPath('userData')` —— 与 `floating-ball-pos.json` 完全一致。

**设置（主进程文件）**：`todo-settings.json`，`{ todoBadgeVisible: boolean, windowAlwaysOnTop: boolean }`，默认 `{ true, true }`。

## 待办数量气泡

「待办数量」= 未完成的 `type==='todo'` 条目数（`done===false`）。备忘录不计入。

- 气泡 DOM：悬浮球 `#ball` 容器内新增绝对定位 `<span id="ballBadge">`，置于容器右上角（`top:0;right:0`），红底白字圆角小胶囊。
- 更新链路：主进程维护 `todo-badge.ts`，在 todo 数据变更后重算 count，向悬浮球 `executeJavaScript('setBadge(n)')`；悬浮球导出 `setBadge` / `setBadgeFlash(bool)` 全局函数（含在 `buildFloatingBallHtml` 的 `<script>` 里）。
- 显隐：`todoBadgeVisible` 为 false 时气泡隐藏（`display:none`），仍照常重算计数。
- 闪烁：有「已到期未确认」的提醒时，气泡进入闪烁态（CSS 呼吸动画）。用户打开待办窗口即确认全部到期项，停止闪烁。

## 定时提醒

- **调度**：主进程 `todo-scheduler.ts` 持 30s 间隔；每次跑 `computeDueReminders(items, now)` 得到「`reminder<=now && !reminderFired`」的条目，逐个触发。
- **触发动作**：① `new Notification({ title: item.title, body: '提醒' })`；② 置 `reminderFired=true` 并落库；③ 置「待确认到期」集合，通知气泡进入闪烁。
- **到期确认**：打开待办窗口时 IPC `acknowledge-reminders`，清空待确认集合、停止闪烁。
- **可测试性**：`computeDueReminders(items, now)` 是纯函数，可 node 单测（红绿）。

## 提醒到期/恢复的容错

- 提醒时刻早于当前会话（如电脑休眠/关机错过）：`computeDueReminders` 仍返回并触发一次通知 —— 用户不会永久错过。
- `before-quit`：清掉 scheduler 定时器（接到 `index.ts` 清理咽喉）。
- Notification 需主进程 `new Notification`（无需渲染层参与），Windows 可直接用。

## 窗口

- `todo-window.ts` 暴露 `showTodoWindow()`，范式完全复制 `showAiWindow`：
  - 独立 BrowserWindow，`frame:false` + `titleBarStyle:'hidden'`
  - dev：`loadURL(${VITE_DEV_SERVER_URL}#/todo)`；prod：`loadFile(dist,'#/todo')`
  - 复用 `Layout.vue` 标题栏（含 最小化/最大化/关闭）
  - 新增「置顶」标题栏按钮，走新 IPC `toggle-todo-always-on-top`，状态默认置顶，持久化到 `todo-settings.json`。
- 单例：窗口已存在则 `show()+focus()`，不新建。

## 渲染层 UI

**TodoView.vue**（路由页，套 `Layout`）：
- 左侧 `TodoApp.vue`：类型切换 Tab（全部 / 待办 / 备忘录）、列表、新增按钮；右上角/toast 提示。
- 每条列表项：标题（富文本渲染）、优先级色条、完成勾选框（仅 todo）、提醒时间、删除/编辑。
- 点击「新增」或「编辑」→ 进入全屏式详情编辑面板（同窗口内切换视图，不用新窗口）。

**TodoEditor.vue**（Quill 富文本）：
- 标题输入（普通 input，或富文本单行）
- Quill 工具栏：加粗/斜体/下划线/删除线、标题 H1/H2、有序/无序列表、引用、链接、图片插入（`image` handler → 读文件转 dataURL）
- 字段：类型、优先级（下拉/分段）、完成（todo）、提醒时间（datetime-local）
- 保存 → 调 IPC create/update → 回列表

**stores/todo.ts**（Pinia）：持有 `items`、`activeTab`、`editedId`、UI 状态；方法 `load/create/update/remove/toggleDone` 封装 IPC 调用；由主进程广播 `todo-changed` 触发重拉（保证悬浮球计数与窗口一致）。

## IPC 清单（preload → ipc-handlers）

| 通道 | 方向 | 说明 |
|---|---|---|
| `get-todos` | invoke | 返回 items 全量 |
| `create-todo` | invoke | 新增，返回创建后的 items |
| `update-todo` | invoke | 更新，返回新 items |
| `delete-todo` | invoke | 删除 |
| `toggle-todo-done` | invoke | 切换完成 |
| `acknowledge-reminders` | invoke | 到期确认，清闪烁 |
| `toggle-todo-always-on-top` | invoke | 窗口置顶开关 |
| `get-todo-settings` / `set-todo-settings` | invoke | 设置读写（气泡显隐等） |
| `todo-changed` | 主→悬浮球 | 计数重算推送 |
| `todo-badge-update` | 不必要 | 改用 executeJavaScript |

preload 里统一挂到 `window.electronAPI.todo.*` 命名空间。

## 依赖

- 新增 `quill`（前端依赖）。样式 `import 'quill/dist/quill.css'` 由 vite 打包。需 `quill` v2。
- npm registry 走 npmmirror（已有 `.npmrc`），安装无网络风险。

## 可测试性

两个纯模块，遵循 `conversion-registry.ts` 范式（内部懒 `require('electron')`、logger 注入）：
- `todo-store.ts`：CRUD + load/save（注入 logger）。node 单测 `test-todo-store.mjs`。
- `todo-reminders.ts`：`computeDueReminders` 纯函数。node 单测 `test-todo-reminders.mjs`。

## 错误处理与一致性

- 主进程所有读写 JSON 包 try/catch，损坏文件回退默认值（沿用 `loadBallSettings` 的容错模式）。
- 渲染层 IPC 失败 → UI toast 提示，不回滚本地乐观更新（下次 load 纠正）。
- 悬浮球 `executeJavaScript` 均 `.catch(()=>{})` 防窗口销毁时报错。

## 里程碑切分（每个 2–5 分钟级任务，见 plan.md）

1. 依赖安装（quill）+ 路由 `/todo`
2. 数据层 todo-store + 单测
3. 提醒纯函数 + 单测
4. 主进程 IPC + todo-window + 接线
5. 悬浮球气泡 badge
6. 渲染层 store + TodoView/TodoApp
7. Quill 编辑器
8. 设置面板 + 气泡显隐
9. 端到端验证 + code review
