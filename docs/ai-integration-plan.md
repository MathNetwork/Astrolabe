# AI 集成计划

## 目标

在 Astrolabe 中集成 Claude AI 助手，帮助用户探索和构建知识图谱。

## 参考

claude-prism（MIT 开源）：`.reference/claude-prism/`
- 通过 Tauri 调用本地 Claude Code CLI（不直接调 API）
- 浮动聊天面板 + 流式输出 + Skills 系统

## 架构方案

```
用户在 Astrolabe 中操作
    ↓
浮动聊天面板（右下角）
    ↓ 用户输入 + 上下文（选中节点、当前文档）
Tauri Command（Rust）
    ↓ 调用本地 claude CLI
Claude Code CLI（本地安装）
    ↓ 流式 JSON 输出
Tauri Event → 前端渲染
```

**关键决策**：不管 API key，不做 API 调用。直接调用用户本地安装的 Claude Code CLI。

## 功能规划

### Phase 1: 基础聊天

**目标**：能在 Astrolabe 内和 Claude 对话

- [ ] Rust 端：发现 Claude CLI 路径 + 执行命令
- [ ] Rust 端：流式事件转发（claude-output / claude-complete / claude-error）
- [ ] 前端：聊天 store（messages, streaming, sessionId）
- [ ] 前端：浮动聊天面板（可折叠、可拖拽高度）
- [ ] 前端：消息渲染（markdown + KaTeX + 代码块）

**参考文件**：
- `.reference/claude-prism/apps/desktop/src-tauri/src/claude.rs`
- `.reference/claude-prism/apps/desktop/src/stores/claude-chat-store.ts`
- `.reference/claude-prism/apps/desktop/src/components/claude-chat/`

### Phase 2: 上下文注入

**目标**：Claude 能看到用户当前在看什么

- [ ] 选中节点时，自动注入 obj 的 statement/proof/notes 到上下文
- [ ] 选中边时，注入 mor 的 source/target/notes
- [ ] 当前 MDX 文档内容作为上下文
- [ ] `@节点名` 引用（类似 claude-prism 的 `@文件名`）

### Phase 3: 知识图谱 Skills

**目标**：Claude 能帮助操作知识图谱

候选 skills（`/` 命令）：

| 命令 | 功能 |
|------|------|
| `/add-node` | 从对话中提取概念，创建新节点 |
| `/add-edge` | 从对话中识别关系，创建新边 |
| `/explain` | 解释选中节点的数学内容 |
| `/find-connections` | 分析两个节点之间的路径 |
| `/summarize` | 总结一组相关节点 |
| `/suggest-sort` | 根据内容建议节点的 sort |

### Phase 4: Tool Widgets

**目标**：Claude 的操作可视化

- [ ] "Added node: X" widget（点击跳转到新节点）
- [ ] "Modified morphism: A→B" widget
- [ ] 操作预览（接受/拒绝）
- [ ] 和 undo 系统集成

## 技术细节

### Claude CLI 集成（Rust 端）

```rust
// 发现 Claude 路径
fn find_claude_binary() -> Option<PathBuf> {
    // ~/.local/bin/claude → PATH → nvm paths
}

// 执行
fn execute_claude(prompt: &str, project_path: &str) {
    // claude -p "prompt" --output-format stream-json
    // 逐行解析 JSON，emit Tauri events
}
```

### 聊天 Store（前端）

```typescript
interface ChatState {
    messages: Message[]
    isStreaming: boolean
    sessionId: string | null
    // 不需要多标签，一个对话就够
}
```

### 上下文构建

```typescript
function buildContext(selectedObj, selectedMor, activeDoc) {
    let ctx = ''
    if (selectedObj) {
        ctx += `[Selected node: ${obj.name} (${obj.sort})]\n`
        ctx += `[Statement: ${obj.statement}]\n`
    }
    if (selectedMor) {
        ctx += `[Selected edge: ${source.name} → ${target.name}]\n`
    }
    if (activeDoc) {
        ctx += `[Current document: ${activeDoc.title}]\n`
    }
    return ctx + '\n' + userPrompt
}
```

## 优先级

1. **Phase 1: 基础聊天** ← 从这里开始
2. Phase 2: 上下文注入
3. Phase 3: Skills
4. Phase 4: Tool Widgets

## 依赖

- 用户需要本地安装 Claude Code CLI（`claude` 命令可用）
- Tauri 2 的 shell/command API
