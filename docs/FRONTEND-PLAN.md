# 前端联动开发计划

> 日期：2026-04-02
> 基于：docs/archive/frontend-analysis.md 调查报告

---

## 背景

### 已有能力（零成本）

1. **Lean 状态环**——NetworkView:180-188 根据 `node.state` 画绿/黄/红色环。`lean_sync_state` 更新 store → astrolabe.json 变化 → 2 秒内自动刷新。无需改动。
2. **Frontend → Terminal 通道**——`invoke('pty_write', { sessionId, data })` 可从任意组件向终端发命令。
3. **MDX lean badge**——EntryBlockRenderer 显示 ∀ badge + cross-source lean 面板 + proof 嵌套。

### 主要缺口

交互按钮、影响链可视化、AI 操作实时跟随、双向导航、.lean 文件自动同步。

### 核心技术约束

- 不改 MCP server / astrolabe-code / 后端 Python 代码（除 6F 的 mtime endpoint）
- 不引入 WebSocket（保持 2 秒轮询）
- 所有新测试通过 + 现有 140 个前端测试零回归

---

## Phase 6A：交互按钮（半天）

### 目标

在 DetailView 里加操作按钮，点击直接向 terminal 发命令。

### 需要改动的文件

| 文件 | 改动 |
|------|------|
| `src/components/detail/EntryDetail.tsx` | 加 Prove / Sync / Formalize 按钮 |

### 步骤

1. 当选中 entry 是 lean atom 且 state = `"sorry"` 时，显示 "Prove" 按钮
2. 点击 → `invoke('pty_write', { sessionId: viewStore.ptySessionId, data: "/prove <hash>\n" })`
3. 加 "Sync Lean" 按钮（始终显示，调 `/sync-lean\n`）
4. 如果选中的是 tex atom 且没有 lean counterpart（frontier 候选），显示 "Formalize" 按钮

### 测试

| 测试名 | 验证内容 |
|--------|---------|
| `test_prove_button_visible_for_sorry` | sorry 状态 lean atom 显示 Prove 按钮 |
| `test_prove_button_hidden_for_proven` | proven 状态不显示 |
| `test_prove_button_sends_pty_command` | 点击后 pty_write 被调用，data 含正确 hash |
| `test_sync_button_always_visible` | Sync 按钮始终显示 |

### 验证

选中 rigid theorem → 看到 "Prove" 按钮 → 点击 → terminal 自动输入 `/prove 7b7e8e9400bd`

---

## Phase 6B：Propagation 影响链高亮（1 天）

### 目标

选中节点时，Network View 高亮所有下游受影响节点。Paper 截图的杀手级 feature。

### 需要改动的文件

| 文件 | 改动 |
|------|------|
| `src/stores/highlightStore.ts` | **新增**：highlightedHashes + highlightMode + provingHash |
| `src/components/detail/EntryDetail.tsx` | 加 "Show Impact" 按钮 |
| `src/panels/workspace/NetworkView.tsx` | 渲染时读 highlightStore，画橙色光圈 + 降低非高亮节点透明度 |

### highlightStore 设计

```typescript
interface HighlightState {
  highlightedHashes: Set<string>        // 当前高亮的节点集合
  highlightMode: 'none' | 'propagation' | 'proving'
  provingHash: string | null            // 正在 prove 的节点（Phase 6C 用）
  setHighlight: (hashes: string[], mode: string) => void
  clearHighlight: () => void
  setProving: (hash: string | null) => void
}
```

### 步骤

1. 创建 `highlightStore.ts`
2. EntryDetail 加 "Show Impact" 按钮 → fetch `/api/astrolabe/propagate` → `setHighlight(affected, 'propagation')`
3. NetworkView 渲染循环：`highlightedHashes.has(node.id)` → 橙色外圈；不在集合中 → `globalAlpha = 0.2`

### 测试

| 测试名 | 验证内容 |
|--------|---------|
| `test_highlight_store_set_clear` | set 后 has 返回 true，clear 后返回 false |
| `test_propagation_button_calls_api` | 点击后 fetch propagate endpoint |
| `test_network_view_reads_highlight_store` | NetworkView 导入 highlightStore |

