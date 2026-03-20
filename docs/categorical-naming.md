# Categorical Naming: Plugin → Functor 重命名计划

## 原则

- 代码即理论，理论即代码
- 代码中不存在范畴论没有定义的概念
- 工程术语只在注释中作为解释出现，不出现在命名中

## 命名映射

| 旧术语 | 新术语 | 理由 |
|--------|--------|------|
| plugin / plugins | functor / functors | 插件就是函子 |
| AstrolabePlugin | AstrolabeFunctor | 基类 |
| scan_plugins | scan_functors | 扫描函子 |
| register_builtin_plugins | register_builtin_functors | 注册内置函子 |
| plugin.json | functor.json | 函子元数据 |
| .astrolabe/plugins/ | .astrolabe/functors/ | 用户函子目录 |
| /api/plugins/ | /api/functors/ | API 路径 |
| ilean_parser.py | import_functor.py | parser 是 import functor 的实现 |
| PluginInfo (前端) | FunctorInfo | 前端类型 |
| pluginSkills | functorSkills | 前端 skill 注册 |
| skill / skills | （暂不改） | AI skill 需要单独讨论 |

## 影响范围

- 后端 Python: ~188 处 plugin/Plugin 引用
- 前端 TS/TSX: ~30 处 plugin/Plugin 引用（不含 skill）
- 文件/目录重命名: ~20 个
- API 路径变更: `/api/plugins/*` → `/api/functors/*`
- 数据目录: `.astrolabe/plugins/` → `.astrolabe/functors/`
- 测试文件: ~10 个重命名

## 开发原则

**严格 TDD**：每个 Phase 的每个功能点必须先写失败的测试，确认红了，再写最小实现让测试变绿。每个 Phase 完成后跑全量测试确认无回归。

---

## Phase 1：后端基类和加载器重命名

**目标**：`plugins/` → `functors/`，`AstrolabePlugin` → `AstrolabeFunctor`

### TDD 步骤

1. 先写测试 `test_functors.py`：
   - `AstrolabeFunctor` 基类有 name, version, router, skills, analysis_endpoints 属性
   - `scan_functors()` 扫描 `.astrolabe/functors/` 目录
   - `scan_functors()` 加载 `functor.json`（不是 plugin.json）
   - 确认红了

2. 实现：
   - `mv backend/astrolabe/plugins/ backend/astrolabe/functors/`
   - `base.py`: `AstrolabePlugin` → `AstrolabeFunctor`
   - `__init__.py`: `scan_plugins` → `scan_functors`，扫描 `.astrolabe/functors/`
   - `builtin/__init__.py`: `register_builtin_plugins` → `register_builtin_functors`，`BUILTIN_PLUGINS` → `BUILTIN_FUNCTORS`
   - 确认绿了

3. 更新 `server.py` 的 import 路径
4. 删除旧的 `test_plugins.py`
5. 全量测试确认无回归
6. Commit

**涉及文件**：
- `backend/astrolabe/plugins/` → `backend/astrolabe/functors/`（目录重命名）
- `backend/astrolabe/functors/base.py`（类名）
- `backend/astrolabe/functors/__init__.py`（函数名 + 扫描路径）
- `backend/astrolabe/functors/builtin/__init__.py`（常量名 + 函数名）
- `backend/astrolabe/server.py`（import 路径 + 变量名）
- `backend/tests/test_plugins.py` → `backend/tests/test_functors.py`
- `backend/tests/test_plugin_integration.py` → `backend/tests/test_functor_integration.py`
- `backend/tests/test_plugin_analysis.py` → `backend/tests/test_analysis_functor.py`
- `backend/tests/test_plugin_metadata.py` → `backend/tests/test_functor_metadata.py`

---

## Phase 2：ilean parser → Lean import functor

**目标**：`ilean_parser.py` → `import_functor.py`，API 路径不变

### TDD 步骤

1. 先写测试 `test_lean_import_functor.py`：
   - `from astrolabe.functors.builtin.lean.import_functor import parse_lean_project`
   - 和 `test_ilean_plugin.py` 相同的测试内容，但 import 路径变了
   - 确认红了

2. 实现：
   - `mv ilean_parser.py import_functor.py`
   - 更新 `router.py` 的 import
   - 确认绿了

3. 删除旧的 `test_ilean_plugin.py`、`test_ilean_endpoint.py`、`test_ilean_dedup.py`（合并到新测试）
4. Commit

**涉及文件**：
- `backend/astrolabe/functors/builtin/lean/ilean_parser.py` → `import_functor.py`
- `backend/astrolabe/functors/builtin/lean/router.py`（import 路径）
- `backend/tests/test_ilean_*.py` → `backend/tests/test_lean_import_functor.py`

---

