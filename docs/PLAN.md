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
| `selectObjStore` | selectedHash（节点选中，temporal undo/redo） |
| `selectMorStore` | selectedHash（边选中） |
| `physicsStore` | gravity/repulsion/linkDistance/friction |
| `viewStore` | layout/tab/labels/fontSize/numberMap/ptySessionId |
| `pluginStore` | plugins/enabled/activeMode |
| `highlightStore` | highlightedHashes + highlightMode + provingHash |

### 已有能力（零成本联动）

1. **Lean 状态环**：`node.state` → 绿/黄/红色环，`lean_sync_state` 更新后 2 秒自动刷新
2. **Frontend → Terminal**：`invoke('pty_write', { sessionId, data })` 从任意组件发命令
3. **MDX lean badge**：EntryBlockRenderer ∀ badge + cross-source lean 面板 + proof 嵌套
4. **Propagation 高亮**：Show Impact → 橙色外圈 + 非高亮节点 15% 透明度

---

## 已完成

### Phase 1：Lean 基础设施 ✅

lean-lsp-mcp 自动注入 | Lean MCP tools（`lean_project_info` + `lean_sorry_scan` + `lean_sync_state`）| 18 tools，39 个 Python 测试

### Phase 2：Slash Commands ✅

`/prove` `/smart-prove` `/batch-prove` `/sorry` `/sync-lean` `/store` `/frontier` `/propagate` `/avalidate` `/metrics` | `search` MCP tool

### Phase 3：lean_sync_state ✅

解析 .lean 声明 → 匹配 store atoms → 更新 state（proven/sorry/checked）

### Phase 4：Lean Prover Agent ✅

`~/.claude/agents/lean-prover.md` | `/prove` 委派 lean-prover sub-agent

### Phase 6A：交互按钮 ✅

Prove 按钮（sorry，黄色）+ Sync Lean（蓝色）+ Show Impact（橙色 toggle）| `pty_write` 发命令 | 8 个契约测试

### Phase 6B：Propagation 高亮 ✅

`highlightStore` | 橙色外圈 + 非高亮 15% opacity | 12 个测试，160 总测试

### EntryBlockRenderer Proof 嵌套 ✅

tex lean 面板自动嵌套 lean proof | 6 个契约测试

---

## 待实施 Phase

### 依赖关系

```
6C ──────────────────────── 无依赖
6D ──────────────────────── 无依赖（可与 6C 并行）
6E（工作指示器）──────────── 依赖 6D（hashExtractor）
6F（activeNodeHash）──────── 依赖 6D（hashExtractor）
6G（批量操作路径）─────────── 依赖 6E + 6F
6H（ReadView 导航）──────── 无依赖
6I（.lean Watcher）──────── 无依赖
```

### 推荐执行顺序

```
Day 1:  6C（半天）+ 6D hashExtractor + viewStore + toggle（半天）
Day 2:  6D ChatPanel 集成（半天）+ 6E 工作指示器（半天）
Day 3:  6F activeNodeHash（半天）+ 6H ReadView 导航（半天）
Day 4:  6G 批量操作路径（1 天）
可选:   6I .lean Watcher（半天）
```

---

### Phase 6C：节点工作态 — provingHash（半天）

**目标**：用户点 Prove 按钮后，目标节点显示橙色虚线边框。

**依赖**：无（`highlightStore.provingHash` 已存在但未使用）

**改动**：

| 文件 | 改动 |
|------|------|
| `src/components/detail/EntryDetail.tsx` | Prove 按钮 onClick 加 `setProving(id)` |
| `src/panels/workspace/NetworkView.tsx` | render 循环读 `provingHash`，画虚线 |

**NetworkView 渲染**（state ring 之后，dashed outline 之前）：

```typescript
const { provingHash } = highlightStoreRef.current
if (node.id === provingHash) {
    ctx.beginPath()
    ctx.arc(node.x, node.y, r + 2.5 / transform.k, 0, 2 * Math.PI)
    ctx.strokeStyle = '#f97316'
    ctx.lineWidth = 1.5 / transform.k
    ctx.setLineDash([4 / transform.k, 3 / transform.k])
    ctx.stroke()
    ctx.setLineDash([])
}
```

