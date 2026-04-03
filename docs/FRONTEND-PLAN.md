# 前端联动开发计划

> 日期：2026-04-02
> 基于：docs/archive/frontend-analysis.md 调查报告

---

## 背景

前端调查的三个关键发现：

1. **Lean 状态环已实现**——NetworkView:180-188 根据 `node.state` 画绿/黄/红色环。`lean_sync_state` 更新 store → astrolabe.json 变化 → 2 秒内前端自动刷新。无需改动。
2. **Frontend → Terminal 通道已存在**——`invoke('pty_write', { sessionId, data })` 可以从任意前端组件向终端发送命令。
3. **MDX entryblock lean badge 已实现**——EntryBlockRenderer 显示 ∀ badge + cross-source lean 面板 + proof 嵌套。

主要缺口：交互按钮、prove 过程实时反馈、双向导航。

---

## Phase 6A：交互按钮（半天）

### 目标

在 DetailView 里加操作按钮，点击直接向 terminal 发命令。

### 步骤

1. 在 `EntryDetail.tsx` 中，当选中的 entry 是 lean atom 且 state = "sorry" 时，显示 "Prove" 按钮
2. 点击 → `invoke('pty_write', { sessionId: viewStore.ptySessionId, data: "/prove <hash>\n" })`
3. 加 "Sync Lean" 按钮（始终显示，调 `/sync-lean\n`）
4. 如果选中的是 tex atom 且没有 lean counterpart（frontier 候选），显示 "Formalize" 按钮

### 测试

- `test_prove_button_visible_for_sorry`：sorry 状态的 lean atom 显示 Prove 按钮
- `test_prove_button_hidden_for_proven`：proven 状态不显示
- `test_prove_button_sends_pty_command`：点击后 pty_write 被调用
- `test_sync_button_always_visible`：Sync 按钮始终显示

### 验证

选中 rigid theorem → 看到 "Prove" 按钮 → 点击 → terminal 自动输入 `/prove 7b7e8e9400bd`

---

## Phase 6B：Propagation 影响链高亮（1 天）

### 目标

选中节点时，Network View 高亮所有被它影响的下游节点。

### 步骤

1. 新建 `src/stores/highlightStore.ts`：

```typescript
interface HighlightState {
  highlightedHashes: Set<string>
  highlightMode: 'none' | 'propagation' | 'proving'
  setHighlight: (hashes: string[], mode: string) => void
  clearHighlight: () => void
}
```

2. 在 EntryDetail 加 "Show Impact" 按钮
3. 点击 → fetch `/api/astrolabe/propagate?hash=<selected>&path=<project>` → 拿到 affected hashes
4. `highlightStore.setHighlight(affected, 'propagation')`
5. NetworkView 渲染：`highlightedHashes.has(node.id)` → 橙色光圈；不在集合中 → 降低透明度

### 测试

- `test_highlight_store_set_clear`：set 后 has 返回 true，clear 后返回 false
- `test_propagation_button_calls_api`：点击后 fetch propagate endpoint
- `test_network_view_reads_highlight_store`：NetworkView 导入了 highlightStore

### 验证

选中 Break definition → 点击 "Show Impact" → 22 个下游节点高亮，其余变暗

---

## Phase 6C：Prove 过程脉冲动画（1 天）

### 目标

`/prove` 执行时，正在被证明的节点呈脉冲效果。

### 步骤

1. 扩展 highlightStore：加 `provingHash: string | null`
2. 点击 "Prove" 按钮时 → `highlightStore.setProving(hash)`
3. NetworkView 渲染：`provingHash` 匹配时，radius 正弦波动（baseR ~ baseR×1.5，周期 1 秒）
4. 结束检测：
   - 简单方案：30 秒 timeout 自动清除
   - 完整方案：监听 pty-output 解析 "proven"/"sorry" 关键词
5. 脉冲结束后 astrolabe.json 变化 → 2 秒轮询 → 状态环颜色更新

### 测试

