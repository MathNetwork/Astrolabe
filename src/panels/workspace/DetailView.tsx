'use client'

/**
 * DetailView — 节点/边详情 + 连接工具
 *
 * 职责：
 *   - 显示选中 obj 的完整信息（sort, name, statement, proof, intuition, notes）
 *   - 显示选中 mor 的信息（source, target, notes）
 *   - Edges 工具：列出选中 obj 的所有入边/出边
 *   - Neighbors 工具：列出选中 obj 的邻居节点
 *   - 点击邻居/边 → 写入 selectObjStore 或 selectMorStore
 *
 * 订阅：selectObjStore, selectMorStore, dataStore
 * 写入：selectObjStore（点击邻居时），selectMorStore（点击边时）
 *
 * 进度：空壳，待 Phase 5 填充
 */
import { memo } from 'react'

export const DetailView = memo(function DetailView() {
    return <div className="h-full" />
})
