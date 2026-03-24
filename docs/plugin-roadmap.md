# Astrolabe Plugin Roadmap

## 定位

Astrolabe 是一个**只读可视化应用**。数据编辑通过 VSCode + AI（Claude Code 等）完成，Astrolabe 负责展示和刷新。不重复造编辑器的轮子。

## 核心框架（已完成）

- 数据层：astrolabe.json，content-addressable simplicial complex store
- CRUD API：供 AI 和外部工具调用
- Network View：ref graph + d3-force physics
- Detail Panel：entry 元信息纯展示
- AI Chat：Claude 输出 JSON → 执行 CRUD
- FILES：项目文件浏览
- MDX：文档展示

---

## P0 — 数据刷新通路

| 任务 | 说明 |
|------|------|
| 文件监听 | astrolabe.json 被外部修改（VSCode/AI）时自动刷新视图 |
| 增量刷新 | Network View 不全量重建 simulation，只更新变化的节点 |
| AI Chat 解耦 | AI 操作不触发 Network 重载（已完成） |
| Chat 模式修复 | Claude CLI agent loop → 纯 chat，只输出 JSON |

## P1 — 数据导入

| 插件 | 说明 |
|------|------|
| Lean 4 导入器 | 解析 .ilean 文件生成 entries |
| LaTeX/PDF 导入器 | 从论文中提取定理/引理依赖结构 |
| Stacks Project 导入器 | 导入 Stacks Project tag 结构 |
| BibTeX 导入器 | 参考文献作为 entries |

## P1 — 分析层

| 插件 | 说明 |
|------|------|
| Network Analysis | PageRank, betweenness, community detection |
| Transitive Reduction | 去除冗余依赖边 |
| 拓扑分析 | Betti numbers, persistent homology |
| 路径查询 | 两个 entry 之间的依赖路径 |

## P2 — 渲染层

| 插件 | 说明 |
|------|------|
| LaTeX 渲染 | statement/proof 字段数学公式渲染 |
| Sort 着色 | 按 sort 类型上色 |
| Status 徽标 | stated/proven/conjecture 视觉标记 |
| Edge 方向标签 | ref 长度 2 时显示 A → B |
| Node 大小/着色映射 | Network 中按指标调节节点视觉 |

## P2 — 个性化

| 任务 | 说明 |
|------|------|
| 用户偏好 | physics 参数、label 显示等设置持久化 |
| 项目配置 | 每个项目的插件启用/禁用 |

---

## 插件机制

等有 3-5 个插件后再抽象，先不设计框架。
