# Astrolabe 演进计划

> Phase 1（动态颜色）和 Phase 2（态射 sort）已完成，详见 `docs/completed.md`

## 进度总览

| Phase | 内容 | 状态 |
|-------|------|------|
| 1 | 动态颜色系统（autoColor + 删 sorts.json） | ✅ 完成 |
| 2 | 态射 sort 字段（TDD，后端+前端+渲染+AI skills） | ✅ 完成 |
| — | Sort Overview 面板（TDD，工具函数+面板+按钮集成） | ✅ 完成 |
| 3 | 插件系统 | 🔜 当前 |

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

### Step 3.1：metadata 扩展字段

**目标**：允许 obj/mor 携带 `metadata` 开放字段，插件可以写回分析结果

**现状问题**：`knowledge_storage.py` 的 `create_node` 只写入白名单字段，`update_node` 只更新已存在的字段，`_migrate_schema` 主动 strip 未知字段。插件无法把结果（如 centrality 值）持久化到节点上。

**涉及文件**：
- `backend/astrolabe/knowledge_storage.py` — `create_node` / `update_node` 支持 `metadata: dict` 参数，存储在节点的 `metadata` 字段中；`_migrate_schema` 保留 `metadata` 不 strip
- `backend/tests/` — TDD：先写测试验证 metadata 读写

**破坏性**：无。新增可选字段，旧数据无 metadata 不受影响。

### Step 3.2：后端插件加载器

**目标**：`scan_plugins` + `plugin.json` 解析 + `APIRouter` 动态注册

**涉及文件**：
- `backend/astrolabe/plugins/base.py` — `AstrolabePlugin` 基类（name, version, routes, skills）
- `backend/astrolabe/plugins/__init__.py` — `scan_plugins(project_path)` 扫描 `.astrolabe/plugins/`
- `backend/astrolabe/server.py` — 项目初始化时调用 `scan_plugins`，动态 `include_router`
- 写一个 dummy 插件（返回 `{"hello": "world"}` 的单个 endpoint）验证框架

**验证标准**：dummy 插件的 endpoint 可通过 `/api/plugins/dummy/hello` 访问。

**破坏性**：无。

### Step 3.3：前端 Skills 动态加载

**目标**：插件可以注册自定义 AI skills，合并到 ChatComposer

**涉及文件**：
- 后端 — `/api/plugins/list` 端点，返回所有已加载插件的 skills
- `src/lib/skills.ts` — `getAllSkills()` 合并内置 + 插件 skills
- `src/components/claude-chat/ChatComposer.tsx` — skill 列表从 `BUILT_IN_SKILLS` 改为 `getAllSkills()`
- `src/hooks/useProjectLoader.ts` — 项目加载时 fetch 插件 skills

**破坏性**：无。

### Step 3.4：最小分析插件（验证整条链路）

**目标**：写一个真实但最小的分析插件（degree centrality），跑通"插件注册 → 分析计算 → 结果写入 analysisStore → NetworkView 映射"的完整链路

**涉及文件**：
- `.astrolabe/plugins/degree/plugin.json` — 插件声明
- `.astrolabe/plugins/degree/main.py` — 计算 degree centrality，返回 `{node_id: degree}` 格式
- `src/hooks/useAnalysisData.ts` — 从 `/api/plugins/list` 获取插件分析端点，动态 fetch
- `src/panels/workspace/NetworkSettings.tsx` — size/color 映射选项动态构建

**验证标准**：在 NetworkSettings 里能选择 "Degree (plugin)" 映射节点大小，效果和现有内置 degree 分析一致。

**破坏性**：无。

### Step 3.5：逐步迁移现有分析代码

**目标**：确认框架稳定后，把 `backend/astrolabe/analysis/` 的 16 个文件逐步包装为内置插件

**策略**：
- 不一次迁移全部 37 个路由，按模块逐步迁移
- 每迁移一个模块，跑全量测试确认前端无感知
- 最终 server.py 只剩核心 CRUD 路由

### Step 3.6：ilean 解析插件

**目标**：第一个数据导入插件，解析 Lean 编译产物生成 obj/mor

**前提**：Step 3.1-3.4 验证框架稳定

---

### 总预估

| Step | 改动 | 工作量 |
|------|------|--------|
| 3.1 metadata 扩展 | knowledge_storage.py 白名单改造 | 小 |
| 3.2 插件加载器 | scan + base class + dummy 插件 | 中 |
| 3.3 Skills 动态加载 | 合并机制 + ChatComposer | 小 |
| 3.4 最小分析插件 | degree 插件 + useAnalysisData 动态化 | 中 |
| 3.5 分析代码迁移 | 逐步包装为插件 | 大（可分批） |
| 3.6 ilean 插件 | 二进制解析 | 大 |

**顺序**：3.1 → 3.2 → 3.3 → 3.4 → 3.5 → 3.6
