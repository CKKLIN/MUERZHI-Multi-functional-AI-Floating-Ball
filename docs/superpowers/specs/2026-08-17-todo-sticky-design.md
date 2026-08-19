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

## 贴屏便签板（todo-sticky.ts，我设计的样式）—— 已实现为“合并单窗口”
- **所有 pinned 项合并到一个无边框透明 always-on-top 小窗**（不是每项一个窗口），`skipTaskbar:true`。
- 每次显示一张便签，**底部圆点 + ‹ › 箭头轮播切换**（当前圆点变长变靛蓝），单张时箭头隐藏。
- 外观（Apple 高级风，与待办/提醒一致）：
  - 左侧**优先级竖色条**（紧急橙/高琥珀/中蓝/低灰）
  - 顶部小标题栏：MUERZHI logo + 品牌字 + 计数（如 2/3）+ ✕（关闭=取消当前贴屏）
  - 正文区：待办=正文全文单行省略；备忘=标题+正文；已完成删除线淡化
- **拖动**：顶部标题栏 `-webkit-app-region: drag`，整板移动。
- 尺寸：208×120，极简迷你。

## 实时更新
主进程维护单个 board window；任何数据变更（增/删/改/完成/取消贴屏）后调用 `syncStickyNotes()`：
- 无 pinned → 关闭板；否则若有板则 `renderNotes(list, index)` 就地刷新（不重建），无板则创建（`ready-to-show` 后补推首帧数据，避免加载中 executeJavaScript 被吞）。
- 轮播位置在渲染层按当前便签 **id 保持**（list 同步时不跳回第一张）。

## 位置持久化
整板一个位置，存 `todo-settings.json` 的 `stickyBoardPos`。板 `move` 事件（300ms 去抖）→ `updateTodoSettings({ stickyBoardPos })` 写盘，启动时按它重建。
（注：`TodoItem.pinX/pinY` 与 `savePinPosition` 为早期设计的残留字段，当前板不使用；`togglePin` 也不再传 initial 位置。）

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
