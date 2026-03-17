# NetMath — 数学知识图谱可视化工具

## 架构

- **前端**：Next.js + React + Three.js (ForceGraph3D)，**Tauri 桌面应用**（不是浏览器）
- **后端**：Python (FastAPI/uvicorn)，端口 8765，内存状态 + JSON 持久化
- 前后端通过 REST API 通信，前端用 `tauriFetch`（api.ts）或原生 `fetch`（canvasStore.ts）
- 用户始终在 Tauri 桌面应用中运行，不要当作浏览器环境理解

## 关键目录

- `src/components/NetworkRead.tsx` — Read 视图（MDX 文档渲染）
- `src/components/inspector/` — Detail 面板、卡片堆叠、边/邻居工具
- `src/components/MarkdownRenderer.tsx` — 通用 Markdown 渲染器（支持 LaTeX + objref）
- `src/lib/canvasStore.ts` — 画布状态管理（zustand），loadCanvas / reloadKnowledge
- `src/hooks/useGraphData.ts` — 知识图谱数据转换和过滤
- `assets/objectSortConfig.ts` — 对象 sort → 颜色/形状映射（节点视觉配置源）
- `assets/morphismSortConfig.ts` — 态射默认视觉配置（边无 sort 分类）
- `backend/netmath/server.py` — API 路由
- `backend/netmath/knowledge_storage.py` — 知识节点 CRUD

## 核心规则

### 范畴论 Schema
- 知识图谱建模为范畴（category）
- **对象**（节点）：`objectSortConfig.ts` 定义视觉，字段名 `sort`（旧名 `kind`）
- **态射**（边）：无 sort 分类，含义通过 `notes` 字段描述
- JSON 格式：`obj`（对象字典）、`mor`（态射字典）
- 后端 `_load()` 自动迁移旧格式（nodes→obj, edges→mor, kind→sort, 旧 relation→notes）
- `backend/tests/test_categorical_schema.py` 有 schema 测试保障

### 视觉配置
- 颜色和形状**只在前端** `assets/objectSortConfig.ts` 和 `assets/morphismSortConfig.ts` 定义
- 后端和 knowledge.json **禁止**存储 `style`, `confidence`, `tags`, `scope`, `source`
- 后端 `_load()` 会自动清除这些禁止字段
- `backend/tests/test_knowledge_no_style.py` 有测试保障

### knowledge.json 对象允许字段
`id`, `name`, `sort`, `status`, `statement`, `proof`, `intuition`, `notes`, `position`, `created_at`, `updated_at`

### Display Math 格式
- node statement 中的 display math 必须用多行格式，`$$` 独占一行：
  ```
  some text\n\n$$\n\\mathcal{E}(M,Y)\n$$\n\nmore text
  ```
- 单行 `$$...$$` 会被 remark-math 识别为 inline math，不会居中
- 节点名称只用纯 ASCII 文本，不用 LaTeX 或 unicode

### MDX obj 引用
- 块级：`<div class="objblock">node_id</div>` — 默认显示 sort + name + statement
- 块级指定字段：`<div class="objblock" data-show="statement,proof">node_id</div>`
- `data-show` 合法值：`statement`, `proof`, `intuition`, `notes`（逗号分隔，默认 `statement`）
- 内联：`<objref id="node_id"></objref>` — 渲染可点击链接
- `objref` 在 NetworkRead.tsx 和 MarkdownRenderer.tsx 中都已注册
- 点击 objblock 或 objref 都会跳转到 detail 面板

### Detail 面板
- 只读模式，直接显示 knowledge.json 中的数据
- 不做 auto-save，不做编辑

### 数据流
- 前端通过 `loadCanvas()` 从后端拉取 canvas + knowledge 数据
- 修改数据必须通过后端 API，不要直接写 JSON（会被内存状态覆盖）
- 刷新按钮调用 `handleRefreshCanvas` → `reloadGraph()` → `loadCanvas()`

## 语言

与用户交流使用中文。
