# Lean 能力集成规划

## 核心策略

不从 OpenGauss 移植代码。直接使用同样的外部工具（lean-lsp-mcp + lean4-skills），通过 Astrolabe 的 MCP 和 store 把它们串起来。Astrolabe 的独有价值在于：用网络分析指导 proving 策略，用 store 追踪 formalization 进度。

---

## Phase 1：Lean 基础设施接入（2 天）

### 目标

在 Astrolabe Code 里能跑 `/prove`，能查 Lean 编译状态。

### 1.1 安装 lean-lsp-mcp

检查 `uvx --from lean-lsp-mcp lean-lsp-mcp` 是否可用。如果可用，在 astrolabe-code 的 MCP 自动检测逻辑（`src/services/mcp/config.ts`）中加一层：

检测条件：项目目录下有 `lakefile.lean` 或 `lakefile.toml`
动作：自动注入 lean-lsp-mcp server

```json
{
  "command": "uvx",
  "args": ["--from", "lean-lsp-mcp", "lean-lsp-mcp"],
  "env": { "LEAN_PROJECT_PATH": "<cwd>" }
}
```

跟 astrolabe MCP 自动检测同样的模式。

### 1.2 安装 lean4-skills

调查 lean4-skills 的安装方式：

```bash
# 方式 1：Claude Code plugin marketplace
claude plugin marketplace add cameronfreer/lean4-skills
claude plugin install lean4

# 方式 2：直接 git clone 到 plugin 目录
```

确认在 astrolabe-code 里也能用（可能需要改 plugin 加载路径）。

### 1.3 验证

在 hessenberg-digraphs 下启动 `astrolabe`：
- `/mcp` 显示 astrolabe server + lean-lsp-mcp server
- 输入 `/prove` 能启动 prove workflow
- 能编译 Lean 文件、能检测 sorry

---

## Phase 2：Lean MCP Tools（1 天）

### 目标

在 Astrolabe MCP server 里加 Lean 相关的 tools，让 agent 能通过标准 MCP 调用操作 Lean 状态。

### 2.1 新建 `mcp/lean_tools.py`

```
mcp/
├── core_tools.py
├── leannets_tools.py
├── lean_tools.py        ← 新增
├── utils.py
└── server.py
```

### 2.2 tools 定义

| Tool | 功能 | 输入 | 输出 |
|---|---|---|---|
| `lean_project_info` | Lean 项目基本信息 | `path` | lakefile 类型、toolchain 版本、module 列表 |
| `lean_sorry_scan` | 扫描 .lean 文件中的 sorry | `path` | `{file: [line_numbers]}` |
| `lean_sync_state` | 把 Lean 编译结果同步到 astrolabe store | `path` | 更新了多少个 atom 的 state |

### 2.3 `lean_sorry_scan` 实现

遍历项目下所有 `.lean` 文件，正则匹配 `sorry`（排除注释），返回每个文件的 sorry 位置。参考 OpenGauss 的 `swarm_manager.py:135`。

### 2.4 `lean_sync_state` 实现

核心 glue 逻辑：

1. 扫描 `.lean` 文件，提取所有 theorem/def 声明
2. 对比 astrolabe store 中的 lean atoms
3. 匹配上的：根据编译结果更新 `state` 字段
   - 编译通过且无 sorry → `state: "proven"`
   - 有 sorry → `state: "sorry"`
   - 编译失败 → `state: "error"`
4. 返回更新数量

### 2.5 server.py 注册

```python
from lean_tools import register_lean_tools
register_lean_tools(mcp)
```

### 2.6 测试

- `test_lean_sorry_scan`：构造含 sorry 的 .lean 文件，确认检测到
- `test_lean_sync_state`：模拟编译结果，确认 store 的 state 更新正确

---

## Phase 3：Store ↔ Lean 状态同步（2 天）

### 目标

Lean 验证结果自动反映到 astrolabe store 和 UI（lean badge 颜色变化）。

### 3.1 自动同步流程

