# 架构重构计划

## 现状问题

1. **屎山架构**: `page.tsx` 600+ 行单体组件，40+ useState，所有 Panel 通过 props 传递
2. **Lean 遗留**: 286 处 Lean/LSP 相关代码散布在 67 个文件里，GMTNet 完全不需要
3. **性能灾难**: 点击一个节点要等几秒，因为触发整棵组件树重渲染
4. **状态混乱**: 3 个 zustand store + page.tsx 的 40+ useState，职责不清

## 本质

**NetMath 就是三样东西：**
1. **JSON 文件浏览器** — 读取 knowledge.json（obj/mor），展示节点详情
2. **MDX 阅读器** — 渲染数学笔记，nodeblock/noderef 链接到节点
3. **3D 图谱** — 可视化节点和边的网络关系

**不是别的。** 不是 IDE，不是 Lean 分析器，不是代码编辑器。任何不服务于这三个功能的代码都应该删除。

## GMTNet 的实际数据

就两样：
- **9 个 MDX 文件**（数学笔记）
- **knowledge.json**（175 节点 + 208 边）

就四个面板：
- **Read**: MDX 阅读器
- **Network**: 3D 图谱
- **Detail**: JSON 浏览器（选中节点的 statement/proof/notes）
- **Settings**: 布局参数、网络分析

就这么简单。

## 目标架构

```
┌─────────────────────────────────────────────────────┐
│                  page.tsx (<100行)                    │
│                   纯布局组件                          │
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌────────┐  ┌────────┐ │
│  │ Settings │  │   Read   │  │Network │  │ Detail │ │
│  │  Panel   │  │  Panel   │  │ Panel  │  │ Panel  │ │
│  └────┬─────┘  └────┬─────┘  └───┬────┘  └───┬────┘ │
└───────┼──────────────┼────────────┼────────────┼─────┘
        │              │            │            │
        └──────────────┴─────┬──────┴────────────┘
                             │
                    ┌────────┴────────┐
                    │  stores (zustand) │
                    │                  │
                    │  selection:      │
                    │    nodeId        │
                    │    edgeId        │
                    │                  │
                    │  data:           │
                    │    objects[]     │
                    │    morphisms[]   │
                    │    numbering     │
                    │                  │
                    │  view:           │
                    │    mode          │
                    │    layout        │
                    │    showLabels    │
                    │                  │
                    │  physics:        │
                    │    params        │
                    │                  │
                    │  analysis:       │
                    │    pagerank etc  │
                    └─────────────────┘

                    ┌─────────────────┐
                    │  positionsRef    │
                    │  (不在 store)    │
                    └─────────────────┘
```

### 各 Panel 订阅关系

```
SettingsPanel  → physics, analysis, view
ReadPanel      → data.objects, data.numbering, selection.nodeId
NetworkPanel   → data.objects, data.morphisms, selection.nodeId, physics, positionsRef
DetailPanel    → selection.nodeId, data.objects
```

**点击节点**: `selection.nodeId` 变化 → 只有 Detail + Network(高亮) 重渲染。Read 和 Settings 不动。

## 需要删除的 Lean 遗留

| 类别 | 文件/代码 | 说明 |
|------|----------|------|
| Lean LSP | `hooks/useLspIndex.ts` | 完全删除 |
| Lean types | `analysis/lean_types.py` 等 | 后端分析里的 lean 路由 |
| Namespace 系统 | `lenses/aggregators/byNamespace.ts` | GMTNet 不用 namespace |
| Custom nodes | `addCustomNode`, `removeCustomNode` | knowledge 节点通过后端 API 管理 |
| File watcher | `hooks/useFileWatch.ts` | 监听 .ilean 文件变化，不需要 |
| Proof status | `lib/proofStatus.ts` | Lean 证明状态，不需要 |
| isTauri 检查 | 各处 `if (!isTauri)` | 简化：始终是 Tauri |
| 2D 图 | `graph/ForceGraph2D.tsx`, `graph/SigmaGraph.tsx` | 只用 3D |

## 目标文件结构

