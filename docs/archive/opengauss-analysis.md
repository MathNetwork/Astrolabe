# OpenGauss 深度调查报告

> 调查日期：2026-04-02
> 目标：评估 OpenGauss 哪些能力可提取到 Astrolabe MCP tools 或 Astrolabe Code

---

## 1. 项目全貌

**路径**：`/Users/moqian/OpenGauss`
**规模**：100+ Python 文件，核心模块 5 个
**License**：MIT

### 核心模块

| 模块 | 文件数 | 职责 |
|------|--------|------|
| `gauss_cli/` | 25+ | CLI 入口、认证、配置、项目检测、autoformalize workflow |
| `tools/` | 35+ | 工具注册表 + 47 个 tools（terminal、file、web、memory 等） |
| `environments/` | 10+ | RL 环境抽象 + 6 个具体环境 |
| `agent/` | 12 | Agent 核心（prompt builder、trajectory、context compressor） |
| `gateway/` | 12 | 多平台消息网关（Slack/Telegram/Discord/WhatsApp） |

### 入口

| 命令 | 文件 | 功能 |
|------|------|------|
| `gauss` | `gauss_cli/main.py` | 主 CLI |
| `gauss-agent` | `run_agent.py` | Agent runner（5800+ 行） |
| `gauss-acp` | `acp_adapter/entry.py` | Agent Client Protocol server |

### 核心依赖

- **API**：openai, anthropic>=0.39.0
- **CLI**：fire, prompt_toolkit, rich
- **Config**：python-dotenv, pyyaml, pydantic>=2.0
- **可选**：atroposlib（RL）, mcp>=1.2.0, ptyprocess, docker/modal/daytona

---

## 2. Lean 验证能力

### 关键发现：OpenGauss 不直接调 Lean

它通过两层间接调用：

1. **lean-lsp-mcp**：独立 MCP server（`uvx --from lean-lsp-mcp lean-lsp-mcp`），封装 Lean LSP 协议
2. **lean4-skills**：Claude Code 插件（`cameronfreer/lean4-skills`），提供 `/prove`、`/draft`、`/autoprove` 等 workflow

### Lean 交互机制

| 方面 | 实现 |
|------|------|
| 编译 | 不直接调 `lake build`，委托给 lean-lsp-mcp MCP server |
| 项目检测 | `project.py:80`：查找 `lakefile.lean` 或 `lakefile.toml` |
| Sorry 检测 | `swarm_manager.py:135`：字符串匹配 `"sorry"` in tool output |
| 验证成功 | 字符串匹配 `"no errors"` 或 `"goals accomplished"` |
| 状态值 | `starting` → `active` → `has sorry` \| `verified` |

### lean4-skills 插件

- **来源**：`https://github.com/cameronfreer/lean4-skills.git`
- **安装**：通过 `claude plugin marketplace add` + `claude plugin install lean4`
- **提供的 workflow**：

| 命令 | 功能 |
|------|------|
| `/prove` | 证明一个 theorem |
| `/draft` | 起草证明 |
| `/review` | 审查变更 |
| `/checkpoint` | 保存进度 |
| `/refactor` | 重构证明 |
| `/golf` | 优化证明（缩短） |
| `/autoprove` | 自动证明 |
| `/formalize` | 从非形式化描述生成 Lean 代码 |
| `/autoformalize` | 全自动形式化 |

### MCP Server 配置

```json
{
    "type": "stdio",
    "command": "uvx",
    "args": ["--from", "lean-lsp-mcp", "lean-lsp-mcp"],
    "env": {
        "LEAN_PROJECT_PATH": "/path/to/lean/project"
    }
}
```

---

## 3. Agent 架构

### AIAgent（`run_agent.py`）

- **API 格式**：OpenAI chat completions
- **默认模型**：`anthropic/claude-opus-4.6`（通过 OpenRouter）
- **工具调用**：单 tool → 顺序执行；多 tool → ThreadPoolExecutor 并行
- **Context 压缩**：token 估算超阈值时压缩历史，保留 memory + todo
- **Budget 管理**：parent/child 共享 iteration budget（70% caution、90% warning）
- **Session 持久化**：SQLite DB 存 session metadata + system prompt

### Tool 注册系统（`tools/registry.py`）

```python
registry.register(
    name="tool_name",           # 唯一标识
    toolset="category",         # 分类（file、web、memory 等）
    schema={...},               # OpenAI function schema
    handler=callable,           # (args: dict, **kwargs) -> str
    check_fn=callable,          # 可用性检查
    requires_env=["VAR"],       # 需要的环境变量
    emoji="icon",
)
```

### 已注册 Tools（47 个，按分类）

| 分类 | Tools |
|------|-------|
| **file** (4) | read_file, write_file, patch, search_files |
| **terminal** (1) | terminal |
| **web** (2) | web_search, web_extract |
| **memory** (1) | memory |
| **todo** (1) | todo |
| **browser** (11) | navigate, snapshot, click, type, scroll, back, press, close, get_images, vision, console |
| **code_execution** (1) | execute_code |
| **delegate** (1) | delegate_task |
| **rl** (10) | list_environments, select_environment, get_config, edit_config, start_training, check_status, stop_training, get_results, list_runs, test_inference |
| **其他** (15) | clarify, send_message, session_search, skill_manage, skills_list, skill_view, image_generate, vision_analyze, text_to_speech, cronjob, mixture_of_agents, ha_* (4) |

**注意：没有 Lean 特有 tools。** Lean 能力全走 managed workflow。

### SwarmManager（`swarm_manager.py`）

