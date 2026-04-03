# Astrolabe 开发计划

> 最后更新：2026-04-03

---

## 架构概览

### 平台

- **Frontend**：Next.js + React + d3-force Canvas 2D，Tauri 桌面应用
- **Backend**：Python FastAPI，port 8765
- **MCP Server**：18 tools（Core 10 + LeanNets 5 + Lean 3）
- **Terminal**：xterm.js → Tauri PTY → Claude Code CLI
- **数据同步**：astrolabe.json mtime 轮询（2 秒），全量刷新

### 状态管理（Zustand）

| Store | 职责 |
|-------|------|
| `dataStore` | objects/morphisms/files + refreshTrigger |
| `selectObjStore` | selectedHash（节点选中） |
| `selectMorStore` | selectedHash（边选中） |
| `physicsStore` | gravity/repulsion/linkDistance/friction |
| `viewStore` | layout/tab/labels/fontSize/numberMap/ptySessionId |
| `pluginStore` | plugins/enabled/activeMode |
| `highlightStore` | highlightedHashes + highlightMode + provingHash |

### 已有能力（零成本联动）

1. **Lean 状态环**：`node.state` → 绿/黄/红色环，`lean_sync_state` 更新后 2 秒自动刷新
2. **Frontend → Terminal**：`invoke('pty_write', { sessionId, data })` 从任意组件发命令
3. **MDX lean badge**：EntryBlockRenderer ∀ badge + cross-source lean 面板 + proof 嵌套

---

## 已完成

### Phase 1：Lean 基础设施 ✅

- lean-lsp-mcp 自动注入（config.ts 检测 lakefile → 注入 server）
- Lean MCP tools：`lean_project_info` + `lean_sorry_scan` + `lean_sync_state`
- MCP server：18 tools，39 个 Python 测试全过

### Phase 2：Slash Commands ✅

- `/prove`：3 阶段（收集上下文 → lean-prover agent → sync store）
- `/smart-prove`：frontier PageRank 选目标 + propagation 分析 + cross_source hint
- `/batch-prove`：skeleton 拓扑排序 → 按 DAG 逐个 prove
- `/sorry` `/sync-lean` `/store` `/frontier` `/propagate` `/avalidate` `/metrics`
- `search` MCP tool：关键词搜索 title/notes/content

### Phase 3：lean_sync_state ✅

- 解析 .lean 声明 → 匹配 store atoms → 更新 state（proven/sorry/checked）
- Hessenberg 验证：37 声明匹配，所有 atoms 状态正确

### Phase 4：Lean Prover Agent ✅

- `~/.claude/agents/lean-prover.md`：Session Contract + 策略 + 编译指令
- `/prove` 委派 lean-prover sub-agent，主 agent 管全局策略

### Phase 6A：交互按钮 ✅

- Prove 按钮（sorry lean atom，黄色）+ Sync Lean 按钮（蓝色）
- `pty_write` 发送命令，PTY 未连接时 disabled
- 8 个契约测试

### Phase 6B：Propagation 高亮 ✅

- `highlightStore`：highlightedHashes + highlightMode + provingHash
- Show Impact 按钮（橙色，toggle）→ propagate API → 橙色外圈 + 非高亮 15% 透明度
- 12 个测试（6 store + 6 contract），160 总测试全过

### EntryBlockRenderer Proof 嵌套 ✅

- tex entryblock 的 lean 面板自动嵌套 lean proof（通过 (theorem, proof) edge）
- 6 个契约测试

---

## 当前阶段：前端联动 + AI 协同

### Phase 6C：节点工作态（1 天）

**目标**：AI 正在操作的节点有明确的视觉状态。

**机制**：

| 组件 | 改动 |
|------|------|
| `highlightStore` | 使用已有 `provingHash` |
| `EntryDetail.tsx` | Prove 按钮点击 → `setProving(hash)` |
| `NetworkView.tsx` | `provingHash` 匹配时：橙色虚线边框（`setLineDash`） |

**节点工作态渲染**：

```typescript
// NetworkView 渲染循环中，state ring 之后
if (node.id === provingHash) {
    ctx.beginPath()
    ctx.arc(node.x, node.y, r + 2.5 / transform.k, 0, 2 * Math.PI)
    ctx.strokeStyle = '#f97316'  // orange-500
    ctx.lineWidth = 1.5 / transform.k
    ctx.setLineDash([4 / transform.k, 3 / transform.k])
    ctx.stroke()
    ctx.setLineDash([])
}
```

**工作态清除**：30 秒 timeout 自动清除。状态变化时（astrolabe.json 刷新后 state 改变）也清除。

**状态变色**：节点 state 变化通过 2 秒轮询自然反映——状态环颜色直接切换（sorry 黄 → proven 绿），无需额外动画。

### Phase 6D：AI Follow Mode（1 天）

**目标**：Network View 实时跟随 agent 操作路径。

**数据流**：

```
PTY 字节流 → Tauri pty-output → ChatPanel listener
  → hashExtractor（strip ANSI → /\b[0-9a-f]{12}\b/g → objectMap 验证）
  → 300ms debounce
  → if (aiFollowMode) selectObjStore.select(hash)
  → NetworkView fly-to（已有）
```

