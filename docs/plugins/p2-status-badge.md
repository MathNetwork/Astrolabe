# P2: Status Badge

## 目标
节点上显示状态徽标：stated（空心圆）、proven（实心圆）、conjecture（问号）。

## 当前状态
无。旧版 ObjCard 有 status 展示但已删。

## 数据流
```
ref-graph nodes 含 status 字段 → NetworkView canvas 渲染时
  → 在节点圆上叠加小标记
```

## 涉及文件
- `src/panels/workspace/NetworkView.tsx` — canvas 渲染逻辑中，节点绘制后追加 badge

## API 端点
无。纯前端。

## 验收标准
1. proven 节点有绿色勾号
2. stated 节点有蓝色圆环
3. conjecture 节点有橙色问号
4. 无 status 的节点不显示 badge
