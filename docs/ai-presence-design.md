# AI 生命感设计文档

> 日期：2026-04-03

---

## 美学原则

生命感是**不经意间**被感知的。用户不会注意到动画在播放，但关掉后会觉得软件少了某种温度。

**约束**：
- 动画幅度极小：节点大小波动 ≤ 10%，透明度波动 ≤ 15%
- 动画速度极慢：最快周期 ≥ 2 秒
- 颜色只用低饱和度、低亮度变化
- 同一时刻最多一种 AI 动画在播放
- 用户操作（拖拽、点击、缩放）时所有 AI 动画暂停

**正面参考**：macOS 呼吸灯、Apple Watch 呼吸 app、Figma 协作者光标

**反面案例**：闪烁、弹跳、粒子特效、任何引人注目的东西

---

## 1. 效果清单

### 效果 A：AI 注视点（AI Gaze）

**触发条件**：AI Follow Mode 开启（viewStore.aiFollowMode = true），agent 输出中检测到 store hash。

**视觉描述**：在 agent 当前关注的节点周围，出现一圈极淡的蓝灰色光晕。不是外圈线条，而是径向渐变——从节点中心向外扩散的、半径约为节点 1.8 倍的柔和雾气。颜色从 `rgba(120, 160, 200, 0.12)` 渐变到完全透明。

当 agent 切换到下一个节点时，旧节点的光晕在 800ms 内淡出（线性衰减到 0），新节点的光晕在 400ms 内淡入。两者可以短暂共存（切换瞬间都可见），形成"注意力转移"的感觉。

**动画参数**：
- 光晕半径：`nodeRadius * 1.8`
- 光晕颜色：`rgba(120, 160, 200, alpha)` 其中 alpha 在 0.08 ~ 0.12 之间以 4 秒周期正弦缓动（`alpha = 0.10 + 0.02 * sin(t * PI / 2000)`）
- 淡入时长：400ms，easeOutCubic
- 淡出时长：800ms，linear
- 最大同时可见光晕数：2（当前 + 上一个正在淡出的）

**消失条件**：AI Follow Mode 关闭，或 agent 停止输出超过 5 秒，或用户开始拖拽/缩放。

**为什么是"不经意间"的**：alpha 峰值只有 0.12（几乎透明），4 秒呼吸周期比人的注意节奏慢，颜色是冷灰蓝不是亮色。用户如果不刻意看，不会意识到光晕在呼吸。

---

### 效果 B：证明呼吸（Proof Breath）

**触发条件**：`highlightStore.provingHash` 不为 null（Phase 6C：用户点了 Prove 按钮）。

**视觉描述**：正在被证明的节点的状态环（原本是黄色 sorry 环）从静态变为缓慢明暗呼吸。不是改变大小，不是改变颜色，只是 sorry 环的透明度在微小范围内波动。

**动画参数**：
- 基础状态：sorry 环颜色 `#eab308`，lineWidth `1.5 / transform.k`（现有）
- 呼吸叠加：`alpha = 0.6 + 0.15 * sin(t * PI / 1500)` → 在 0.45 ~ 0.75 之间波动
- 周期：3 秒
- 缓动：纯正弦（无 easing，正弦本身已足够平滑）

**消失条件**：`provingHash` 被清除（prove 完成或超时），或用户正在拖拽。消失时不做过渡——直接恢复为静态环。这是因为 prove 结束通常伴随状态环颜色变化（黄→绿），颜色变化本身就是视觉事件，不需要额外的淡出动画。

**为什么是"不经意间"的**：只改透明度不改大小/颜色，波动范围只有 0.3（从 0.45 到 0.75），周期 3 秒。肉眼看起来像环在"安静地等待"，不是在"努力闪烁"。

---

### 效果 C：变化涟漪（Change Ripple）

**触发条件**：`astrolabe.json` 被修改（mtime 变化 → dataStore.triggerRefresh），且某个 entry 的 state 字段发生了变化（从 sorry 变为 proven，或反之）。

**视觉描述**：变化的节点产生一圈扩散的涟漪——一个圆环从节点中心向外扩散，同时淡出。颜色取自新状态环颜色（proven → 淡绿，sorry → 淡黄）。圆环从 `nodeRadius` 扩展到 `nodeRadius * 3`，透明度从 0.25 线性衰减到 0。

一次涟漪只出现一次（不循环）。如果多个节点同时变化，每个各产生一个涟漪，但它们自然交错（不同节点位置不同，视觉上不会堆叠）。

