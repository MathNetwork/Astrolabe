# 前端联动调查报告

> 日期：2026-04-02

---

## 组件清单

| 组件 | 文件路径 | 用途 | 联动相关性 |
|------|---------|------|-----------|
| NetworkView | `src/panels/workspace/NetworkView.tsx` | D3-force Canvas 2D 图，节点/边渲染、交互 | 🔴 核心 |
| ReadView | `src/panels/workspace/ReadView.tsx` | MDX 文档渲染 | 🟡 中等 |
| DetailView | `src/panels/workspace/DetailView.tsx` | 选中 entry 详情面板 | 🟡 中等 |
| EntryDetail | `src/components/detail/EntryDetail.tsx` | Entry 数据展示（hash、ref、record） | 🟡 中等 |
| ChatPanel | `src/components/ai-chat/ChatPanel.tsx` | PTY 终端（xterm.js + Tauri IPC） | 🔴 核心 |
| WorkspacePanel | `src/panels/workspace/WorkspacePanel.tsx` | 布局管理（single/split/three） | 🟢 低 |
| LeanBadge | `src/plugins/leannets/LeanBadge.tsx` | ∀ 符号 badge（proven/sorry 颜色） | 🔴 核心 |
| EntryBlockRenderer | `src/plugins/leannets/EntryBlockRenderer.tsx` | MDX entry 块渲染，含 lean 状态 badge | 🟡 中等 |
| DetailEdges | `src/plugins/leannets/DetailEdges.tsx` | 详情面板的边关系展示，含 cross-source | 🟡 中等 |
| MarkdownRenderer | `src/components/MarkdownRenderer.tsx` | MDX → React（KaTeX + entry 宏） | 🟢 低 |
| EntryBlock | `src/components/mdx/EntryBlock.tsx` | MDX 中的 entry 块组件 | 🟢 低 |
| EntryLink | `src/components/mdx/EntryLink.tsx` | MDX 中的 entry 引用链接 | 🟢 低 |
| NetworkSettings | `src/panels/workspace/NetworkSettings.tsx` | 物理参数滑块 | 🟢 低 |
| ExplorerPanel | `src/panels/explorer/ExplorerPanel.tsx` | 左侧栏：插件列表 + 文件树 | 🟢 低 |

---

## 状态管理

| Store | 文件 | 管理内容 | 联动作用 |
|-------|------|---------|---------|
| dataStore | `src/stores/dataStore.ts` | objects/morphisms/files + refreshTrigger | 数据源，mtime 变化时全量刷新 |
| selectObjStore | `src/stores/selectObjStore.ts` | selectedHash（当前选中 atom） | 节点选中 → DetailView + camera fly-to |
| selectMorStore | `src/stores/selectMorStore.ts` | selectedHash（当前选中 edge） | 边选中 |
| physicsStore | `src/stores/physicsStore.ts` | gravity/repulsion/linkDistance/friction | D3 力参数 |
| viewStore | `src/stores/viewStore.ts` | layoutMode/activeTab/showLabels/fontSize/numberMap/ptySessionId | UI 状态 + PTY session |
| pluginStore | `src/plugins/registry.ts` | plugins/enabled/activeMode | 插件渲染器切换 |

---

## 数据流图

```
astrolabe.json 文件变化
       │
       ▼
useFileWatcher（2 秒轮询 /api/astrolabe/mtime）
       │ mtime 变了
       ▼
dataStore.triggerRefresh()  →  refreshTrigger++
       │
       ▼
useProjectLoader（依赖 refreshTrigger）
       │ 重新 fetch
       ▼
GET /api/astrolabe/ref-graph  +  GET /api/project/files
       │
       ▼
dataStore.setObjects(nodes) + setMorphisms(links)
       │
       ├──► NetworkView（loadKey 变化 → 重建 d3 simulation）
       ├──► ReadView（重新加载 entries 用于编号）
       ├──► DetailView（selectedHash 对应的 entry 数据更新）
       └──► EntryBlock/EntryLink（下次 fetch 时获取新数据）
```

