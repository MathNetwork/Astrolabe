# P0: Incremental Refresh

## 目标
Network View 数据更新时不全量重建 d3-force simulation，只增删变化的节点/边，保留现有布局。

## 当前状态
当前 NetworkView 每次 fetch ref-graph 后完全重建 simulation（`sim.nodes(newNodes)`, `sim.alpha(1).restart()`），所有节点位置丢失。

## 数据流
```
新数据到达 → diff(oldNodes, newNodes)
  → 新节点：加入 simulation，初始位置放在相关节点附近
  → 删除节点：从 simulation 移除
  → 变化节点：更新属性（name, color, radius），不改位置
  → 边同理
  → sim.alpha(0.3).restart()（小幅重新平衡，不是完全重启）
```

## 涉及文件
- `src/lib/refView.ts` — 新增 `diffRefGraph(oldNodes, newNodes)` 纯函数
- `src/panels/workspace/NetworkView.tsx` — 数据加载后用 diff 而非全量替换

## API 端点
无。用现有 `/api/astrolabe/ref-graph`。

## 验收标准
1. 创建新 entry 后点刷新，新节点出现在图上，其他节点不动
2. 删除 entry 后点刷新，节点消失，其他节点位置不变
3. 100 个节点的图刷新后 <100ms 稳定
