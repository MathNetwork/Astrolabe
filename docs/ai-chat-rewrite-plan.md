# AI Chat 模块重写计划

## 目标

AI Chat 前后端统一使用 astrolabe.json 的 `{ref, record}` 格式，替代旧的 signature.json。

## 核心设计

### 数据格式

astrolabe.json 是一个 content-addressable flat store：
- key = sha256(ref + record)[:12]
- value = { ref: [...], record: {...} }
- ref 长度决定 simplex 维度（1 = atom, 2 = edge, 3 = triangle, ...）
- face 条件：ref 中每个 hash 必须已存在（除 `["__self__"]` 创建 atom）

### `__self__` 约定

创建 atom 时客户端发 `ref: ["__self__"]`，后端生成 hash 后替换。
`"__self__"` 只能以 `["__self__"]` 的形式出现，混入其他位置 → 400。

### Content-addressable hash

- hash = sha256(canonical JSON of {ref, record})[:12]
- 同内容创建两次 → 同一个 hash（幂等）
- update_record → hash 重算 → BFS 传播到所有引用方
- 传播方向：只往高维走（atom → edge → triangle → ...），自然 bounded

## CRUD 端点（`/api/astrolabe`）

| Method | Path | 功能 |
|--------|------|------|
| POST | `/entries` | 创建 entry → 201（幂等） |
| PATCH | `/entries/{id}` | 合并更新 record → 200（hash 可能变，返回新 id） |
| DELETE | `/entries/{id}` | 级联删除 → 204 |

## 已完成

- [x] AstrolabeStorage: create_entry / update_record / delete_cascade
- [x] Content-addressable hash + BFS 传播
- [x] `__self__` 边界验证
- [x] astrolabe_router CRUD 端点
- [x] 前端 ToolWidgets / parseClaudeActions / skills.ts 重写
- [x] 清理 signature_crud、旧测试、api.ts 死代码
- [x] PATCH 路由适配 update_record 新返回类型 (new_hash, entry)

## 进行中

- [ ] AI Chat 端到端测试
- [ ] Claude CLI agent loop 问题（chat 模式下不应循环）

## 遗留

- signature_storage.py — network_analysis 模块仍依赖，需单独迁移
- SortOverview.tsx:6、api.ts:4 — 过时注释
- 3 个前端测试文件之前就 broken，与本次重写无关
- pattern.py:486 — counts_3 类型 bug，network_analysis 单独修

## Future Work

### 版本控制
当前模型是 content-addressable identity（hash 是内容指纹），update 时旧版本被覆盖，不保留历史。
如需版本控制，可扩展为：update 不删旧 entry，新建 entry + 一条 "supersedes" 关系指向旧版本（Git 模型）。
代价是数据量膨胀，当前场景暂不需要。

### 更高维 simplex 的 UI 支持
目前 UI 主要展示 atom 和 edge。triangle 及更高维 simplex 的可视化和交互需要单独设计。

### network_analysis 迁移到 AstrolabeStorage
完全去除 SignatureStorage 依赖。
