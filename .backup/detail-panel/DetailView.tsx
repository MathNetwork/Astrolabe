'use client'

/**
 * DetailView — 纯布局容器
 *
 * 只订阅 selectObjStore.selectedHash 决定是否渲染。
 * ObjCard/MorCard/MorList 都是自治组件，自己订阅 store。
 */
import { memo } from 'react'
import { useSelectObjStore } from '@/stores/selectObjStore'
import { useSelectMorStore } from '@/stores/selectMorStore'
import { ObjCard } from '@/components/shared/ObjCard'
import { MorCard } from '@/components/shared/MorCard'
import { MorList } from '@/components/shared/MorList'

export const DetailView = memo(function DetailView() {
    const selectedObjHash = useSelectObjStore(s => s.selectedHash)
    const selectedMorHash = useSelectMorStore(s => s.selectedHash)
    // 完全空状态
    if (!selectedObjHash && !selectedMorHash) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="text-center text-white/20">
                    <div className="text-3xl mb-2">◇</div>
                    <div className="text-xs">Select an object or morphism</div>
                </div>
            </div>
        )
    }

    return (
        <div className="h-full flex flex-col">
            {/* 上：Obj 详情（有 obj 时显示，没有则留空） */}
            <div className="overflow-y-auto p-3 shrink-0 max-h-[50%]">
                {selectedObjHash && <ObjCard id={selectedObjHash} />}
            </div>

            {/* 下：Morphisms (左) + Mor 详情 (右) */}
            <div className="flex-1 min-h-0 flex border-t border-white/5">
                <div className="w-1/2 overflow-y-auto p-3 border-r border-white/5">
                    {selectedObjHash && <MorList objId={selectedObjHash} />}
                </div>
                <div className="w-1/2 overflow-y-auto p-3">
                    {selectedMorHash ? (
                        <MorCard id={selectedMorHash} />
                    ) : (
                        <div className="h-full flex items-center justify-center text-white/15 text-xs">
                            Click a morphism to see details
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
})
