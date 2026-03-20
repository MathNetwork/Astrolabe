# Astrolabe 演进计划

> Phase 1（动态颜色）和 Phase 2（态射 sort）已完成，详见 `docs/completed.md`

## 进度总览

| Phase | 内容 | 状态 |
|-------|------|------|
| 1 | 动态颜色系统（autoColor + 删 sorts.json） | ✅ 完成 |
| 2 | 态射 sort 字段（TDD，后端+前端+渲染+AI skills） | ✅ 完成 |
| — | Sort Overview 面板（TDD，工具函数+面板+按钮集成） | ✅ 完成 |
| 3 | 插件系统（3.1-3.6） | ✅ 完成 |

---

## 技术选型

### 范畴论建模 — 方案 A ✅

给 mor 加可选 `sort` 字段 + 扩展 MDX 语法，不改变数据模型基础结构。

### 插件系统 — 方案 A（配置式）

`.astrolabe/plugins/` 目录放 Python 模块，后端启动时扫描动态注册 FastAPI router，前端从 API 加载插件 skills。

### 动态颜色 — 方案 A ✅

FNV-1a 哈希 → HSL 色环，DEFAULT_SORTS 保留数学预设。

---

## Phase 3：插件系统（无破坏性）

**目标**：将 37 个分析路由从 server.py 抽成插件架构，建立可扩展的插件加载机制

### 现状调查结果

**后端路由分布**：63 个路由中 26 个是核心（CRUD + canvas + docs），37 个是分析算法（59%），0 个死代码。

**分析代码规模**：`backend/astrolabe/analysis/` 16 个文件、~5000 行，覆盖 centrality、community detection、DAG 分析、拓扑、几何、模式识别等。

**前端扩展点**：
- `analysisStore.data` 是 `Record<string, unknown>` — 完全开放，插件可写入任意 key
- `KnowledgeObject` / `KnowledgeMorphism` 都有 `[key: string]: unknown` — 前端类型可扩展
- `useAnalysisData.ts` 的 17 个分析 fetch 是硬编码的 — 需要动态化
- `NetworkView.tsx` 的 `SIZE_KEY_MAP` / `COLOR_KEY_MAP` 硬编码 — 需要动态化
- `ToolWidgets.tsx` 的 action type 是 if-else 平铺 — 需要注册表模式
- `skills.ts` 的 `BUILT_IN_SKILLS` 是硬编码数组 — 需要合并插件 skills

**后端限制**：`knowledge_storage.py` 的字段白名单不允许 obj/mor 存储额外字段，`_migrate_schema` 主动 strip 未知字段。分析结果只能存在 analysisStore（内存），不落盘到 knowledge.json。

### 开发原则

**严格 TDD**：每个 Step 的每个功能点必须先写失败的测试，确认红了，再写最小实现让测试变绿。绝对不能先写实现再补测试。每个 Step 完成后跑全量测试确认无回归。

**先验证再迁移**：不要一上来就搬 5000 行分析代码。用最小的 dummy 插件跑通整条链路，确认框架稳定后再逐步迁移现有代码。

---

### Step 3.1：metadata 扩展字段 ✅

obj/mor 支持可选 `metadata` 字典，插件可通过 metadata 写回分析结果。create/update 支持 metadata 参数，合并不覆盖。11 个测试。

### Step 3.2：后端插件加载器 ✅

`scan_plugins` + `plugin.json` + `APIRouter` 动态注册 + `/api/plugins/list` 端点。dummy 插件验证通过。14 个测试。

### Step 3.3：前端 Skills 动态加载 ✅

`registerPluginSkills()` / `clearPluginSkills()` / `getAllSkills()`。`matchSkills()` 自动搜索全部 skills。`useProjectLoader` 从 `/api/plugins/list` 获取插件 skills。9 个测试。

### Step 3.4：插件分析端点 + 动态 fetch ✅

`plugin.json` 声明 `analysis_endpoints`。`useAnalysisData` 的 `fetchPluginAnalysis()` 从 `/api/plugins/list` 发现端点并 fetch。5 个测试。

---

### Step 3.5：迁移现有分析路由到内置插件（🔜 当前）

**目标**：把 server.py 里 37 个分析路由迁移到内置分析插件的 APIRouter，不改任何分析逻辑

**策略**：分批迁移，每批 commit
1. 第一批：centrality（pagerank, betweenness, degree, katz, structural）— 5 个路由
2. 第二批：community/clustering（communities, clustering, spectral, hierarchical）— 4 个路由
3. 第三批：DAG 分析（dag, critical-path, transitive-reduction）— 3 个路由
4. 第四批：几何/拓扑（curvature, geometry, topology, mapper）— 4 个路由
5. 第五批：高级分析 + 模式（statistics, link-prediction, embedding, correlations, patterns, motif-participation, entropy, metrics/all）— 剩余全部

**每批 TDD 流程**：
- 写测试确认路由通过插件框架注册后仍可访问
- 确认测试红了
- 创建 `backend/astrolabe/analysis/router.py` 注册路由（第一批创建，后续追加）
- 从 server.py 删除对应路由
- server.py 通过 `app.include_router(analysis_router)` 引入
- 确认测试绿了 + 全量测试无回归

**完成后**：server.py 只剩 ~26 个核心路由，分析路由全部在 `analysis/router.py`

### Step 3.6：ilean 解析插件 ✅

**完成**：Lean 编译产物 (.ilean) → Astrolabe obj/mor 导入插件

- **3.6.1**：解析核心（从 LeanAstrolabe 适配），sha256(name)[:12] 确定性 ID，sort 映射，sorry 检测。10 个测试。
- **3.6.2**：POST `/api/plugins/lean/import` endpoint，返回 proposals（不直接写入）。3 个测试。
- **3.6.3**：去重——已存在的 obj 标记 `_status: "existing"`。3 个测试。

---

### 测试统计

| 完成时 | 前端 | 后端 | 总计 |
|--------|------|------|------|
| 3.1 完成 | 589 | 40 | 629 |
| 3.2 完成 | 589 | 54 | 643 |
| 3.3 完成 | 598 | 54 | 652 |
| 3.4 完成 | 601 | 56 | 657 |
| 3.5 完成 | 601 | 64 | 665 |
| 3.6 完成 | 601 | 80 | 681 |