- `test_proving_hash_triggers_animation`：provingHash 不为 null 时渲染包含脉冲计算
- `test_proving_cleared_on_timeout`：30 秒后自动清除

### 验证

点击 Prove → 节点脉冲 → 完成 → 脉冲停止 → 状态环变色

---

## Phase 6D：ReadView 双向导航（半天）

### 目标

Network View ↔ Read View 双向联动。

### 步骤

1. **Network → ReadView**：selectObjStore.selectedHash 变化 → ReadView 找到 `entryblock-<hash>` DOM 元素 → `scrollIntoView({ behavior: 'smooth', block: 'center' })`
2. **ReadView → Network**：EntryBlock 点击已调 `selectObjStore.select(hash)` → NetworkView 已有 fly-to 动画（确认链路通畅）

### 测试

- `test_readview_scrolls_on_selection`：selection 变化后 scrollIntoView 被调用
- `test_entryblock_selects_on_click`：点击后 selectedHash 更新

### 验证

Network 点击 Theorem 4.3 → ReadView 平滑滚动到对应 entryblock

---

## Phase 6E：Terminal 输出联动（1 天）

### 目标

Terminal 输出触发前端动作。

### 步骤

1. ChatPanel 的 pty-output 事件监听中加输出解析
2. 字符串匹配：
   - `"proven"` / `"verified"` → `dataStore.triggerRefresh()` + 清除脉冲
   - `"sorry"` / `"failed"` → 清除脉冲
   - `"lean_sync_state"` → `dataStore.triggerRefresh()`
3. pty-output 是原始字节流，需积累成行再匹配

### 测试

- `test_output_parser_detects_proven`：输出含 "proven" → triggerRefresh
- `test_output_parser_detects_sorry`：输出含 "sorry" → clearProving
- `test_output_parser_buffers_lines`：分段到达时正确拼接

### 验证

Terminal 里 `/prove` 完成 → 前端自动刷新 → 节点状态更新 → 脉冲停止

---

## Phase 6F：.lean 文件 Watcher（半天）

### 目标

.lean 文件变化后自动触发 lean_sync_state。

### 步骤

1. 后端加 `/api/lean/mtime` endpoint：返回 .lean 文件最新 mtime
2. 前端 useFileWatcher 扩展：轮询 .lean mtime
3. mtime 变化 → `pty_write("/sync-lean\n")`
4. sync 完成 → astrolabe.json 更新 → 已有轮询机制刷新前端

### 测试

- `test_lean_mtime_endpoint`：后端返回正确 mtime
- `test_lean_watcher_triggers_sync`：mtime 变化后 pty_write 被调用

### 验证

VSCode 修改 .lean → 保存 → 几秒后 Astrolabe UI 节点状态自动更新

---

## 总时间线

```
Phase 6A ─── 交互按钮 ────────── 半天 ── 无依赖
Phase 6B ─── Propagation 高亮 ── 1 天 ── 无依赖（可与 6A 并行）
Phase 6C ─── Prove 脉冲动画 ──── 1 天 ── 依赖 6A（Prove 按钮触发）
Phase 6D ─── ReadView 双向导航 ── 半天 ── 无依赖
Phase 6E ─── Terminal 输出联动 ── 1 天 ── 依赖 6C（清除脉冲）
Phase 6F ─── .lean Watcher ───── 半天 ── 依赖 6E（触发刷新）
```

总计约 **4.5 天**。

### 优先级建议

**最小 demo（1.5 天）**：6A + 6B
- "Prove" 按钮是用户体验关键交互点
- Propagation 高亮是 paper 截图的杀手级 feature

**完整体验（4.5 天）**：6A → 6B → 6C → 6D → 6E → 6F

---

## 约束

- 不改 MCP server 代码
- 不改 astrolabe-code 代码
- 不改后端 Python 代码（除 6F 的 mtime endpoint）
- 不引入 WebSocket（保持轮询）
- 所有新测试通过 + 现有 140 个前端测试零回归
