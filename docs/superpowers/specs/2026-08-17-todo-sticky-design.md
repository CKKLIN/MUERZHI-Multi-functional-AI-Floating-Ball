# 贴屏便签 · 设计文档

日期：2026-08-17
状态：待评审

## 一句话
给待办/备忘增加「贴到屏幕」能力：每条卡片悬停按钮可把这条以一张可拖动的迷你便签常驻屏幕，支持同时多张、随数据实时更新，点击便签打开待办窗口并定位到该条。

## 已确认决策（用户 Brainstorming 回答）
| 决策 | 选择 |
|---|---|
| 入口 | 列表卡片悬停操作按钮（贴屏） |
| 点击便签 | 打开待办窗口并定位到该条（可预览/编辑）；本身可拖动、可关闭 |
| 多贴 | 支持多条同时贴，各自记住屏幕位置 |
| 实时性 | 便签内容随数据实时更新（标题/正文/完成态/优先级） |

## 数据模型
在 `TodoItem` 增加：
```ts
pinned: boolean          // 是否贴屏
pinX: number | null      // 便签屏幕位置（贴屏后写入）
pinY: number | null
```
`createTodo` 默认 `pinned:false, pinX:null, pinY:null`。位置随 `todo-notes.json` 持久化（启动时重建便签）。

## 贴屏便签窗口（todo-sticky.ts，我设计的样式）
- 每条 pinned 项一个独立的**无边框透明 always-on-top** 小窗（类似提醒弹窗），`skipTaskbar:true`。
- 外观（Apple 高级风，与待办/提醒一致）：
  - **左侧竖色条**按优先级（紧急橙/高琥珀/中蓝/低灰，复用 PRIO_COLOR）
  - 顶部小标题栏：**MUERZHI logo + 待办标题**（加粗、单行省略）+ 右上 **✕**（关闭=取消贴屏）
  - 下方正文摘录（纯文本 2 行省略，去图）
  - todo 已完成 → 标题加删除线 + 整体淡化
- **拖动**：便签主体 `-webkit-app-region: drag`；✕ 与任何可点区域 `no-drag`。拖动时主进程记录新位置。
- 尺寸：固定 250×118 左右（内容少也够，避免自适应的复杂度）。

## 实时更新
主进程维护 `Map<itemId, BrowserWindow>`；任何数据变更（增/删/改/完成/取消贴屏）后调用 `syncStickyNotes()`：
- 对每条 `pinned` 项：没有便签则创建；已有则用 `executeJavaScript('renderNote(data)')` 就地刷新内容（标题/摘录/完成/优先级），不重建窗口。
- 不再 `pinned` 的项：关闭对应窗口。
- 启动时调用一次，按持久化位置重建。

## 位置持久化
便签 `move` 事件 → 主进程写回该项 `pinX/pinY`（`updateTodo` 的轻量变体，避免每次 move 都整段重渲染；位置保存用 `savePinPosition`，不触发 sticky 重建）。

## 点击定位
便签点击 → IPC `todo-sticky-open(itemId)` → `showTodoWindow()` 后向待办窗口发 `todo-focus-item`；渲染层监听后 `store.startPreview(itemId)` 直接打开该条预览。

## IPC / preload 清单
| 通道 | 方向 | 说明 |
|---|---|---|
| `todo-toggle-pin` | invoke | 切换 pinned；新贴时计算初始位置（主屏右上角级联） |
| `todo-sticky-open` | invoke | 打开待办窗口并定位该条 |
| `todo-sticky-move` | on | 保存便签新位置 |
| `todo-focus-item` | 主→待办窗 | 渲染层定位到该条预览 |
| `todo-get` | 复用 | items 已含 pinned/pinX/pinY |

## 测试
- todo-store 增 `togglePin` / `savePinPosition` 纯数据层单测（test-todo-store.mjs）。
- sticky 窗口逻辑不单测（electron 耦合），靠类型检查 + 冒烟。

## 文件
- 改：`todo-store.ts`、`env.d.ts`、`ipc-handlers.ts`、`preload/index.ts`、`TodoApp.vue`（卡片悬停按钮 + focus 监听）、`test-todo-store.mjs`
- 新：`electron/main/todo-sticky.ts`
- `index.ts`：启动 sync + before-quit 关闭全部便签

## 不做（YAGNI）
- 便签不内置编辑（点开进主窗口编辑）
- 不做便签分组/贴边吸附
