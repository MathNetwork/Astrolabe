# Astrolabe 自检 + OpenGauss 对比报告

> 日期：2026-04-02

---

## 1. 项目全貌

### 测试覆盖

| 模块 | 测试文件 | 测试数 | 状态 |
|------|---------|--------|------|
| MCP | `mcp/test_tools.py` | 20 | ✅ 全过 |
| Backend | `backend/tests/` (17 文件) | 172 | ⚠️ 5 个 import error（需在 venv 内跑） |
| Frontend | 无 | 0 | ❌ 无前端测试 |
| Tauri | `src-tauri/src/claude.rs` | 39 | ✅ 全过 |

### REST API vs MCP 对齐

| REST Endpoint | MCP Tool | 一致？ |
|---|---|---|
| `GET /entries` | `query` | ✅ |
| `GET /entries/{hash}` | `get` | ✅ |
| `POST /entries` | `create` | ✅ |
| `DELETE /entries/{hash}` | `delete` | ✅ |
| `PATCH /entries/{hash}` | `update` | ✅ |
| `GET /stages` | `stages` | ✅ |
| `GET /ref-graph` | `ref_graph` | ✅ |
| `GET /analyze` | `metrics` | ✅ |
| `GET /graph` | `skeleton` | ✅ |
| `GET /propagate` | `propagate` | ✅ |
| — | `store_summary` | MCP 独有 ✅ |
| — | `cross_source` | MCP 独有 ✅ |
| — | `frontier` | MCP 独有 ✅ |
| — | `validate` | MCP 独有 ✅ |
| `GET /profile/{hash}` | — | REST 独有 |
| `GET /mtime` | — | REST 独有（内部用） |
| `GET /api/project/*` | — | REST 独有（文件管理） |
| `GET /api/docs/*` | — | REST 独有（MDX 文档） |

### 文档

| 文档 | 存在？ | 状态 |
|------|--------|------|
| CLAUDE.md | ✅ | 开发规范，与代码一致 |
| ASTROLABE.md (hessenberg) | ✅ | convention，刚创建 |
| docs/opengauss-analysis.md | ✅ | OpenGauss 调查报告 |
| docs/lean-integration-plan.md | ✅ | Lean 集成规划 |
| README.md (Astrolabe) | ❓ | 未检查 |
| README.md (astrolabe-code) | ✅ | 已重写 |

---

## 2. MCP Tools 自检

### 可用性（14/14 通过）

| Tool | 状态 | 备注 |
|------|------|------|
| `store_summary` | ✅ | 369 entries, 101 atoms, 268 edges |
| `query` | ✅ | degree/sort/source 过滤均正常 |
| `get` | ✅ | 有效 hash 返回 entry，无效返回 error |
| `create` | ✅ | （测试套件验证） |
| `update` | ✅ | （测试套件验证） |
| `delete` | ✅ | （测试套件验证） |
| `validate` | ✅ | valid=true, entry_count=369 |
| `stages` | ✅ | 返回 flat dict {hash: stage} |
| `ref_graph` | ✅ | 369 nodes, 536 links |
| `propagate` | ✅ | ef81140750b3 → 22 affected |
| `skeleton` | ✅ | 101 nodes |
| `metrics` | ✅ | pagerank top: 9ed01c6e8e80 (0.167) |
| `cross_source` | ✅ | 正确返回 counterpart 或 null |
| `frontier` | ✅ | 9 unformalized, top: Givens factor |

### 路径一致性：✅ 通过

三种路径格式（项目根、.astrolabe/、.astrolabe/astrolabe.json）均返回 count=101。

### 错误处理：✅ 通过

- 不存在的 hash → `{"error": "Entry 'NONEXISTENT' not found"}`
- validate 在空 store 上返回 `{"valid": true, "entry_count": 0}`

### Description 质量：⚠️ 需改进

- `path` 参数没说明应该传项目根目录（模型常传 `.astrolabe` 路径）
- 虽然 `resolve_store_path` 已修复了路径解析，但 description 仍应明确

---

## 3. Astrolabe Code 自检

### ASTROLABE.md 加载：✅ 通过

hessenberg-digraphs 有 ASTROLABE.md，astrolabe-code 启动时读取成功（`hasAstrolabeMd=true`）。

### MCP 自动检测：✅ 通过（-p 模式）

`-p` 模式下 14 个 tools 全部注册。交互模式在 Tauri 面板中偶尔有问题（scope/连接相关）。

### Slash Commands

| 命令 | 状态 | 备注 |
|------|------|------|
| `/store` | ✅ | 调 store_summary，输出表格+分析 |
| `/frontier` | ✅ | 调 frontier |
| `/propagate` | ✅ | 需要 hash 参数 |
| `/avalidate` | ✅ | 调 validate |
| `/metrics` | ✅ | 调 metrics pagerank |

### System Prompt

