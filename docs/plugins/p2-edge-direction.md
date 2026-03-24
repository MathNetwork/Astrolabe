# P2: Edge Direction Labels

## 目标
ref 长度为 2 时显示方向标签（A → B），ref 长度 > 2 时显示 simplex 维度标记。

## 当前状态
当前 ref links 有箭头（drawArrow），但没有文字标签。高维 simplex 的 ref links 和普通 edge 视觉上没有区分。

## 数据流
```
ref-graph links 含 source/target + position
  → 渲染时在边中点显示标签
  → edge (ref len 2): "sort" 或箭头方向
  → triangle link (ref len 3): 用不同线型区分
```

## 涉及文件
- `src/panels/workspace/NetworkView.tsx` — canvas 渲染中，link 绘制后加文字
- `src/lib/refView.ts` — ForceLink 可增加 label 字段

## API 端点
无。纯前端。

## 验收标准
1. edge 上显示 sort 文字（如 "uses", "implies"）
2. hover 边时文字高亮
3. 高维 simplex 的 link 视觉上可区分
