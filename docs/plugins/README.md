# Astrolabe Plugin Development Plans

Astrolabe 是一个**只读可视化应用**。数据编辑通过 VSCode + AI（Claude Code 等）完成，Astrolabe 负责展示和刷新。

## 插件清单

### P0 — 数据刷新通路
- [file-watcher](p0-file-watcher.md) — astrolabe.json 文件监听 + 自动刷新
- [incremental-refresh](p0-incremental-refresh.md) — Network View 增量更新
- [chat-mode](p0-chat-mode.md) — Claude CLI 纯 chat 模式

### P1 — 数据导入
- [lean4-importer](p1-lean4-importer.md) — Lean 4 .ilean 导入
- [latex-importer](p1-latex-importer.md) — LaTeX/PDF 结构导入
- [stacks-importer](p1-stacks-importer.md) — Stacks Project 导入
- [bibtex-importer](p1-bibtex-importer.md) — BibTeX 参考文献导入

### P1 — 分析层
- [network-analysis](p1-network-analysis.md) — PageRank, betweenness, community
- [transitive-reduction](p1-transitive-reduction.md) — 去冗余边
- [topological-analysis](p1-topological-analysis.md) — Betti numbers, persistent homology
- [path-query](p1-path-query.md) — 依赖路径查询

### P2 — 渲染层
- [latex-rendering](p2-latex-rendering.md) — 数学公式渲染
- [sort-coloring](p2-sort-coloring.md) — 按 sort 着色
- [status-badge](p2-status-badge.md) — 状态徽标
- [edge-direction](p2-edge-direction.md) — 边方向箭头
- [node-visual-mapping](p2-node-visual-mapping.md) — 节点大小/颜色映射

## 插件机制

暂不设计框架。等有 3-5 个插件后从实践中抽象。
