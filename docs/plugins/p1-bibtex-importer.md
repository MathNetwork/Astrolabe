# P1: BibTeX Importer

## 目标
将 BibTeX 参考文献导入为 astrolabe entries，建立引用关系。

## 当前状态
无旧代码。

## 数据流
```
.bib 文件 → 解析 BibTeX entries
  → 每篇论文变成 atom (name=title, sort=paper/book/...)
  → 论文间的引用关系变成 edges
  → POST /api/astrolabe/entries 写入
```

## 涉及文件
- `plugins/bibtex-importer/parse.py` — BibTeX 解析（pybtex or bibtexparser）
- `plugins/bibtex-importer/import.py` — 转换并写入

## API 端点
用现有 `POST /api/astrolabe/entries`。

## 验收标准
1. 给定 .bib 文件，每个 entry 变成 atom
2. 同一个 .bib 中的交叉引用变成 edges
3. 在 Astrolabe 中可视化文献引用网络
