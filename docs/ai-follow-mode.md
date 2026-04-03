# AI Follow Mode 设计文档

> 日期：2026-04-02
> 定位：FRONTEND-PLAN Phase 6E 的扩展功能

---

## 1. 功能描述

AI Follow Mode：当 agent 在 terminal 里操作 store entries（查询、证明、分析）时，前端 Network View 实时跟随，自动选中 agent 正在查看/操作的节点。用户可以直观看到 AI 在知识网络上"思考"的路径。

**典型场景**：用户输入 `/smart-prove` → agent 调 `frontier` → 调 `cross_source` → 调 `get` 查看定理 → 启动 lean-prover → 操作 `.lean` 文件。在这个过程中，Network View 依次 fly-to 到 frontier 最高 atom → cross-source 对应的 tex atom → 正在证明的 theorem 节点。用户无需手动点击，就能实时跟踪 AI 的推理轨迹。

---

## 2. 数据流设计

```
┌─────────────┐
│  Claude Code │   ← agent 调 MCP tools，输出含 12-char hex hashes
│  (PTY 进程)  │
└──────┬──────┘
       │ 原始字节流
       ▼
┌──────────────┐
│  Tauri IPC   │   ← 'pty-output' 事件 { session_id, data: number[] }
└──────┬───────┘
       │ Uint8Array
       ▼
┌──────────────┐
│  ChatPanel   │   ← term.write(bytes) 渲染到 xterm
│  pty-output  │   ← 同时：bytes → hashExtractor（新增）
│  listener    │
└──────┬───────┘
       │ 提取到的 hash 候选
       ▼
┌──────────────┐
│ hashExtractor│   ← 正则匹配 12-char hex，验证存在于 dataStore.objectMap
│ (纯函数)     │   ← 输出：最后一个有效 hash（或 null）
└──────┬───────┘
       │ validatedHash
       ▼
┌──────────────┐
│  debounce    │   ← 300ms debounce，避免高频输出时闪烁
│  (lodash 或  │
│   自写)      │
└──────┬───────┘
       │ debouncedHash
       ▼
┌──────────────┐
│ selectObj    │   ← 仅当 aiFollowMode === true 时写入
│ Store        │   ← selectObjStore.select(hash)
└──────┬───────┘
       │ selectedHash 变化
       ▼
┌──────────────┐
│ NetworkView  │   ← 已有逻辑：fly-to 动画（500ms，easeCubicOut）
│ fly-to       │   ← 已有逻辑：节点高亮 + glow
└──────────────┘
```

### 性能考量

| 问题 | 方案 |
|------|------|
| PTY 输出量大时频繁 select | 300ms debounce，只处理最后一个 hash |
| 字节流中 hash 被截断在两个 chunk 之间 | 维护 tail buffer（保留最后 24 字节），与新 chunk 拼接后再匹配 |
| fly-to 动画叠加导致抖动 | selectObjStore 去重（hash 相同时不触发），fly-to 已有 `prevSelectedRef` 去重（NetworkView:606） |
| Network View 不可见时浪费计算 | hashExtractor 在 ChatPanel 中运行，仅调 `selectObjStore.select()`。如果 NetworkView 不在 DOM 中，fly-to useEffect 不会触发 |

---

## 3. 需要改动的文件

### 新增文件

| 文件 | 用途 |
|------|------|
| `src/lib/hashExtractor.ts` | 纯函数：从文本中提取并验证 12-char hex hashes |
| `src/__tests__/hash-extractor.test.ts` | hashExtractor 测试 |
| `src/__tests__/ai-follow-mode.test.ts` | 集成契约测试 |

### 修改文件

| 文件 | 改动 | 原因 |
|------|------|------|
| `src/stores/viewStore.ts` | 加 `aiFollowMode: boolean` + `toggleAiFollow()` | 开关状态 |
| `src/components/ai-chat/ChatPanel.tsx` | 在 pty-output listener 中加 hashExtractor 调用 | 数据流入口 |
| `src/panels/workspace/NetworkSettings.tsx` | 加 AI Follow 开关 UI | 用户控制 |

