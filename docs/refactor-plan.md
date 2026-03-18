# 架构重构计划

## 现状问题

1. **屎山架构**: `page.tsx` 600+ 行单体组件，40+ useState，所有 Panel 通过 props 传递
2. **Lean 遗留**: 286 处 Lean/LSP 相关代码散布在 67 个文件里，GMTNet 完全不需要
3. **性能灾难**: 点击一个节点要等几秒，因为触发整棵组件树重渲染
4. **状态混乱**: 3 个 zustand store + page.tsx 的 40+ useState，职责不清

## 本质

**NetMath 就是三样东西：**
1. **JSON 文件浏览器** — 读取 knowledge.json（obj/mor），展示节点详情
2. **MDX 阅读器** — 渲染数学笔记，objblock/objref 链接到节点
3. **3D 图谱** — 可视化节点和边的网络关系

**不是别的。** 不是 IDE，不是 Lean 分析器，不是代码编辑器。任何不服务于这三个功能的代码都应该删除。

## GMTNet 的实际数据

就两样：
- **9 个 MDX 文件**（数学笔记）
- **knowledge.json**（175 个 obj + 208 个 mor）

## 目标架构

```
page.tsx (<100 行，纯布局)
┌──────────────┬──────────────────────────────┬──────────────────┐
│              │                              │                  │
│   Controls   │         Workspace            │    Inspector     │
│   (左栏)     │         (中栏)               │    (右栏)        │
│              │                              │                  │
│  设置/分析    │  Read / Network / Detail     │    CardStack     │
│              │  (可切换视图模式)              │   (obj 卡片)     │
│              │                              │                  │
└──────────────┴──────────────────────────────┴──────────────────┘
        │                    │                        │
        └────────────────────┼────────────────────────┘
                             │
                     stores (zustand)

selectObjStore ──── obj 选中 hash（双向：读+写）
selectMorStore ──── mor 选中 hash（双向：读+写）
dataStore ────────── objects[], morphisms[], numbering（只读）
viewStore ────────── viewMode, layoutPreset, showLabels
physicsStore ─────── gravity, repulsion, linkDistance（布局引擎）
analysisStore ────── pagerank, communities 等（节点大小/颜色映射）
```

### stores 设计

六个独立 store，各自职责单一，互不影响：

#### selectObjStore — obj 选中状态
```
selectedHash: string | null    ← 当前选中的 obj hash

select(hash)                   ← 任何地方都可以调用写入

写入者（调用 select）：
  - NetworkView:  点击 3D 节点 → selectObjStore.select(hash)
  - CardStack:    点击卡片 → selectObjStore.select(hash)
  - ReadView:     点击 objref/objblock → selectObjStore.select(hash)

读取者（订阅 selectedHash）：
  - CardStack:    滚动到选中 obj 的卡片
  - NetworkView:  高亮节点 + 相机飞向
  - DetailView:   显示选中 obj 的详细信息
```

#### selectMorStore — mor 选中状态
```
selectedHash: string | null    ← 当前选中的 mor hash

写入者：
  - NetworkView:  点击 3D 边 → selectMorStore.select(hash)

读取者：
  - NetworkView:  高亮选中的边
  - DetailView:   显示选中 mor 的详细信息
```

**obj 和 mor 选中完全独立，可以同时选中。**
**store 是双向的：任何组件都可以写入，任何组件都可以读取。**

### undo/redo 策略

所有有写入操作的 store 使用 `zundo` 的 `temporal` 中间件，自动记录状态变化：

```ts
// 回撤上一次操作
useSelectObjStore.temporal.getState().undo()
// 重做
useSelectObjStore.temporal.getState().redo()
```

| Store | undo 支持 | 理由 |
|-------|----------|------|
| selectObjStore | ✅ temporal | 可回撤节点选中 |
| selectMorStore | ✅ temporal | 可回撤边选中 |
| viewStore | ✅ temporal | 可回撤视图切换 |
| physicsStore | ✅ temporal | 可回撤参数调整 |
| dataStore | ❌ 豁免 | 只读数据，从后端加载 |
| analysisStore | ❌ 豁免 | 计算结果，重新计算即可 |

