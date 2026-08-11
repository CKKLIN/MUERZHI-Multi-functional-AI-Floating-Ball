# 代码评审：AI 岛提问卡逐题推进

日期：2026-08-11
范围：本次改动（question-card-utils.js / test-question-card-utils.mjs / ai-island.ts / vite.config.ts / package.json）

## 逐项检查

| 点 | 结论 |
|---|---|
| 纯逻辑正确性 | `resolveQuestionList`/`toQuestionItem`/`buttonLabel`/`progressText` 由 25 条断言覆盖（多题/单题/空/兜底/选项 label-desc），全部通过，语义与原 `renderQuestionBody` 一致 |
| 后端零改动 | agent-server/agent-bridge/ipc-handlers/preload 未触碰；`dismissQuestion` 末题路径行为不变 |
| 生命周期/状态 | `qList`/`qIndex` 为岛上局部；`applyQuestion`/`applyCard(null)` 均重置为第 1 题（符合已拍板决策 3）；原本的权限↔提问互斥逻辑保留 |
| 函数声明提升 | `stepQuestion` 调用在其后定义的 `dismissQuestion`（function 声明，已提升），无时序问题 |
| 路径注入 | `const __QCU_UTILS_PATH__=${JSON.stringify(path)}` —— JSON.stringify 转义反斜杠成合法 JS 字符串字面量；dev 用 `__dirname`（dist-electron/main），打包用 `process.resourcesPath`，均与 `question-card-utils.js` 落位一致 |
| 发布链路 | vite copy + watcher、extraResources 均已接线；`vite build` 通过并确认文件复制进 dist；bundle 内注入点存在（grep ×2） |
| 类型 | `npx vue-tsc` exit 0，无 unused/noEmit 报错 |
| 边界 | 单题：无进度 + 恒「知道了」（与旧行为等值）；被打断重来：重渲染归 1；无 questions 数组：兜底单题 |

## 结论/风险

- 无 Critical/Major 问题。
- Minor（可接受，不阻塞）：进度上岛只存显示层，若用户在「下一题」后仍不改主界面作答、卡片因 session 完成事件被静默移除，岛直接收起——符合"只读通知"定位。

## GUI 冒烟（2026-08-11，真实数据路径 /question + UTF-8 文件载荷）

通过 `npm run dev` + POST 3 题 AskUserQuestion 载荷，主进程 `executeJavaScript` 回读岛内 DOM
自动走查，四步采样全部符合预期：

| 操作 | 采样结果 |
|---|---|
| 首题渲染 | `第 1/3 题`，正文含三选项，按钮「下一题」，上一题 disabled |
| 点下一题 | `第 2/3 题`，label+description 均正确渲染，上一题可点 |
| 再点下一题 | `第 3/3 题`，按钮变「知道了」（末题语义） |
| 点上一题 | 回到 `第 2/3 题` |

- 中文在正式路径下**无乱码**。此前用户看到的乱码系我初测用 Windows 命令行 curl 以 GBK 字节发中文的测试伪象；改用 UTF-8 文件载荷后复测正常，应用自身字符集无误。
- 同时验证了 `require(__QCU_UTILS_PATH__)` 发布链路在 dev 下可用（脚本执行、渲染、点击全部正常）。
- 调试代码已移除；移除后单测 / `vue-tsc` / `vite build` 三连全绿。

## 追加需求：卡片宽高自适应、去滚动条（2026-08-11）

去掉 `.question-body`（原 max-height:160px）与 `.perm-input`（原 max-height:72px）的
`max-height + overflow:auto`，并移除 JS 层截断（`formatToolInput` 的 6 字段限制 / 单行 100/80 字符
截断 / catch 兜底 200 字符，以及 `applyPermission` 字符串分支的 `truncate(ti,200)`）。
岛窗口宽度高度本就由 `resizeIsland()`（scrollWidth/scrollHeight → `resize-ai-island` IPC 设 bounds）自动适配，去掉内部钳制后随内容长大。

GUI 冒烟（UTF-8 载荷 + `executeJavaScript` 回读）：
| 卡 | 正文采样 | 尺寸/滚动 |
|---|---|---|
| 审批卡（Write 10 字段含长文本/嵌套 JSON） | 全部字段 + 完整内容，无截断 | `innerH:506==docH:506`，noVScroll ✓ noHScroll ✓ |
| 提问卡（6 选项 + 超长描述） | 问题 + 6 选项完整 | `innerH:608==docH:608`，noVScroll ✓ noHScroll ✓ |

- 无滚动条，窗口按内容自动长高；回归（单测/tsc/build）三连全绿。

## 追加需求：卡片宽度自适应区间（最窄 300 / 最宽 420，2026-08-11）

卡片由固定 300px 改为 `width:max-content; min-width:300px; max-width:420px`，
`.perm-input` 由 `word-break:break-all`（会把 max-content 塌缩成单字符）改为
`word-break:normal; overflow-wrap:anywhere`；卡片整体加继承的 `word-break:break-word`
让长选项在卡宽内换行。新增 `fitIslandWidth()`：按当前展示卡 `scrollWidth` 钳制 [300,420] 设岛宽，
让窗口贴合卡片（避免 `.island{width:fit-content}` 取卡片未钳制理想宽度导致窗口过宽、透明区挡点击）。

GUI 冒烟（`executeJavaScript` 回读 cardW/innerW）：
| 场景 | cardW | innerW | 说明 |
|---|---|---|---|
| 短 `command: ls` | 300 | 320 | 最窄保底 |
| 中 59 字符命令 | 403 | 424 | 按内容自适应（区间内） |
| 长审批（整条大命令） | 420 | 440 | 封顶换行 |
| 长提问（88 字符选项） | 420 | 440 | 封顶换行，标签不再被裁剪 |

全部 `noVScroll/noHScroll` ✓。回归三连全绿。