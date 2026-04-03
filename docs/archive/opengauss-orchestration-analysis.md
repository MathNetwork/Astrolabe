# OpenGauss 编排能力深度分析

> 日期：2026-04-02
> 目的：提取可移植到 astrolabe-code 的 Lean 编排逻辑

---

## A. autoformalize.py 逻辑

文件：`/Users/moqian/OpenGauss/gauss_cli/autoformalize.py`（~2234 行）

### 核心数据结构

| 结构 | 行号 | 用途 |
|------|------|------|
| `ManagedWorkflowSpec` | 131-138 | 解析后的 workflow 描述（kind, frontend_command, backend_command, args） |
| `ManagedContext` | 141-157 | 所有 staged 路径和元数据（lean_root, plugin_root, mcp_config 等） |
| `SharedLeanBundle` | 220-239 | lean4-skills 仓库里的共享资产（plugin, skill, scripts, references） |
| `AutoformalizeBackendRuntime` | 242-248 | 最终产物：argv + child_env + managed_context |
| `AutoformalizeLaunchPlan` | 165-217 | resolve 的完整输出，含 handoff_request |

### 命令映射

```
/prove, /draft, /review, /checkpoint, /refactor, /golf  → /lean4:<kind>
/autoprove, /auto-proof, /auto_proof                     → /lean4:autoprove
/formalize                                                → /lean4:formalize
/autoformalize, /auto-formalize, /auto_formalize         → /lean4:autoformalize
```

所有命令最终映射到 lean4-skills 插件内部的 workflow。

### /prove 流程

1. 用户输入 `/prove <theorem description>`
2. `resolve_autoformalize_request()` 解析命令 → `ManagedWorkflowSpec(kind="prove", backend_command="/lean4:prove")`
3. 解析 backend（默认 `claude-code`），检查 git、ripgrep
4. 发现 Gauss project → 读 `.gauss/project.yaml` → 获取 `lean_root`
5. 准备 lean4-skills：git clone/fetch `cameronfreer/lean4-skills`
6. `_build_claude_runtime()`：
   - 创建隔离 HOME（`~/.cache/gauss/autoformalize/claude-code/managed/claude-home`）
   - 安装 lean4 plugin（`claude plugin install lean4@lean4-skills`）
   - 写 MCP config（lean-lsp-mcp server，`LEAN_PROJECT_PATH=<lean_root>`）
   - Stage credentials（OAuth/API key → 隔离 HOME）
   - 预批准所有工具权限
   - 写 startup context（Markdown 文件）
7. 构建 argv：`["claude", "--model", "claude-opus-4-6", "--dangerously-skip-permissions", "<startup_prompt>"]`
8. startup_prompt 内容：
   ```
   "You are in a Gauss-managed Lean workflow session.
    Read the startup context at {context_path} first.
    Then run this command: /lean4:prove"
   ```
9. 子进程启动 → Claude Code 读 startup context → 执行 `/lean4:prove` → lean4-skills 接管
10. lean4-skills 内部：调 lean-lsp-mcp 编译、检查 sorry、尝试 tactic → 成功/失败

### /autoprove 流程

跟 /prove 几乎完全相同，区别仅在：
- `backend_command="/lean4:autoprove"`（步骤 2）
- lean4-skills 内部逻辑不同：autoprove 更自动化，减少人工干预

**关键洞察**：/prove 和 /autoprove 在 autoformalize.py 层面没有区别。差异完全在 lean4-skills 插件内部。

### /formalize 流程

1. 用户输入 `/formalize <informal description>`
2. 解析为 `backend_command="/lean4:formalize"`
3. 同样的 runtime 准备（步骤 3-8 与 /prove 相同）
4. lean4-skills 内部：从 informal 描述生成 Lean 4 代码（不仅仅是 proof，还包括 definition/theorem statement）

### /autoformalize 流程

1. 用户输入 `/autoformalize`（通常不需要参数）
2. 解析为 `backend_command="/lean4:autoformalize"`
3. 同样的 runtime 准备
4. lean4-skills 内部：扫描整个项目，自动决定哪些需要形式化，然后逐个处理

### Session Contract（注入给 Claude 的约定）

