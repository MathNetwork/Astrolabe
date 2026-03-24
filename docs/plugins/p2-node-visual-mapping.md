# P2: Node Visual Mapping

## 目标
Network View 节点大小和颜色可按分析指标（PageRank, betweenness, community）映射。

## 当前状态
旧版 NetworkSettings 有 SIZE/COLOR/CLUSTERING 选项，已删。需配合 P1 Network Analysis 插件一起恢复。

## 数据流
```
P1 Network Analysis API → {nodeId: score/group}
  → NetworkSettings 选择映射模式
  → NetworkView 更新 node.radius / node.color
  → 不重建 simulation，只更新属性 + 重绘
```

## 涉及文件
- `src/panels/workspace/NetworkSettings.tsx` — 恢复 SIZE/COLOR 选项
- `src/panels/workspace/NetworkView.tsx` — 属性更新 effect
- `src/lib/refView.ts` — 可能需要 `computeNodeRadius` 和 `extractColorMapping` 函数

## API 端点
依赖 P1 Network Analysis 的端点。

## 验收标准
1. SIZE 选择 PageRank 后，高 rank 节点更大
2. COLOR 选择 Community 后，同组节点同色
3. 切换模式不重建 simulation