### 验证

选中 Break definition → "Show Impact" → 22 个下游节点高亮，其余变暗

---

## Phase 6C：Prove 过程脉冲动画（1 天）

### 目标

`/prove` 执行时，目标节点呈脉冲效果。

### 需要改动的文件

| 文件 | 改动 |
|------|------|
| `src/stores/highlightStore.ts` | 使用 Phase 6B 已加的 `provingHash` |
| `src/components/detail/EntryDetail.tsx` | Prove 按钮点击时 `setProving(hash)` |
| `src/panels/workspace/NetworkView.tsx` | `provingHash` 匹配时画脉冲（radius 正弦波动） |

### 步骤

1. Prove 按钮点击 → `highlightStore.setProving(hash)` + `pty_write("/prove <hash>\n")`
2. NetworkView 渲染：`provingHash === node.id` → radius = `baseR + sin(time * 4) * baseR * 0.5`（1 秒周期）
3. 30 秒 timeout 自动清除（简单方案）
4. 脉冲结束后 astrolabe.json 变化 → 2 秒轮询 → 状态环颜色自动更新

### 测试

| 测试名 | 验证内容 |
|--------|---------|
| `test_proving_hash_triggers_animation` | provingHash 不为 null 时渲染含脉冲逻辑 |
| `test_proving_cleared_on_timeout` | 30 秒后自动清除 |

### 验证

点击 Prove → 节点脉冲 → 完成/超时 → 脉冲停止 → 状态环变色

---

## Phase 6D：AI Follow Mode（1 天）

### 目标

Agent 在 terminal 操作 store entries 时，Network View 实时跟随，自动 fly-to 到 agent 正在操作的节点。用户直观看到 AI 在知识网络上"思考"的路径。

**典型场景**：`/smart-prove` → agent 调 `frontier` → `cross_source` → `get` → lean-prover。Network View 依次 fly-to 到 frontier 最高 atom → cross-source tex atom → 正在证明的 theorem。

### 数据流

```
PTY 字节流
  → Tauri 'pty-output' 事件
  → ChatPanel listener
  → hashExtractor（strip ANSI → regex 12-hex → objectMap 验证）
  → 300ms debounce
  → if (aiFollowMode) selectObjStore.select(hash)
  → NetworkView fly-to（已有，无需改动）
```

### 需要改动的文件

| 文件 | 改动 |
|------|------|
| `src/lib/hashExtractor.ts` | **新增**：纯函数，从文本提取并验证 12-char hex hash |
| `src/stores/viewStore.ts` | 加 `aiFollowMode: boolean` + `toggleAiFollow()` |
| `src/components/ai-chat/ChatPanel.tsx` | pty-output listener 中加 hashExtractor 调用 |
| `src/panels/workspace/NetworkSettings.tsx` | 加 AI Follow toggle 开关 |

不改的文件：selectObjStore（已有 `select`）、NetworkView（已有 fly-to）、dataStore（已有 `objectMap`）。

### hashExtractor 设计

```typescript
// src/lib/hashExtractor.ts — 纯函数，不导入 React 或 store
const ANSI_RE = /\x1b\[[0-9;]*[A-Za-z]/g
const HASH_RE = /\b[0-9a-f]{12}\b/g

export function extractLastValidHash(
  text: string,
  isValid: (hash: string) => boolean,
): string | null {
  const clean = text.replace(ANSI_RE, '')
  const matches = clean.match(HASH_RE)
  if (!matches) return null
  for (let i = matches.length - 1; i >= 0; i--) {
    if (isValid(matches[i])) return matches[i]
  }
  return null
}
```

### ChatPanel 集成

```typescript
// 在 pty-output listener 中，term.write(bytes) 之后加：
const text = new TextDecoder().decode(new Uint8Array(event.payload.data))
tailBufferRef.current += text
if (tailBufferRef.current.length > 200)
  tailBufferRef.current = tailBufferRef.current.slice(-24)
if (viewStore.aiFollowMode) {
  const hash = extractLastValidHash(
    tailBufferRef.current,
    (h) => dataStore.objectMap.has(h),
  )
  if (hash) debouncedSelect(hash)
}
```

