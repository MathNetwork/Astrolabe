# P0: File Watcher

## 目标
astrolabe.json 被外部修改时自动刷新所有视图。

## 当前状态
- 后端：AstrolabeStorage 已有 `_check_reload()` — 每次读取时检测 mtime，文件变了自动重新加载 ✅
- 前端：数据只在 useProjectLoader 初始加载时读取一次。需要 Tauri fs watch 触发 re-fetch。

## 数据流
```
文件变动 → Tauri fs watch(astrolabe.json) → event → frontend
  → re-fetch /api/astrolabe/graph
  → 后端 AstrolabeStorage._check_reload() 检测 mtime → 重新 _load()
  → 返回最新数据
  → dataStore 更新 objects/morphisms
  → 视图刷新
```

## 涉及文件
- `backend/astrolabe/storage.py` — `_check_reload()` mtime 检测 ✅ 已完成
- `src-tauri/src/watcher.rs` — 新建，Tauri file watcher command
- `src/hooks/useFileWatcher.ts` — 新建，监听 Tauri 事件触发 re-fetch
- `src/hooks/useProjectLoader.ts` — 接收 watcher 事件触发刷新

## API 端点
无需新端点。后端已有 mtime 检测，前端 re-fetch 现有 API 即可。

## 验收标准
1. 用 VSCode 编辑 astrolabe.json 保存
2. Astrolabe 的 Detail Panel 和 Network View 在 1 秒内自动反映变化
3. 不需要手动点刷新按钮
