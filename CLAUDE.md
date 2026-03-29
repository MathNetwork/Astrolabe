# Astrolabe — 数学知识图谱可视化工具

## 架构

- **前端**：Next.js + React + d3-force (2D Canvas)，**Tauri 桌面应用**（不是浏览器）
- **后端**：Python (FastAPI/uvicorn)，端口 8765，内存状态 + JSON 持久化
- 前后端通过 REST API 通信
- 用户始终在 Tauri 桌面应用中运行

## 核心数据模型

astrolabe.json 是 content-addressable flat store：
- key = sha256(ref + record)[:12]
- value = `{ "ref": [...], "record": "<string>" }`
- **record 是纯字符串**，核心层不解读内容（JSON/Markdown/Lean 等格式由插件决定）
- `ref = [self_hash]`（自指，degree 0）或 `ref = [h0, h1, ..., hk]`（有序 hash 列表，degree ≥ 1）
- `__self__` 是前端哨兵值，创建自引用 entry 时客户端发 `ref: ["__self__"]`，后端替换为 `ref: [computed_hash]`
- 核心层只知道 entry（hash + ref + record）、degree、stage、profile
- **Entry 是不可变对象**（frozen dataclass），修改 = 删旧建新

**后端 Entry class：**
```python
Entry(hash: str, ref: tuple[str, ...], record: str)
  .degree -> int          # len(ref) - 1
  .is_self_referencing -> bool
```

## 布局

```
page.tsx（多布局模式）
┌────────────────────────────────────────┬──────────────────┐
│                                        │                  │
│            Workspace (70%)             │  Inspector (30%) │
│                                        │                  │
│   Read / Network / Detail（可切换）     │   EntryDetail    │
│   6 种布局模式（single/split/three）    │                  │
│   Network 内嵌 ⚙ Settings overlay      │                  │
│                                        │                  │
└────────────────────────────────────────┴──────────────────┘
                         │
                  stores (zustand)
```

## 关键目录

```
src/
├── stores/                      ← 6 个 zustand store，各自独立
├── panels/workspace/            ← ReadView, NetworkView, NetworkSettings, DetailView
├── components/ai-chat/          ← ChatPanel, ChatMessages, ChatComposer, ToolWidgets
├── components/detail/           ← EntryDetail
├── lib/refView.ts               ← ref graph 纯函数（ForceNode, hitTest, 映射）
├── lib/skills.ts                ← 15 个 AI slash 技能
├── hooks/                       ← useProjectLoader, useClaudeEvents, useFileWatcher
└── types/entry.ts               ← AstrolabeEntry, degree, isScalar, profile
```

## Store 设计

| Store | 职责 | Undo |
|-------|------|------|
| `selectObjStore` | 选中的 entry hash | ✅ temporal |
| `selectMorStore` | 选中的 edge hash | ✅ temporal |
| `dataStore` | objects/morphisms/projectFiles/refreshTrigger | ❌ 只读 |
| `viewStore` | layoutMode, activeTab, showLabels, viewMode 等 | ✅ temporal |
| `physicsStore` | gravity, repulsion, linkDistance, friction | ✅ temporal |
| `claudeChatStore` | streamMessages, isStreaming, sessionId | ❌ 事件驱动 |

**铁律**：每个 Panel 只和 store 通信，永远不和其他 Panel 直接对话。Store 间无互相订阅。

## NetworkView

- **渲染**：2D Canvas + d3-force，不用 Three.js/WebGL
- **数据**：调用 `/api/astrolabe/ref-graph` → 所有 entry 为节点，ref 为有向链接
- **交互**：pan/zoom、弹性拖拽、点击选中节点/边、hover tooltip
- **视觉**：选中节点白色 + 光晕，vector hash 虚线边框，按 degree 着色
- **Settings overlay**：⚙ 按钮展开透明面板（physics 滑块 + label 开关）
- **纯函数层**：`lib/refView.ts`（buildRefViewNodes, hitTest, degreeRadius, mapPhysicsToD3）

## 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Cmd+Z` | Undo（最近修改的 temporal store） |
| `Cmd+Shift+Z` | Redo |
| `Escape` | 取消选中 |
| `Cmd+1/2/3` | 切换 Read/Network/Detail |

## astrolabe.json 规则

### Entry 格式
```json
{
  "<12-char-hash>": {
    "ref": ["<hash>", ...],
    "record": "plain string — core layer does not interpret content"
  }
}
```

### 自引用约束
- `|ref| = 1` → `ref[0] == own_hash`（自指）
- 创建时用 `ref: ["__self__"]`，后端自动替换

### Display Math 格式
- display math 必须用多行格式，`$$` 独占一行
- 节点名称只用纯 ASCII 文本

## API 端点

### Astrolabe Router (`/api/astrolabe`)
| Method | Path | 功能 |
|--------|------|------|
| GET | `/entries` | 所有 entry（可选 `?degree=k` 过滤） |
| GET | `/entries/{id}` | 单个 entry |
| POST | `/entries` | 创建（ref + record） |
| PATCH | `/entries/{id}` | 合并更新 record |
| DELETE | `/entries/{id}` | 级联删除 |
| GET | `/stages` | stage 分解 |
| GET | `/profile/{id}` | multiplicity profile |
| GET | `/ref-graph` | 完整引用图（所有 entry 为节点） |

### 其他 Router
- `/api/docs/{list,read}` — MDX 文档
- `/api/project/{status,create,files,file-content}` — 项目管理
- `/api/canvas/viewport` — 视口持久化
- `/api/health` — 健康检查

## AI Chat

- 浮动可拖拽窗口，流式渲染 Claude 回复
- 15 个 slash 技能（/explain, /add-obj, /extract-obj, /edit-obj 等）
- ToolWidgets 解析 Claude 输出的 JSON → 一键 CRUD 按钮
- 通过 Tauri IPC 调用 Claude CLI（execute_claude_code / resume_claude_code）

## 数据流

- `useProjectLoader` 从 `/api/astrolabe/ref-graph` 加载 → dataStore
- `useFileWatcher` 监听 astrolabe.json 变化 → 自动 reload
- 修改数据必须通过后端 API，不要直接写 JSON
- PATCH 会重算 hash 并 BFS 传播到所有引用方

## 语言

与用户交流使用中文。
