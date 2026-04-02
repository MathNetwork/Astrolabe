# Astrolabe 开发路线图

> 生成日期：2026-04-02
> 基于：OpenGauss 调查报告、Lean 集成规划、自检报告

---

## 现状总览

### 核心平台（全部工作正常）

| 能力 | 状态 | 说明 |
|------|------|------|
| Content-addressable store | ✅ | 369 entries, 101 atoms, 268 edges (hessenberg) |
| Well-formedness 验证 | ✅ | 五条公理全部通过 |
| MCP Server (14 tools) | ✅ | query/get/create/update/delete/validate/stages/ref_graph/propagate/skeleton/metrics/cross_source/frontier/store_summary |
| REST API | ✅ | 10 endpoints，与 MCP 对齐 |
| Plugin 架构 | ✅ | Core + LeanNets 分离 |
| Semantic propagation | ✅ | 反向 BFS，修改一个 entry 可追踪 22 个 affected |
| Network metrics | ✅ | PageRank 等 11 种指标 |
| Formalization frontier | ✅ | 9 个未形式化 tex atoms |
| Cross-source edge | ✅ | tex ↔ lean 对应关系管理 |
| MDX 文档 + 自动编号 | ✅ | 前端渲染正常 |
| MCP 路径自动解析 | ✅ | 项目根 / .astrolabe/ / astrolabe.json 三种路径均兼容 |
| Astrolabe Code slash commands | ✅ | /store, /frontier, /propagate, /avalidate, /metrics |
| ASTROLABE.md convention 注入 | ✅ | astrolabe-code 启动时自动读取 |
| Tauri 桌面应用 + xterm.js 终端 | ✅ | Claude Code CLI 集成 |

### 测试覆盖

| 模块 | 测试数 | 状态 |
|------|--------|------|
| MCP | 20 | ✅ 全过 |
| Backend | 172 | ⚠️ 5 个 import error（venv 环境问题） |
| Tauri (Rust) | 39 | ✅ 全过 |
| Frontend | 0 | ❌ 无测试 |

### Hessenberg 项目数据质量

| 指标 | 值 |
|------|-----|
| Store entries | 369 (101 atoms + 268 edges) |
| tex atoms | 35 |
| lean atoms | 61 (lean > tex，含辅助引理) |
| bib atoms | 5 |
| proven | 22 (36% lean atoms) |
| sorry | 1 (HessenbergDigraphs.lean:476) |
| 无 state 的 lean atoms | 14 (非 proof，需补充) |
| 未形式化 tex atoms | 23/35 (66%) |
| Lean 项目 | `lean/` 子目录，mathlib v4.28.0，`lake build` 通过 |

### OpenGauss 对比结论

OpenGauss 通过 lean-lsp-mcp（Lean LSP 封装）+ lean4-skills（Claude Code 插件）间接操作 Lean，不直接调 `lake build`。Astrolabe 采取相同策略：不移植 OpenGauss 代码，直接使用同样的外部工具，用 Astrolabe 的网络分析能力（PageRank、propagation、frontier）指导 proving 策略——这是 OpenGauss 不具备的差异化优势。

OpenGauss 中不需要的部分：Gateway（Slack/Telegram）、Browser tools、Image/TTS、Home Assistant、ACP adapter、RL 训练（短期）。

---

## 待修复清单

开始新 Phase 之前，先解决已知问题。按严重度排序：

### P0（阻塞 Lean 集成）

| # | 问题 | 修复方式 | 归属 Phase |
|---|------|---------|-----------|
| 1 | lean-lsp-mcp 未注入到 astrolabe-code | MCP 自动检测逻辑加 Lean 项目检测 | Phase 1 |
| 2 | lean4-skills 未安装 | 安装插件到 astrolabe-code | Phase 1 |

### P1（影响数据质量和开发体验）

| # | 问题 | 修复方式 |
|---|------|---------|
| 3 | 14 个 lean atoms 缺少 state 字段 | lean_sync_state 工具批量补充 → Phase 2 |
| 4 | 23 个 tex atoms 未形式化 | frontier 已能识别，/smart-prove 能力 → Phase 4 |
| 5 | 用户级 skills 污染 system prompt | astrolabe-code 启动时过滤或隔离用户级 skills |
| 6 | store_summary 的 no_state 统计混淆 | 分开统计 no_state_theorem vs no_state_proof |
| 7 | 前端零测试 | 补充基础测试 |
| 8 | 5 个后端测试 import error | 修复 venv 依赖 |

### P2（低优先级）

