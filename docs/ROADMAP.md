# Astrolabe 开发路线图

> 初始日期：2026-04-02
> 最后更新：2026-04-02
> 基于：OpenGauss 调查报告、编排能力深度分析、自检报告

---

## 现状总览

### 核心平台（全部工作正常）

| 能力 | 状态 | 说明 |
|------|------|------|
| Content-addressable store | ✅ | 369 entries, 101 atoms, 268 edges (hessenberg) |
| Well-formedness 验证 | ✅ | 五条公理全部通过 |
| MCP Server (16 tools) | ✅ | Core 9 + LeanNets 5 + Lean 2 |
| REST API | ✅ | 10 endpoints，与 MCP 对齐 |
| Plugin 架构 | ✅ | Core + LeanNets + Lean 分离 |
| Semantic propagation | ✅ | 反向 BFS，修改一个 entry 可追踪 22 个 affected |
| Network metrics | ✅ | PageRank 等 11 种指标 |
| Formalization frontier | ✅ | 9 个未形式化 tex atoms |
| Cross-source edge | ✅ | tex ↔ lean 对应关系管理 |
| MDX 文档 + 自动编号 | ✅ | 前端渲染正常 |
| MCP 路径自动解析 | ✅ | 项目根 / .astrolabe/ / astrolabe.json 三种路径均兼容 |
| Astrolabe Code slash commands | ✅ | /store, /frontier, /propagate, /avalidate, /metrics |
| ASTROLABE.md convention 注入 | ✅ | astrolabe-code 启动时自动读取 |
| Tauri 桌面应用 + xterm.js 终端 | ✅ | Claude Code CLI 集成 |
| lean-lsp-mcp 自动注入 | ✅ | 检测 lakefile → 自动注入 lean-lsp-mcp server |
| Lean MCP tools | ✅ | lean_project_info + lean_sorry_scan |

### 测试覆盖

| 模块 | 测试数 | 状态 |
|------|--------|------|
| MCP | 32 | ✅ 全过（含 12 个 Lean 测试） |
| Backend | 172 | ⚠️ 5 个 import error（venv 环境问题） |
| Tauri (Rust) | 39 | ✅ 全过 |
| Frontend | 0 | ❌ 无测试 |

### OpenGauss 编排能力分析结论

OpenGauss 的复杂性大部分来自"在外部启动另一个 Claude Code 子进程"——隔离 HOME、credential staging、stream-json 解析、PTY 管理。astrolabe-code 自己就是 Claude Code，这些全部不需要。

真正有价值且需要移植的：
1. **Session Contract**（4 条原则）→ 写入 sub-agent prompt
2. **Proof 策略 prompt**→ 内联到 slash command
3. **lean_status 状态追踪**→ 映射到 store 的 `state` 字段（`proven`/`sorry`）
4. **sorry/verified 检测**→ 已在 `lean_sorry_scan` 中实现

不需要移植的：隔离 HOME、credential staging、stream-json 解析、PTY attach/detach、SwarmManager、checkpoint_manager、Codex backend、lean4-skills git clone。

---

## 已完成

### Phase 1：Lean 基础设施接入 ✅

| 完成项 | 说明 |
|--------|------|
| lean-lsp-mcp 自动注入 | `config.ts` 自动检测 lakefile，注入 lean-lsp-mcp server（含 `lean/` 子目录搜索） |
| Lean MCP tools | `lean_project_info` + `lean_sorry_scan`，12 个新测试全部通过 |
| MCP server 注册 | 14 → 16 tools，`server.py` 注册 lean_tools |
| 端到端验证 | hessenberg-digraphs 项目：检测到 `lean/` 子目录，sorry 扫描找到第 476 行 |

跳过项：lean4-skills 安装（不在官方 marketplace，改用内联 prompt 方案替代）

---

## 待修复清单

### P0（已清零）

~~lean-lsp-mcp 未注入~~ → Phase 1 已完成
~~lean4-skills 未安装~~ → 改用内联 prompt，不需要外部插件

