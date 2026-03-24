# P0: Chat Mode

## 目标
AI Chat 场景下 Claude CLI 不走 agent loop，纯输出 JSON 块后结束。

## 当前状态
`src-tauri/src/claude.rs` 已加 `--tools ""` 禁用所有工具，`src/stores/claudeChatStore.ts` 传 `allowedTools: []`。理论上 Claude 没有工具就不会 loop。但 Claude CLI 仍然以 agent 模式运行，偶尔仍会尝试循环。

## 数据流
```
用户输入 → ChatComposer → sendPrompt → Tauri invoke execute_claude_code
  → Claude CLI (--tools "" --print) → 输出 JSON → claude-output event
  → ChatMessages 渲染 → ToolWidgets 解析 JSON → 执行 CRUD
```

## 涉及文件
- `src-tauri/src/claude.rs` — `common_claude_args()` 确认 `--tools ""` 生效
- `src/stores/claudeChatStore.ts` — 确认 `allowedTools: []`
- 可能需要 Claude CLI 更新支持 `--max-turns 1` 或类似参数

## API 端点
无。

## 验收标准
1. 用户发消息后 Claude 输出一段文本（含 JSON 块），然后结束
2. 不出现循环尝试调用工具的行为
3. 不出现 "I don't have access to..." 类的工具拒绝消息