```
用户在 astrolabe 里说 "验证 Theorem 4.3"
  → agent 调 lean-lsp-mcp 编译
  → 编译结果返回
  → agent 调 lean_sync_state 更新 store
  → astrolabe.json 变化
  → file watcher 触发 UI 更新
  → lean badge 颜色变化（sorry=黄 → proven=绿）
```

### 3.2 Astrolabe Code hook

在 astrolabe-code 的 PostToolUse hook 中：检测到 Lean 编译完成后，自动调 `lean_sync_state`。用户不需要手动同步。

### 3.3 slash command

| 命令 | prompt |
|---|---|
| `/sync-lean` | "调 lean_sync_state 同步 Lean 编译状态到 store，报告更新了哪些 atoms" |
| `/sorry` | "调 lean_sorry_scan 查看项目中所有 sorry，列出文件和行号" |

---

## Phase 4：网络指导的 Proving（3 天）

### 目标

这是 Astrolabe 独有的——用网络分析指导 proving 策略。

### 4.1 `/smart-prove` workflow

一个组合 workflow（prompt 类型 slash command）：

```
1. 调 frontier 获取最值得证明的 atom
2. 调 propagate 分析这个 atom 的上下游依赖
3. 调 cross_source 检查有没有对应的 tex 描述（informal proof hint）
4. 调 metrics 看依赖的 atoms 中哪些已 proven（proof context）
5. 组装 prompt：把以上信息 + theorem statement 发给模型
6. 模型调 lean-lsp-mcp 尝试 prove
7. 成功 → lean_sync_state 更新 store
8. 失败 → 分析错误，调整策略
```

### 4.2 `/batch-prove` workflow

```
1. 调 frontier 获取 top N 未证明 atoms
2. 调 skeleton graph 做拓扑排序（先证 dependencies）
3. 按顺序逐个 prove
4. 每次 prove 后 lean_sync_state 更新 store
5. 报告：证了几个，失败几个，还剩几个
```

### 4.3 这就是差异化

OpenGauss 的 `/autoprove` 对每个 theorem 独立操作，不看全局网络。Astrolabe 的 `/smart-prove` 利用：
- **PageRank**：先证最重要的
- **Propagation**：知道改一个 definition 会影响什么
- **Cross-source**：从 tex 的 informal proof 获取 hint
- **依赖结构**：按 DAG 顺序证，先证 leaf 后证 root

---

## Phase 5：验证结果可视化（1 天）

### 目标

proving 过程在 Astrolabe UI 上实时可见。

### 5.1 前端联动

- `/smart-prove` 执行时，Network View 高亮当前正在 prove 的节点
- prove 成功 → 节点变绿（lean badge proven）
- prove 失败 → 节点变红
- 通过 MCP tool 写一个 event 文件 → file watcher → 前端响应

### 5.2 进度仪表盘

`/store` 的输出已经有 proven/sorry/no_state 统计。prove 过程中实时更新。

---

## 时间线

| Phase | 内容 | 工作量 | 依赖 |
|---|---|---|---|
| Phase 1 | lean-lsp-mcp + lean4-skills 接入 | 2 天 | 无 |
| Phase 2 | Lean MCP tools（sorry_scan, sync_state） | 1 天 | Phase 1 |
| Phase 3 | Store ↔ Lean 自动同步 + hook | 2 天 | Phase 2 |
| Phase 4 | /smart-prove + /batch-prove | 3 天 | Phase 3 |
| Phase 5 | 前端可视化联动 | 1 天 | Phase 4 |

总计约 9 天。Phase 1-3 做完就有基本可用的 Lean 验证能力。Phase 4 是差异化。Phase 5 是锦上添花。

---

## 不做的事

- **不从 OpenGauss 移植代码**——用同样的外部工具
- **不做 RL 训练**——短期不需要
- **不做 batch runner**——`/batch-prove` 用 Astrolabe Code 的 agent loop 逐个跑，不需要 multiprocessing
- **不做 SwarmManager**——单 agent 够用，多 agent 并行是后续优化