### P1（影响数据质量和开发体验）

| # | 问题 | 修复方式 | 归属 Phase |
|---|------|---------|-----------|
| 1 | 14 个 lean atoms 缺少 state 字段 | lean_sync_state 批量补充 | Phase 3 |
| 2 | 23 个 tex atoms 未形式化 | /smart-prove 能力 | Phase 5 |
| 3 | 用户级 skills 污染 system prompt | astrolabe-code 过滤或隔离 | Phase 0 |
| 4 | store_summary 的 no_state 统计混淆 | 分开统计 no_state_proof vs no_state_other | Phase 0 |
| 5 | 前端零测试 | 补充基础测试 | Phase 0 |
| 6 | 5 个后端测试 import error | 修复 venv 依赖 | Phase 0 |

### P2（低优先级）

| # | 问题 | 备注 |
|---|------|------|
| 7 | MCP tool description 未标注 path 含义 | resolve_store_path 已兜底 |
| 8 | REST 有 profile/mtime 但 MCP 没有 | 内部用，不需要 |

---

## Phase 0：基础修复（1 天）

### 目标

解决 P1 中不依赖 Lean 集成的已知问题。

### 步骤

1. **修复后端测试 import error**：确认 venv 激活后 172 个测试全部通过
2. **修复 store_summary 统计**：将 `no_state` 拆分为 `no_state_proof` 和 `no_state_other`
3. **修复 skills 污染**：在 ASTROLABE.md 中声明 identity boundary
4. **改进 MCP tool description**：`path` 参数加注"传项目根目录"

### 验证标准

- [ ] `python3 -m pytest backend/tests/` 在 venv 内 172/172 通过
- [ ] `store_summary` 输出区分 `no_state_proof` 和 `no_state_other`
- [ ] MCP tool 的 `path` 参数 description 包含"项目根目录"字样

---

## Phase 2：/prove 和 /sorry 命令（1 天）

### 目标

在 astrolabe-code 中实现 `/prove` 和 `/sorry` slash commands。`/prove` 是核心——收集 Astrolabe 网络上下文，构建 Lean prover prompt，让 agent 用 lean-lsp-mcp 去证明。

### 步骤

#### 2.1 `/prove` slash command

**文件**：`astrolabe-code/src/commands/astrolabe/index.ts`

prompt-type command，接受 hash 或 theorem 描述作为参数。Prompt 构建流程：

1. 调 `get` MCP tool 获取 theorem statement
2. 调 `cross_source` 检查有无 tex 版本（informal proof hint）
3. 调 `query` 获取依赖的已证明引理（proof context）
4. 调 `lean_project_info` 获取 Lean 项目路径
5. 组装完整 prompt，包含：
   - Session Contract（来自 OpenGauss 的 4 条原则）
   - theorem statement + 依赖 + tex hint
   - 工具使用指令（lean-lsp-mcp 编译、Read/Edit 修改 .lean 文件）
   - 成功条件（消除 sorry，编译无错误）
   - 失败处理（3 次尝试后报告阻塞原因）

#### 2.2 `/sorry` slash command

**文件**：同上

调 `lean_sorry_scan` MCP tool，列出所有 sorry 的文件和行号。

#### 2.3 注册到 commands.ts

导入并添加到 COMMANDS 数组。

### 验证标准

- [ ] `/prove <hash>` 生成包含 theorem statement 和 Session Contract 的 prompt
- [ ] `/prove` 无参数时显示 usage 提示
- [ ] `/sorry` 调 lean_sorry_scan 并列出结果
- [ ] 原有 5 个 astrolabe commands 不受影响

---

## Phase 3：lean_sync_state + /sync-lean（1 天）

### 目标

实现 `lean_sync_state` MCP tool，将 Lean 编译结果同步到 Astrolabe store 的 state 字段。配合 `/sync-lean` 命令手动触发。

