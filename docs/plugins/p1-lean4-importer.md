# P1: Lean 4 Importer

## 目标
解析 Lean 4 项目的 .ilean 文件，生成 astrolabe entries。

## 当前状态
`.backup/functors/ilean_parser/` 有旧版实现（解析 .ilean → signature.json 的 obj/mor），可参考解析逻辑。

## 数据流
```
Lean 4 项目 .ilean 文件 → 解析器（Python CLI）
  → 提取 definitions, theorems, lemmas, instances
  → 生成 entries: atoms (ref=["__self__"]) + edges (ref=[source, target])
  → POST /api/astrolabe/entries 写入
```

## 涉及文件
- `plugins/lean4-importer/parse.py` — 新建，.ilean 解析逻辑
- `plugins/lean4-importer/import.py` — 新建，调用 CRUD API 写入

## API 端点
用现有 `POST /api/astrolabe/entries`。

## 验收标准
1. 给定一个 Lean 4 项目路径，运行导入器
2. 项目中的 definition/theorem/lemma 变成 atoms
3. 依赖关系变成 edges
4. Astrolabe 刷新后可视化
