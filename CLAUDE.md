# NetMath — 数学知识图谱可视化工具

## 架构

- **前端**：Next.js + React + d3-force (2D Canvas)，**Tauri 桌面应用**（不是浏览器）
- **后端**：Python (FastAPI/uvicorn)，端口 8765，内存状态 + JSON 持久化
- 前后端通过 REST API 通信
- 用户始终在 Tauri 桌面应用中运行

## 核心身份

**NetMath 就是三样东西：**
1. **JSON 文件浏览器** — 读取 knowledge.json（obj/mor），展示节点详情
2. **MDX 阅读器** — 渲染数学笔记，objblock/objref 链接到节点
3. **2D 力导向图** — 可视化节点和边的网络关系

## 布局

```
page.tsx（两栏布局）
┌────────────────────────────────────────┬──────────────────┐
│                                        │                  │
│            Workspace (70%)             │  Inspector (30%) │
│                                        │                  │
│   Read / Network / Detail（可切换）     │   CardStack      │
│                                        │   (obj 卡片)     │
│   Network 内嵌 ⚙ Settings overlay      │                  │
│                                        │                  │
└────────────────────────────────────────┴──────────────────┘
                         │
                  stores (zustand)
```

## 关键目录

```
src/
├── stores/                      ← 6 个 zustand store，各自独立
├── panels/workspace/            ← ReadView, NetworkView, NetworkSettings, DetailView
├── panels/inspector/            ← InspectorPanel, CardStack
├── components/shared/           ← 自治组件（ObjCard, MorCard, MorList, ObjBlock, ObjRef）
├── lib/graph2d.ts               ← 2D 图纯函数（ForceNode, hitTest, 聚类, 映射）
├── hooks/                       ← useProjectLoader, useKeyboardShortcuts, useAnalysisData
└── assets/                      ← objectSortConfig（颜色）, morphismSortConfig
```

## Store 设计

| Store | 职责 | Undo |
|-------|------|------|
| `selectObjStore` | 选中的 obj hash | ✅ temporal |
| `selectMorStore` | 选中的 mor hash | ✅ temporal |
| `dataStore` | objects/morphisms/nodeNumbering | ❌ 只读 |
| `viewStore` | layoutMode, activeTab, sizeMappingMode, colorMappingMode, clusterMode | ✅ temporal |
| `physicsStore` | gravity, repulsion, linkDistance, friction | ✅ temporal |
| `analysisStore` | 网络分析数据（pagerank 等） | ❌ 计算结果 |

**铁律**：每个 Panel 只和 store 通信，永远不和其他 Panel 直接对话。

## 自治组件模式

`components/shared/` 下的组件接收 `id`，自己订阅 store 取数据。View 只管布局，不做数据查找。

| 组件 | 接收 | 订阅 |
|------|------|------|
| `ObjCard` | id | dataStore |
| `MorCard` | id | dataStore, selectObjStore（点击跳转） |
| `MorList` | objId | dataStore, selectObjStore, selectMorStore |
| `ObjBlock` | id | dataStore, selectObjStore |
| `ObjRef` | id | dataStore, selectObjStore |

## NetworkView

- **渲染**：2D Canvas + d3-force，不用 Three.js/WebGL
- **交互**：pan/zoom、弹性拖拽、点击选中节点/边、hover tooltip
- **视觉**：选中节点白色 + 光晕，in/out 边流动虚线（青色/金色）
- **Settings overlay**：⚙ 按钮展开透明面板（physics/size/color/clustering）
- **性能**：size/color 变化只更新节点属性不重建 simulation
- **纯函数层**：`lib/graph2d.ts`（buildForceNodes, hitTest, 聚类, 映射），可独立测试

## 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Cmd+Z` | Undo（最近修改的 temporal store） |
| `Cmd+Shift+Z` | Redo |
| `Escape` | 取消选中 |
| `Cmd+1/2/3` | 切换 Read/Network/Detail |

文件：`src/hooks/useKeyboardShortcuts.ts`

## 范畴论 Schema

- 知识图谱建模为范畴（category）
- **对象**（节点）：`objectSortConfig.ts` 定义颜色，字段名 `sort`
- **态射**（边）：无 sort 分类，含义通过 `notes` 字段描述
- JSON 格式：`obj`（对象字典）、`mor`（态射字典）
- 后端 `_load()` 自动迁移旧格式
- `backend/tests/test_categorical_schema.py` 有 schema 测试保障

## knowledge.json 规则

### 对象允许字段
`id`, `name`, `sort`, `status`, `statement`, `proof`, `intuition`, `notes`, `position`, `created_at`, `updated_at`

### 视觉配置
- 颜色**只在前端** `assets/objectSortConfig.ts` 定义
- 后端和 knowledge.json **禁止**存储 `style`, `confidence`, `tags`, `scope`, `source`

### Display Math 格式
- display math 必须用多行格式，`$$` 独占一行
- 节点名称只用纯 ASCII 文本

## MDX obj 引用

- 块级：`<div class="objblock">node_id</div>`
- 块级指定字段：`<div class="objblock" data-show="statement,proof">node_id</div>`
- `data-show` 合法值：`statement`, `proof`, `intuition`, `notes`
- 内联：`<objref id="node_id"></objref>`
- 点击 objblock/objref 都会写入 selectObjStore

## 数据流

- `useProjectLoader` 从后端 API 加载 obj/mor → dataStore
- `useAnalysisData` 自动并行 fetch 分析端点 → analysisStore
- 修改数据必须通过后端 API，不要直接写 JSON
- ReadView 的 Refresh 按钮清缓存 + 重新 fetch

## 后端分析

`backend/netmath/analysis/` 提供：pagerank、betweenness、degree、communities（Louvain）、DAG depth、spectral clustering、Ricci curvature、katz、hub/authority 等。

前端通过 `useAnalysisData` hook 复用，项目加载时自动运行。

## 语言

与用户交流使用中文。