### 步骤

#### 3.1 `lean_sync_state` MCP tool

**文件**：`Astrolabe/mcp/lean_tools.py`

核心 glue 逻辑：
1. 调 `lean_sorry_scan` 获取所有 sorry 位置
2. 扫描 `.lean` 文件，提取 theorem/def 声明名
3. 与 store 中 `source=lean` 的 atoms 匹配（按 title）
4. 更新 `state` 字段：
   - 声明存在且无 sorry → `"proven"`
   - 声明存在且有 sorry → `"sorry"`
   - 声明不存在 → 不修改
5. 写回 `astrolabe.json`（触发 hash propagation）
6. 返回 `{updated: N, proven: M, sorry: K}`

**附带修复**：执行一次可解决 P1 #1（14 个 lean atoms 缺少 state）。

#### 3.2 `/sync-lean` slash command

**文件**：`astrolabe-code/src/commands/astrolabe/index.ts`

调 `lean_sync_state`，报告更新了哪些 atoms。

#### 3.3 测试

- `test_lean_sync_state`：fixture store + 模拟 .lean 文件，确认 state 更新正确
- `test_lean_sync_state_preserves_wellformedness`：更新后 validate 仍通过
- 集成测试：对 hessenberg-digraphs 运行，确认 14 个 atoms 被赋值

### 验证标准

- [ ] `lean_sync_state` 对 hessenberg 正确识别 proven/sorry atoms
- [ ] 更新后 store 仍 well-formed（validate 通过）
- [ ] `/sync-lean` 输出更新数量和具体 atom 名
- [ ] MCP 测试全部通过

---

## Phase 4：Lean Prover Agent（2 天）

### 目标

定义专用的 Lean prover sub-agent，让 `/prove` 能真正启动 AgentTool 去操作 Lean 文件。

### 步骤

#### 4.1 Agent 定义

**文件**：`astrolabe-code/src/agents/lean-prover.md`（frontmatter agent）

```markdown
---
name: lean-prover
description: Lean 4 proof specialist
tools: [Read, Edit, Bash, mcp_lean-lsp_*]
effort: thorough
---

You are a Lean 4 proof specialist working within an Astrolabe knowledge network.

## Session Contract
- Work only inside the current Lean project.
- Prefer Lean/LSP-first workflows and use the lean-lsp-mcp server.
- Keep changes reproducible and explain blockers clearly.
- Do not modify theorem statements, only fill in proofs.

## Workflow
1. Read the .lean file and locate the theorem
2. Attempt proof using Lean tactics (prefer simp, norm_num, ring, omega first)
3. Compile via lean-lsp-mcp to check for errors
4. If sorry remains, analyze the error and try a different approach
5. After 3 failed attempts, report the blocking error

## Constraints
- Do not add new imports unless necessary
- Prefer simple tactic proofs before complex strategies
- Report success or failure clearly with the final state
```

#### 4.2 升级 /prove 为 agent-based

修改 `/prove` 的 prompt，改为通过 AgentTool 启动 lean-prover sub-agent：
- 主 agent 收集 Astrolabe 网络上下文（theorem + hints + deps）
- 将上下文注入 sub-agent prompt
- Sub-agent 执行 Lean 操作
- 主 agent 调 `lean_sync_state` 更新 store

#### 4.3 PostToolUse 自动同步

在 astrolabe-code 的 hook 配置中：检测到 lean-lsp-mcp 编译完成后，提示调 `lean_sync_state`。

### 验证标准

- [ ] `/prove <hash>` 启动 lean-prover sub-agent
- [ ] Sub-agent 能读写 .lean 文件并调 lean-lsp-mcp 编译
- [ ] 证明成功后 store 的 state 自动更新为 `proven`
- [ ] 证明失败后报告清晰的错误信息

---

## Phase 5：网络指导的 Proving（3 天）

### 目标

利用 Astrolabe 网络分析指导 proving 策略——核心差异化。

