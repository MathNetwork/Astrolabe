# P1: Transitive Reduction

## 目标
去除冗余依赖边：如果 A→B→C 且 A→C，则 A→C 是冗余的。

## 当前状态
`.backup/network-panel/graphProcessing.ts` 有旧版前端实现（`transitiveReduction` 函数），可参考算法。

## 数据流
```
GET /api/astrolabe/ref-graph → 构建有向图
  → 计算 transitive reduction
  → 返回需要隐藏的 edge id 列表
  → Network View 渲染时跳过这些边
```

## 涉及文件
- `plugins/transitive-reduction/reduction.py` — 算法实现
- 或直接在前端 `src/lib/refView.ts` 中实现（纯前端方案）

## API 端点
可选：`GET /api/analysis/transitive-reduction?path=...` → `{hidden_edges: [id, ...]}`
或纯前端：无需 API。

## 验收标准
1. 开启后冗余边被隐藏
2. 图的可达性不变
3. 可视化更清晰