**策略测试保障**：`undo-policy.test.ts` 扫描 `src/stores/` 目录，新加 store 如果没有 `temporal` 且不在豁免列表，测试直接失败。

#### dataStore — knowledge.json 数据层（只读）
```
objects: KnowledgeObject[]       ← 所有 obj（从后端加载）
morphisms: KnowledgeMorphism[]   ← 所有 mor（从后端加载）
nodeNumbering: Map<hash, label>  ← 编号映射（如 "abc123" → "Theorem 3.2"）

工具方法：
  - getObjectById(hash) → obj
  - getNodeLabel(hash) → label
```

#### viewStore — 布局状态

布局和内容两层解耦：

```
                    viewStore                    WorkspacePanel 内部
                   （全局 store）                  （本地 state）
                 ┌─────────────┐              ┌──────────────────┐
                 │ layoutMode  │              │ slots            │
                 │             │              │                  │
                 │  'single'   │──→ 一个框     │ [0] = 'read'     │ ← slot1 显示 ReadView
                 │  'split-    │──→ 左大+     │ [1] = 'network'  │ ← slot2 显示 NetworkView
                 │   right'    │   右上下     │ [2] = 'detail'   │ ← slot3 显示 DetailView
                 └─────────────┘              └──────────────────┘
                    ↑ 控制                         ↑ 控制
               slot 怎么排列                    哪个 view 在哪个 slot
              （空间布局）                     （内容绑定）
```

- **layoutMode**：slot 的空间排列方式（single / split-right / 未来更多）
- **slots**：哪个 view（Read/Network/Detail）绑定到哪个 slot（1/2/3）
- 改布局不影响绑定，改绑定不影响布局
- 用户在每个 slot 头部点击小 icon 可以交换 view 位置

```
showLabels: boolean
showBridges: boolean
```

### 三区域及订阅关系

```
Controls (左)
└── ControlsPanel            → physicsStore, analysisStore, viewStore

Workspace (中，可切换 read/network/detail)
├── WorkspacePanel           → viewStore（决定显示哪个 View）
├── ReadView                 → dataStore（读 obj 数据）
│                              写 selectObjStore（点击 objref）
├── NetworkView              → dataStore（读 obj/mor 数据展示图谱）
│                              读+写 selectObjStore（高亮节点 / 点击节点）
│                              读+写 selectMorStore（高亮边 / 点击边）
│                              读 physicsStore（力导向布局参数）
│                              读 analysisStore（节点大小/颜色映射）
└── DetailView               → 读 selectObjStore + selectMorStore + dataStore

Inspector (右)
├── InspectorPanel           → 纯容器
└── CardStack                → 读 selectObjStore（滚动到选中卡片）
                               写 selectObjStore（点击卡片选中 obj）
                               读 dataStore（obj 的 name/statement/sort）
```