**清除**：Prove 按钮点击时 `setTimeout(() => setProving(null), 30000)`。dataStore refresh 后如果 entry state 变了也清除。

**测试**：2 个契约测试（EntryDetail 调 setProving + NetworkView 读 provingHash）

---

### Phase 6D：hashExtractor + AI Follow Mode（1 天）

**目标**：从 PTY 输出提取 hash，Network View 实时跟随 agent。

**依赖**：无

**改动**：

| 文件 | 类型 | 改动 |
|------|------|------|
| `src/lib/hashExtractor.ts` | 新增 | 纯函数：strip ANSI → regex 12-hex → objectMap 验证 |
| `src/stores/viewStore.ts` | 修改 | 加 `aiFollowMode: boolean` + `toggleAiFollow()` |
| `src/components/ai-chat/ChatPanel.tsx` | 修改 | pty-output listener 加 hashExtractor → selectObjStore.select |
| `src/panels/workspace/NetworkSettings.tsx` | 修改 | Labels 之后加 AI Follow toggle |

**hashExtractor**（纯函数，不导入 React/store）：

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

**ChatPanel 集成**（pty-output listener，`term.write(bytes)` 之后）：

```typescript
const text = new TextDecoder().decode(new Uint8Array(event.payload.data))
tailBufferRef.current += text
if (tailBufferRef.current.length > 200)
    tailBufferRef.current = tailBufferRef.current.slice(-24)
const { aiFollowMode } = useViewStore.getState()
if (aiFollowMode) {
    const hash = extractLastValidHash(
        tailBufferRef.current,
        (h) => useDataStore.getState().objectMap.has(h),
    )
    if (hash) debouncedSelect(hash)  // 300ms debounce
}
```

**边界情况**：多 hash 取最后一个 | git hash 被 objectMap 过滤 | 300ms debounce | tail buffer 24 字节处理 chunk 截断 | 用户点击后 300ms cooldown | ANSI strip

**开关**：默认关闭，NetworkSettings toggle，`Cmd+Shift+F` 快捷键

**测试**：7 个 hashExtractor 纯函数测试 + 7 个契约测试

---

### Phase 6E：AI 工作指示器 — statusText（半天）

**目标**：图底部一行文字显示 AI 当前操作。

**依赖**：Phase 6D（需要 hashExtractor 已集成到 ChatPanel）

**改动**：

| 文件 | 改动 |
|------|------|
| `src/stores/highlightStore.ts` | 加 `statusText: string \| null` + `setStatusText()` |
| `src/components/ai-chat/ChatPanel.tsx` | hashExtractor 检测到 hash → `setStatusText(...)` |
| `src/panels/workspace/NetworkView.tsx` | render 循环末尾渲染 statusText |

**NetworkView 渲染**（labels 之后，`ctx.restore()` 之前）：

```typescript
const { statusText } = highlightStoreRef.current
if (statusText) {
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.font = '12px sans-serif'
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)'
    ctx.textAlign = 'center'
    ctx.fillText(statusText, canvas.width / (2 * devicePixelRatio), canvas.height / devicePixelRatio - 16)
    ctx.restore()
}
```

**写入逻辑**（ChatPanel，hashExtractor 之后）：
- 检测到 hash → `setStatusText("Working on entry <hash>...")`
- 5 秒无新 hash → `setStatusText(null)`

**测试**：2 个契约测试（highlightStore 有 statusText + NetworkView 读 statusText）

---

### Phase 6F：activeNodeHash — AI 访问节点标记（半天）

**目标**：AI Follow 模式下，当前被 AI 访问的节点也显示工作态虚线（不仅仅是用户点 Prove 的节点）。

**依赖**：Phase 6D（hashExtractor）+ Phase 6C（虚线渲染已实现）

**改动**：