- "你是谁" → ✅ 回答 Astrolabe Code
- "功能" → ⚠️ 因为用户级 skills（~/.claude/skills/ 里 150+ 科学技能）会被注入，所以回答包含"基因组学"等
- "entry 是什么" → ✅ 直接解释（ASTROLABE.md convention 已注入）

---

## 4. 能力缺口

### Astrolabe 缺的（vs OpenGauss）

| 能力 | 状态 | 严重度 |
|------|------|--------|
| Lean LSP 交互 | 未接入（lean-lsp-mcp 可用但未注入） | 🔴 |
| /prove workflow | 未装 lean4-skills | 🔴 |
| /autoprove workflow | 未装 lean4-skills | 🔴 |
| /formalize workflow | 未装 lean4-skills | 🟡 |
| sorry 扫描 | MCP tool 未实现 | 🟡 |
| lean_status 自动同步 | store 有 state 字段但无自动更新 | 🟡 |
| Batch 验证 | 无 | 🟡 |
| DAG 顺序调度 | skeleton graph 有拓扑但无调度器 | 🟡 |
| Swarm 并行 | 无 | 🟢 |
| RL 训练 | 无 | 🟢 |
| Checkpoint/Resume | 无 | 🟢 |

### Astrolabe 独有的

| 能力 | 工作正常？ |
|------|-----------|
| Content-addressable store | ✅ |
| Well-formedness 验证 (Def 2.2) | ✅ valid=true |
| Semantic propagation（反向 BFS） | ✅ 22 affected from Break entry |
| Network metrics（PageRank 等 11 种） | ✅ |
| Formalization frontier | ✅ 9 unformalized atoms |
| Cross-source edge 管理 | ✅ |
| MDX 文档 + 自动编号 | ✅（前端渲染） |
| Store summary 一键查看 | ✅ |
| Plugin 架构（Core/LeanNets 分离） | ✅ |
| MCP 路径自动解析 | ✅ 三种路径均工作 |

### Hessenberg 数据质量

| 指标 | 值 | 说明 |
|------|-----|------|
| 总 entries | 369 | |
| Atoms | 101 | |
| Edges | 268 | 2.7 edges/atom，密度良好 |
| tex atoms | 35 | |
| lean atoms | 61 | lean > tex，有 lean-only 辅助引理 |
| bib atoms | 5 | |
| proven | 22 | 36% 的 lean atoms |
| sorry | 1 | ⚠️ 需要关注 |
| no_state | 38 | 24 个是 proof（不需要 state），14 个是其他 |
| 未形式化 tex atoms | 23 (of 35) | 66% 未形式化 |
| Well-formedness | ✅ valid | |

**24 个 no_state lean atoms 全是 sort=proof**——proof 对象不需要 state 字段，这是合理的。剩下 14 个 no_state 的 lean atoms 可能是 definition/lemma 等需要补充 state。

---

## 5. Lean 集成准备度

| 检查项 | 状态 |
|--------|------|
| `uvx` 可执行 | ✅ `/Users/moqian/.local/bin/uvx` |
| `lean-lsp-mcp` 可安装 | ✅ `uvx --from lean-lsp-mcp lean-lsp-mcp --help` 正常 |
| lean4-skills 引用 | ❌ astrolabe-code 中无任何引用 |
| hessenberg-digraphs 有 lakefile | ✅ `lean/lakefile.toml`（Lean 项目在 `lean/` 子目录） |
| Lean 项目可编译 | ✅ `lake build` 8027 jobs 全部通过（有 linter 警告 + 1 处 sorry） |

**Lean 项目结构：** `hessenberg-digraphs/lean/` 下有完整 Lean 4 项目：
- `lakefile.toml` — 依赖 mathlib v4.28.0
- `lean-toolchain` — leanprover/lean4:v4.28.0
- `HessenbergDigraphs.lean` — 主文件（~880 行）
- `lake build` 编译成功，1 处 sorry（第 476 行），其余均为 linter 警告

---

## 6. 问题汇总 + 优先级

### 🔴 必须修

1. **lean-lsp-mcp 未注入**——`uvx` 可用但 astrolabe-code 不会自动启动它
2. **lean4-skills 未安装**——`/prove` 等 workflow 不可用

### 🟡 建议修

3. **14 个 lean atoms 缺少 state 字段**——不是 proof 的 lean atoms 应该有 state
4. **23 个 tex atoms 未形式化**——frontier 工具能找到它们，但没有自动 prove 能力
5. **用户级 skills 污染 system prompt**——150+ 科学技能被注入，"基因组学"等出现在自我介绍中
6. **store_summary 的 no_state 计数包含 proof**——应该分开统计：no_state_theorem vs no_state_proof
7. **前端零测试**——需要补充
8. **5 个后端测试 import error**——需在 venv 内跑

### 🟢 低优先级

9. MCP tool description 未标注 path 应传项目根目录（已有 resolve 兜底）
10. REST 有 `profile/{hash}` 和 `mtime` 接口但 MCP 没有（内部用，不需要）
11. Swarm 并行、RL 训练（短期不需要）
