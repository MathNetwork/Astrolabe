# Extension Design: 多层渲染与知识引用 DSL

## 1. 自然语言图与形式化图的共存

### 多对多形式化映射

一个自然语言 obj 可以对应多个 Lean obj。例如 sort: "theorem" 的自然语言定理，形式化时被拆成：
- 主定理陈述（lean-theorem）
- 关键引理（lean-lemma）
- 辅助构造（lean-definition）

它们通过 `sort: "formalizes"` 的 mor 指向自然语言 obj。反过来一个 Lean obj 也可以参与多个自然语言 obj 的形式化。

```
NL theorem A ←[formalizes]── Lean theorem A.main
             ←[formalizes]── Lean lemma A.aux1
             ←[formalizes]── Lean def A.helper

NL theorem B ←[formalizes]── Lean lemma A.aux1  （共享）
             ←[formalizes]── Lean theorem B.main
```

**实现影响**：
- mor sort 需要支持 `"formalizes"` 类型
- 前端需要能展示一个自然语言 obj 的所有形式化子节点
- ilean 插件导入时：如果已有同名 Lean obj，更新而非重复创建
- 去重逻辑需要理解 formalizes 关系（已有 `_status: "existing"` 机制）

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
