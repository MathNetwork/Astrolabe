# P1: Path Query

## 目标
查询两个 entry 之间的依赖路径。

## 当前状态
`.backup/network-panel/graphProcessing.ts` 有旧版 `hasPath` 和 BFS 实现，可参考。

## 数据流
```
GET /api/analysis/path?path=...&from=hashA&to=hashB
  → 构建有向图（ref 关系）
  → BFS/DFS 找最短路径
  → 返回路径上的 entry id 列表
```

## 涉及文件
- `plugins/path-query/query.py` — 路径查找算法
- `plugins/path-query/router.py` — API 端点

## API 端点
- `GET /api/analysis/path?path=...&from=A&to=B` → `{path: [A, ..., B], length: n}`
- `GET /api/analysis/path?path=...&from=A&to=B&all=true` → `{paths: [[...], [...]]}`

## 验收标准
1. 给定两个 entry hash，返回最短依赖路径
2. 无路径时返回空
3. 路径上的 entry 在 Network View 中可高亮
