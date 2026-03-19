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

### Step 3.1：后端分析路由抽取为 APIRouter

**目标**：把 37 个分析路由从 server.py 移到独立的 analysis router，不改变任何 API 路径

**涉及文件**：
- `backend/astrolabe/analysis/router.py` — 新文件，APIRouter 注册所有分析路由
- `backend/astrolabe/server.py` — 删除 37 个分析路由，改为 `app.include_router(analysis_router)`
- 预期：server.py 从 ~2200 行降到 ~900 行，分析路由独立可测试

**破坏性**：无。API 路径不变，前端无感知。

### Step 3.2：前端 useAnalysisData 动态化

**目标**：分析端点列表从硬编码改为可配置

**涉及文件**：
- `src/hooks/useAnalysisData.ts` — 重构：从 `/api/plugins/analysis/endpoints` 获取端点列表，动态 fetch
- `backend/astrolabe/analysis/router.py` — 新增端点发现 API
- `src/panels/workspace/NetworkSettings.tsx` — size/color 映射选项动态构建
- `src/panels/workspace/NetworkView.tsx` — `SIZE_KEY_MAP` / `COLOR_KEY_MAP` 动态化

**破坏性**：无。

### Step 3.3：前端 Skills 动态化

**目标**：插件可以注册自定义 AI skills

**涉及文件**：
- `src/lib/skills.ts` — 新增 `registerPluginSkills()` + `getAllSkills()`
- `src/components/claude-chat/ChatComposer.tsx` — skill 列表改为 `getAllSkills()`
- `src/hooks/useProjectLoader.ts` — 项目加载时获取插件 skills

**破坏性**：无。

### Step 3.4：ToolWidgets 注册表模式

**目标**：action type 处理从 if-else 改为注册表

**涉及文件**：
- `src/lib/parseClaudeActions.ts` — action type 可扩展
- `src/components/claude-chat/ToolWidgets.tsx` — `actionHandlers: Record<string, handler>`

**破坏性**：无。

### Step 3.5：插件加载器

**目标**：后端扫描 `.astrolabe/plugins/` 目录，动态加载 Python 插件模块

**涉及文件**：
- `backend/astrolabe/plugins/__init__.py` — `scan_plugins()` 扫描 + 加载
- `backend/astrolabe/plugins/base.py` — `AstrolabePlugin` 基类
- `backend/astrolabe/server.py` — 项目初始化时 `scan_plugins` + 动态 `include_router`
- 内置分析包装为默认插件

**破坏性**：无。

### Step 3.6：ilean 解析插件（验证架构）

**目标**：第一个数据导入插件，解析 Lean 编译产物生成 obj/mor

**涉及文件**：
- `.astrolabe/plugins/lean/plugin.json` — 插件声明
- `.astrolabe/plugins/lean/lean_parser.py` — ilean 解析 → obj/mor

**预期工作量**：大

### 总预估

| Step | 改动 | 工作量 |
|------|------|--------|
| 3.1 分析路由抽取 | server.py 拆分 | 中 |
| 3.2 useAnalysisData 动态化 | fetch 逻辑重构 | 中 |
| 3.3 Skills 动态化 | 合并机制 | 小 |
| 3.4 ToolWidgets 注册表 | if-else → map | 小 |
| 3.5 插件加载器 | scan + base class | 中 |
| 3.6 ilean 插件 | 二进制解析 | 大 |

**推荐顺序**：3.1 → 3.2 → 3.3 → 3.4 → 3.5 → 3.6（先重构核心，再建框架，最后验证）

**核心策略**：先重构再扩展——Step 3.1-3.4 把现有硬编码改为可扩展模式（API 路径不变，前端无感知），Step 3.5 建立插件框架，Step 3.6 用 ilean 插件验证。全程无破坏性改动。