| 文件 | 改动 |
|------|------|
| `src/stores/highlightStore.ts` | 加 `activeNodeHash: string \| null` + `setActiveNode()` |
| `src/components/ai-chat/ChatPanel.tsx` | hashExtractor 检测到 hash → `setActiveNode(hash)` |
| `src/panels/workspace/NetworkView.tsx` | 虚线逻辑从 `provingHash` 改为 `provingHash \|\| activeNodeHash` |

**NetworkView 改动**（替换 Phase 6C 的虚线代码）：

```typescript
const { provingHash, activeNodeHash } = highlightStoreRef.current
const workingHash = provingHash || activeNodeHash
if (node.id === workingHash) {
    // 同 6C 的虚线渲染代码
}
```

**优先级**：`provingHash`（用户主动）> `activeNodeHash`（AI 自动检测）

**清除**：5 秒无新 hash → `setActiveNode(null)`

**测试**：2 个契约测试

---

### Phase 6G：批量操作路径（1 天）

**目标**：`/batch-prove` 执行时，拓扑序节点呈三色状态（待处理/处理中/已处理）。

**依赖**：Phase 6E + 6F（需要 hashExtractor 和 statusText 已集成）

**改动**：

| 文件 | 改动 |
|------|------|
| `src/stores/highlightStore.ts` | 加 `batchProgress` 字段 + `setBatchProgress()` |
| `src/components/ai-chat/ChatPanel.tsx` | 解析 PTY 输出中的 batch 事件 |
| `src/panels/workspace/NetworkView.tsx` | batch 模式下三色渲染 |

**batchProgress 接口**：

```typescript
batchProgress: {
    total: number
    completed: string[]       // 已完成的 hash 列表
    currentHash: string | null
} | null
```

**渲染**（NetworkView，highlightedHashes check 之后）：

```typescript
const { batchProgress } = highlightStoreRef.current
if (batchProgress && highlightedHashes.has(node.id)) {
    const isCompleted = batchProgress.completed.includes(node.id)
    const isCurrent = node.id === batchProgress.currentHash
    if (isCurrent) {
        ctx.strokeStyle = '#f97316'  // 橙色：处理中
        ctx.setLineDash([4 / transform.k, 3 / transform.k])
    } else if (!isCompleted) {
        ctx.strokeStyle = 'rgba(255,255,255,0.3)'  // 灰色：待处理
        ctx.setLineDash([3 / transform.k, 3 / transform.k])
    }
    // 已处理：无额外标记（state ring 已更新）
}
```

**PTY 解析**：检测到 hash + `batchProgress !== null` → 更新 currentHash / completed

**测试**：3 个契约测试

---

### Phase 6H：ReadView 双向导航（半天）

**目标**：Network ↔ Read 双向联动。

**依赖**：无

**改动**：`src/panels/workspace/ReadView.tsx`

- selectObjStore 变化 → 找 `[data-entry="<hash>"]` → `scrollIntoView({ behavior: 'smooth', block: 'center' })`
- ReadView → Network 已通过 EntryBlock `selectObjStore.select()` + NetworkView fly-to 工作

**测试**：2 个契约测试

---

### Phase 6I：.lean 文件 Watcher（半天）

**目标**：.lean 文件变化后自动 sync。

**依赖**：无

**改动**：

| 文件 | 改动 |
|------|------|
| `backend/astrolabe_app/analysis/router.py` | 加 `/api/lean/mtime` endpoint |
| `src/hooks/useFileWatcher.ts` | 扩展轮询 .lean mtime → `pty_write("/sync-lean\n")` |

**测试**：2 个测试

---

## highlightStore 完整接口

单一数据源，所有高亮/工作态/batch 状态集中管理：

```typescript
// src/stores/highlightStore.ts
interface HighlightState {
    // ── Phase 6B（已实现）──
    highlightedHashes: Set<string>
    highlightMode: 'none' | 'propagation' | 'proving'
    provingHash: string | null
    setHighlight: (hashes: string[], mode: 'propagation' | 'proving') => void
    clearHighlight: () => void
    setProving: (hash: string | null) => void

    // ── Phase 6E ──
    statusText: string | null
    setStatusText: (text: string | null) => void

    // ── Phase 6F ──
    activeNodeHash: string | null
    setActiveNode: (hash: string | null) => void

    // ── Phase 6G ──
    batchProgress: {
        total: number
        completed: string[]
        currentHash: string | null
    } | null
    setBatchProgress: (p: HighlightState['batchProgress']) => void
}
```