**关键发现**：
- **轮询模式**，非 WebSocket/SSE，2 秒延迟
- **全量刷新**，非增量更新——mtime 变化后整个 ref-graph 重新 fetch
- **样式更新**有单独路径：`'mn-settings-changed'` 事件只刷新颜色/大小，不重建 simulation

---

## Network View 详细分析

### 节点渲染

- **Canvas 2D**（非 SVG、非 WebGL）
- 节点画为 `ctx.arc()` 圆，直接在 canvas 上绘制
- **颜色**：plugin skeleton 模式有自定义颜色，否则按 `sort` 哈希生成 HSL 色
- **大小**：plugin 模式由后端计算 radius，默认按 degree（`Math.max(3, 8 - degree * 1.5)`）
- **状态环**（NetworkView:180-188）：`node.state` 字段控制
  - `proven` → 绿色 `#22c55e`
  - `sorry` → 黄色 `#eab308`
  - `error` → 红色 `#ef4444`
  - 无 state → 无环

### Lean Badge（∀）

- **LeanBadge.tsx**：23 行，显示 ∀ 符号 + 背景色
- **EntryBlockRenderer.tsx:94-102**：MDX 中的 entry 块已显示 lean badge
- **NetworkView:180-188**：Canvas 上画状态环（不是 ∀ 符号，是颜色环）
- 状态数据来自 `node.state`，从 ref-graph API 返回的 record.state 解析

### 交互

- 点击节点 → `selectObjStore.select(hash)` → DetailView 更新 + camera fly-to（500ms 动画）
- Hover → tooltip（节点名/ID）+ glow 效果
- Drag → pin 节点 + alpha restart
- Zoom → d3.zoom 0.1x-10x

### 动画能力

- **Camera fly-to**：已有（d3.transition 500ms + easeCubicOut）
- **Physics tick**：连续 canvas 重绘（simulation.on('tick')）
- **无**节点颜色渐变动画
- **无**脉冲/闪烁效果

---

## Terminal Panel 联动能力

### 当前实现

- **PTY 模式**（非 `-p`），通过 Tauri IPC 通信
- `pty_spawn(projectPath, rows, cols)` → sessionId
- `pty_write(sessionId, data)` → 发送输入
- `pty-output` 事件 → xterm 显示输出
- sessionId 持久化在 `viewStore.ptySessionId`

### Frontend → Terminal 通道

**已存在！** `invoke('pty_write', { sessionId, data })` 可以从前端向终端发送任意文本。

已有的使用场景：
- 用户输入（xterm.onData）
- 拖拽文件上传后自动输入路径

**可直接用于**：点击 "Prove" 按钮 → `pty_write(sessionId, "/prove <hash>\n")`

### Terminal → Frontend 通道

**部分存在**。`pty-output` 事件传递原始字节到 xterm 显示，但当前**没有解析 output 内容**的逻辑。要实现"检测到 proven → 高亮节点"需要加一层输出解析。

---

## 联动可行性矩阵

| 联动功能 | 需要改的组件 | 数据来源 | 技术难度 | 展示价值 |
|---------|------------|---------|---------|---------|
| 1. Lean badge 颜色实时更新 | 无（已有！） | node.state → 状态环 | ✅ 已实现 | 高 |
| 2. store_summary diff 显示 | 新增组件或改 `/store` 输出 | lean_sync_state 返回值 | 小 | 中 |
| 3. "Prove" 按钮 → terminal | EntryDetail + ChatPanel | pty_write + selectObjStore | 小 | 高 |
| 4. 节点点击 → 显示 proof state | EntryDetail（已有 DetailEdges） | entry record.state | 小 | 中 |
| 5. prove 过程高亮节点（脉冲） | NetworkView（canvas 动画） | 新增 provingStore 或事件 | 中 | 高 |
| 6. MDX entryblock 状态 badge | 无（已有！） | EntryBlockRenderer lean badge | ✅ 已实现 | 中 |
| 7. 前端操作触发 terminal 命令 | EntryDetail 按钮 + pty_write | Tauri IPC | 小 | 高 |
| 8. Terminal 输出触发前端更新 | ChatPanel 输出解析 | pty-output 事件解析 | 中 | 中 |
| 9. ReadView 滚动到指定 entry | ReadView + scrollIntoView | selectObjStore | 小 | 中 |
| 10. .lean 文件 watcher | useFileWatcher 扩展 | 新增 mtime 轮询端点 | 中 | 中 |
| 11. 网络图节点颜色渐变动画 | NetworkView canvas 渲染 | provingStore 状态变化 | 中 | 高 |
| 12. Propagation 影响链高亮 | NetworkView | propagate API | 中 | 高 |

