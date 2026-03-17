'use client'

/**
 * ControlsPanel — 左栏：设置和分析控制
 *
 * 职责：
 *   - 物理参数调整（gravity, repulsion, linkDistance）→ 写入 physicsStore
 *   - 网络分析触发和结果展示（pagerank, communities 等）→ 读写 analysisStore
 *   - 视图切换（read/network/detail）→ 写入 viewStore
 *   - 标签/桥接显示开关 → 写入 viewStore
 *
 * 订阅：physicsStore, analysisStore, viewStore
 * 不关心：selectObjStore, selectMorStore, dataStore
 *
 * 进度：空壳，待 Phase 6 填充
 */
import { memo } from 'react'

export const ControlsPanel = memo(function ControlsPanel() {
    return <div className="h-full bg-black" />
})
