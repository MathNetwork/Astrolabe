# P1: Topological Analysis

## 目标
计算 simplicial complex 的拓扑不变量：Betti numbers, persistent homology。

## 当前状态
`.backup/functors/network_analysis/topology.py` 有旧版 persistent homology 实现，可参考。

## 数据流
```
GET /api/astrolabe/entries → 构建 simplicial complex
  → 计算 Betti numbers β₀, β₁, β₂, ...
  → 计算 persistent homology（filtration by stage）
  → 返回结果
```

## 涉及文件
- `plugins/topological-analysis/betti.py` — Betti numbers 计算
- `plugins/topological-analysis/persistence.py` — Persistent homology
- `plugins/topological-analysis/router.py` — API 端点

## API 端点
- `GET /api/analysis/topology?path=...` → `{betti: [β₀, β₁, ...], persistence: [...]}`

## 验收标准
1. 返回正确的 Betti numbers
2. 对 100 entry 的 complex 计算 <1s
3. persistence diagram 数据可用于前端可视化
