# P1: Stacks Project Importer

## 目标
导入 Stacks Project 的 tag 结构为 astrolabe entries。

## 当前状态
无旧代码。Stacks Project 有公开的 tag 数据库和 API。

## 数据流
```
Stacks Project tags → 获取 tag 列表 + 依赖关系
  → 每个 tag 变成 atom (name=tag label, sort=lemma/theorem/...)
  → tag 之间的引用变成 edges
  → POST /api/astrolabe/entries 写入
```

## 涉及文件
- `plugins/stacks-importer/fetch.py` — 获取 Stacks Project 数据
- `plugins/stacks-importer/import.py` — 转换并写入

## API 端点
用现有 `POST /api/astrolabe/entries`。

## 验收标准
1. 导入指定章节的 tags
2. 每个 tag 变成 atom，依赖关系变成 edges
3. 在 Astrolabe 中可视化代数几何的定理依赖网络
