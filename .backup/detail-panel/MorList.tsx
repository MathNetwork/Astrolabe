'use client'

/**
 * MorList — 自治 morphism 列表
 *
 * 接收 objId，自己从 dataStore 查 incoming/outgoing morphisms。
 * 箭头点击 → selectObjStore（跳转邻居）
 * 文字点击 → selectMorStore（选中/取消 mor）
 */
import { memo, useCallback } from 'react'
import { useDataStore } from '@/stores/dataStore'
import { useSelectObjStore } from '@/stores/selectObjStore'
import { useSelectMorStore } from '@/stores/selectMorStore'
import { getNodeKindVisual } from '@/lib/sortConfig'

export interface MorListProps {
    objId: string
}

export const MorList = memo(function MorList({ objId }: MorListProps) {
    const morphisms = useDataStore(s => s.morphisms)
    const objects = useDataStore(s => s.objects)
    const selectedMorHash = useSelectMorStore(s => s.selectedHash)
    const selectMor = useSelectMorStore(s => s.select)
    const selectObj = useSelectObjStore(s => s.select)

    const incoming = morphisms.filter(m => m.target === objId)
    const outgoing = morphisms.filter(m => m.source === objId)

    if (incoming.length === 0 && outgoing.length === 0) return null

    const renderMor = (mor: { id: string; source: string; target: string; notes?: string }, direction: 'in' | 'out') => {
        const otherHash = direction === 'in' ? mor.source : mor.target
        const otherObj = objects.find(o => o.id === otherHash)
        const otherName = otherObj?.name || otherHash.slice(0, 8)
        const { color } = getNodeKindVisual(otherObj?.sort)
        const isSelected = selectedMorHash === mor.id

        return (
            <div
                key={mor.id}
                className={`flex items-center gap-2 px-2 py-1 rounded text-xs transition-colors ${
                    isSelected ? 'bg-white/10' : ''
                }`}
            >
                <button
                    className="text-white/30 hover:text-white/70 text-[10px] w-4 cursor-pointer transition-colors"
                    onClick={() => selectObj(otherHash)}
                    title={`Jump to ${otherName}`}
                >
                    {direction === 'in' ? '←' : '→'}
                </button>
                <button
                    className="truncate cursor-pointer hover:underline transition-colors"
                    style={{ color }}
                    onClick={() => selectMor(isSelected ? null : mor.id)}
                    title="Show morphism details"
                >
                    {otherName}
                </button>
            </div>
        )
    }

    return (
        <div>
            {incoming.length > 0 && (
                <div>
                    <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">
                        Incoming ({incoming.length})
                    </div>
                    {incoming.map(m => renderMor(m, 'in'))}
                </div>
            )}
            {outgoing.length > 0 && (
                <div className={incoming.length > 0 ? 'mt-2' : ''}>
                    <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">
                        Outgoing ({outgoing.length})
                    </div>
                    {outgoing.map(m => renderMor(m, 'out'))}
                </div>
            )}
        </div>
    )
})
