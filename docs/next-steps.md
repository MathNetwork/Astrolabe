# 下一步开发计划

## 当前状态

- 架构重构 ✅（2D 图、6 stores、shared 组件、323 测试）
- AI 集成 ✅（聊天、上下文、10 skills、Tool Widgets）
- 应用目前是**只读**的——数据只能通过 AI 或后端 API 修改

## 优先级排序

### P0: 编辑功能（核心缺失）

目前用户不能直接在 UI 上创建/编辑节点，只能通过 AI 聊天。这是最大的功能缺口。

**需要做的：**
- [ ] 创建节点：空白处右键 / 按钮 → 表单（name, sort, statement, proof, ...）
- [ ] 编辑节点：DetailView 的字段变成可编辑（双击 or 编辑按钮）
- [ ] 删除节点：确认对话框
- [ ] 创建边：从一个节点拖到另一个 / 按钮选 source + target
- [ ] 编辑/删除边
- [ ] 所有修改通过后端 API → 刷新 dataStore
- [ ] 编辑操作纳入 undo 系统

**依赖**：后端 API 已有 CRUD 端点

### P1: Sort 自定义（通用化关键）

目前 sort 类型（theorem/definition/lemma...）和颜色硬编码在 `objectSortConfig.ts` 里。要做通用工具需要让用户自定义。

**需要做的：**
- [ ] 项目级 sort 配置：`.netmath/sorts.json`（name → color 映射）
- [ ] 没有 sorts.json 时 fallback 到默认（数学 sort）
- [ ] Settings 里可以添加/修改/删除 sort
- [ ] 创建节点时 sort 下拉列表从配置读取

**影响**：objectSortConfig.ts 从硬编码变成动态读取

### P2: UI 打磨

**聊天面板：**
- [ ] 位置可调（不只是右下角）
- [ ] 大小可拖拽
- [ ] 支持全屏模式

**整体 UI：**
- [ ] 首页重新设计（当前太简陋）
- [ ] 加载状态优化（skeleton loading）
- [ ] 空状态优化（没有节点时的引导）
- [ ] 移动端适配（如果做 Web 版）

**NetworkView：**
- [ ] 节点标签可切换显示/隐藏
- [ ] 小地图（minimap）
- [ ] 导出图片

### P3: Template 项目

做 2-3 个非数学的小 demo 展示通用性。每个是一个独立仓库，包含 `.netmath/` 目录。

- [ ] 法律案例（5-10 个节点：statute, case, opinion, argument）
- [ ] 生物通路（5-10 个节点：gene, protein, pathway, disease）
- [ ] 或：哲学论证 / 历史事件 / 软件架构

**依赖**：P1 Sort 自定义完成后才有意义

### P4: 桌面版打包

- [ ] `npm run tauri build` 生成 .app / .dmg (macOS)
- [ ] 应用图标设计
- [ ] 自动更新机制（tauri-plugin-updater）
- [ ] 代码签名（Apple Developer）

**依赖**：P0-P2 基本完成，功能稳定后再打包

## 建议执行顺序

```
P0 编辑功能    ← 最先做，核心功能
    ↓
P1 Sort 自定义  ← 通用化
    ↓
P2 UI 打磨     ← 体验提升
    ↓
P3 Templates   ← 展示通用性
    ↓
P4 打包发布    ← 最后
```

## 时间估算

| 阶段 | 范围 |
|------|------|
| P0 编辑功能 | 节点/边 CRUD + 表单 + undo |
| P1 Sort 自定义 | sorts.json + 动态配置 + UI |
| P2 UI 打磨 | 聊天面板 + 首页 + 细节 |
| P3 Templates | 2-3 个小项目 |
| P4 打包 | build + 图标 + 签名 |