```markdown
## Session Contract
- Work inside the current Lean project.
- Prefer Lean/LSP-first workflows and use the managed Lean MCP server.
- Run the managed backend workflow command exactly as requested before improvising.
- Keep changes reproducible and explain blockers clearly if the workflow cannot proceed.
```

### 每个步骤的可移植性评估

| 步骤 | 可移植性 | 说明 |
|------|----------|------|
| 命令解析 | ✅ 简单 | 字符串解析，可直接用 TS |
| Lean 项目发现 | ✅ 已完成 | astrolabe-code 的 config.ts 已实现 |
| lean-lsp-mcp 注入 | ✅ 已完成 | config.ts 已实现自动检测+注入 |
| lean4-skills 安装 | ⚠️ 需适配 | 不在官方 marketplace，需要替代方案 |
| 隔离 HOME | ❌ 不需要 | astrolabe-code 自己就是 Claude Code，不需要隔离 |
| credential staging | ❌ 不需要 | 用户已登录，不需要复制凭证 |
| 权限预批准 | ❌ 不需要 | 用户直接操作，按正常权限流程 |
| startup context | ✅ 需要 | 改写为 ASTROLABE.md 或 sub-agent prompt |
| 子进程启动 | ⚠️ 需适配 | 用 AgentTool 替代 subprocess.Popen |
| stream-json 解析 | ❌ 不需要 | AgentTool 直接返回结果，不需要解析流 |

---

## B. Lean 状态机

### 状态转换图

```
None ──────────► "starting" ──────────► "active"
                 (task spawn)           (lean/lsp tool invoked)
                     │                      │
                     │                      │
                     ▼                      ▼
              ┌─────────────┐       ┌─────────────┐
              │ "has sorry"  │       │ "has sorry"  │
              │ (tool_result │       │ (tool_result │
              │  含 "sorry") │       │  含 "sorry") │
              └─────────────┘       └─────────────┘
                     │                      │
                     ▼                      ▼
              ┌─────────────┐       ┌─────────────┐
              │ "verified"   │       │ "verified"   │
              │ (tool_result │       │ (tool_result │
              │  含 "no      │       │  含 "no      │
              │  errors" 或  │       │  errors" 或  │
              │  "goals      │       │  "goals      │
              │  accomplished│       │  accomplished│
              │  ")          │       │  ")          │
              └─────────────┘       └─────────────┘
```

### 检测逻辑（swarm_manager.py:99-141）

| 状态 | 触发条件 | 匹配字符串 |
|------|---------|-----------|
| `"starting"` | task spawn | — |
| `"active"` | `content_block_start` 事件，tool name 含 `"lean"` 或 `"lsp"` | tool name |
| `"has sorry"` | `tool_result` 事件，content 含 `"sorry"` | 大小写不敏感 |
| `"verified"` | `tool_result` 事件，content 含 `"no errors"` 或 `"goals accomplished"` | 大小写不敏感 |

### 映射到 Astrolabe Store state 字段

| OpenGauss lean_status | Astrolabe store state | 映射方式 |
|----------------------|----------------------|---------|
| `None` | 无 state 字段 | 直接对应 |
| `"starting"` | — | 瞬态，不需要持久化 |
| `"active"` | — | 瞬态，不需要持久化 |
| `"has sorry"` | `"sorry"` | 直接映射 |
| `"verified"` | `"proven"` | 重命名 |

**结论**：OpenGauss 的 5 个状态中，只有 2 个需要持久化到 store。`starting` 和 `active` 是运行时瞬态。Store 的 `state` 字段（`proven` / `sorry`）已经足够。

---

## C. Managed Workflow 机制

### 启动方式

OpenGauss 启动一个**完全隔离的 Claude Code 子进程**：

```python
argv = [
    "claude",
    "--model", "claude-opus-4-6",
    "--dangerously-skip-permissions",
    startup_prompt_string,  # "You are in a Gauss-managed Lean workflow session..."
]
```

通过 `subprocess.Popen` 启动，设置隔离的 HOME 目录、预装好的 plugin 和 MCP config。

### Prompt 注入