- 单例模式，管理并行 Claude Code 子进程
- `SwarmTask` dataclass 含 `lean_status` 字段
- 支持 PTY attach/detach（交互模式）
- stream-json 事件解析驱动状态更新
- 状态机：`queued` → `running` → `complete`/`failed`/`cancelled`

---

## 4. Batch Runner

**文件**：`batch_runner.py`（14K+ 行）

| 方面 | 实现 |
|------|------|
| 输入 | JSONL：`{"prompt": "...", "docker_image": "...", "cwd": "..."}` |
| 并行 | `multiprocessing.Pool`，默认 4 workers |
| Checkpoint | `data/{run_name}/checkpoint.json`，按 prompt 文本匹配 |
| 输出 | `batch_{n}.jsonl`：conversations + tool_stats + reasoning_stats |
| 重试 | 失败不标记 completed，`--resume` 时自动重试 |

---

## 5. Environment 抽象

### GaussAgentBaseEnv 抽象方法

```python
setup()              # 加载数据集，初始化状态
get_next_item()      # 返回下一个数据项
format_prompt(item)  # 组装 prompt
compute_reward(item, result, ctx)  # 计算 reward（0.0-1.0）
evaluate()           # 周期性评估
```

### 已实现环境

| 环境 | 功能 | Reward 逻辑 |
|------|------|------------|
| TerminalTestEnv | 文件创建验证 | 精确匹配 1.0，部分 0.5 |
| WebResearchEnv | 多跳网络研究 | 正确性 0.6 + 工具使用 0.2 + 效率 0.2 |
| AgenticOPDEnv | 代码任务蒸馏 | 测试验证 + LLM judge |
| TerminalBench2 | 终端命令基准 | exit code + 输出匹配 |
| YCBenchEnv | YC 创业任务 | 领域特定 |
| TBLiteEnv | 化学计算基准 | 计算验证 |

---

## 6. RL 训练（Atropos + Tinker）

- Phase 1：API server 模式
- Phase 2：ManagedServer，token-level tracking
- 当前针对 Qwen3-8B 调优
- **短期对 Astrolabe 不需要**

---

## 7. 可提取精华

### 7a. 可直接作为 MCP tools

| 能力 | 来源文件 | MCP tool 名 | 工作量 |
|------|---------|------------|--------|
| Lean LSP 交互 | lean-lsp-mcp 包 | `lean_check` | 小（直接用现有 MCP server） |
| Sorry 扫描 | swarm_manager.py:135 | `lean_sorry_scan` | 小（正则扫描 .lean 文件） |
| 项目检测 | project.py:80 | `lean_project_info` | 小 |

### 7b. 可融入 Astrolabe Code

| 能力 | 来源 | 融入方式 | 工作量 |
|------|------|---------|--------|
| `/prove` workflow | lean4-skills 插件 | slash command | 中 |
| `/autoprove` workflow | lean4-skills 插件 | slash command | 中 |
| lean_status 追踪 | swarm_manager.py | store state 自动更新 | 中 |
| Checkpoint/rollback | checkpoint_manager.py | hook | 小 |

### 7c. 需要新建的 glue 代码

| 功能 | 描述 | 工作量 |
|------|------|--------|
| AstrolabeVerifyEnv | store → 未验证 atoms → lean 编译 → reward → state 更新 | 大 |
| DAG scheduler | skeleton graph 拓扑排序 → 任务队列 → swarm dispatch | 中 |
| lean-lsp-mcp 自动启动 | 检测 Lean 项目时自动注入 lean-lsp MCP | 小 |

### 7d. 不需要的

| 能力 | 跳过原因 |
|------|---------|
| Gateway（Slack/Telegram/Discord） | Astrolabe 不需要聊天平台 |
| Browser tools | 不相关 |
| Image gen / TTS / Voice | 不相关 |
| Home Assistant | 不相关 |
| RL 训练（Atropos/Tinker） | 短期不需要 |
| ACP adapter | 有 MCP 就够了 |

### 7e. 推荐实施顺序

1. **lean-lsp-mcp 自动注入**（跟现有 astrolabe MCP 自动检测类似）— 1 天
2. **`/prove` 和 `/autoprove`** 作为 Astrolabe Code slash commands — 2 天
3. **lean_sorry_scan MCP tool**（扫 .lean 文件查 sorry）— 半天
4. **lean_status ↔ store state 同步**（验证结果自动更新 state 字段）— 2 天
5. **DAG scheduler**（按依赖顺序批量验证）— 3 天
6. **AstrolabeVerifyEnv**（RL 环境，长期）— 1 周+

---

## 关键代码引用

| 文件 | 行号 | 内容 |
|------|------|------|
| `gauss_cli/autoformalize.py` | 36-43 | Lean4 skills 常量定义 |
| `gauss_cli/autoformalize.py` | 472-501 | UV runner + lean project root 解析 |
| `gauss_cli/autoformalize.py` | 1878-1909 | MCP server config 生成 |
| `gauss_cli/project.py` | 80-91 | Lean 项目检测（lakefile） |
| `swarm_manager.py` | 59-86 | SwarmTask dataclass（含 lean_status） |
| `swarm_manager.py` | 99-141 | stream-json 事件解析 + sorry 检测 |
| `tools/registry.py` | 24-42 | ToolEntry dataclass |
| `environments/gauss_base_env.py` | 606-670 | 5 个抽象方法 |
| `batch_runner.py` | 621-651 | 输入 JSONL schema |
| `batch_runner.py` | 667-709 | Checkpoint 格式 |
