# Panel 架构重构计划

## 问题

当前 `page.tsx` 是 600+ 行的单体组件，40+ 个 useState，所有 Panel 的状态通过 props 层层传递。任何交互（点击节点、切换文件、改设置）都触发整棵组件树重渲染，导致严重卡顿。

## 目标

- 每个 Panel 独立订阅 zustand store，互不干扰
- 点击节点只触发 Detail + Network 高亮，不影响 Read 和 Settings
- `page.tsx` 缩减到 <100 行（只做布局）
- 所有交互响应 <100ms

## 目标架构

```
┌─────────────────────────────────────────────────────┐
│                    page.tsx (<100行)                  │
│            只做布局，不持有业务状态                      │
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌────────┐  ┌────────┐ │
│  │ Settings │  │   Read   │  │Network │  │ Detail │ │
│  │  Panel   │  │  Panel   │  │ Panel  │  │ Panel  │ │
│  └────┬─────┘  └────┬─────┘  └───┬────┘  └───┬────┘ │
│       │              │            │            │     │
└───────┼──────────────┼────────────┼────────────┼─────┘
        │              │            │            │
   ┌────┴──────────────┴────────────┴────────────┴────┐
   │              editorStore (zustand)                │
   │                                                  │
   │  ── 选择状态 ──                                    │
   │  selectedNodeId: string | null                    │
   │  selectedEdgeId: string | null                    │
   │                                                  │
   │  ── 数据（从后端加载，只读）──                        │
   │  knowledgeNodes: KnowledgeNode[]                  │
   │  knowledgeEdges: KnowledgeEdge[]                  │
   │  nodeNumbering: Map<string, string>               │
   │                                                  │
   │  ── 视图状态 ──                                    │
   │  viewMode: 'read' | 'network' | 'detail'         │
   │  layoutPreset: string                             │
   │                                                  │
   │  ── 交互模态 ──                                    │
   │  isAddingEdge: boolean                            │
   │  isRemovingNodes: boolean                         │
   │                                                  │
   │  ── 分析数据 ──                                    │
   │  analysisData: AnalysisData                       │
   │                                                  │
   │  ── 物理/布局 ──                                   │
   │  physics: PhysicsSettings                         │
   │                                                  │
   │  ── 视觉映射 ──                                    │
   │  sizeMappingMode, colorMappingMode                │
   │  layoutClusterMode                                │
   │                                                  │
   │  ── Actions ──                                    │
   │  selectNode(id)                                   │
   │  loadProject(path)                                │
   │  refresh()                                        │
   └──────────────────────────────────────────────────┘

   ┌──────────────────────────────────────────────────┐
   │           positionsRef (不在 store 里)             │
   │     物理引擎每帧更新，通过 ref 共享给 3D 渲染        │
   └──────────────────────────────────────────────────┘
```

## 各 Panel 职责与订阅

### SettingsPanel
- **订阅**: physics, analysisData, sizeMappingMode, colorMappingMode, layoutClusterMode
- **不关心**: selectedNodeId, docs, nodeNumbering
- **动作**: 修改 physics/mapping 参数

### ReadPanel (NetworkRead)
- **订阅**: docs (MDX files), nodeNumbering, selectedNodeId (用于 noderef 高亮)
- **不关心**: physics, analysisData, positions
- **动作**: selectNode (通过 nodeblock/noderef 点击)

### NetworkPanel (ForceGraph3D)
- **订阅**: nodes, edges, selectedNodeId (高亮), positions (ref), physics
- **不关心**: docs, nodeNumbering
- **动作**: selectNode (3D 点击), updatePosition (拖拽)

### DetailPanel (NodeInspector)
- **订阅**: selectedNodeId, knowledgeNodes (获取节点详情)
- **不关心**: docs, physics, positions, analysisData
- **动作**: 无 (只读显示)

## 需要保留的复杂交互

### 1. Undo/Redo
当前通过 `selectNodeUndoable`、`updateFilterOptionsUndoable` 等实现。新 store 需要集成 undo middleware 或保留现有 history 系统。

### 2. 交互模态
"添加边模式" 和 "删除模式" 改变点击行为：
- 正常模式: 点击 → selectNode
- 添加边模式: 点击 → 创建边
- 删除模式: 点击 → 删除节点

这些模态状态放在 store 里，NetworkPanel 根据模态决定点击行为。

### 3. 跨 Panel 通信路径
所有通过 store：
- Read 点击 noderef → `store.selectNode(id)` → Detail 显示 + Network 高亮
- Network 点击节点 → `store.selectNode(id)` → Detail 显示
- Detail 点击邻居 → `store.selectNode(id)` + `store.focusNode(id)` → Network 跳转

### 4. 3D 位置
`positionsRef` 是 `React.MutableRefObject<Map<string, [number, number, number]>>`，物理引擎每帧更新。**不放 store 里**（会导致 60fps 的 store 更新）。通过 ref 在 NetworkPanel 内部共享。

### 5. Lens 系统
`useLensStore` 控制 Canvas/Full Graph/Ego Network 等视图模式，影响可见节点集。保留为独立 store。

## 执行步骤（TDD）

### Phase 1: editorStore
1. 写测试：store 的 selectNode、loadProject、视图切换
2. 实现 `src/lib/editorStore.ts`
3. 不动任何现有代码

### Phase 2: DetailPanel
1. 写测试：给定 selectedNodeId，渲染节点详情
2. 实现 `src/components/panels/DetailPanel.tsx`
3. 从 editorStore 订阅，不接收 props

### Phase 3: ReadPanel
1. 写测试：加载 MDX，渲染 nodeblock/noderef
2. 重构 `NetworkRead.tsx` → `src/components/panels/ReadPanel.tsx`
3. 从 editorStore 订阅 selectedNodeId 和 nodeNumbering

### Phase 4: NetworkPanel
1. 写测试：渲染 3D 图，点击节点触发 selectNode
2. 重构 ForceGraph3D 的外层 → `src/components/panels/NetworkPanel.tsx`
3. 物理引擎和 positionsRef 保持不变

### Phase 5: SettingsPanel
1. 已有组件，改为直接订阅 store 而非接收 props
2. 测试：修改 physics 不触发 DetailPanel 重渲染

### Phase 6: 新 page.tsx
1. 写测试：布局正确，各 Panel 独立渲染
2. page.tsx 只做布局 + PanelGroup
3. 删除旧的 prop drilling

### Phase 7: 清理
1. 删除旧的 page.tsx 中的业务逻辑
2. 合并/清理 canvasStore 和 editorStore
3. 运行全部测试

## 开发规则

### TDD
- 每个 Phase 先写测试，确认失败，再写代码
- 测试通过后才进入下一个 Phase

### 不破坏现有功能
- 新代码在新文件里
- 旧代码保留到最后一步才删除
- 每个 Phase 结束都能运行应用

### 性能要求
- 点击节点 → Detail 显示 <100ms
- 切换 MDX 页面（已访问过）→ <50ms
- Settings 修改 → 不触发 Read/Detail 重渲染

### 从 CLAUDE.md 继承的规则
- Tauri 桌面应用，不是浏览器
- 前后端通过 REST API 通信（端口 8765）
- knowledge.json 用 obj/mor schema
- 视觉配置只在前端 `assets/objectSortConfig.ts`
- 修改数据必须通过后端 API
- 与用户交流使用中文
