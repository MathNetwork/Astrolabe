'use client'

import { memo } from 'react'
import { useSelectionStore } from '@/stores/selectionStore'
import { useDataStore } from '@/stores/dataStore'

/**
 * NetworkPanel — 3D 知识图谱
 *
 * 订阅: dataStore.objects, dataStore.morphisms, selectionStore.selectedNodeId
 * TODO: 从 ForceGraph3D 迁移 3D 渲染逻辑
 */
export const NetworkPanel = memo(function NetworkPanel() {
    const objects = useDataStore(s => s.objects)
    const morphisms = useDataStore(s => s.morphisms)
    const selectedNodeId = useSelectionStore(s => s.selectedNodeId)

    return (
        <div className="h-full flex items-center justify-center bg-[#0a0a0f] text-white/30 text-sm">
            NetworkPanel — {objects.length} objects, {morphisms.length} morphisms
            {selectedNodeId && <span className="ml-2 text-white/50">selected: {selectedNodeId.slice(0, 8)}</span>}
        </div>
    )
})

export default NetworkPanel