| # | 问题 | 备注 |
|---|------|------|
| 9 | MCP tool description 未标注 path 含义 | resolve_store_path 已兜底，改 description 即可 |
| 10 | REST 有 profile/mtime 但 MCP 没有 | 内部用，不需要 MCP 对应 |
| 11 | Swarm 并行、RL 训练 | 短期不需要 |

---

## Phase 0：基础修复（1 天）

### 目标

解决 P1 中不依赖 Lean 集成的已知问题，为后续 Phase 扫清障碍。

### 步骤

1. **修复后端测试 import error**：确认 venv 激活后 172 个测试全部通过
2. **修复 store_summary 统计**：在 `leannets_tools.py` 的 `store_summary` 中，将 `no_state` 拆分为 `no_state_proof`（合理，proof 不需要 state）和 `no_state_other`（需要补充）
3. **修复 skills 污染**：在 astrolabe-code 的 system prompt 构建中过滤与 Astrolabe 无关的用户级 skills，或在 ASTROLABE.md 中声明 identity boundary
4. **改进 MCP tool description**：`path` 参数加注"传项目根目录（含 .astrolabe/ 的目录）"

### 验证标准

- [ ] `python3 -m pytest backend/tests/` 在 venv 内 172/172 通过
- [ ] `store_summary` 输出区分 `no_state_proof` 和 `no_state_other`
- [ ] astrolabe-code 回答"你的功能"时不出现"基因组学"等无关技能
- [ ] MCP tool 的 `path` 参数 description 包含"项目根目录"字样

---

## Phase 1：Lean 基础设施接入（2 天）

### 目标

在 Astrolabe Code 里能调 Lean LSP，能跑 `/prove`，能检测 sorry。

### 步骤

#### 1.1 lean-lsp-mcp 自动注入

在 astrolabe-code 的 MCP 自动检测逻辑中加一层 Lean 项目检测：

- **检测条件**：项目目录或其子目录下有 `lakefile.lean` 或 `lakefile.toml`
- **动作**：自动注入 lean-lsp-mcp server
  ```json
  {
    "command": "uvx",
    "args": ["--from", "lean-lsp-mcp", "lean-lsp-mcp"],
    "env": { "LEAN_PROJECT_PATH": "<检测到的 Lean 项目路径>" }
  }
  ```
- **注意**：hessenberg-digraphs 的 Lean 项目在 `lean/` 子目录，路径解析需递归查找

#### 1.2 安装 lean4-skills

```bash
# 方式 1：Claude Code plugin marketplace
claude plugin marketplace add cameronfreer/lean4-skills
claude plugin install lean4

# 方式 2：直接 git clone 到 plugin 目录
```

确认 `/prove`、`/draft`、`/autoprove`、`/formalize` 等 workflow 在 astrolabe-code 中可用。

#### 1.3 Lean 项目路径约定

hessenberg-digraphs 的结构是根目录存 `.astrolabe/`（store），`lean/` 子目录存 Lean 项目。lean-lsp-mcp 的 `LEAN_PROJECT_PATH` 应指向 `lean/`，astrolabe MCP 的 `path` 指向根目录。两者共存，互不冲突。

### 验证标准

- [ ] 在 hessenberg-digraphs 下启动 astrolabe-code，`/mcp` 显示 astrolabe server + lean-lsp-mcp server
- [ ] lean-lsp-mcp 的 `LEAN_PROJECT_PATH` 正确指向 `lean/` 子目录
- [ ] `/prove` 命令可启动 prove workflow
- [ ] lean-lsp-mcp 能编译 `HessenbergDigraphs.lean`，返回诊断信息
- [ ] 在无 Lean 项目的目录下，lean-lsp-mcp 不会被注入（不报错）

---

## Phase 2：Lean MCP Tools（1 天）

### 目标

在 Astrolabe MCP server 中添加 Lean 专用 tools，让 agent 通过标准 MCP 协议查询和同步 Lean 状态。

### 步骤

#### 2.1 新建 `mcp/lean_tools.py`

```
mcp/
├── core_tools.py
├── leannets_tools.py
├── lean_tools.py        ← 新增
├── utils.py
└── server.py
```

#### 2.2 实现三个 tools

| Tool | 功能 | 输入 | 输出 |
|------|------|------|------|
| `lean_project_info` | Lean 项目基本信息 | `path` | lakefile 类型、toolchain 版本、module 列表 |
| `lean_sorry_scan` | 扫描 .lean 文件中的 sorry | `path` | `{file: [line_numbers]}` |
| `lean_sync_state` | 把 Lean 编译结果同步到 store | `path` | 更新了多少个 atom 的 state |

**`lean_sorry_scan`**：遍历 `.lean` 文件，正则匹配 `sorry`（排除注释和字符串），返回文件名和行号列表。