**数据流是双向的：**
- 在 NetworkView 点击节点 → `selectObjStore.select(hash)` → CardStack 滚动 + DetailView 更新
- 在 CardStack 点击卡片 → `selectObjStore.select(hash)` → NetworkView 高亮 + 相机飞向
- 在 ReadView 点击 objref → `selectObjStore.select(hash)` → 全部联动
- 改 physics 参数 → 只有 NetworkView 重渲染，其他不动

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
│   └── page.tsx                         ← 80 行，纯布局 ✅
│
├── stores/
│   ├── selectObjStore.ts                ← obj 选中（双向读写，temporal undo）✅
│   ├── selectMorStore.ts                ← mor 选中（双向读写，temporal undo）✅
│   ├── dataStore.ts                     ← knowledge 数据（只读，豁免 undo）✅
│   ├── viewStore.ts                     ← 视图状态（temporal undo）✅
│   ├── physicsStore.ts                  ← 物理参数（temporal undo）✅
│   └── analysisStore.ts                 ← 分析数据（豁免 undo）✅
│
├── panels/
│   ├── controls/                        ← 左栏
│   │   └── ControlsPanel.tsx            ← 物理参数滑块、网络分析触发、视图切换按钮（待 Phase 6）
│   ├── workspace/                       ← 中栏（read/network/detail 可切换）
│   │   ├── WorkspacePanel.tsx           ← 根据 viewStore.viewMode 显示对应 View（待 Phase 3-5）
│   │   ├── ReadView.tsx                 ← MDX 阅读器：文件导航 + 渲染 + TOC + 编号（Phase 5 进行中）
│   │   ├── NetworkView.tsx              ← 3D 力导向图 + 节点/边高亮 + 相机飞行（待 Phase 6）
│   │   └── DetailView.tsx               ← obj 详情 + edges 列表 + edge metadata ✅
│   └── inspector/                       ← 右栏
│       ├── InspectorPanel.tsx           ✅ 纯容器
│       └── CardStack.tsx                ✅ 布局容器（传 id 给 ObjCard）
│
├── hooks/
│   ├── useProjectLoader.ts              ← 项目加载：从后端 API 读 obj/mor → 写入 dataStore ✅
│   └── useUndoShortcuts.ts              ← 全局 Cmd+Z/Cmd+Shift+Z 快捷键 ✅
│
├── components/
│   ├── shared/                          ← 自治组件（接收 id，自己订阅 store）
│   │   ├── ObjCard.tsx                  ✅ obj 展示卡片（compact/full）
│   │   ├── MorCard.tsx                  ✅ mor 展示卡片
│   │   ├── MorList.tsx                  ✅ morphism 列表（incoming/outgoing）
│   │   ├── ObjBlock.tsx                 ✅ MDX 块级 obj 引用
│   │   └── ObjRef.tsx                   ✅ MDX 内联 obj 引用
│   └── graph3d/                         ← 3D 渲染引擎（保留不动）
│       ├── ForceGraph3D.tsx             ← 3D 力导向图主组件
│       ├── BatchedEdges.tsx             ← 高性能批量边渲染（单 draw call）
│       ├── InstancedNodeLayer.tsx       ← 高性能实例化节点渲染
│       └── ...                          ← 其他 3D 子组件
│
├── lib/                                 ← 纯工具函数（无状态）
│   ├── api.ts                           ← 后端 API 调用封装
│   ├── graphProcessing.ts               ← 图数据处理工具
│   ├── colors.ts                        ← 颜色工具
│   └── history/                         ← 旧 undo 系统（Phase 8 清理时删除）
│
├── assets/
│   ├── objectSortConfig.ts              ← obj sort → 形状/颜色映射
│   └── morphismSortConfig.ts            ← mor 默认视觉配置
│
├── types/
│   ├── graph.ts                         ← NetMathNode/NetMathEdge 类型 + toNetMathNode 转换
│   ├── node.ts → obj.ts                 ← TODO Phase 8: 改名，KnowledgeNode → KnowledgeObject
│   ├── edge.ts → mor.ts                 ← TODO Phase 8: 改名，KnowledgeEdge → KnowledgeMorphism
│   └── index.ts                         ← 类型导出
│
└── workers/
    └── forceLayout3D.worker.ts          ← Web Worker：独立线程跑力导向布局计算
                                            每帧计算 175 个节点的位置（引力/斥力/弹簧）
                                            结果传回主线程渲染，不阻塞 UI
