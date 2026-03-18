# 下一步开发计划

## 当前状态

- 架构重构 ✅（2D 图、6 stores、shared 组件、323 测试）
- AI 集成 ✅（聊天、上下文、10 skills、Tool Widgets）
- 应用目前是**只读**的——数据只能通过 AI 或后端 API 修改

## 优先级排序

### P0: 编辑功能 ✅

通过 AI Skills 实现，不需要单独的编辑 UI：
- `/add-node` `/add-edge` — 创建
- `/edit-node` `/edit-edge` — 修改
- `/delete-node` `/delete-edge` — 删除
- Tool Widgets 自动检测 JSON 输出，一键执行 API 调用

### P1: Sort 自定义 ✅

- 后端 `/api/knowledge/sorts` 读取 `.netmath/sorts.json`
- dataStore.sortConfig 存储项目自定义 sort
- objectSortConfig 支持动态覆盖（custom → default → fallback）
- 没有 sorts.json 时 fallback 到默认数学 sort

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
