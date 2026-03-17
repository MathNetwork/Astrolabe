'use client'

/**
 * NetworkView — 3D 知识图谱
 *
 * 进度：空壳，待 Phase 4 填充
 */
import { memo } from 'react'
import { useDataStore } from '@/stores/dataStore'
import { useSelectObjStore } from '@/stores/selectObjStore'
import { useSelectMorStore } from '@/stores/selectMorStore'
import { usePhysicsStore } from '@/stores/physicsStore'
import { useAnalysisStore } from '@/stores/analysisStore'

export const NetworkView = memo(function NetworkView() {
    const objects = useDataStore(s => s.objects)
    const morphisms = useDataStore(s => s.morphisms)
    const selectedObjHash = useSelectObjStore(s => s.selectedHash)
    const selectedMorHash = useSelectMorStore(s => s.selectedHash)
    const physics = usePhysicsStore()
    const analysisData = useAnalysisStore(s => s.data)

    return (
        <div className="h-full flex items-center justify-center border border-white/5 rounded">
            <div className="text-center text-white/15">
                <div className="text-2xl mb-1">🕸</div>
                <div className="text-xs">NetworkView</div>
                <div className="text-[10px] text-white/10 mt-0.5">{objects.length} obj · {morphisms.length} mor</div>
            </div>
        </div>
    )
})