### 不改的文件

| 文件 | 原因 |
|------|------|
| `selectObjStore.ts` | 已有 `select(hash)` 接口，直接用 |
| `NetworkView.tsx` | 已有 fly-to 响应 selectedHash 变化，无需改动 |
| `dataStore.ts` | 已有 `objectMap` 用于 hash 验证，无需改动 |
| `DetailView.tsx` | 已响应 selectObjStore，自动显示详情 |

### 调用关系

```
ChatPanel (pty-output listener)
  │
  ├── term.write(bytes)                    ← 现有：渲染到 xterm
  │
  └── hashExtractor(text, objectMap)       ← 新增
        │
        ├── 正则匹配 /\b[0-9a-f]{12}\b/g
        ├── 过滤：objectMap.has(candidate)
        └── 返回最后一个有效 hash
              │
              ▼
        debounce(300ms)
              │
              ▼
        if (viewStore.aiFollowMode)
          selectObjStore.select(hash)
```

---

## 4. 状态管理

### 新增状态

在 `viewStore` 中加一个字段：

```typescript
// viewStore.ts
interface ViewState {
  // ... 现有字段 ...
  aiFollowMode: boolean
  toggleAiFollow: () => void
  setAiFollowMode: (on: boolean) => void
}
```

**理由**：
- `aiFollowMode` 是 UI 状态（开关），属于 viewStore 的职责范围
- 不创建新 store——一个布尔值不值得独立管理
- 不放在 selectObjStore——follow mode 是输入策略，不是选中状态本身

### 与现有 store 的关系

```
viewStore.aiFollowMode ──读取──► ChatPanel（决定是否调 selectObjStore）
                                      │
dataStore.objectMap ────读取──► hashExtractor（验证 hash 有效性）
                                      │
selectObjStore.select() ◄──写入──┘
       │
       ▼
NetworkView（fly-to）
DetailView（显示详情）
```

**关键**：aiFollowMode 只影响"谁来调 `select()`"，不改变 select 本身的行为。手动点击和 AI follow 走同一条 `selectObjStore.select()` 路径。

---

## 5. 用户交互

### 开关位置

在 `NetworkSettings.tsx` 的现有滑块下方，加一个 toggle：

```
┌─────────────────────────┐
│ Gravity       ════○═══  │
│ Repulsion     ═══○════  │
│ Link Distance ════○═══  │
│ Friction      ═══○════  │
│ ☑ Labels                │
│ ───────────────────── │
│ 🤖 AI Follow   [  ON ] │  ← 新增
└─────────────────────────┘
```

### 样式

- 小型 toggle switch（类似 Labels 的 checkbox 风格）
- 开启时：绿色/高亮
- 关闭时：灰色
- 旁边文字 "AI Follow"

### 默认值

`aiFollowMode: false`（默认关闭）。用户需要主动开启——避免不知情时被自动跳转干扰。

### 快捷键

`Cmd+Shift+F` / `Ctrl+Shift+F` — toggle AI Follow Mode。NetworkSettings 面板中也显示快捷键提示。

### 状态指示

当 aiFollowMode 开启时，在 NetworkView 的左上角显示一个小徽章：

```
┌──────────────────────────────┐
│ 🤖 Following                 │  ← 半透明小标签
│                              │
│        ○──○──○               │
│       /    \                 │
│      ○      ○               │
│                              │
└──────────────────────────────┘
```

---

## 6. 边界情况

