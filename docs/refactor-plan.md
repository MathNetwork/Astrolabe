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

### 三区域及订阅关系

```
Controls (左)
└── ControlsPanel        → physicsStore, analysisStore, viewStore

Workspace (中，可切换 read/network/detail)
├── WorkspacePanel       → viewStore.viewMode（决定显示哪个 View）
├── ReadView             → dataStore.objects, dataStore.numbering
├── NetworkView          → dataStore.objects, dataStore.morphisms, selectionStore, positionsRef
└── DetailView           → selectionStore, dataStore.objects（含 edges/neighbors）

Inspector (右)
├── InspectorPanel       → 纯容器
└── CardStack            → selectionStore.selectedNodeId, dataStore.objects
```

**点击节点**: `selectionStore.selectedNodeId` 变化 → CardStack + NetworkView(高亮) 更新。ReadView 和 ControlsPanel 不动。

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
│   └── page.tsx                         ← <100 行，纯布局（Controls | Workspace | Inspector）
│
├── stores/                              ← 多个小 store ✅ 已完成
│   ├── selectionStore.ts                ✅
│   ├── dataStore.ts                     ✅
│   ├── viewStore.ts                     ✅
│   ├── physicsStore.ts                  ← TODO
│   └── analysisStore.ts                 ← TODO
│
├── panels/
│   ├── controls/                        ← 左栏：设置
│   │   └── ControlsPanel.tsx            ✅ 空壳
│   ├── workspace/                       ← 中栏：主工作区（可切换视图）
│   │   ├── WorkspacePanel.tsx           ✅ 空壳，订阅 viewStore
│   │   ├── ReadView.tsx                 ✅ 空壳
│   │   ├── NetworkView.tsx              ✅ 空壳
│   │   └── DetailView.tsx               ✅ 空壳（含 edges/neighbors）
│   └── inspector/                       ← 右栏：节点检查器
│       ├── InspectorPanel.tsx           ✅ 容器
│       └── CardStack.tsx                ✅ 空壳，订阅 selectionStore + dataStore
│
├── components/                          ← 可复用子组件
│   ├── shared/
│   │   ├── MarkdownRenderer.tsx
│   │   ├── NodeBlock.tsx
│   │   ├── NodeRef.tsx
│   │   └── ProofCollapsible.tsx
│   └── graph3d/                         ← 3D 引擎（保留不动）
│
├── hooks/
│   ├── useProjectLoader.ts              ✅ 加载 objects/morphisms → dataStore
│   ├── useGraphData.ts                  ← store → 3D 节点转换
│   └── useAnalysis.ts                   ← 触发分析
│
├── lib/                                 ← 纯工具（无状态）
│   ├── api.ts
│   ├── graphProcessing.ts
│   ├── colors.ts
│   └── history/                         ← undo/redo（保留）
│
└── types/
```

## 执行步骤（TDD）

### Phase 0: stores ✅ 已完成
- selectionStore, dataStore, viewStore（18 个测试通过）

### Phase 1: 框架骨架 ✅ 已完成
- page.tsx 80 行，三栏布局
- controls / workspace / inspector 空壳组件
- useProjectLoader 加载数据到 dataStore
- 17 个结构测试通过

### Phase 2: Inspector 填充
1. 写测试 → CardStack 显示选中节点的卡片（name, statement, proof）
2. 写测试 → 点击节点 → selectionStore → CardStack 更新
3. **验证**: 点击节点秒响应

### Phase 3: Workspace — ReadView
1. 写测试 → 从旧 NetworkRead.tsx 迁移 MDX 渲染
2. 去掉 Lean 相关代码
3. **验证**: 切换文件秒切换（已访问页面缓存渲染结果）

### Phase 4: Workspace — NetworkView
1. 写测试 → 接入 ForceGraph3D（内部不动）
2. 从 store 订阅节点/边数据
3. **验证**: 3D 交互正常

### Phase 5: Workspace — DetailView
1. 写测试 → 节点详情 + edges/neighbors
2. **验证**: 和 CardStack 联动正确

### Phase 6: Controls 填充
1. 从旧 SettingsPanel 迁移，订阅 physicsStore + analysisStore
2. **验证**: 改 physics 不触发其他区域重渲染

### Phase 7: 清理
1. 删除旧代码（page.tsx 旧版、canvasStore、store.ts 等）
2. 删除 Lean 遗留（286 处）
3. 删除不用的组件（2D 图、namespace、custom nodes）
4. 全量测试

## 开发规则

- **TDD**: 先写测试，确认失败，再写代码
- **渐进替换**: 每个 Phase 立即替换到旧代码中，不等到最后
- **分支开发**: 在 `refactor/panel-architecture` 分支，随时可回滚到 main
- **性能目标**: 点击节点 <100ms，切换文件(已访问) <50ms
- **不动 3D 引擎**: graph3d/ 内部保留不变
- **不动 undo/redo**: history/ 保留不变
- **从 CLAUDE.md 继承**: Tauri 桌面应用、REST API 8765、obj/mor schema、视觉配置只在前端