1. **Startup prompt**（命令行参数）：告诉 Claude 读 startup context，然后执行 `/lean4:prove`
2. **Startup context**（Markdown 文件）：项目路径、Lean root、session contract、user arguments
3. **lean4-skills 插件**：提供 `/lean4:*` 命令的实际实现（proof strategy、tactic 选择等）

### 输出解析

两种模式：
- **Background**：`subprocess.Popen(stdout=PIPE)`，逐行读 stream-json，解析状态
- **Interactive**：PTY（pseudo-terminal），用 `select.select` 多路复用，支持 attach/detach（Ctrl-]）

### 在 astrolabe-code 中的复现方案

**关键洞察**：astrolabe-code 自己就是 Claude Code。它不需要启动子进程来运行 Claude Code。

| OpenGauss 方式 | astrolabe-code 替代方案 |
|---------------|----------------------|
| `subprocess.Popen("claude", ...)` | AgentTool（内建 sub-agent） |
| 隔离 HOME + credential staging | 不需要（同一进程内） |
| stream-json 解析 | AgentTool 直接返回消息 |
| PTY attach/detach | 不需要（sub-agent 在同一终端上下文） |
| lean4-skills 插件 | prompt-type slash command（将 lean4-skills 的 prompt 内联） |

---

## D. Sub-Agent 机制

### astrolabe-code 的 AgentTool

**文件**：`/Users/moqian/astrolabe-code/src/tools/AgentTool/AgentTool.tsx`

AgentTool 是 Claude Code 内建的子 agent 生成工具。关键能力：

| 能力 | 说明 | 行号 |
|------|------|------|
| 工具继承 | 子 agent 继承父的 MCP servers + 可定义自己的 | runAgent.ts:95-218 |
| 工具过滤 | `allowedTools` / `disallowedTools` 控制子 agent 可用工具 | agentToolUtils.ts:122-225 |
| 权限模式 | 子 agent 可设独立的 permissionMode（如 `plan`、`acceptEdits`） | AgentTool.tsx:573-577 |
| 系统 prompt | 子 agent 有独立的 `getSystemPrompt()` | AgentTool.tsx:508-518 |
| 后台运行 | `run_in_background=true` → 返回 agentId + outputFile | AgentTool.tsx:141-155 |
| 消息通信 | 父可用 `SendMessage({to: agentId})` 与运行中的 sub-agent 通信 | — |
| Agent 定义 | Markdown frontmatter 定义 tools、mcpServers、effort 等 | loadAgentsDir.ts:106-133 |

### 用 AgentTool 实现 /prove 的可行性

**完全可行**。方案：

```
用户: /prove Theorem 4.3

→ astrolabe-code 解析命令
→ 调 store MCP tools 收集信息（frontier、cross_source、metrics）
→ 构建 sub-agent prompt：
    "你是一个 Lean 4 证明专家。
     当前项目：{lean_root}
     要证明的定理：{theorem_statement}
     相关的 informal proof：{tex_notes}（来自 cross_source）
     依赖已证明的引理：{proven_deps}（来自 store query）
     
     使用 lean-lsp-mcp 的工具来编译和检查。
     目标：消除所有 sorry，使定理通过编译。"
→ Agent(prompt=..., tools=[lean-lsp tools, Read, Edit, Bash])
→ sub-agent 操作 Lean 文件，调 lean-lsp-mcp 编译
→ 返回结果给主 agent
→ 主 agent 调 lean_sync_state 更新 store
```

**优势**（相比 OpenGauss）：
- 不需要隔离环境，sub-agent 共享主 agent 的 MCP 连接
- 不需要 stream-json 解析，AgentTool 直接返回结构化结果
- 主 agent 可以根据 Astrolabe 网络信息构建更好的 prompt

### 如何添加新的 slash command

**文件**：`/Users/moqian/astrolabe-code/src/commands/astrolabe/index.ts`

现有命令都是 prompt-type：
```typescript
export const astrolabeStore: Command = {
  type: 'prompt',
  name: 'store',
  description: 'Show Astrolabe store summary via MCP tools',
  async getPromptForCommand(): Promise<ContentBlockParam[]> {
    return [{ type: 'text', text: 'Call the store_summary MCP tool...' }]
  },
}
```

添加 `/prove`：在同一文件或新文件中添加同样模式的 Command 对象，注册到 commands.ts。