### 步骤

#### 5.1 `/smart-prove` workflow

组合 workflow：
1. 调 `frontier` 获取最值得证明的 atom（PageRank 排序）
2. 调 `propagate` 分析上下游依赖
3. 调 `cross_source` 获取 tex informal hint
4. 调 `metrics` 查看已证明依赖（proof context）
5. 用收集到的信息构建增强 prompt → 启动 lean-prover agent
6. 成功 → `lean_sync_state` 更新 store
7. 失败 → 报告原因，建议下一个目标

#### 5.2 `/batch-prove` workflow

1. 调 `frontier` 获取 top N
2. 调 `skeleton` 做拓扑排序（先证 leaves）
3. 按 DAG 顺序逐个 `/smart-prove`
4. 每次 prove 后更新 store
5. 最终报告：成功/失败/剩余

#### 5.3 差异化能力矩阵

| 策略 | OpenGauss `/autoprove` | Astrolabe `/smart-prove` |
|------|----------------------|------------------------|
| 选择目标 | 顺序遍历 | PageRank 加权 |
| 依赖感知 | 无 | propagation 追踪影响链 |
| Informal hint | 无 | cross_source 从 tex 获取 |
| 执行顺序 | 独立 | DAG 拓扑排序 |
| 进度追踪 | swarm lean_status | store state + network 可视化 |

### 验证标准

- [ ] `/smart-prove` 自动选择 frontier 中 PageRank 最高的 atom
- [ ] prompt 中包含 tex 的 informal hint（如有 cross-source edge）
- [ ] `/batch-prove` 按拓扑顺序执行
- [ ] 执行后 store 中 proven 数量增加

---

## Phase 6：验证结果可视化（1 天）

### 目标

Proving 过程在 Astrolabe UI 上实时可见。

### 步骤

1. **前端 lean badge**：根据 state 显示颜色（proven=绿, sorry=黄, error=红）
2. **`/store` 增强**：prove 前后的 diff（新增 proven, 减少 sorry）
3. **实时高亮**：prove 执行时高亮当前节点

### 验证标准

- [ ] Network View 中 lean atoms 显示正确颜色 badge
- [ ] `/store` 反映 prove 前后的变化

---

## 不做的事

| 排除项 | 理由 |
|--------|------|
| 从 OpenGauss 移植代码 | 用内联 prompt 替代 lean4-skills 插件 |
| 隔离 HOME / credential staging | astrolabe-code 自身就是 Claude Code |
| stream-json 解析 / PTY | AgentTool 直接返回结果 |
| SwarmManager / 多 agent 并行 | 单 agent 够用 |
| checkpoint_manager | git worktree isolation + session JSONL 替代 |
| RL 训练 | 短期不需要 |
| Gateway / Browser / TTS | 不相关 |

---

## 总时间线

```
Phase 0 ─── 基础修复 ──────────── 1 天 ──── 无依赖
Phase 2 ─── /prove + /sorry ───── 1 天 ──── 无依赖（可与 Phase 0 并行）
Phase 3 ─── lean_sync_state ───── 1 天 ──── 依赖 Phase 2
Phase 4 ─── Lean Prover Agent ─── 2 天 ──── 依赖 Phase 3
Phase 5 ─── 网络指导 Proving ──── 3 天 ──── 依赖 Phase 4
Phase 6 ─── 可视化联动 ────────── 1 天 ──── 依赖 Phase 5
```

**关键里程碑**：
- Phase 2 完成 → `/prove` 能跑，agent 可以尝试 Lean 证明
- Phase 3 完成 → store 与 Lean 状态双向同步
- Phase 4 完成 → 专用 Lean prover agent，完整证明闭环
- Phase 5 完成 → 核心差异化（网络指导 proving）
- Phase 6 完成 → 可视化体验

总计约 **9 天**。Phase 2-3（2 天）做完即具备基本 Lean 验证能力。Phase 4-5 是核心价值。
