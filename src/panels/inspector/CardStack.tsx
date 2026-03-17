'use client'

/**
 * CardStack — obj 卡片堆叠浏览器
 *
 * 职责：
 *   - 所有 obj 都有对应的卡片（纵向堆叠）
 *   - 每张卡片显示 obj 的 sort 颜色 + name + statement（MarkdownRenderer）
 *   - 选中的 obj 滚动到视觉中心并高亮
 *   - 点击卡片 → 写入 selectObjStore.select(hash)
 *   - 编号显示从 dataStore.nodeNumbering 读取
 *
 * 订阅：selectObjStore.selectedHash, dataStore.objects, dataStore.nodeNumbering
 * 写入：selectObjStore（点击卡片时）
 *
 * 进度：空壳，待 Phase 2 填充
 */
import { memo } from 'react'
import { useSelectObjStore } from '@/stores/selectObjStore'
import { useDataStore } from '@/stores/dataStore'

export const CardStack = memo(function CardStack() {
    const selectedHash = useSelectObjStore(s => s.selectedHash)
    const objects = useDataStore(s => s.objects)
    return <div className="h-full" />
})