| 情况 | 处理方式 |
|------|---------|
| **输出含多个 hash** | 取最后一个有效 hash（最可能是当前操作的目标） |
| **hash 不在 store 中**（如 git hash） | `objectMap.has(candidate)` 过滤掉，不触发 select |
| **快速连续输出多 hash** | 300ms debounce，只响应最后一个 |
| **hash 被截断在两 chunk 之间** | tail buffer 保留最后 24 字节，与新 chunk 拼接 |
| **Network View 不可见** | select 仍然写入 store（无害），fly-to useEffect 因 DOM 不存在而不执行 |
| **split view 中多面板** | 正常工作——select 触发所有面板响应（Detail 显示详情 + Network fly-to） |
| **用户手动点击时 AI follow 覆盖** | 用户点击后 300ms 内忽略 AI follow 输出（userClickCooldown）。用户交互优先级高于 AI follow |
| **aiFollowMode 关闭时的残留选中** | 不取消——关闭只停止后续跟随，当前选中保留（跟关掉自动滚动不清除位置一样） |
| **PTY 未连接** | `viewStore.ptySessionId === null` 时整个逻辑不执行 |
| **ANSI 转义序列干扰** | hashExtractor 先 strip ANSI codes 再匹配 |

---

## 7. 测试计划

### hash-extractor.test.ts（纯函数测试）

| 测试名 | 输入 | 预期输出 |
|--------|------|---------|
| `extracts_single_hash` | `"Entry abc123def456 found"` + objectMap 含该 hash | `"abc123def456"` |
| `extracts_last_hash_when_multiple` | `"abc123def456 then 789012345678"` + 两者都有效 | `"789012345678"` |
| `ignores_invalid_hash` | `"abc123def456"` + objectMap 不含 | `null` |
| `ignores_non_hex` | `"hello world"` | `null` |
| `strips_ansi_codes` | `"\x1b[32mabc123def456\x1b[0m"` + 有效 | `"abc123def456"` |
| `handles_hash_at_boundary` | `"...text abc123"` + `"def456 more..."` (拼接后) | `"abc123def456"` |
| `ignores_longer_hex_strings` | `"abcdef123456789012"` (18 chars) | `null`（不匹配 12-char 边界） |

### ai-follow-mode.test.ts（契约测试）

| 测试名 | 验证内容 |
|--------|---------|
| `viewStore_has_aiFollowMode` | viewStore.ts 包含 `aiFollowMode` 字段 |
| `viewStore_has_toggleAiFollow` | viewStore.ts 包含 `toggleAiFollow` 方法 |
| `chatpanel_imports_hashExtractor` | ChatPanel.tsx 导入 hashExtractor |
| `chatpanel_reads_aiFollowMode` | ChatPanel.tsx 引用 aiFollowMode |
| `chatpanel_calls_selectObj` | ChatPanel.tsx 引用 selectObjStore 或 select |
| `network_settings_has_follow_toggle` | NetworkSettings.tsx 包含 aiFollow 相关 UI |
| `hashExtractor_is_pure_module` | hashExtractor.ts 不导入 React，不导入 store |

---

## 8. 实现步骤（TDD 顺序）

### Step 1：hashExtractor 纯函数（红 → 绿 → 重构）

1. 写 `hash-extractor.test.ts`（7 个测试）
2. 运行，全部红
3. 创建 `src/lib/hashExtractor.ts`：
   ```typescript
   const ANSI_RE = /\x1b\[[0-9;]*[A-Za-z]/g
   const HASH_RE = /\b[0-9a-f]{12}\b/g

   export function extractLastValidHash(
     text: string,
     isValid: (hash: string) => boolean,
   ): string | null {
     const clean = text.replace(ANSI_RE, '')
     const matches = clean.match(HASH_RE)
     if (!matches) return null
     for (let i = matches.length - 1; i >= 0; i--) {
       if (isValid(matches[i])) return matches[i]
     }
     return null
   }
   ```
4. 运行，全部绿

### Step 2：viewStore 状态（红 → 绿）

1. 写 `ai-follow-mode.test.ts` 中 viewStore 相关测试（2 个）
2. 运行，红
3. 在 `viewStore.ts` 加 `aiFollowMode: false` + `toggleAiFollow` + `setAiFollowMode`
4. 运行，绿

### Step 3：ChatPanel 集成（红 → 绿）