**扩展原则**：每个 phase 只加该 phase 需要的字段。不提前加。

---

## 数据流

```
CLI (Claude Code / lean-prover agent)
  │ PTY 文字输出含 12-char hex hashes
  ▼
Tauri PTY backend → emit 'pty-output' { session_id, data: number[] }
  ▼
ChatPanel.tsx (line 112, pty-output listener)
  ├── term.write(bytes)                          ← 现有
  └── [6D] hashExtractor(text, objectMap.has)    ← Phase 6D 新增
        │
        ├── [6D] aiFollowMode ? selectObjStore.select(hash)  → fly-to
        ├── [6E] setStatusText("Working on <hash>...")
        ├── [6F] setActiveNode(hash)
        └── [6G] batchProgress ? setBatchProgress(...)
              │
              ▼
NetworkView.tsx render function (d3 tick 驱动)
  ├── highlightStoreRef.current 读取：
  │   ├── [6B] highlightedHashes → 橙色外圈 + 非高亮 0.15 opacity
  │   ├── [6C] provingHash → 橙色虚线
  │   ├── [6F] activeNodeHash → 橙色虚线（provingHash 优先）
  │   ├── [6G] batchProgress → 三色渲染
  │   └── [6E] statusText → 底部文字
  └── 现有：node.state → 状态环颜色
```

---

## 技术约束

- **零 rAF 动画循环**：所有视觉变化由 store 状态驱动 → `simulation.alpha(0.01).restart()` → 一次 tick → 重绘
- **d3 simulation 不受 AI 协同影响**：只改视觉属性（stroke/fill/opacity），不碰节点坐标
- **Canvas 无 CSS transition**：颜色切换在下一帧生效，即时变化
- **用户操作永远优先**：拖拽/点击时 AI Follow 暂停（300ms cooldown）
- **每个 phase 只加该 phase 的 store 字段**：不提前扩展 interface

---

## 涉及文件清单

| 文件 | Phase | 类型 | 改动 |
|------|-------|------|------|
| `src/components/detail/EntryDetail.tsx` | 6C | 修改 | Prove onClick 加 `setProving(id)` |
| `src/panels/workspace/NetworkView.tsx` | 6C+6E+6F+6G | 修改 | 虚线 + statusText + batch 三色 |
| `src/lib/hashExtractor.ts` | 6D | 新增 | 纯函数：ANSI strip → 12-hex regex → validate |
| `src/stores/viewStore.ts` | 6D | 修改 | `aiFollowMode` + `toggleAiFollow` |
| `src/components/ai-chat/ChatPanel.tsx` | 6D+6E+6F+6G | 修改 | hashExtractor → select + statusText + activeNode + batch |
| `src/panels/workspace/NetworkSettings.tsx` | 6D | 修改 | AI Follow toggle |
| `src/stores/highlightStore.ts` | 6E+6F+6G | 修改 | 逐 phase 加 statusText / activeNodeHash / batchProgress |
| `src/panels/workspace/ReadView.tsx` | 6H | 修改 | scrollIntoView |
| `src/hooks/useFileWatcher.ts` | 6I | 修改 | .lean mtime 轮询 |
| `backend/astrolabe_app/analysis/router.py` | 6I | 修改 | `/api/lean/mtime` endpoint |

---

## 已发现的实现细节

- **provingHash 已定义但未使用**：highlightStore 中存在，NetworkView render 循环未读取，EntryDetail Prove 按钮未调 setProving（Phase 6C 修复）
- **Show Impact 工作正常**：propagate API 参数名是 `changed`（不是 `hash`），已正确使用
- **Canvas 不支持 CSS transition**：状态变色通过 store 刷新 + 下一帧重绘，人眼感知为即时
- **ChatPanel 是所有 PTY 解析的唯一入口**：Phase 6D/6E/6F/6G 的新逻辑全部加在 pty-output listener 中，按顺序执行
