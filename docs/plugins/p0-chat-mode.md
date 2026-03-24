# P0: Chat Mode ✅

## 目标
AI Chat 场景下 Claude 能正确输出 JSON 块用于 CRUD 操作。

## 最终方案
不限制工具。Claude 保留全部工具访问权限（Read, Bash, Grep 等），可以自由探索项目。
CRUD 操作通过 SYSTEM_CONTEXT 中的格式说明引导 Claude 输出 JSON 块，前端 ToolWidgets 解析执行。
Claude 也可以直接调 API（curl），P0 文件监听实现后视图会自动刷新。

## 已完成
- `src/lib/skills.ts` SYSTEM_CONTEXT：完整描述 astrolabe.json 格式（content-addressable hash, ref 验证, __self__ 约定）
- `src/lib/skills.ts` SYSTEM_CONTEXT：CRUD API 端点文档
- `src/lib/parseClaudeActions.ts`：解析 create-entry / update-entry / delete-entry
- `src/components/ai-chat/ToolWidgets.tsx`：执行 CRUD 并刷新数据
- Tauri HMR listener race condition 修复

## 数据流
```
用户输入 → ChatComposer → sendPrompt → Tauri invoke execute_claude_code
  → Claude CLI (-p --output-format stream-json) → 自由使用工具 + 输出 JSON
  → ChatMessages 渲染 → ToolWidgets 解析 JSON → 执行 CRUD
  → refreshData 更新 dataStore
```

## 遗留
- Claude 偶尔仍会用 curl 直接调 API 而不是输出 JSON — 这是可以接受的，P0 文件监听会解决视图同步
