# 下一步开发计划

## 当前状态

- 架构重构 ✅（2D 图、6 stores、shared 组件、323 测试）
- AI 集成 ✅（聊天、上下文、10 skills、Tool Widgets）
- 应用目前是**只读**的——数据只能通过 AI 或后端 API 修改

## 优先级排序

### P0: 编辑功能 ✅

通过 AI Skills 实现，不需要单独的编辑 UI：
- `/add-node` `/add-edge` — 创建
- `/edit-node` `/edit-edge` — 修改
- `/delete-node` `/delete-edge` — 删除
- Tool Widgets 自动检测 JSON 输出，一键执行 API 调用

### P1: Sort 自定义 ✅

- 后端 `/api/knowledge/sorts` 读取 `.netmath/sorts.json`
- dataStore.sortConfig 存储项目自定义 sort
- objectSortConfig 支持动态覆盖（custom → default → fallback）
- 没有 sorts.json 时 fallback 到默认数学 sort

### P2: UI 打磨（进行中）

**已完成：**
- [x] 聊天面板嵌入 Inspector（底部抽屉式，可拖拽高度，可展开）
- [x] 字体大小从 text-xs 改为 text-sm
- [x] 所有按钮换成 heroicon
- [x] assets/ 目录完全删除，sort 配置移到 src/lib/sortConfig.ts

**下一步：流式消息重构（重要）**

当前问题：Claude 回复是一块一块跳出来的，不是逐字流动。thinking/tool_use 消息被忽略了。

参考 claude-prism 的实现（`.reference/claude-prism/apps/desktop/src/components/claude-chat/`），需要重写：

1. **claudeChatStore** — 存原始流消息（ClaudeStreamMessage[]），不做文本合并
2. **useClaudeEvents** — 每条 claude-output 原样存入 store
3. **ChatMessages** — 按消息类型分别渲染：
   - `thinking` → 折叠的思考过程（ThinkingWidget）
   - `text` → markdown 文本（自然 streaming）
   - `tool_use` → 工具调用显示（ToolWidget: Read/Edit/Bash）
   - `result` → 最终结果 + 费用
4. **Stop 按钮** — 调用 cancel_claude_execution

关键文件参考：
- `.reference/claude-prism/apps/desktop/src/stores/claude-chat-store.ts` (ClaudeStreamMessage 类型)
- `.reference/claude-prism/apps/desktop/src/components/claude-chat/chat-messages.tsx` (渲染逻辑)
- `.reference/claude-prism/apps/desktop/src/components/claude-chat/tool-widgets.tsx` (ThinkingWidget/ToolWidget)

**其他待做：**
- [ ] 首页重新设计
- [ ] NetworkView 节点标签可切换
- [ ] 加载/空状态优化

### P3: Template 项目

做 2-3 个非数学的小 demo 展示通用性。每个是一个独立仓库，包含 `.netmath/` 目录。

- [ ] 法律案例（5-10 个节点：statute, case, opinion, argument）
- [ ] 生物通路（5-10 个节点：gene, protein, pathway, disease）
- [ ] 或：哲学论证 / 历史事件 / 软件架构

**依赖**：P1 Sort 自定义完成后才有意义

### P4: 桌面版打包

- [ ] `npm run tauri build` 生成 .app / .dmg (macOS)
- [ ] 应用图标设计
- [ ] 自动更新机制（tauri-plugin-updater）
- [ ] 代码签名（Apple Developer）

**依赖**：P0-P2 基本完成，功能稳定后再打包

## 建议执行顺序

```
P0 编辑功能    ← 最先做，核心功能
    ↓
P1 Sort 自定义  ← 通用化
    ↓
P2 UI 打磨     ← 体验提升
    ↓
P3 Templates   ← 展示通用性
    ↓
P4 打包发布    ← 最后
```

## 时间估算

| 阶段 | 范围 |
|------|------|
| P0 编辑功能 | 节点/边 CRUD + 表单 + undo |
| P1 Sort 自定义 | sorts.json + 动态配置 + UI |
| P2 UI 打磨 | 聊天面板 + 首页 + 细节 |
| P3 Templates | 2-3 个小项目 |
| P4 打包 | build + 图标 + 签名 |
