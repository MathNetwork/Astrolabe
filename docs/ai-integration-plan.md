# AI 集成计划

## 目标

在 NetMath 中集成 Claude AI 助手，帮助用户探索和构建知识图谱。

## 参考

claude-prism（MIT 开源）：`.reference/claude-prism/`
- Rust 端 claude.rs 直接复用（发现 CLI、执行命令、流式事件）
- 前端架构参考但按 NetMath 需求重写

## 架构

```
用户在 NetMath 中操作
    ↓
浮动聊天面板（右下角 ✦ 按钮）
    ↓ 用户输入 + 自动注入上下文（选中节点的 statement/proof/notes）
Tauri Command（Rust claude.rs）
    ↓ 调用本地 claude CLI（--output-format stream-json）
Claude Code CLI（本地安装）
    ↓ 流式 JSON 输出
Tauri Event（claude-output/complete/error）
    ↓ useClaudeEvents hook 解析
claudeChatStore → ChatPanel 渲染
```

**关键决策**：不管 API key，直接调用用户本地安装的 Claude Code CLI。

## 完成状态

### Phase 1: 基础聊天 ✅

- Rust：`claude.rs` 从 claude-prism 复制，发现 CLI 路径 + 执行 + 流式事件
- 前端：`claudeChatStore`（messages, isStreaming, sessionId, sendPrompt）
- 前端：`useClaudeEvents` hook（监听 claude-output/complete/error）
- 前端：`ChatPanel`（浮动右下角）+ `ChatMessages`（markdown 渲染）+ `ChatComposer`（输入框）
- 流式消息合并（appendToLastAssistant），不碎片化

### Phase 2: 上下文注入 ✅

- `buildContext.ts` 纯函数：选中 obj 的 name/sort/statement/proof/intuition/notes 注入
- 选中 mor 的 source→target + notes 注入
- 上下文只发给 Claude，聊天框显示用户原始输入（不显示 context 前缀）
- ChatComposer 订阅 selectObjStore + selectMorStore + dataStore

### Phase 3: Skills ✅

10 个内置 skills，全部适配 NetMath 的 MDX + knowledge.json 架构：

| 命令 | 功能 |
|------|------|
| `/explain` | 解释选中概念（直觉 + 数学含义 + 重要性） |
| `/summarize` | 总结上下文中的概念关系 |
| `/add-node` | 创建新节点（输出 JSON 格式） |
| `/add-edge` | 创建节点间的态射 |
| `/find-connections` | 分析关系路径，发现缺失连接 |
| `/suggest-sort` | 建议 sort 分类 |
| `/write-proof` | 写证明（引用 objref） |
| `/write-mdx` | 写 MDX 段落（含 objblock/objref 语法） |
| `/review-graph` | 审查图谱完整性 |
| `/translate` | 中英互译（保留 LaTeX） |

每个 skill 的 prompt 包含 SYSTEM_CONTEXT（schema、MDX 格式、API 端口）。
输入 `/` 弹出选择器，模糊匹配。

### Phase 4: Tool Widgets ← 下一步

- [ ] Claude 操作知识图谱时的可视化反馈
- [ ] "Added node: X" widget（点击跳转）
- [ ] 操作预览（接受/拒绝）
- [ ] 和 undo 系统集成

## 文件清单

```
src-tauri/src/claude.rs              ← Rust：Claude CLI 集成（从 claude-prism 复制）
src/stores/claudeChatStore.ts        ← 聊天状态（messages, streaming, sessionId）
src/hooks/useClaudeEvents.ts         ← Tauri 事件监听 + 消息解析
src/components/claude-chat/
├── ChatPanel.tsx                    ← 浮动面板（✦ 按钮 + 折叠）
├── ChatMessages.tsx                 ← 消息渲染（MarkdownRenderer）
└── ChatComposer.tsx                 ← 输入框 + / 命令选择器 + 上下文注入
src/lib/buildContext.ts              ← 上下文构建纯函数
src/lib/skills.ts                    ← 10 个内置 skills + matchSkills
```

## 依赖

- 用户需要本地安装 Claude Code CLI（`claude` 命令可用）
- Tauri 2 + tokio + dirs + which + uuid（Rust 依赖）