```

## 执行记录

### Phase 0: stores ✅
- selectObjStore（selectedHash）— obj 选中，纯状态，无相机逻辑
- selectMorStore（selectedHash）— mor 选中，独立
- obj 和 mor 选中互不影响，可同时选中
- dataStore（objects/morphisms/nodeNumbering）— knowledge 数据
- viewStore（viewMode/layoutPreset/showLabels/showBridges）— 视图状态
- physicsStore（gravity/repulsion/linkDistance/damping）— 物理参数
- analysisStore（data/loading）— 分析结果
- 共 6 个 store，43 个测试通过

### Phase 1: 框架骨架 ✅
- page.tsx 80 行，三栏布局（Controls | Workspace | Inspector）
- controls / workspace / inspector 目录 + 空壳组件
- InspectorPanel 是纯容器，CardStack 订阅 selectObjStore + dataStore
- NetworkView 订阅 5 个 store，职责注释清晰
- useProjectLoader 加载 objects/morphisms → dataStore
- store 双向读写：任何组件可写入 selectObjStore，所有订阅者自动响应
- 43 个测试通过

### Phase 2: Inspector 填充 ✅
- CardStack：所有 obj 卡片堆叠，选中高亮+滚动
- ObjCard：独立组件，sort 颜色 + name + statement 预览（MarkdownRenderer）
- 点击卡片 → selectObjStore.select(hash)
- 10 个 cardstack 测试通过

### Phase 3: Workspace 布局 ✅
- WorkspacePanel：6 种 layoutMode（single, split-right/left, split-bottom/top, three-equal）
- 布局和内容解耦：layoutMode 控制 slot 排列，slots 控制 view 绑定
- 每个 slot 头部 icon 可交换 view 位置
- 自定义 SVG LayoutIcon 精确表示每种布局
- 面板折叠按钮（⚙ controls, ◇ inspector）
- 布局持久化 autoSaveId
- 8 个 workspace 测试通过

### Phase 4: DetailView ✅
- DetailView 是纯布局容器，只订阅 selectObjStore.selectedHash
- ObjCard/MorCard/MorList 都是自治组件，自己订阅 store
- DetailView 不直接 import dataStore/getNodeKindVisual
- 8 个 detail 测试通过

### Phase 5: ReadView ✅
- 5.1: 文件加载 + 缓存（/api/docs/list, /api/docs/read）
- 5.2: 左侧栏文档导航
- 5.3: MDX 渲染（KaTeX + objblock + objref）
- 5.4: 右侧 TOC（extractHeadings + IntersectionObserver + 平滑滚动）
- 5.5: 全局 obj 编号（buildGlobalObjNumbering → dataStore.nodeNumbering）
- 5.6: 字号 A−/A+（14-24px）+ 刷新按钮（清缓存 + 保持滚动）
- 30 个 readview 测试通过

### 共享自治组件 ✅
所有共享组件接收 id，自己订阅 store 取数据：
```
shared/
├── ObjCard.tsx    — 接收 id，自己查 dataStore（compact/full 两种模式）
├── ObjBlock.tsx   — 接收 id，自己查 dataStore + selectObjStore（MDX 块级引用）
├── ObjRef.tsx     — 接收 id，自己查 dataStore + selectObjStore（MDX 内联引用）
├── MorCard.tsx    — 接收 id，自己查 dataStore（mor 展示卡片）
└── MorList.tsx    — 接收 objId，自己查 dataStore + selectMorStore + selectObjStore
```
View 只管布局，不做数据查找。159 个测试通过。

### Phase 6: NetworkView ✅

2D Canvas + d3-force 力导向图，替代旧 3D ForceGraph。

**实现：**
- `graph2d.ts`：纯函数层（buildForceNodes/Links, hitTest, mapPhysicsToD3），35 个测试
- `NetworkView.tsx`：唯一订阅全部 5 个 store 的组件，21 个测试
- 节点圆形，颜色来自 objectSortConfig，大小来自 analysisStore
- 交互：d3.zoom pan/zoom + d3.drag 弹性拖拽 + 点击选中
- 视觉：hover 光晕 + tooltip，选中节点 in/out 边流动虚线（青色=in，金色=out）
- 外部选中时 flyTo 平滑 pan
- physicsStore 变化时热更新力参数

**DetailView 改进：**
- 只选 mor 时右下角显示 MorCard，上方留空
- MorCard source/target 可点击跳转，带 sort 颜色
- obj 和 mor 选中完全独立，不联动清除

### Phase 7: Controls 填充 ✅

- ControlsPanel：physics 滑块（4 个）+ by size（8 种）+ by color（6 种）
- viewStore 扩展：sizeMappingMode + colorMappingMode
- graph2d：extractMetric（归一化分析数据）+ extractColorMapping（分组→颜色）
- NetworkView 订阅 viewStore 映射模式，只更新节点属性不重建 simulation
- useAnalysisData 复用旧 hook，项目加载时自动跑分析
- 完整链路：ControlsPanel → viewStore → NetworkView → Canvas 渲染

### Phase 7.5: 聚类布局 ← 下一步

根据网络分析结果（community/layer/spectral 等）把同组节点聚在一起。
旧代码在 3D Worker 里用自定义力实现，2D 用 d3 的 `forceX`/`forceY` 更简单。

**架构：**
```
viewStore.clusterMode        ← 聚类模式（none/community/layer/spectral/curvature/anomaly）
viewStore.clusterStrength    ← 聚类强度（0-10 滑块）
    ↓
