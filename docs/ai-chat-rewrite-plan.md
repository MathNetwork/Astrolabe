# AI Chat 模块重写计划 v2

## 目标

AI Chat 前后端统一使用 astrolabe.json 的 `{ref, record}` 格式，替代旧的 signature.json。

## 核心设计

单一 `create_entry(ref, record)` 接口，ref 验证规则：
- ref 不能为空
- `ref = ["__self__"]` → atom，后端生成 hash_id 后替换
- `"__self__"` 只能以 `["__self__"]` 的形式出现，混入其他位置 → 400
- 其他情况 → ref 中每个 hash 必须已存在
- ref 长度不限（支持任意维度 simplex，face 条件）

## CRUD 端点（`/api/astrolabe`）

| Method | Path | 功能 |
|--------|------|------|
| POST | `/entries` | 创建 entry，body: `{"ref": [...], "record": {...}}` → 201 |
| PATCH | `/entries/{id}` | 合并更新 record → 200（404 if not found） |
| DELETE | `/entries/{id}` | 级联删除（atom 被删时引用它的 entry 一起删） → 204 |

请求体示例：
```json
// 创建 atom
{ "ref": ["__self__"], "record": { "name": "Theorem X", "sort": "theorem" } }

// 创建 1-simplex
{ "ref": ["abc123", "def456"], "record": { "sort": "depends_on" } }

// 更新
{ "status": "proven", "statement": "For all x..." }
```

## 执行进度

| Step | 内容 | 状态 |
|------|------|------|
| 1 | `AstrolabeStorage` 补 `create_entry`/`update_record`/`delete_cascade` | ✅ |
| 2 | `astrolabe_router.py` CRUD 端点 + 测试（17/17 passed） | ✅ |
| 2.1 | `__self__` 边界验证 + 测试 | 🔄 进行中 |
| 3 | 前端预调查：`ToolWidgets.tsx` / `parseClaudeActions.ts` / `skills.ts` | 🔜 |
| 4 | 重写 `ToolWidgets.tsx`，调新端点 | |
| 5 | 更新 `parseClaudeActions.ts` action 类型 | |
| 6 | 更新 `skills.ts` prompt 中的 JSON 格式说明 | |
| 7 | 清理：删 `signature_storage.py`、`signature_crud/`、`api.ts` 死代码、旧测试 | |
| 8 | 端到端测试 | |

## 待清理文件

- `backend/astrolabe/signature_storage.py`
- `backend/astrolabe/functors/signature_crud/router.py`
- `backend/tests/test_signature_storage_id.py`
- `src/lib/api.ts` 366-512 行