## Phase 3：API 路径 `/api/plugins/` → `/api/functors/`

**目标**：所有 API 路径从 plugins 改为 functors

### TDD 步骤

1. 先写测试：
   - `GET /api/functors/list` 返回函子列表
   - `POST /api/functors/lean/import` 可访问
   - 旧路径 `/api/plugins/list` 返回 404（或重定向）
   - 确认红了

2. 实现：
   - `server.py`: `_loaded_plugins` → `_loaded_functors`
   - `server.py`: `/api/plugins/list` → `/api/functors/list`
   - `server.py`: `prefix="/api/plugins/lean"` → `prefix="/api/functors/lean"`
   - 确认绿了

3. Commit

**涉及文件**：
- `backend/astrolabe/server.py`（路由路径 + 变量名）
- 所有后端测试中的 URL 字符串

---

## Phase 4：前端 PluginInfo → FunctorInfo

**目标**：前端类型、store 字段、组件中的 plugin → functor

### TDD 步骤

1. 先写测试：
   - `dataStore` 有 `functors` 字段（不是 `plugins`）
   - `useProjectLoader` fetch `/api/functors/list`
   - `ExplorerPanel` 渲染 "FUNCTORS" section header
   - `registerFunctorSkills` / `clearFunctorSkills` 函数存在
   - 确认红了

2. 实现：
   - `src/stores/dataStore.ts`: `PluginInfo` → `FunctorInfo`，`plugins` → `functors`，`setPlugins` → `setFunctors`
   - `src/hooks/useProjectLoader.ts`: fetch URL + setter 名
   - `src/hooks/useAnalysisData.ts`: fetch URL
   - `src/lib/skills.ts`: `registerPluginSkills` → `registerFunctorSkills`，`clearPluginSkills` → `clearFunctorSkills`
   - `src/panels/explorer/ExplorerPanel.tsx`: section header + 变量名
   - 确认绿了

3. 更新所有前端测试文件中的引用
4. 重命名测试文件：
   - `pluginSkills.test.ts` → `functorSkills.test.ts`
   - `pluginSkillsLoader.test.ts` → `functorSkillsLoader.test.ts`
   - `pluginAnalysis.test.ts` → `functorAnalysis.test.ts`
5. Commit

**涉及文件**：
- `src/stores/dataStore.ts`
- `src/hooks/useProjectLoader.ts`
- `src/hooks/useAnalysisData.ts`
- `src/lib/skills.ts`
- `src/panels/explorer/ExplorerPanel.tsx`
- `src/panels/__tests__/explorer.test.ts`
- `src/lib/__tests__/pluginSkills.test.ts` → `functorSkills.test.ts`
- `src/hooks/__tests__/pluginSkillsLoader.test.ts` → `functorSkillsLoader.test.ts`
- `src/hooks/__tests__/pluginAnalysis.test.ts` → `functorAnalysis.test.ts`

---

## Phase 5：文档归档 + 重命名

**目标**：归档旧文档，更新术语

1. `docs/extension.md` → `docs/archive/extension.md`
2. `docs/extension-design.md` → `docs/archive/extension-design.md`
3. 其他 docs/ 下的旧文档（plan 相关）也归档
4. 更新 CLAUDE.md 中所有 plugin 引用为 functor
5. Commit

---

## Phase 6：数据目录 `.astrolabe/plugins/` → `.astrolabe/functors/`

**目标**：用户项目的函子目录重命名

1. 后端 `scan_functors` 已在 Phase 1 改为扫描 `.astrolabe/functors/`
2. 添加向后兼容：如果 `.astrolabe/plugins/` 存在但 `.astrolabe/functors/` 不存在，自动迁移
3. 测试向后兼容逻辑
4. Commit

---

## Phase 7：GitHub repo 重命名

1. 提醒用户在 GitHub 上手动重命名 repo: `Astrolabe` → `astrolabe-category`
2. 更新本地 remote URL: `git remote set-url origin https://github.com/MathNetwork/astrolabe-category.git`
3. 确认 push 正常

---

## 预估

| Phase | 改动量 | 风险 |
|-------|--------|------|
| 1 后端基类 | 中（~10 文件，~100 处替换） | 低 |
| 2 ilean → import functor | 小（~4 文件） | 低 |
| 3 API 路径 | 中（~15 文件，后端+测试 URL） | 中（前端 fetch 也要改） |
| 4 前端类型 | 中（~10 文件，~50 处替换） | 中 |
| 5 文档归档 | 小 | 无 |
| 6 数据目录迁移 | 小 | 低（向后兼容） |
| 7 repo 重命名 | 手动 | 无 |

**顺序**：1 → 2 → 3 → 4 → 5 → 6 → 7（后端先改，前端跟进，文档最后）