NetworkView 检测变化
    ↓
graph2d.buildClusterCenters(analysisData, mode)  ← 纯函数：计算每组中心坐标
    ↓
d3.forceX / d3.forceY 把同组节点拉向组中心    ← 不重建 simulation，热更新力
```

**实现步骤：**

Step 7.5.1: `graph2d.ts` 纯函数
- `buildClusterCenters(groups, width, height)` — 给每组分配一个中心位置（圆形排列）
- `assignNodeClusters(nodes, groups)` — 给每个节点标记所属组 + 组中心坐标

Step 7.5.2: viewStore 扩展
- `clusterMode: 'none' | 'community' | 'layer' | 'spectral' | 'curvature' | 'anomaly'`
- `clusterStrength: number`（默认 0，即不聚类）
- `setClusterMode`, `setClusterStrength`

Step 7.5.3: ControlsPanel UI
- Clustering 选择器（同旧 SettingsPanel）
- 强度滑块（Clustered ↔ Loose）

Step 7.5.4: NetworkView 响应
- 新增独立 effect：clusterMode/clusterStrength 变化时
- 添加 `forceX`/`forceY` 力到 simulation（strength = clusterStrength）
- clusterMode=none 时移除聚类力
- 不重建 simulation，只热更新力 + reheat

**关键约束：**
- 聚类力是额外的力，叠加在现有物理力上
- 改变聚类模式/强度不重建 simulation，只更新力参数
- 纯函数层可独立测试（组中心计算）
- 复用 useAnalysisData 已有的 communities/layers/spectralClusters 数据

### Phase 8: 快捷键系统
1. 统一设计快捷键映射表（所有 Panel 操作就位后）
2. 候选快捷键：
   - `Cmd+Z` / `Cmd+Shift+Z` — undo/redo ✅ 已实现
   - `Cmd+1/2/3` — 切换 Read/Network/Detail 视图
   - `Esc` — 取消选中（清除 selectObjStore + selectMorStore）
   - `/` — 搜索节点
   - `Cmd+F` — 文档内搜索
   - `L` — 切换标签显示
3. 写入 `useKeyboardShortcuts` hook，注册在 page.tsx

### Phase 9: 清理
1. 删除旧代码（旧 page.tsx、canvasStore、store.ts、NetworkRead.tsx）
2. 删除 Lean 遗留（286 处）
3. 删除不用的组件（2D 图、namespace、custom nodes、旧 inspector/）
4. 全量测试

## 开发规则

- **TDD**: 先写测试，确认失败，再写代码
- **分支开发**: `refactor/panel-architecture` 分支，随时可回滚到 main
- **性能目标**: 点击节点 <100ms，切换文件(已访问) <50ms
- **铁律**: 每个 Panel 只和 store 通信，永远不和其他 Panel 直接对话
- **自治组件**: shared/ 下的组件接收 id，自己订阅 store 取数据；View 只管布局，不做数据查找
- **2D Canvas 替代 3D**: graph3d/ 在 Phase 9 清理时删除
- **不动 undo/redo**: history/ 保留不变
- **轻巧**: 任何新功能先问"GMTNet 需要这个吗？"
- **从 CLAUDE.md 继承**: Tauri 桌面应用、REST API 8765、obj/mor schema、视觉配置只在前端