---

## E. Prompt Engineering

### OpenGauss 给 Lean Agent 的 System Prompt

**Startup Prompt**（autoformalize.py:2196-2234）：

```
You are in a Gauss-managed Lean workflow session.
Read the startup context at {quoted_context} first.
Then run this command inside the active project as your first workflow action: /lean4:prove
```

**Startup Context**（autoformalize.py:2077-2193，Markdown 文件）：

```markdown
# Gauss Managed Lean Workflow Session

- Managed backend: claude-code
- Gauss command: /prove
- Backend command: /lean4:prove
- Workflow kind: prove
- Project root: {project_root}
- Lean root: {lean_root}
- Active working directory: {active_cwd}
- Managed Lean asset root: {plugin_root}
- Managed Lean workflow guide: {workflow_doc_path}
- Managed Lean skill root: {skills_root}
- Managed Lean MCP config: {mcp_config_path}

## Workflow Request
/lean4:prove

## Session Contract
- Work inside the current Lean project.
- Prefer Lean/LSP-first workflows and use the managed Lean MCP server.
- Run the managed backend workflow command exactly as requested before improvising.
- Keep changes reproducible and explain blockers clearly if the workflow cannot proceed.

## Forwarded Arguments
{user_instruction}
```

**Session Contract 是核心**。其余大部分是路径信息（在 astrolabe-code 中不需要，因为路径已通过 MCP 自动解析）。

### 可复用的部分

| 内容 | 可复用？ | 如何复用 |
|------|---------|---------|
| Session Contract（4 条原则） | ✅ | 直接写入 sub-agent prompt |
| Lean root / project path | ✅ 已有 | lean_project_info MCP tool 提供 |
| 项目结构描述 | ✅ 部分 | 从 ASTROLABE.md 自动注入 |
| 具体 workflow 指令 | ⚠️ 需改写 | lean4-skills 的具体 tactic 策略需要内联到 prompt |
| arXiv search helper | ❌ 不需要 | Astrolabe 有自己的 cross_source |

### 为 astrolabe-code 设计的 Lean Agent Prompt

```markdown
You are a Lean 4 proof specialist working within an Astrolabe knowledge network.

## Available Tools
- lean-lsp-mcp tools: compile, check diagnostics, get goal state
- Astrolabe MCP tools: query store, get entry details, cross_source for tex hints
- File tools: Read, Edit for modifying .lean files

## Workflow
1. Read the theorem statement from the store entry
2. Check cross_source for informal proof hints from the tex version
3. Open the .lean file and locate the theorem
4. Attempt to prove it using Lean tactics
5. Compile via lean-lsp-mcp to check for errors
6. If sorry remains, analyze the error and try a different approach
7. When verified (no errors), report success

## Constraints
- Work only inside the Lean project at {lean_root}
- Do not modify theorem statements, only fill in proofs
- Prefer simple tactic proofs (simp, norm_num, ring, omega) before complex strategies
- If stuck after 3 attempts, report the current state and blocking error
```

---

## F. Checkpoint 机制

### OpenGauss 机制

**文件**：`/Users/moqian/OpenGauss/tools/checkpoint_manager.py`

| 方面 | 实现 |
|------|------|
| 存储方式 | Shadow git 仓库（`~/.gauss/checkpoints/{hash}/`） |
| 内容 | 完整目录快照（`git add -A` + `git commit`） |
| 触发 | 每次工具执行前自动 checkpoint |
| 恢复 | `git checkout {commit_hash} -- {file_or_dir}` |
| 去重 | 每轮只 checkpoint 一次（`_checkpointed_dirs` set） |
| 失败处理 | 静默失败（`logger.debug`），不阻塞工具执行 |
| 上限 | max_snapshots（默认 50），max_files（50000） |

### astrolabe-code 的替代方案

| OpenGauss | astrolabe-code 替代 | 说明 |
|-----------|-------------------|------|
| Shadow git repo | Session JSONL | 对话历史自动持久化 |
| git checkout 恢复 | AgentTool 的 isolation: "worktree" | 在 git worktree 中操作，失败可丢弃 |
| 目录快照 | git stash / git worktree | 标准 git 操作 |
| 自动 checkpoint | 不需要 | astrolabe-code 已有 undo 能力（Edit tool） |

