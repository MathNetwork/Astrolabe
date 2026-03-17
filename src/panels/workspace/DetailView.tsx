'use client'

/**
 * DetailView — 纯布局容器
 *
 * 只订阅 selectObjStore.selectedHash 决定是否渲染。
 * ObjCard/MorCard/MorList 都是自治组件，自己订阅 store。
 */
import { memo, useEffect, useRef } from 'react'
import { useSelectObjStore } from '@/stores/selectObjStore'
import { useSelectMorStore } from '@/stores/selectMorStore'
import { ObjCard } from '@/components/shared/ObjCard'
import { MorCard } from '@/components/shared/MorCard'
import { MorList } from '@/components/shared/MorList'

export const DetailView = memo(function DetailView() {
    const selectedObjHash = useSelectObjStore(s => s.selectedHash)
    const selectedMorHash = useSelectMorStore(s => s.selectedHash)
    const clearMor = useSelectMorStore(s => s.select)

    // 切换 obj 时清除 mor 选中（mor 方向是相对 obj 的）
    const prevObjRef = useRef(selectedObjHash)
    useEffect(() => {
        if (selectedObjHash !== prevObjRef.current) {
            prevObjRef.current = selectedObjHash
            clearMor(null)
        }
    }, [selectedObjHash, clearMor])

    // 无 obj 也无 mor：空状态
    if (!selectedObjHash && !selectedMorHash) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="text-center text-white/20">
                    <div className="text-3xl mb-2">◇</div>
                    <div className="text-xs">Select a node or edge</div>
                </div>
            </div>
        )
    }

    // 只选了 mor，没选 obj：只显示 MorCard
    if (!selectedObjHash && selectedMorHash) {
        return (
            <div className="h-full flex flex-col p-3">
                <MorCard id={selectedMorHash} />
            </div>
        )
    }

    return (
        <div className="h-full flex flex-col">
            {/* 上：Obj 详情 */}
            <div className="overflow-y-auto p-3 shrink-0 max-h-[50%]">
                <ObjCard id={selectedObjHash!} />
            </div>

            {/* 下：Morphisms (左) + Mor 详情 (右) */}
            <div className="flex-1 min-h-0 flex border-t border-white/5">
                <div className="w-1/2 overflow-y-auto p-3 border-r border-white/5">
                    <MorList objId={selectedObjHash!} />
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
