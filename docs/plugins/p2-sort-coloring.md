# P2: Sort Coloring

## 目标
Network View 节点按 sort 类型（definition, theorem, lemma...）着色。

## 当前状态
当前节点按 degree 着色（refView.ts 的 DEGREE_COLORS）。旧版有 `sortConfig.ts` 定义 sort→color 映射，可参考。

## 数据流
```
ref-graph 返回 nodes（含 sort 字段）
  → 构建 ForceNode 时，如果 sort 存在，用 sort→color 映射
  → 否则 fallback 到 degree 着色
```

## 涉及文件
- `src/lib/refView.ts` — 修改 `buildRefViewNodes`，增加 sort 着色逻辑
- `src/lib/sortConfig.ts` — 保留现有 sort→color 映射表

## API 端点
无。纯前端。

## 验收标准
1. definition 蓝色，theorem 金色，lemma 绿色...
2. 无 sort 的节点 fallback 到 degree 着色
3. NetworkSettings 可切换 degree/sort 着色模式