**`lean_sync_state`**（核心 glue 逻辑）：
1. 扫描 `.lean` 文件，提取 theorem/def 声明
2. 与 store 中 source=lean 的 atoms 匹配（按 title）
3. 根据编译结果更新 `state` 字段：无 sorry 且编译通过 → `proven`；有 sorry → `sorry`；编译失败 → `error`
4. 写回 `astrolabe.json`（触发 hash propagation）
5. 返回更新计数

**附带修复**：执行一次 `lean_sync_state` 可解决待修复清单 #3（14 个 lean atoms 缺少 state）。

#### 2.3 注册到 server.py

```python
from lean_tools import register_lean_tools
register_lean_tools(mcp)
```

#### 2.4 测试

新建 `mcp/test_lean_tools.py`：
- `test_lean_project_info`：指向 hessenberg-digraphs/lean/，确认返回 mathlib 依赖
- `test_lean_sorry_scan`：构造含 sorry 的临时 .lean 文件，确认检测到正确行号
- `test_lean_sync_state`：用 fixture store + 模拟编译结果，确认 state 更新正确且 hash 重算

### 验证标准

- [ ] `lean_project_info` 对 hessenberg-digraphs/lean/ 返回 toolchain=v4.28.0, dep=mathlib
- [ ] `lean_sorry_scan` 检测到 HessenbergDigraphs.lean:476 的 sorry
- [ ] `lean_sync_state` 运行后，store 中 14 个缺 state 的非 proof lean atoms 被正确赋值
- [ ] `python3 -m pytest mcp/test_lean_tools.py` 全部通过
- [ ] `validate` 确认更新后 store 仍然 well-formed

---

## Phase 3：Store <-> Lean 自动同步（2 天）

### 目标

Lean 验证结果自动反映到 store 和 UI。用户不需要手动调 `lean_sync_state`。

### 步骤

#### 3.1 自动同步流程

```
用户说 "验证 Theorem 4.3"
  → agent 调 lean-lsp-mcp 编译
  → 编译结果返回
  → agent 调 lean_sync_state 更新 store
  → astrolabe.json 文件变化
  → file watcher 触发 UI 更新
  → lean badge 颜色变化（sorry=黄, proven=绿, error=红）
```

#### 3.2 PostToolUse hook

在 astrolabe-code 的 hook 系统中：检测到 lean-lsp-mcp 的编译相关 tool 返回后，自动调 `lean_sync_state`。这样每次 Lean 编译后 store 自动更新。

#### 3.3 新增 slash commands

| 命令 | 功能 |
|------|------|
| `/sync-lean` | 手动触发 lean_sync_state，报告更新了哪些 atoms |
| `/sorry` | 调 lean_sorry_scan，列出所有 sorry 的文件和行号 |

#### 3.4 前端 lean badge

在 Network View 的节点上，根据 lean atom 的 state 显示颜色 badge：
- `proven` → 绿色
- `sorry` → 黄色
- `error` → 红色
- 无 state（非 proof） → 灰色

### 验证标准

- [ ] 通过 lean-lsp-mcp 编译一个 theorem 后，store 的 state 自动更新（无需手动操作）
- [ ] `/sync-lean` 输出更新数量和具体 atom 名
- [ ] `/sorry` 正确列出 HessenbergDigraphs.lean:476
- [ ] Network View 中 lean atoms 显示正确的颜色 badge
- [ ] 修改一个 theorem 使其通过后，badge 从黄/红变绿

---

## Phase 4：网络指导的 Proving（3 天）

### 目标

利用 Astrolabe 的网络分析能力指导 proving 策略——这是相对于 OpenGauss 的核心差异化。OpenGauss 的 `/autoprove` 对每个 theorem 独立操作；Astrolabe 利用 PageRank、propagation、cross-source 和依赖结构做全局优化。

### 步骤

#### 4.1 `/smart-prove` workflow

组合 workflow（prompt 类型 slash command），执行流程：

1. 调 `frontier` 获取最值得证明的 atom（PageRank 加权排序）
2. 调 `propagate` 分析该 atom 的上下游依赖（prove 它能 unblock 哪些后续工作）
3. 调 `cross_source` 检查有无对应 tex 描述（informal proof hint）
4. 调 `metrics` 查看依赖 atoms 中哪些已 proven（可用的 proof context）
5. 组装 prompt：theorem statement + 依赖关系 + tex hint + 已有 proof context
6. 调 lean-lsp-mcp 尝试 prove
7. 成功 → `lean_sync_state` 更新 store → badge 变绿
8. 失败 → 分析 Lean 错误信息，调整策略或跳过