**动画参数**：
- 起始半径：`nodeRadius`
- 终止半径：`nodeRadius * 3`
- 颜色：状态环颜色降低饱和度 — proven `rgba(34, 197, 94, 0.25)` → sorry `rgba(234, 179, 8, 0.25)`
- 持续时间：1200ms
- 缓动：easeOutCubic（开始快、结束慢，自然消散感）
- 线宽：`1 / transform.k`，不变

**消失条件**：1200ms 后自然消失。不可中断——一旦触发必定播放完毕（因为只有 1.2 秒且极淡，中断反而更突兀）。

**为什么是"不经意间"的**：只出现一次不循环，持续只有 1.2 秒，起始透明度只有 0.25 且快速衰减。用户余光可能捕捉到"那边好像有什么动了一下"，但不会被打断。

---

### 效果 D：路径残影（Path Afterglow）

**触发条件**：AI Follow Mode 开启，agent 在短时间内（10 秒内）依次访问了多个节点。

**视觉描述**：agent 走过的节点之间，连接它们的边（如果存在）出现一条极淡的渐变色线，颜色从最近访问的节点（较亮）到较早的节点（较暗）渐变。像是 AI 留下的"思考轨迹"。

颜色：`rgba(120, 160, 200, alpha)` 其中 alpha 按访问时间衰减：最近 = 0.15，每过 2 秒衰减 0.03，10 秒前的 = 0。

**动画参数**：
- 颜色：`rgba(120, 160, 200, alpha)`
- alpha 衰减：`max(0, 0.15 - (now - visitTime) * 0.015)` （每秒衰减 0.015，10 秒后为 0）
- 线宽：`1.5 / transform.k`
- 更新频率：跟随 canvas tick（不需要额外 timer）

**消失条件**：AI Follow Mode 关闭，或最后一次访问超过 10 秒，或用户正在拖拽。

**为什么是"不经意间"的**：最大 alpha 只有 0.15，且持续衰减。不是单独的线，而是叠加在已有边上的淡色。用户必须仔细看才能分辨出"这条边比那条边亮一点点"。

---

### 效果 E：空闲微动（Idle Drift）

**触发条件**：应用打开且 AI 未在操作（无 provingHash、无 AI Follow、无 propagation 高亮），simulation 已冷却（alpha < 0.001），超过 30 秒无任何用户操作。

**视觉描述**：整个图的所有节点以极其缓慢的速度做微小的布朗运动——每个节点在其当前位置 ± 0.5 像素范围内随机漂移。视觉上几乎察觉不到，但潜意识里感觉"这个图是活的"。

**动画参数**：
- 漂移幅度：`±0.5` 像素（世界坐标，不受 zoom 影响）
- 更新频率：每 100ms 给每个节点施加一次微小力 `(Math.random() - 0.5) * 0.002`
- simulation alpha 维持在 `0.001`（刚好不停但几乎不动）
- 无方向偏好（各向同性随机）

**消失条件**：任何用户操作、任何 AI 操作开始、或 AI Follow Mode 开启。消失方式：停止施加微小力，simulation 自然冷却到停止。

**为什么是"不经意间"的**：0.5 像素的漂移在 1920×1080 屏幕上占 0.026%。人眼在静止背景下的位移感知阈值约为 1 弧分（约 1-2 像素），0.5 像素低于阈值。但是大量节点同时微动产生的整体"呼吸感"是可以被潜意识感知的。

---

## 2. 技术可行性

### 渲染驱动

当前 NetworkView 的渲染是 **d3 simulation tick 驱动**（NetworkView.tsx:293）：
```
simulation.on('tick', () => renderRef.current())
```

simulation 冷却后（alphaDecay=0.01 → alpha 趋近 0），tick 停止 → 渲染停止。

**问题**：效果 A/B/D 需要在 simulation 冷却后继续动画。

**方案**：当任何 AI 动画激活时，启动一个独立的 `requestAnimationFrame` 循环调用 `renderRef.current()`。所有 AI 动画关闭后停止 rAF。这样不影响 d3 simulation 的物理行为（不 restart），只驱动重绘。

```typescript
// 概念代码
const aiAnimatingRef = useRef(false)
function startAiRenderLoop() {
    if (aiAnimatingRef.current) return
    aiAnimatingRef.current = true
    const loop = () => {
        if (!aiAnimatingRef.current) return
        renderRef.current()
        requestAnimationFrame(loop)
    }
    requestAnimationFrame(loop)
}
function stopAiRenderLoop() {
    aiAnimatingRef.current = false
}
```

### 逐效果评估

