# Extension Design: 多层渲染与知识引用 DSL

## 1. obj 与 mor 的多对多关系

### 范畴论模型的核心：多对多是自然的

在范畴论数据模型中，obj 和 mor 之间天然是多对多的——任何 obj 可以是任意数量 mor 的 source 或 target，任何 mor 连接任意两个 obj。这不是特殊设计，而是模型本身的性质。

不同的 mor sort 表达不同类型的多对多关系：

```
obj A ──[uses]──────→ obj B
      ──[uses]──────→ obj C
      ←─[generalizes]─ obj D
      ←─[formalizes]── obj E (lean-theorem)
      ←─[formalizes]── obj F (lean-lemma)

obj B ──[uses]──────→ obj C
      ←─[formalizes]── obj E (共享，同一个 Lean obj 形式化了 A 和 B 的部分)
```

关键：**关系的语义完全由 mor sort 决定**。核心不预设任何特定的 sort 含义——`uses`、`formalizes`、`generalizes`、`contradicts`、`inclusion` 都只是 sort 字符串，视觉表现和行为由渲染规则和插件定义。

### 形式化映射作为 sort 的一个实例

`formalizes` 是最典型的多对多例子：
- 一个自然语言定理 → 被拆成多个 Lean 声明（主定理 + 辅助引理 + 构造）
- 一个 Lean 声明 → 参与多个自然语言概念的形式化
- ilean 插件导入时自动创建 `sort: "formalizes"` 的 mor

**但所有 sort 都遵循同样的多对多模式**——`uses` 一样是多对多的（一个定理用多个引理，一个引理被多个定理使用），`inclusion` 也是（一个概念包含在多个上位概念中）。

**实现影响**：
- 数据模型已经支持（obj/mor 独立 CRUD，无数量限制）
- 前端展示需要支持"按 mor sort 过滤"查看特定类型的关系子图
- 插件（如 ilean）通过创建特定 sort 的 mor 表达领域语义

---

## 2. mor sort 驱动差异化渲染

不同 sort 的 mor 在 Canvas 上应有不同的视觉表现。

### 渲染规则

| mor sort | 视觉表现 | Canvas 实现 |
|----------|----------|------------|
| `uses` | 实线箭头 | 当前默认行为 |
| `proof-uses` | 虚线箭头 | `setLineDash([6, 4])` |
| `formalizes` | 双线或加粗 | `lineWidth: 2` + 特殊颜色 |
| `generalizes` / `specializes` | 渐变箭头 | 线性渐变色 |
| `contradicts` | 红色线 | 颜色 override |
| `inclusion` / `contains` | 嵌套布局 | 子节点画在父节点内部（P2） |

### 实现路径

**当前 `buildForceLinks` 只返回 `color`**：

```typescript
// 当前
{ id, source, target, color }

// 目标
{ id, source, target, color, dashPattern, lineWidth }
```

**ForceLink 接口扩展**：

```typescript
export interface ForceLink extends SimulationLinkDatum<ForceNode> {
    id: string
    source: ForceNode | string
    target: ForceNode | string
    color: string
    dashPattern?: number[]   // e.g. [6, 4] for dashed
    lineWidth?: number       // default 0.5
}
```

**渲染规则注册表**（可由插件扩展）：

```typescript
const MOR_RENDER_RULES: Record<string, { color?: string, dashPattern?: number[], lineWidth?: number }> = {
    'uses':        { },                                    // 默认
    'proof-uses':  { dashPattern: [6, 4] },
    'formalizes':  { lineWidth: 2, color: '#9B72CF' },
    'generalizes': { color: '#3AAFA9' },
    'contradicts': { color: '#E74C6F' },
}
```

**NetworkSettings 新增选项**：
- 边渲染模式：`uniform`（全部一样）/ `by-sort`（按 sort 差异化）
- 默认 `by-sort`

---

## 3. MDX 组件作为知识引用 DSL

MDX 里引用知识网络实体的组件构成一门 DSL。

### 已实现的基本组件

| 组件 | 用途 | 文件 |
|------|------|------|
| `<ObjBlock id="..." />` | obj 完整卡片 | `src/components/shared/ObjBlock.tsx` |
| `<ObjRef id="..." />` | 行内 obj 引用 | `src/components/shared/ObjRef.tsx` |

### 需要实现的基本组件

| 组件 | 用途 | 优先级 |
|------|------|--------|
| `<MorBlock id="..." />` | mor 详情卡片 | P1 |
| `<MorRef id="..." />` | 行内 mor 引用 | P1 |

### 需要设计的复合组件

| 组件 | 用途 | 优先级 |
|------|------|--------|
| `<NodeCluster id="..." />` | 展示一个 obj 和所有 inclusion/formalizes 子节点 | P1 |
| `<FormalizationStatus id="..." />` | 显示自然语言 obj 的形式化覆盖度 | P1 |
| `<ProofTree root="..." />` | 从 theorem obj 渲染证明依赖树 | P2 |
| `<DependencyDiff a="..." b="..." />` | 对比两个 obj 的依赖网络差异 | P2 |

### 设计原则

1. **ID 驱动**：所有组件通过 id 引用 knowledge.json 里的 obj/mor，不硬编码内容
2. **活引用**：点击跳转、悬停预览、实时反映 knowledge.json 的变化
3. **AI 可生成**：用户说"展示这个定理的证明树"，AI 输出 `<ProofTree root="abc123" />`
4. **可组合**：复合组件可以嵌套（`<NodeCluster>` 内部渲染 `<ObjBlock>`）

### 示例

```mdx
# First Variation Formula

<ObjBlock id="3965488135e9" data-show="statement,intuition" />

## Formalization Status

<FormalizationStatus id="3965488135e9" />

This theorem has been partially formalized. The main statement is in Lean,
but the proof uses <ObjRef id="a1b2c3d4e5f6" /> which is not yet formalized.

## Proof Dependencies

<ProofTree root="3965488135e9" />
```

---

## 4. 实现优先级

### P0（当前可做）

- [ ] `formalizes` mor sort 支持（ilean 插件导入时自动创建 NL↔Lean 映射）
- [ ] `buildForceLinks` 返回 `{ color, dashPattern, lineWidth }`（按 sort 差异化）
- [ ] `NetworkView.tsx` Canvas 渲染使用 dashPattern 和 lineWidth
- [ ] `MOR_RENDER_RULES` 注册表

### P1（近期）

- [ ] `MorBlock` / `MorRef` 组件（类比 ObjBlock/ObjRef）
- [ ] `NodeCluster` 组件（展示 inclusion 子节点）
- [ ] `FormalizationStatus` 组件（覆盖度指标）
- [ ] NetworkSettings 边渲染模式选项（uniform / by-sort）

### P2（中期）

- [ ] `ProofTree` 组件
- [ ] `DependencyDiff` 组件
- [ ] 渲染规则插件化注册（`registerMorRenderRule(sort, rule)`）
- [ ] `inclusion` 的嵌套布局（Canvas 层面的 compound node）
