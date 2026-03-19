# 已完成的开发记录

## Phase 1：动态颜色系统 ✅

**完成时间**：2026-03-19

**目标**：删除 sorts.json，任何 sort 自动获得确定性颜色，零配置即可用

### 改动

用 FNV-1a 哈希实现 `autoColor(sort)`，颜色链路简化为两级查找：

```
getObjectSort(sort)
  ├── DEFAULT_SORTS[sort]   ← 10 个数学 sort 预设（保留）
  └── autoColor(sort)       ← FNV-1a hash → HSL 色环（取代灰色 fallback）
```

### 文件清单

| 文件 | 改动 |
|------|------|
| `src/lib/sortConfig.ts` | 加 autoColor（FNV-1a），删 customSorts / setCustomSortConfig，改 fallback |
| `src/hooks/useProjectLoader.ts` | 删 sorts fetch + setCustomSortConfig 调用 |
| `src/stores/dataStore.ts` | 删 SortConfig 类型、sortConfig 字段、setSortConfig |
| `src/components/claude-chat/ToolWidgets.tsx` | 删 save-sorts 分支和 import |
| `backend/astrolabe/server.py` | 删 /api/knowledge/sorts endpoint |
| `src/__tests__/custom-sorts.test.ts` | 重写为测试 autoColor 确定性 |
| `src/lib/__tests__/graph2d.test.ts` | unknown sort 期望从灰色改为 HSL autoColor |

**调用点不变**（7 处）：ObjCard、MorCard、MorList、ObjBlock、ObjRef、NetworkView、graph2d.ts

---

## Phase 2：态射 sort 字段 ✅（严格 TDD）

**完成时间**：2026-03-19

**目标**：mor 获得 sort 分类能力，在 UI 中可视化区分不同类型的关系

### TDD 过程

**Step 1（后端 schema）**：6 个新测试红 → 改 knowledge_storage.py → 12 个全绿
- mor 允许字段加 `sort`
- `_migrate_schema`：旧 `relation` 字段迁移为 `sort`（不再 strip）
- `create_edge` 接受可选 `sort` 参数
- `update_edge` 允许修改 `sort`

**Step 2（前端类型）**：1 个新测试红 → KnowledgeMorphism 加 `sort?: string` → 全绿

**Step 3（边颜色渲染）**：4 个新测试红 → 实现 → 全绿
- `ForceLink` 接口加 `color` 字段
- `buildForceLinks` 返回 `color`：有 sort → `getObjectSort(sort).color`，无 sort → `MORPHISM_DEFAULT`
- `MorCard` 显示 mor 的 sort 标签和对应颜色
- `NetworkView` 边渲染使用 `link.color`

**Step 4（AI Skills）**：2 个新测试红 → 实现 → 全绿
- `SYSTEM_CONTEXT` 的 Morphisms 字段列表加 `sort`
- `/add-edge` prompt 加 sort 参数说明
- `/edit-edge` prompt 加 sort 修改
- 删除废弃的 `/init-sorts` skill 和 `save-sorts` action

### 文件清单

| 文件 | 改动 |
|------|------|
| `backend/astrolabe/knowledge_storage.py` | mor 加 sort 字段，relation → sort 迁移 |
| `backend/tests/test_categorical_schema.py` | 12 个测试（含 6 个新增） |
| `src/stores/dataStore.ts` | KnowledgeMorphism 加 `sort?: string` |
| `src/lib/graph2d.ts` | ForceLink 加 color，buildForceLinks 返回颜色 |
| `src/components/shared/MorCard.tsx` | 显示 mor sort 标签 |
| `src/panels/workspace/NetworkView.tsx` | 边渲染用 link.color |
| `src/lib/skills.ts` | SYSTEM_CONTEXT + add-edge/edit-edge 更新，删 init-sorts |
| `src/lib/parseClaudeActions.ts` | 删 save-sorts action type |
| `src/types/__tests__/categoricalSchema.test.ts` | 4 个测试 |
| `src/lib/__tests__/graph2d.test.ts` | 2 个新测试 |
| `src/components/shared/__tests__/morcard.test.ts` | 2 个新测试 |
| `src/panels/__tests__/claude-widgets.test.ts` | 3 个新测试 |

---

## Sort Overview 面板 ✅（严格 TDD）

**完成时间**：2026-03-19

**目标**：在 NetworkView 工具栏添加 Sort 概览浮层，展示 obj/mor 的 sort 分布

### TDD 过程

**Step 1（工具函数）**：7 个测试红 → `sortStats.ts`（computeSortStats 纯函数）→ 全绿

**Step 2（面板组件）**：7 个测试红 → `SortOverview.tsx` → 全绿

**Step 3（按钮集成）**：2 个测试红 → NetworkView 工具栏 tag 按钮 + 互斥逻辑 → 全绿

### 文件清单

| 文件 | 改动 |
|------|------|
| `src/lib/sortStats.ts` | 新文件：computeSortStats 纯函数 |
| `src/lib/__tests__/sortStats.test.ts` | 7 个测试 |
| `src/panels/workspace/SortOverview.tsx` | 新文件：Sort 概览面板 |
| `src/panels/__tests__/sort-overview.test.ts` | 7 个测试 |
| `src/panels/workspace/NetworkView.tsx` | 工具栏 + tag 按钮 + 互斥 |
| `src/panels/__tests__/networkview.test.ts` | 3 个集成测试 |

---

## 测试统计

| 时间点 | 前端测试 | 后端测试 | 总计 |
|--------|----------|----------|------|
| Phase 1 开始前 | 563 | 17 | 580 |
| Phase 2 完成后 | 572 | 29 | 601 |
| Sort Overview 完成后 | 589 | 29 | 618 |