### 用户交互

- **开关位置**：NetworkSettings 面板底部，toggle switch
- **默认值**：关闭（避免不知情时被自动跳转干扰）
- **快捷键**：`Cmd+Shift+F` / `Ctrl+Shift+F`
- **状态指示**：开启时 NetworkView 左上角显示半透明 "Following" 徽章

### 边界情况

| 情况 | 处理 |
|------|------|
| 输出含多个 hash | 取最后一个有效 hash |
| hash 不在 store（如 git hash） | `objectMap.has()` 过滤 |
| 快速连续输出 | 300ms debounce |
| hash 截断在两 chunk 之间 | tail buffer 保留最后 24 字节 |
| 用户手动点击时 AI 覆盖 | 用户点击后 300ms cooldown，期间忽略 AI follow |
| Network View 不可见 | select 写入 store（无害），fly-to useEffect 不触发 |
| ANSI 转义序列干扰 | strip ANSI codes 后再匹配 |
| PTY 未连接 | `ptySessionId === null` 时不执行 |
| 关闭 follow 后残留选中 | 不取消——只停止后续跟随 |

### 测试

**hash-extractor.test.ts（纯函数）**

| 测试名 | 输入 | 预期 |
|--------|------|------|
| `extracts_single_hash` | `"Entry abc123def456"` + 有效 | `"abc123def456"` |
| `extracts_last_when_multiple` | 两个有效 hash | 最后一个 |
| `ignores_invalid_hash` | objectMap 不含 | `null` |
| `ignores_non_hex` | `"hello world"` | `null` |
| `strips_ansi_codes` | `"\x1b[32mabc123def456\x1b[0m"` | `"abc123def456"` |
| `handles_boundary` | 拼接后匹配 | 正确提取 |
| `ignores_longer_hex` | 18 chars hex | `null` |

**ai-follow-mode.test.ts（契约）**

| 测试名 | 验证 |
|--------|------|
| `viewStore_has_aiFollowMode` | viewStore.ts 含 `aiFollowMode` |
| `viewStore_has_toggleAiFollow` | viewStore.ts 含 `toggleAiFollow` |
| `chatpanel_imports_hashExtractor` | ChatPanel.tsx 导入 hashExtractor |
| `chatpanel_reads_aiFollowMode` | ChatPanel.tsx 引用 aiFollowMode |
| `chatpanel_calls_selectObj` | ChatPanel.tsx 引用 selectObjStore |
| `network_settings_has_follow_toggle` | NetworkSettings.tsx 含 aiFollow UI |
| `hashExtractor_is_pure` | 不导入 React 或 store |

### 可扩展性

hashExtractor 返回 `lastHash`。未来支持"高亮 AI 路径"只需改为 `allHashes[]`，配合 highlightStore 即可渲染完整轨迹。

---

## Phase 6E：ReadView 双向导航（半天）

### 目标

Network View ↔ Read View 双向联动。

### 需要改动的文件

| 文件 | 改动 |
|------|------|
| `src/panels/workspace/ReadView.tsx` | 监听 selectObjStore 变化 → scrollIntoView |

### 步骤

1. **Network → ReadView**：`selectObjStore.selectedHash` 变化 → ReadView 找 `[data-entry="<hash>"]` DOM 元素 → `scrollIntoView({ behavior: 'smooth', block: 'center' })`
2. **ReadView → Network**：EntryBlock 点击已调 `selectObjStore.select(hash)` → NetworkView 已有 fly-to（确认链路通畅）

### 测试

| 测试名 | 验证 |
|--------|------|
| `test_readview_scrolls_on_selection` | selection 变化后 scrollIntoView 被调用 |
| `test_entryblock_selects_on_click` | 点击后 selectedHash 更新 |

### 验证

Network 点击 Theorem 4.3 → ReadView 平滑滚动到对应 entryblock

---

## Phase 6F：.lean 文件 Watcher（半天）

### 目标

.lean 文件变化后自动触发 lean_sync_state。

### 需要改动的文件

