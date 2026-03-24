# P0: File Watcher

## 目标
astrolabe.json 被外部修改时自动刷新所有视图。

## 当前状态
无。目前数据只在 useProjectLoader 初始加载时读取一次。AI Chat 的 ToolWidgets 会手动调 refreshData，但外部编辑（VSCode 直接改 JSON）不会触发任何刷新。

## 数据流
```
Tauri fs watch(astrolabe.json) → event → frontend
  → useProjectLoader 重新 fetch /api/astrolabe/graph
  → dataStore 更新 objects/morphisms
  → NetworkView 可选增量刷新（见 p0-incremental-refresh）
```

## 涉及文件
- `src-tauri/src/watcher.rs` — 新建，Tauri file watcher command
- `src/hooks/useFileWatcher.ts` — 新建，监听 Tauri 事件
- `src/hooks/useProjectLoader.ts` — 接收 watcher 事件触发刷新

## API 端点
无需后端端点。后端 AstrolabeStorage 已有 `_load()` 从磁盘读取。前端直接 re-fetch 现有 API 即可。

## 验收标准
1. 用 VSCode 编辑 astrolabe.json 保存
2. Astrolabe 的 Detail Panel 和 Network View 在 1 秒内自动反映变化
3. 不需要手动点刷新按钮
