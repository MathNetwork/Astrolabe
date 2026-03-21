# 下一步开发计划

## 当前状态

- 架构重构 ✅（2D 图、6 stores、shared 组件、323 测试）
- AI 集成 ✅（聊天、上下文、10 skills、Tool Widgets）
- 应用目前是**只读**的——数据只能通过 AI 或后端 API 修改

## 优先级排序

### P0: 编辑功能 ✅

通过 AI Skills 实现，不需要单独的编辑 UI：
- `/add-node` `/add-edge` — 创建
- `/edit-node` `/edit-edge` — 修改
- `/delete-node` `/delete-edge` — 删除
- Tool Widgets 自动检测 JSON 输出，一键执行 API 调用

### P1: Sort 自定义 ✅

- 后端 `/api/knowledge/sorts` 读取 `.netmath/sorts.json`
- dataStore.sortConfig 存储项目自定义 sort
- objectSortConfig 支持动态覆盖（custom → default → fallback）
- 没有 sorts.json 时 fallback 到默认数学 sort

### P2: UI 打磨 ✅

**已完成：**
- [x] 聊天面板嵌入 Inspector（底部抽屉式，可拖拽高度，可展开）
- [x] 字体大小从 text-xs 改为 text-sm
- [x] 所有按钮换成 heroicon
- [x] assets/ 目录完全删除，sort 配置移到 src/lib/sortConfig.ts
- [x] 流式消息重构：store 存原始 ClaudeStreamMessage[]，按类型分派渲染
  - thinking → 折叠的 ThinkingWidget
  - text → markdown（KaTeX 数学公式渲染）
  - tool_use → ToolWidget（Read/Edit/Bash/Glob/Grep 状态显示）
  - result → 最终结果 + 费用
  - StreamingIndicator 带计时器
- [x] Claude Code 状态检测：首页 EnvironmentStatus 显示版本 + 认证邮箱
- [x] 图片粘贴/拖拽：Cmd+V 截图 + Tauri onDragDropEvent 拖放，缩略图预览
- [x] tauri-plugin-fs 集成（图片保存到 .netmath/attachments/）
- [x] 首页粒子特效恢复（从 Astrolabe 移植，400 粒子 + 鼠标交互连线）
- [x] Tauri 插件版本对齐（dialog/http/shell/fs）
- [x] Rust unused function 警告消除

**待做：**
- [ ] NetworkView 节点标签可切换
- [ ] 加载/空状态优化
- [ ] Stop 按钮（调用 cancel_claude_execution）

### P3: Template 项目

做 2-3 个非数学的小 demo 展示通用性。每个是一个独立仓库，包含 `.netmath/` 目录。

- [ ] 法律案例（5-10 个节点：statute, case, opinion, argument）
- [ ] 生物通路（5-10 个节点：gene, protein, pathway, disease）
- [ ] 或：哲学论证 / 历史事件 / 软件架构

**依赖**：P1 Sort 自定义完成后才有意义

### P4: 桌面版打包

- [ ] `npm run tauri build` 生成 .app / .dmg (macOS)
- [ ] 应用图标设计
- [ ] 自动更新机制（tauri-plugin-updater）
- [ ] 代码签名（Apple Developer）

**依赖**：P0-P2 基本完成，功能稳定后再打包

### P5: 技术演进（未排期）

**Graphology 前端图算法库**

Logseq 用 Graphology 管理图数据结构。JavaScript 版的 NetworkX，有完整算法生态（centrality、Louvain 社区检测、最短路径、ForceAtlas2 布局等）。

价值：
- 轻量分析（degree、社区）可以在前端直接算，不等后端 API
- 离线模式（不依赖 Python 后端）的基础
- 替代手写数组操作，代码更简洁

时机：等有离线需求或后端分析成为瓶颈时再引入。

**官网（mathnetwork.network）**

静态单页站：产品介绍 + 截图 + GitHub 链接 + 桌面版下载。可以复用 Next.js 首页或用 Astro 单独建。

## 测试覆盖

534 个测试，覆盖：
- Store 行为（selection, undo, streaming, status）
- 纯函数（filterDisplayMessages, buildToolResultMap, handleClaudeOutput, parseClaudeActions, imageUtils）
- 组件结构（ChatMessages, StreamWidgets, ToolWidgets, InspectorPanel）
- Rust 端（claude.rs, lib.rs 命令注册）