| 效果 | 改动文件 | 渲染影响 | 性能开销 | 与 6B 兼容性 |
|------|---------|---------|---------|-------------|
| A 注视点 | NetworkView.tsx（渲染循环 + rAF 驱动） | 需要 rAF 循环 | 极低：每帧多画 1-2 个径向渐变 | 兼容：光晕在高亮橙圈之下绘制 |
| B 呼吸 | NetworkView.tsx（状态环 alpha 计算） | 需要 rAF 循环 | 极低：只改 1 个节点的 alpha | 兼容：在高亮模式下呼吸仍可见 |
| C 涟漪 | NetworkView.tsx（临时涟漪列表 + 渲染） | 触发时需要 rAF 循环（1.2 秒） | 低：每帧多画 1-3 个圆环 | 兼容：涟漪叠加在所有效果之上 |
| D 残影 | NetworkView.tsx（访问历史 + 边颜色叠加） | 跟随现有 tick 即可 | 低：每帧遍历访问历史（最多 5-6 条） | 兼容：在边颜色之上叠加 |
| E 微动 | NetworkView.tsx（微小力 + alpha 维持） | 用 setInterval 施加力 | 极低：simulation 以极低 alpha 运行 | 兼容：互斥——有高亮时不微动 |

### 369 节点场景帧率影响

当前 369 节点 + 536 边，canvas 2D 渲染每帧 < 2ms（无复杂操作）。新增最多 2 个径向渐变（效果 A）+ 1 个 alpha 计算（效果 B）+ 3 个圆环（效果 C），总计 < 0.5ms 额外开销。60fps 无影响。

---

## 3. 数据流

### AI 当前关注的节点

```
PTY output → ChatPanel pty-output listener
  → hashExtractor（Phase 6D：提取 12-char hex，objectMap 验证）
  → viewStore.aiFollowMode ? selectObjStore.select(hash) : skip
  → 同时：aiPresenceStore.setGazeTarget(hash)  ← 新增
```

hashExtractor 是效果 A（注视点）和效果 D（残影）的数据源。Phase 6D 的 AI Follow Mode 和 AI Presence 共享同一个提取管道，区别在于 Follow Mode 调 `selectObjStore.select()`（会 fly-to），Presence 只调 `aiPresenceStore.setGazeTarget()`（只画光晕，不移动相机）。两者可以同时启用也可以独立。

### Entry 状态变化

```
astrolabe.json mtime 变化
  → useFileWatcher（2 秒轮询）
  → dataStore.triggerRefresh()
  → useProjectLoader 重新 fetch ref-graph
  → NetworkView loadKey 变化 → 重建节点数组
  → 对比新旧节点的 state 字段 → 检测到变化 → 触发涟漪
```

涟漪需要对比前后 state。方案：在 NetworkView 重建节点时，保存一份 `prevStateMap: Map<id, state>`，新数据到来时 diff，变化的节点加入涟漪队列。

### Store vs Event

| 数据 | 走 store 还是 event | 理由 |
|------|-------------------|------|
| gazeTarget (当前注视节点) | store (aiPresenceStore) | 多个组件可能读取（NetworkView 渲染 + 状态指示器） |
| visitHistory (路径残影) | store (aiPresenceStore) | 需要持久化最近 10 秒的访问记录 |
| provingHash | store (highlightStore，已有) | 已在 Phase 6B 定义 |
| ripple 队列 | ref (组件内部) | 纯渲染状态，1.2 秒后自动清除，不需要跨组件共享 |
| 用户操作中 | ref (组件内部) | 拖拽/缩放检测在 NetworkView 内部，不需要外部访问 |

### 新增 store

```typescript
// aiPresenceStore.ts
interface AIPresenceState {
    enabled: boolean
    gazeTarget: string | null       // 效果 A: AI 当前注视的节点
    visitHistory: { hash: string; time: number }[]  // 效果 D: 最近访问
    setEnabled: (on: boolean) => void
    setGazeTarget: (hash: string | null) => void
    recordVisit: (hash: string) => void  // 添加到 visitHistory，自动淘汰 >10s 的
}
```

---

## 4. 开关机制

### 总开关

在 `NetworkSettings.tsx` 中，AI Follow toggle 下方：

```
☑ Labels
🤖 AI Follow   [ ON  ]
✨ AI Presence  [ OFF ]   ← 新增
```

### 默认值

`enabled: false`。理由：这是美学增强，不是功能需求。用户需要主动选择开启。开启后，具体哪些效果生效由场景自动决定（有 provingHash → 呼吸，有 gazeTarget → 注视点，有 state diff → 涟漪）。