```
src/
├── app/local/edit/
│   └── page.tsx                    ← <100 行，纯布局
│
├── stores/                         ← 多个小 store
│   ├── selectionStore.ts           ← selectedNodeId, selectedEdgeId, focusNodeId
│   ├── dataStore.ts                ← objects, morphisms, nodeNumbering
│   ├── viewStore.ts                ← viewMode, layoutPreset, showLabels
│   ├── physicsStore.ts             ← 物理引擎参数
│   └── analysisStore.ts            ← 分析数据
│
├── panels/                         ← 四个独立面板
│   ├── ReadPanel.tsx               ← MDX 渲染，订阅 dataStore + selectionStore
│   ├── NetworkPanel.tsx            ← 3D 图谱，订阅 dataStore + selectionStore + physicsStore
│   ├── DetailPanel.tsx             ← 节点详情，订阅 selectionStore + dataStore
│   ├── SettingsPanel.tsx           ← 设置，订阅 physicsStore + analysisStore + viewStore
│   └── PanelLayout.tsx             ← 面板布局管理
│
├── components/                     ← 内部子组件
│   ├── read/                       ← Read 内部
│   │   ├── DocSidebar.tsx
│   │   ├── PageToc.tsx
│   │   ├── RenderedContent.tsx
│   │   └── nodeNumbering.ts
│   ├── network/                    ← Network 内部
│   │   ├── graph3d/                ← 3D 引擎（保留）
│   │   └── CanvasToolbar.tsx
│   ├── detail/                     ← Detail 内部
│   │   ├── NodeCard.tsx
│   │   ├── CardStack.tsx
│   │   └── ConnectionsPanel.tsx
│   └── shared/                     ← 共享
│       ├── MarkdownRenderer.tsx
│       ├── NodeBlock.tsx
│       ├── NodeRef.tsx
│       └── ProofCollapsible.tsx
│
├── hooks/                          ← 精简
│   ├── useGraphData.ts             ← store → 3D 节点转换
│   ├── useAnalysis.ts              ← 触发分析
│   └── useProject.ts               ← 项目加载
│
├── lib/                            ← 纯工具（无状态）
│   ├── api.ts
│   ├── graphProcessing.ts
│   ├── colors.ts
│   └── history/                    ← undo/redo（保留）
│
└── types/
    ├── graph.ts
    └── node.ts
```

## 执行步骤（渐进替换 + TDD）

每个 Phase 完成后立即在旧 page.tsx 中替换对应部分，验证功能正常。

### Phase 0: 创建 stores
1. 写测试 → `stores/selectionStore.ts`（selectNode, focusNode）
2. 写测试 → `stores/dataStore.ts`（loadObjects, loadMorphisms, setNodeNumbering）
3. 写测试 → `stores/viewStore.ts`（setViewMode, toggleLabels）
4. 不动现有代码

### Phase 1: DetailPanel（最简单，验证方案可行）
1. 写测试 → `panels/DetailPanel.tsx`
2. 订阅 selectionStore + dataStore，零 props
3. 在旧 page.tsx 中替换 `detailContent` → `<DetailPanel />`
4. 删除 page.tsx 中 35+ 个 detail props
5. **验证**: 点击节点秒响应

### Phase 2: ReadPanel
1. 写测试 → `panels/ReadPanel.tsx`
2. 从 NetworkRead.tsx 提取，去掉 Lean 相关代码
3. 替换旧组件
4. **验证**: 切换文件不触发 Network 重渲染

### Phase 3: SettingsPanel
1. 改为订阅 stores，删除 props
2. 替换旧组件
3. **验证**: 改 physics 不触发 Detail/Read 重渲染

### Phase 4: NetworkPanel
1. 写测试 → `panels/NetworkPanel.tsx`
2. 只改外层（props → store），ForceGraph3D 内部不动
3. 替换旧组件
4. **验证**: 3D 交互正常

### Phase 5: 清理
1. page.tsx 此时应已 <100 行
2. 删除 Lean 遗留代码（286 处）
3. 删除旧 store（canvasStore, store.ts, selectionStore.ts）
4. 删除不用的组件（2D 图、namespace、custom nodes）
5. 全量测试

## 开发规则

- **TDD**: 先写测试，确认失败，再写代码
- **渐进替换**: 每个 Phase 立即替换到旧代码中，不等到最后
- **分支开发**: 在 `refactor/panel-architecture` 分支，随时可回滚到 main
- **性能目标**: 点击节点 <100ms，切换文件(已访问) <50ms
- **不动 3D 引擎**: graph3d/ 内部保留不变
- **不动 undo/redo**: history/ 保留不变
- **从 CLAUDE.md 继承**: Tauri 桌面应用、REST API 8765、obj/mor schema、视觉配置只在前端