**结论**：不需要移植 checkpoint_manager。astrolabe-code 的 session 持久化 + git worktree isolation 已覆盖同样的需求。对于 Lean proving 场景，AgentTool 的 `isolation: "worktree"` 模式最合适——在隔离 worktree 中尝试 proof，成功后 merge，失败则丢弃。

---

## G. 移植计划

### 按优先级排序

| # | 移植项 | 工作量 | 实现位置 | 依赖 |
|---|--------|--------|---------|------|
| 1 | `/prove` slash command | 小（半天） | `astrolabe-code/src/commands/astrolabe/prove.ts` | lean-lsp-mcp 已注入 |
| 2 | `/autoprove` slash command | 小（半天） | `astrolabe-code/src/commands/astrolabe/autoprove.ts` | #1 |
| 3 | Lean prover agent 定义 | 中（1天） | `astrolabe-code/src/agents/lean-prover.md`（frontmatter agent） | #1 |
| 4 | `/formalize` slash command | 中（1天） | `astrolabe-code/src/commands/astrolabe/formalize.ts` | #1 |
| 5 | lean_sync_state MCP tool | 中（1天） | `Astrolabe/mcp/lean_tools.py` | lean_sorry_scan 已有 |
| 6 | PostToolUse 自动同步 hook | 小（半天） | astrolabe-code hook config | #5 |
| 7 | `/smart-prove` 组合 workflow | 大（2天） | `astrolabe-code/src/commands/astrolabe/smart-prove.ts` | #1, #5 |
| 8 | `/batch-prove` 组合 workflow | 大（2天） | `astrolabe-code/src/commands/astrolabe/batch-prove.ts` | #7 |

### 不需要移植的

| 排除项 | 原因 |
|--------|------|
| 隔离 HOME / credential staging | astrolabe-code 自身就是 Claude Code |
| stream-json 解析 | AgentTool 直接返回结果 |
| PTY attach/detach | 不需要，sub-agent 在同一终端 |
| SwarmManager | 单 agent 够用，AgentTool 可并行 |
| checkpoint_manager | git worktree isolation + session JSONL 替代 |
| Codex backend | 只用 Claude |
| lean4-skills git clone | 将关键 prompt 内联到 slash command，不依赖外部插件 |

### 核心洞察

**OpenGauss 的复杂性大部分来自"在外部启动另一个 Claude Code"的需求**——隔离环境、credential staging、stream-json 解析、PTY 管理。astrolabe-code 自己就是 Claude Code，所以这些全部不需要。

真正有价值的是：
1. **Session Contract**（4 条原则）→ 写入 sub-agent prompt
2. **lean4-skills 的 proof 策略**→ 内联到 prompt 或 agent 定义
3. **lean_status 状态追踪**→ 映射到 store 的 state 字段（`proven`/`sorry`）
4. **sorry/verified 检测逻辑**→ 已在 lean_sorry_scan 中实现（扫 .lean 文件）

### 实现架构

```
用户输入 /prove
    │
    ▼
astrolabe-code slash command（prompt type）
    │
    ├── 1. 调 store MCP tools 收集上下文
    │      ├── get_entry → theorem statement
    │      ├── cross_source → tex informal hint
    │      └── metrics → 依赖图 + 已证明引理
    │
    ├── 2. 构建 Lean prover agent prompt
    │      └── Session Contract + theorem + hints + constraints
    │
    ├── 3. AgentTool 启动 sub-agent
    │      ├── tools: [lean-lsp-mcp tools, Read, Edit]
    │      ├── permissionMode: acceptEdits
    │      └── prompt: constructed in step 2
    │
    ├── 4. Sub-agent 操作
    │      ├── 读 .lean 文件
    │      ├── 尝试 proof tactics
    │      ├── 调 lean-lsp-mcp 编译
    │      └── 返回成功/失败
    │
    └── 5. 主 agent 后处理
           ├── 调 lean_sync_state 更新 store
           └── 报告结果
```

这比 OpenGauss 的方案更简洁：没有子进程、没有隔离环境、没有 stream-json 解析。利用 AgentTool 的内建能力，实现同样的功能。