#### 4.2 `/batch-prove` workflow

批量验证流程：

1. 调 `frontier` 获取 top N 未证明 atoms
2. 调 `skeleton` graph 做拓扑排序（先证 leaves，后证依赖者）
3. 按 DAG 顺序逐个 prove（每个用 `/smart-prove` 的信息收集策略）
4. 每次 prove 后 `lean_sync_state` 更新 store
5. 最终报告：证了几个、失败几个、还剩几个、下次建议从哪里开始

#### 4.3 差异化能力矩阵

| 策略 | OpenGauss `/autoprove` | Astrolabe `/smart-prove` |
|------|----------------------|------------------------|
| 选择目标 | 顺序遍历 | PageRank 加权，先证最重要的 |
| 依赖感知 | 无 | propagation 知道改一个 def 影响什么 |
| Informal hint | 无 | cross_source 从 tex 获取 proof sketch |
| 执行顺序 | 独立并行 | DAG 拓扑排序，先证 leaf 后证 root |
| 进度追踪 | swarm lean_status | store state + network 可视化 |

### 验证标准

- [ ] `/smart-prove` 能自动选择 frontier 中 PageRank 最高的 atom
- [ ] prove 时 prompt 中包含 tex 的 informal hint（如果有 cross-source edge）
- [ ] `/batch-prove` 按拓扑顺序执行（不会在依赖未证明时尝试证明依赖者）
- [ ] 执行后 store 中 proven 数量增加，`/store` 统计反映变化
- [ ] 失败的 atom 不会无限重试，报告清晰的失败原因

---

## Phase 5：验证结果可视化（1 天）

### 目标

Proving 过程在 Astrolabe UI 上实时可见，提供直观的进度反馈。

### 步骤

#### 5.1 实时高亮

- `/smart-prove` 或 `/batch-prove` 执行时，Network View 高亮当前正在 prove 的节点（脉冲动画）
- prove 成功 → 节点平滑过渡到绿色
- prove 失败 → 节点闪烁红色后恢复
- 通过 MCP tool 写事件到临时文件 → file watcher → 前端响应

#### 5.2 进度仪表盘

扩展 `/store` 的输出，在 batch-prove 过程中实时显示：
- 已证明 / 总目标
- 当前正在处理的 atom
- 预估剩余量

#### 5.3 历史对比

在 store_summary 中加入与上次 sync 的 diff：新增了几个 proven，减少了几个 sorry。

### 验证标准

- [ ] batch-prove 执行时 Network View 中能看到节点颜色实时变化
- [ ] `/store` 在 prove 前后输出的 proven/sorry 计数变化正确
- [ ] 高亮动画不影响 UI 性能（100+ 节点不卡顿）

---

## 不做的事

明确排除以下能力，避免 scope creep：

| 排除项 | 理由 |
|--------|------|
| 从 OpenGauss 移植代码 | 用同样的外部工具，不需要搬代码 |
| RL 训练（Atropos/Tinker） | 短期不需要，Lean proving 用 agent loop 够了 |
| Batch runner（multiprocessing） | `/batch-prove` 用 agent loop 逐个跑，不需要多进程 |
| SwarmManager（多 agent 并行） | 单 agent 够用，后续优化再考虑 |
| Gateway（Slack/Telegram/Discord） | Astrolabe 不需要聊天平台集成 |
| Browser/Image/TTS tools | 不相关 |
| ACP adapter | 有 MCP 就够了 |

---

## 总时间线

```
Phase 0 ─── 基础修复 ──────────── 1 天 ──── 无依赖
Phase 1 ─── Lean 基础设施接入 ──── 2 天 ──── 无依赖（可与 Phase 0 并行）
Phase 2 ─── Lean MCP Tools ────── 1 天 ──── 依赖 Phase 1
Phase 3 ─── Store↔Lean 自动同步 ── 2 天 ──── 依赖 Phase 2
Phase 4 ─── 网络指导 Proving ───── 3 天 ──── 依赖 Phase 3
Phase 5 ─── 可视化联动 ─────────── 1 天 ──── 依赖 Phase 4
```

**关键里程碑**：
- Phase 0-1 完成 → Lean 编译能力可用，`/prove` 能跑
- Phase 2-3 完成 → Store 与 Lean 状态双向同步，基本可用的 Lean 验证闭环
- Phase 4 完成 → 核心差异化能力上线（网络指导的 proving）
- Phase 5 完成 → 完整的可视化体验

总计约 **10 天**。Phase 0-3（6 天）做完即具备完整的 Lean 验证能力。Phase 4 是差异化核心。Phase 5 是锦上添花。