| 文件 | 改动 |
|------|------|
| `backend/app.py`（或等效） | **新增** `/api/lean/mtime` endpoint |
| `src/hooks/useFileWatcher.ts` | 扩展：轮询 .lean mtime |

### 步骤

1. 后端加 `/api/lean/mtime`：返回 Lean 项目 .lean 文件最新 mtime
2. useFileWatcher 扩展：除轮询 astrolabe.json，也轮询 .lean mtime
3. .lean mtime 变化 → `pty_write("/sync-lean\n")`
4. sync 完成 → astrolabe.json 更新 → 已有轮询刷新前端

### 测试

| 测试名 | 验证 |
|--------|------|
| `test_lean_mtime_endpoint` | 后端返回正确 mtime |
| `test_lean_watcher_triggers_sync` | mtime 变化后 pty_write 被调用 |

### 验证

VSCode 修改 .lean → 保存 → 几秒后 Astrolabe UI 节点状态自动更新

---

## 总时间线

```
Phase 6A ─── 交互按钮 ────────── 半天 ── 无依赖
Phase 6B ─── Propagation 高亮 ── 1 天 ── 无依赖（可与 6A 并行）
Phase 6C ─── Prove 脉冲动画 ──── 1 天 ── 依赖 6A + 6B（Prove 按钮 + highlightStore）
Phase 6D ─── AI Follow Mode ──── 1 天 ── 无依赖（可与 6A-C 并行）
Phase 6E ─── ReadView 双向导航 ── 半天 ── 无依赖
Phase 6F ─── .lean Watcher ───── 半天 ── 无依赖
```

总计约 **4.5 天**。

### 并行执行方案

```
Day 1:  6A（半天） + 6D hashExtractor（半天）
Day 2:  6B highlightStore + NetworkView 高亮
Day 3:  6C 脉冲动画 + 6D ChatPanel 集成
Day 4:  6E ReadView 导航 + 6F .lean Watcher
```

### 最小可行 Demo（1.5 天）

只做 **6A + 6B**：
- "Prove" 按钮是用户体验的关键交互点
- Propagation 高亮是 paper 截图的杀手级 feature

### 全量实施顺序

| 优先级 | Phase | 理由 |
|--------|-------|------|
| P0 | 6A 交互按钮 | 最基本的 UI → Terminal 联动 |
| P0 | 6B Propagation 高亮 | Paper demo 必需 |
| P1 | 6C Prove 脉冲 | 视觉反馈，依赖 6A+6B |
| P1 | 6D AI Follow | 差异化 feature，独立开发 |
| P2 | 6E ReadView 导航 | 锦上添花 |
| P2 | 6F .lean Watcher | 自动化便利 |

---

## 新增文件汇总

| 文件 | Phase | 用途 |
|------|-------|------|
| `src/stores/highlightStore.ts` | 6B | 高亮状态 + proving 状态 |
| `src/lib/hashExtractor.ts` | 6D | 纯函数：PTY 输出 → hash 提取 |
| `src/__tests__/highlight-store.test.ts` | 6B | highlightStore 测试 |
| `src/__tests__/hash-extractor.test.ts` | 6D | hashExtractor 测试 |
| `src/__tests__/ai-follow-mode.test.ts` | 6D | AI Follow 契约测试 |
| `src/__tests__/interaction-buttons.test.ts` | 6A | 按钮契约测试 |

## 修改文件汇总

| 文件 | Phase | 改动 |
|------|-------|------|
| `src/components/detail/EntryDetail.tsx` | 6A+6B | Prove/Sync/Impact 按钮 |
| `src/stores/viewStore.ts` | 6D | aiFollowMode 状态 |
| `src/components/ai-chat/ChatPanel.tsx` | 6D | hashExtractor 集成 |
| `src/panels/workspace/NetworkView.tsx` | 6B+6C | 高亮渲染 + 脉冲动画 |
| `src/panels/workspace/NetworkSettings.tsx` | 6D | AI Follow toggle |
| `src/panels/workspace/ReadView.tsx` | 6E | scrollIntoView |
| `src/hooks/useFileWatcher.ts` | 6F | .lean mtime 轮询 |
| `backend/app.py` | 6F | /api/lean/mtime endpoint |
