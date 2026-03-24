# P1: Network Analysis

## 目标
计算图的中心性指标（PageRank, betweenness, degree）和社区检测（Louvain）。

## 当前状态
`.backup/functors/network_analysis/` 有完整旧实现（centrality.py, community.py, dag.py 等），可直接复用核心算法。

## 数据流
```
GET /api/astrolabe/ref-graph → networkx 图
  → 计算 pagerank, betweenness, degree, communities
  → 返回 { nodeId: score } 映射
```

## 涉及文件
- `plugins/network-analysis/analysis.py` — 核心算法（从 backup 提取）
- `plugins/network-analysis/router.py` — FastAPI 端点
- `src/panels/workspace/NetworkSettings.tsx` — 恢复 SIZE/COLOR 选项

## API 端点
- `GET /api/analysis/centrality?path=...` → `{pagerank: {id: score}, betweenness: {...}, degree: {...}}`
- `GET /api/analysis/communities?path=...` → `{id: groupIndex}`

## 验收标准
1. Network View 节点大小可按 PageRank 映射
2. 节点颜色可按 community 映射
3. 100 节点图分析 <500ms
