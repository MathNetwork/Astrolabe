# P1: LaTeX/PDF Importer

## 目标
从 LaTeX 论文中提取定理/引理/命题的依赖结构，生成 astrolabe entries。

## 当前状态
无旧代码。需从零开发。

## 数据流
```
LaTeX 源文件 / PDF → 解析器
  → 识别 \begin{theorem}, \begin{lemma}, \begin{definition} 等环境
  → 提取 \label, \ref, \cite 建立依赖关系
  → 生成 entries: atoms (定理/引理) + edges (引用关系)
  → POST /api/astrolabe/entries 写入
```

## 涉及文件
- `plugins/latex-importer/parse.py` — LaTeX 解析（正则 or pylatexenc）
- `plugins/latex-importer/import.py` — 调用 API 写入

## API 端点
用现有 `POST /api/astrolabe/entries`。

## 验收标准
1. 给定一个 LaTeX 文件，提取所有定理环境
2. \ref 引用关系正确建立为 edges
3. 导入后在 Astrolabe 中可视化论文结构
