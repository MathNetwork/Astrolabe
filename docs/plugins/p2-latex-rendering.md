# P2: LaTeX Rendering

## 目标
Detail Panel 中 statement/proof 字段的数学公式用 KaTeX 渲染。

## 当前状态
项目已有 `MarkdownRenderer` 组件支持 KaTeX。当前 EntryDetail 是毛坯房（纯文本），不渲染 LaTeX。

## 数据流
```
EntryDetail 拿到 entry.record → 检测字段值是否含 $ 或 \
  → 含 LaTeX：用 MarkdownRenderer 渲染
  → 纯文本：直接展示
```

## 涉及文件
- `src/components/detail/EntryDetail.tsx` — 恢复 MarkdownRenderer 对含 LaTeX 字段的渲染

## API 端点
无。纯前端。

## 验收标准
1. statement 中的 `$...$` 和 `$$...$$` 正确渲染为数学公式
2. 不含 LaTeX 的字段仍然纯文本展示
3. 不崩溃：非法 LaTeX 优雅降级为源码展示
