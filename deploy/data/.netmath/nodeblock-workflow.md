# Nodeblock 工作流

将 MDX 原文中的定理/定义转换为 knowledge node + objblock 引用。

## 核心原则

- **纯替换，不删除**：只将定理 statement+proof 的原文替换为 `<div class="objblock">`，散文/推导/记号/remark 一字不动
- **节点内容 = 原文**：节点的 statement/proof 必须与被替换的原文逐字一致
- **先对比，再替换**：替换前必须确认节点内容与原文匹配

## 操作流程

### 1. 识别要节点化的内容

在 MDX 中定位定理/定义/引理的 **statement** 和 **proof** 的精确起止位置。以下内容**不替换**：
- 散文、介绍性文字
- 技术推导、计算过程
- REMARK、注释
- 记号定义、约定说明

### 2. 创建节点（如果不存在）

```bash
curl -s -X POST 'http://localhost:8765/api/knowledge/node' \
  -H 'Content-Type: application/json' \
  -d '{
    "path": "/Users/moqian/GMTNet",
    "name": "节点名 (ASCII)",
    "sort": "definition|theorem|lemma|proposition|corollary|example|remark|reference",
    "status": "stated",
    "statement": "与原文逐字一致的 statement",
    "proof": "与原文逐字一致的 proof（含 objref citation）"
  }'
```

**节点内容规则：**
- statement 和 proof 必须与 MDX 原文**逐字一致**
- 可以包含 `<objref>` 链接（citation 和交叉引用）
- Display math 用多行 `$$` 格式
- 节点名用 plain ASCII 英文

### 3. 对比确认

替换前**必须**对比：
1. 读取节点的 statement/proof
2. 读取 MDX 中要替换的原文
3. 确认两者一致（含 citation、数学符号、格式）
4. 如果不一致，先更新节点内容

### 4. 替换 MDX

精确替换 statement+proof 为 objblock，其余不动：

```mdx
### 3.11 Theorem                          ← 标题保留

<div class="objblock" data-show="statement,proof">dfb777a7655b</div>

(REMARK. Combining (2) and 3.3, ...)     ← 散文保留
```

- `data-show="statement"` — 只显示 statement
- `data-show="statement,proof"` — statement + 可折叠 proof

### 5. 交叉引用

节点有 objblock 后自动获得编号（如 `Theorem 3.2`）。

**引用方式：**

```mdx
<!-- 自动显示编号（如 "Theorem 3.2"）-->
<objref id="dfb777a7655b"></objref>

<!-- 带子条目 -->
<objref id="dfb777a7655b"></objref>(4)

<!-- 文献引用：原文不变，加超链接 -->
<objref id="af3f51d44df5">[FH1, 5.4.15]</objref>
```

- 空 objref → 自动显示位置编号
- 有 children → 显示 children 文本
- 编号基于 objblock 在 MDX 中出现的顺序，按 sort 分别计数

**引用尚未 objblock 化的定理：** 先完成步骤 1-4 为其创建 objblock，获得编号后再引用。

### 6. 创建边（可选）

```bash
curl -s -X POST 'http://localhost:8765/api/knowledge/edge' \
  -H 'Content-Type: application/json' \
  -d '{"path":"/Users/moqian/GMTNet","source":"SOURCE_ID","target":"TARGET_ID"}'
```

## 节点 sort 类型

| Sort | 用途 | 视觉 |
|------|------|------|
| definition | 定义 | 蓝色方块 |
| theorem | 定理 | 金色十二面体 |
| lemma | 引理 | 青色二十面体 |
| proposition | 命题 | 深金色八面体 |
| corollary | 推论 | 紫色四面体 |
| example | 例子 | 绿色圆柱 |
| remark | 注释 | 蓝紫色环 |
| reference | 文献 | 灰色圆柱（大） |
| axiom | 公理 | 蓝色锥体 |

## 允许字段

knowledge.json 节点：id, name, sort, status, statement, proof, intuition, notes, position, created_at, updated_at