### 关闭后的状态

`enabled = false` 时，canvas 渲染逻辑跳过所有 AI Presence 代码路径，回退到纯 Phase 6B 行为。零视觉差异，零性能开销。具体实现：渲染函数开头 `if (!aiPresenceStore.enabled) skip all presence rendering`。

### 与 AI Follow Mode 的关系

两个独立开关：
- AI Follow = 相机跟随（selectObjStore.select → fly-to）
- AI Presence = 视觉生命感（光晕、呼吸、涟漪）

可以都开、都关、或只开一个。Follow 提供导航功能，Presence 提供氛围感受。

---

## 5. 优先级排序

按"生命感贡献度 / 实现成本"排序：

| 排名 | 效果 | 贡献 | 成本 | 推荐 |
|------|------|------|------|------|
| 1 | B 证明呼吸 | 高（prove 是核心操作，呼吸给等待过程以生命感） | 极低（改 1 行 alpha 计算） | **先做** |
| 2 | C 变化涟漪 | 高（state 变化是关键时刻，涟漪给予即时反馈） | 低（涟漪队列 + 1 个圆环绘制） | **先做** |
| 3 | A 注视点 | 中（需要 AI Follow Mode 开启，场景有限） | 中（需要 rAF 循环 + 径向渐变） | 观察效果后决定 |
| 4 | D 残影 | 中（只在 AI 连续操作时有意义） | 中（访问历史管理 + 边色叠加） | 观察效果后决定 |
| 5 | E 微动 | 低（只在空闲时，用户可能不在看屏幕） | 低（微小力 + alpha 维持） | 观察效果后决定 |

**推荐先做 B + C**：
- B（呼吸）只需在现有状态环渲染中加一行 alpha 正弦计算 + rAF 循环，5 行改动
- C（涟漪）需要一个涟漪队列和一个 drawRipple 函数，约 30 行改动
- 两者互不干扰，可以独立上线和评估
- 两者覆盖了最高频的场景：prove 等待（B）和 state 变化（C）

---

## 6. 自我审查

### 通过项

- **微妙性**：所有效果的 alpha 峰值均 ≤ 0.25（涟漪起始），呼吸波动只有 ±0.15。4 秒和 3 秒的周期远低于人类注意力切换频率。
- **用户优先**：所有效果在用户拖拽/缩放时暂停。效果 A/D/E 在检测到用户操作时直接停止 rAF 循环。效果 B 在呼吸中途被用户点击其他节点不会产生冲突（provingHash 被清除 → 呼吸停止）。效果 C 不可中断但只有 1.2 秒且极淡。
- **互斥性**：同一时刻最多一种动画循环在播放。效果 B 是局部的（单节点 alpha），不占用全局动画槽。效果 A/D 共享 AI Follow 场景。效果 E 在所有其他效果关闭时才启动。所以不会出现多效果叠加。
- **性能**：最坏情况（B + C 同时激活）：1 个 alpha 正弦 + 3 个圆环 = < 0.3ms/帧。369 节点场景无感知。
- **关闭回退**：`enabled = false` 时跳过所有 presence 代码，渲染路径与当前完全一致。

### 需要注意的

- **效果 A 的径向渐变**：canvas 2D 的 `createRadialGradient` 在高 DPI 屏幕上可能有 antialiasing artifact。如果出现，改用预渲染的模糊圆形 sprite（`drawImage` 替代 `createRadialGradient`）。
- **效果 C 的涟漪触发频率**：`lean_sync_state` 可能一次更新多个 entry，导致多个涟漪同时出现。虽然视觉上可以共存（不同位置），但如果超过 5 个同时涟漪，应该只取 PageRank 最高的 5 个，丢弃其余。
- **效果 E 的 simulation 副作用**：微小力会轻微改变节点位置。如果用户之后保存了布局（如果有这个功能），微动可能导致微小的位置偏移。目前 Astrolabe 不保存布局，所以不是问题。但如果未来加布局保存，E 需要在保存前停止并还原位置。

### 设计风险

- **"不经意间"是否真的不经意**：这只能通过用户测试验证。文档中的参数是保守估计，但每个人的感知阈值不同。建议先用最保守的参数上线（alpha 减半），收集反馈后再微调。
- **rAF 循环的电量影响**：笔记本电脑上持续 rAF 会阻止 GPU 进入低功耗状态。对策：AI 动画开启时在 NetworkSettings 旁显示一个小电池图标提示。或者用 `setInterval(render, 50)` 替代 rAF（20fps 对 3 秒周期的呼吸足够平滑，但省电）。