---

## 推荐优先级排序

### 已有能力（零成本）

- **Lean badge 颜色**已通过 node.state 状态环实现（proven=绿, sorry=黄, error=红）
- **MDX entryblock 状态 badge**已在 EntryBlockRenderer 中实现
- **astrolabe.json 变化自动刷新**已通过 2 秒轮询实现

改完 store（如 `lean_sync_state` 更新 state 字段）→ store 写入 astrolabe.json → 2 秒内前端自动刷新 → 节点状态环颜色变化。**无需前端改动。**

### Tier 1：高价值 + 低难度（1 天）

| # | 功能 | 改动 | 说明 |
|---|------|------|------|
| 1 | "Prove" 按钮 | EntryDetail 加按钮 → `pty_write("/prove <hash>\n")` | 用户点击节点 → 详情面板 → 点 Prove → terminal 自动输入 |
| 2 | "Sorry" 按钮 | 同上 → `pty_write("/sorry\n")` | 快捷查看所有 sorry |
| 3 | "Sync" 按钮 | 同上 → `pty_write("/sync-lean\n")` | 手动同步 Lean 状态 |

### Tier 2：高价值 + 中难度（2 天）

| # | 功能 | 改动 | 说明 |
|---|------|------|------|
| 4 | Prove 过程脉冲动画 | NetworkView 渲染循环加脉冲逻辑 + provingStore | 正在 prove 的节点呈脉冲效果 |
| 5 | Propagation 影响链高亮 | NetworkView 渲染 + propagate API | 选中节点时高亮所有受影响的下游节点 |
| 6 | ReadView 滚动到 entry | ReadView + selectObjStore 监听 | 点击网络节点 → MDX 自动滚动到对应 entryblock |

### Tier 3：中价值 + 中难度（2 天）

| # | 功能 | 改动 | 说明 |
|---|------|------|------|
| 7 | Terminal 输出解析 | ChatPanel pty-output 钩子 | 检测 "proven"/"sorry" → 触发前端事件 |
| 8 | .lean 文件 watcher | 后端加 /api/lean/mtime + 前端轮询 | .lean 变化 → 自动触发 lean_sync_state |
| 9 | 节点颜色渐变动画 | NetworkView canvas 渲染 | state 变化时平滑过渡颜色 |

### Tier 4：低价值 / 高难度（推迟）

| # | 功能 | 说明 |
|---|------|------|
| 10 | Proving 进度仪表盘 | 需要新组件 + batch-prove 状态管理 |
| 11 | 实时 WebSocket 推送 | 替换轮询，改造后端 |
| 12 | 节点右键上下文菜单 | Canvas 上实现自定义菜单 |

---

## 关键发现总结

1. **Lean 状态环已实现**——`lean_sync_state` 更新 store → astrolabe.json 变化 → 2 秒内前端自动刷新状态环颜色。**Phase 6 的核心可视化已免费获得。**

2. **Frontend → Terminal 通道已存在**——`pty_write` 可从任意前端组件向终端发送命令。加 "Prove" 按钮只需一行 `invoke('pty_write', { sessionId: viewStore.ptySessionId, data: "/prove hash\n" })`。

3. **主要缺口**是 prove 过程的实时反馈（脉冲动画 + terminal 输出解析），以及 ReadView 的双向导航（网络 → MDX 滚动）。
