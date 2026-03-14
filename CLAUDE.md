# NetMath — 数学知识图谱可视化工具

## 架构

- **前端**：Next.js + React + Three.js (ForceGraph3D)，Tauri 桌面应用
- **后端**：Python (FastAPI/uvicorn)，端口 8765，内存状态 + JSON 持久化
- 前后端通过 REST API 通信，前端用 `tauriFetch`（api.ts）或原生 `fetch`（canvasStore.ts）

## 关键目录

- `src/components/NetworkRead.tsx` — Read 视图（MDX 文档渲染）
- `src/components/inspector/` — Detail 面板、卡片堆叠、边/邻居工具
- `src/components/MarkdownRenderer.tsx` — 通用 Markdown 渲染器（支持 LaTeX + noderef）
- `src/lib/canvasStore.ts` — 画布状态管理（zustand），loadCanvas / reloadKnowledge
- `src/hooks/useGraphData.ts` — 知识图谱数据转换和过滤
- `assets/nodeKindConfig.ts` — 节点 kind → 颜色/形状映射（唯一视觉配置源）
- `backend/netmath/server.py` — API 路由
- `backend/netmath/knowledge_storage.py` — 知识节点 CRUD

## 核心规则

### 视觉配置
- 颜色和形状**只在前端** `assets/nodeKindConfig.ts` 定义，根据 `kind` 字段决定
- 后端和 knowledge.json **禁止**存储 `style`, `confidence`, `tags`, `scope`, `source`
- 后端 `_load()` 会自动清除这些禁止字段
- `backend/tests/test_knowledge_no_style.py` 有测试保障

### knowledge.json 节点允许字段
`id`, `name`, `kind`, `status`, `statement`, `proof`, `intuition`, `notes`, `position`, `created_at`, `updated_at`

### MDX 节点引用
- 块级：`<div class="nodeblock">node_id</div>` — 默认显示 kind + name + statement
- 块级指定字段：`<div class="nodeblock" data-show="statement,proof">node_id</div>`
- `data-show` 合法值：`statement`, `proof`, `intuition`, `notes`（逗号分隔，默认 `statement`）
- 内联：`<noderef id="node_id"></noderef>` — 渲染可点击链接
- `noderef` 在 NetworkRead.tsx 和 MarkdownRenderer.tsx 中都已注册
- 点击 nodeblock 或 noderef 都会跳转到 detail 面板

### Detail 面板
- 只读模式，直接显示 knowledge.json 中的数据
- 不做 auto-save，不做编辑

### 数据流
- 前端通过 `loadCanvas()` 从后端拉取 canvas + knowledge 数据
- 修改数据必须通过后端 API，不要直接写 JSON（会被内存状态覆盖）
- 刷新按钮调用 `handleRefreshCanvas` → `reloadGraph()` → `loadCanvas()`

## 语言

与用户交流使用中文。