**需要改动的文件**：

| 文件 | 改动 |
|------|------|
| `src/lib/hashExtractor.ts` | **新增**：纯函数，提取有效 hash |
| `src/stores/viewStore.ts` | 加 `aiFollowMode` + `toggleAiFollow` |
| `src/components/ai-chat/ChatPanel.tsx` | pty-output 中加 hashExtractor |
| `src/panels/workspace/NetworkSettings.tsx` | AI Follow toggle |

**hashExtractor**：

```typescript
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

**边界情况**：多 hash 取最后一个 | git hash 被 objectMap 过滤 | 300ms debounce 防闪烁 | tail buffer 24 字节处理 chunk 截断 | 用户点击后 300ms cooldown 优先 | ANSI strip

**开关**：默认关闭，NetworkSettings 底部 toggle，`Cmd+Shift+F` 快捷键。

### Phase 6E：ReadView 双向导航（半天）

**Network → Read**：selectObjStore 变化 → ReadView 找 `[data-entry="<hash>"]` → `scrollIntoView({ behavior: 'smooth', block: 'center' })`

**Read → Network**：EntryBlock 点击已调 `selectObjStore.select()` → NetworkView fly-to（已有）

改动文件：`ReadView.tsx`

### Phase 6F：.lean 文件 Watcher（半天）

1. 后端加 `/api/lean/mtime`
2. `useFileWatcher` 扩展轮询 .lean mtime
3. 变化 → `pty_write("/sync-lean\n")`

### AI 工作指示器（半天）

**目标**：图底部一行文字，显示 AI 当前操作。

```
"Proving entry 7b7e8e9400bd (Theorem: rigid)..."
"Scanning frontier: found 5 sorry nodes"
```

**实现**：

```typescript
// 扩展 highlightStore
interface AICollabState {
  activeNodeHash: string | null       // 工作态节点
  statusText: string | null           // 底部状态文字
  batchProgress: {                    // batch-prove 进度
    total: number
    completed: number
    currentHash: string | null
  } | null
}
```

- NetworkView 底部渲染 `statusText`（canvas `fillText`，`rgba(255,255,255,0.4)`）
- 数据来源：hashExtractor 同时提取操作上下文（"Proving..."/"Scanning..."）
- 空闲时隐藏（statusText = null）

### 批量操作路径（Phase 6C 扩展）

`/batch-prove` 执行时，skeleton 拓扑序的节点呈三色状态：

| 状态 | 颜色 | 含义 |
|------|------|------|
| 待处理 | `rgba(255,255,255,0.3)` 灰色虚线 | 排队中 |
| 处理中 | `#f97316` 橙色虚线 | 当前正在 prove |
| 已处理 | 无额外标记（state ring 已更新） | 完成 |

数据来源：`batchProgress` 中的 `currentHash` 和 `completed` 列表。

---

## 技术约束

- **零 rAF 动画循环**：所有视觉变化由状态驱动（store 变化 → 重绘一次），不需要独立动画循环
- **d3 simulation 不受 AI 协同影响**：AI 协同只改视觉属性（stroke/fill/opacity），不碰节点坐标
- **状态变色用 canvas 重绘**：highlightStore 变化 → `simulation.alpha(0.01).restart()` → 触发一次 tick → 重绘
- **用户操作永远优先**：拖拽/点击时 AI Follow 暂停（300ms cooldown）

---

## 时间线

```
已完成 ──── Phase 1-4 + 6A + 6B + proof 嵌套
当前 ─────── Phase 6C 节点工作态 ──── 1 天
           Phase 6D AI Follow ────── 1 天（可并行）
           Phase 6E ReadView 导航 ── 半天
           Phase 6F .lean Watcher ── 半天
           AI 工作指示器 ────────── 半天
```

**最小 demo**：6C + 6D（2 天）—— 节点工作态 + AI Follow 展示完整的 AI 协同体验

---

## 文件改动汇总

### 新增

| 文件 | 用途 |
|------|------|
| `src/lib/hashExtractor.ts` | PTY 输出 → hash 提取 |
| `src/__tests__/hash-extractor.test.ts` | hashExtractor 测试 |
| `src/__tests__/ai-follow-mode.test.ts` | AI Follow 契约测试 |

### 修改

| 文件 | Phase | 改动 |
|------|-------|------|
| `EntryDetail.tsx` | 6C | Prove 按钮 → setProving |
| `NetworkView.tsx` | 6C | provingHash → 橙色虚线 + statusText |
| `highlightStore.ts` | 6C | 加 statusText + batchProgress |
| `viewStore.ts` | 6D | aiFollowMode + toggleAiFollow |
| `ChatPanel.tsx` | 6D | hashExtractor 集成 |
| `NetworkSettings.tsx` | 6D | AI Follow toggle |
| `ReadView.tsx` | 6E | scrollIntoView |
| `useFileWatcher.ts` | 6F | .lean mtime 轮询 |
