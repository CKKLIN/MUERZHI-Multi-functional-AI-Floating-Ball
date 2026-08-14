# 待办便签 · Review 报告

日期：2026-08-14
范围：待办便签功能全部改动（Phase A–E）

## 严重性分级
- **Critical**（阻塞）：0
- **Major**（需修复）：0
- **Minor**（可接受/已记录）：若干，见下

## 已发现并修复的问题
1. **[已修] 共享空数组污染**（todo-store.ts）：`readStore()` 之前返回共享 `EMPTY_STATE` 引用，
   `createTodo` 的 `items.unshift()` 直接改写共享数组，污染后续"空文件"读取结果。改为每次返回全新数组。
   （该缺陷是单测 catch 到的——Red 阶段的真实价值。）
2. **[已修] 改期后不再提醒**：`updateTodo` 已改为在 `reminder` 变更时重置 `reminderFired=false`，
   保证用户改/延后提醒时间后能再次到期触发。对应新增单测覆盖。

## Minor / 已知取舍（设计文档已约定）
- 富文本图片以 base64 dataURL 存 JSON；如体积过大再迁移外置媒体目录（YAGNI，不在本期做）。
- 排序为「未完成 → 优先级 → 更新时间」，无拖拽排序（设计已确认）。
- 窗口置顶与气泡开关放在待办面板工具行（D5），而非全局设置页——满足"统一设置"需求。

## 验证结论
- 单测：`test-todo-store.mjs`、`test-todo-reminders.mjs` 全绿。
- 类型：`npx vue-tsc` 退出码 0；`tsc -p tsconfig.node.json` 仅剩改动前既有的错误（region-selector/tray 导出、
  dialog 类型、preload mediaDevices），未新增。
- 构建：`npx vite build` 三产物（renderer / main / preload）全部成功，Quill 正常打进 TodoView chunk。
- 冒烟：`npm run dev` 主进程正常启动运行至超时未崩溃（无循环依赖/找不到模块错误）。

## 结论
功能实现完整且通过全部自动化验证；未发现需要阻塞交付的问题。