1. 写 `ai-follow-mode.test.ts` 中 ChatPanel 相关测试（3 个）
2. 运行，红
3. 在 ChatPanel.tsx 的 pty-output listener 中加入：
   ```typescript
   // AI Follow Mode: extract hashes from PTY output
   const text = new TextDecoder().decode(new Uint8Array(event.payload.data))
   tailBufferRef.current += text
   if (tailBufferRef.current.length > 200) {
     tailBufferRef.current = tailBufferRef.current.slice(-24)
   }
   if (viewStore.aiFollowMode) {
     const hash = extractLastValidHash(
       tailBufferRef.current,
       (h) => dataStore.objectMap.has(h),
     )
     if (hash) debouncedSelect(hash)
   }
   ```
4. 运行，绿

### Step 4：NetworkSettings UI（红 → 绿）

1. 写 `ai-follow-mode.test.ts` 中 UI 测试（1 个）
2. 运行，红
3. 在 NetworkSettings.tsx 加 toggle
4. 运行，绿

### Step 5：全量回归

```bash
npx vitest run    # 所有前端测试通过
```

---

## 自我审查

### 通过项

- **数据流完整性**：PTY bytes → TextDecoder → ANSI strip → regex match → objectMap validate → debounce → selectObjStore.select() → NetworkView fly-to。链路完整，每个环节都有明确的组件负责。
- **性能**：300ms debounce 防止高频触发；objectMap.has() 是 O(1) 查找；fly-to 已有 prevSelectedRef 去重；Network View 不在 DOM 时 useEffect 不执行。
- **可扩展性**：hashExtractor 是纯函数，未来要支持"高亮路径"只需把返回值从 `lastHash` 改为 `allHashes[]`，配合 FRONTEND-PLAN 的 highlightStore 即可实现路径轨迹高亮。
- **状态一致性**：关闭 aiFollowMode 只停止后续跟随，不清除已有选中——符合用户心智模型（关掉自动滚动不会跳回顶部）。

### 需要补充的

- **userClickCooldown 实现细节** → 在 ChatPanel 中监听 selectObjStore 的变化，如果是 NetworkView 的 selfClick 触发的（而非 AI follow），设置 300ms cooldown flag，期间忽略 AI follow 输出。实现方式：在 selectObjStore 加 `lastSelectSource: 'user' | 'ai-follow' | null`，或者在 ChatPanel 中直接用 timestamp 判断。
  - **建议**：最简方案——在 NetworkView 的 click handler 中 `set userClickedAt = Date.now()`，ChatPanel 检查 `Date.now() - userClickedAt < 300` 时跳过。这个 timestamp 可以放在一个 ref 里通过 window event 传递，避免新增 store 字段。

- **tail buffer 清理时机** → 当前设计是 `> 200 字节时 slice(-24)`。更安全的做法：每次成功提取 hash 后清空 buffer（因为 hash 不会跨更多 chunk），失败时保留最后 24 字节。

### 设计风险

- **误触发**：PTY 输出中可能出现恰好 12 位 hex 的非 hash 字符串（如部分 git commit hash 的前 12 位）。objectMap 验证可以过滤大部分，但如果 store 恰好有同名 hash 就会误触发。风险低——store hash 是 SHA256 前 12 位，跟其他 12-hex 碰撞概率极小（2^48 空间）。
- **ANSI 序列复杂度**：简单 regex `\x1b\[[0-9;]*[A-Za-z]` 覆盖 CSI 序列，但不覆盖 OSC（`\x1b]`）或 DCS 序列。Claude Code 的输出主要用 CSI，实际使用中不太会遇到 hash 嵌入 OSC 序列的情况。如果遇到问题，可以用 `strip-ansi` npm 包替代自写 regex。
- **debounce 延迟感知**：300ms debounce 意味着快速操作时有 0.3 秒延迟。如果用户觉得"跟不上"，可以缩短到 150ms 或改为 `throttle`（立即执行第一个，300ms 内忽略后续）。建议先用 300ms debounce 上线，根据反馈调整。
