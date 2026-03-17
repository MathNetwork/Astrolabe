'use client'

/**
 * NetworkView — 3D 知识图谱
 *
 * 订阅 5 个 store：
 *
 * 1. selectObjStore.selectedHash
 *    → 决定聚焦的节点（高亮 + 相机飞向）
 *    → 每次新选中覆盖上一次
 *
 * 2. selectMorStore.selectedHash
 *    → 决定聚焦的边（高亮 source→target）
 *    → 每次新选中覆盖上一次
 *
 * 3. dataStore.objects + dataStore.morphisms
 *    → 读取所有 obj/mor 数据来渲染图谱
 *    → 用 obj.name 显示节点标签
 *    → 用 obj.sort 决定节点形状和颜色
 *
 * 4. physicsStore
 *    → 读取物理参数（gravity, repulsion, linkDistance）
 *    → 控制力导向布局引擎
 *
 * 5. analysisStore
 *    → 读取分析结果（pagerank, communities 等）
 *    → 控制节点大小/颜色映射
 */
import { memo } from 'react'
import { useDataStore } from '@/stores/dataStore'
import { useSelectObjStore } from '@/stores/selectObjStore'
import { useSelectMorStore } from '@/stores/selectMorStore'
import { usePhysicsStore } from '@/stores/physicsStore'
import { useAnalysisStore } from '@/stores/analysisStore'

export const NetworkView = memo(function NetworkView() {
    // 数据
    const objects = useDataStore(s => s.objects)
    const morphisms = useDataStore(s => s.morphisms)

    // 选中状态（高亮 + 相机聚焦）
    const selectedObjHash = useSelectObjStore(s => s.selectedHash)
    const selectedMorHash = useSelectMorStore(s => s.selectedHash)

    // 物理布局参数
    const physics = usePhysicsStore()

    // 分析数据（节点大小/颜色映射）
    const analysisData = useAnalysisStore(s => s.data)

    return <div className="h-full bg-[#0a0a0f]" />
})
