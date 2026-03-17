'use client'

/**
 * MorCard — 自治 mor 展示卡片
 *
 * 接收 id，自己从 dataStore 取 mor 数据 + source/target name。
 */
import { memo } from 'react'
import { useDataStore } from '@/stores/dataStore'

export interface MorCardProps {
    id: string
    isSelected?: boolean
    onClick?: () => void
}

export const MorCard = memo(function MorCard({ id, isSelected, onClick }: MorCardProps) {
    const mor = useDataStore(s => s.morphisms.find(m => m.id === id))
    const objects = useDataStore(s => s.objects)

    if (!mor) return null

    const sourceObj = objects.find(o => o.id === mor.source)
    const targetObj = objects.find(o => o.id === mor.target)

    return (
        <div
            onClick={onClick}
            className={`border-l-2 border-white/20 rounded-r-md px-4 py-3 bg-white/[0.03] ${
                onClick ? 'cursor-pointer' : ''
            } transition-colors ${isSelected ? 'ring-1 ring-white/20' : ''}`}
        >
            <div className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Morphism</div>
            <div className="text-sm text-white/70 mt-1">
                <span className="text-white/90">{sourceObj?.name || mor.source}</span>
                <span className="mx-2 text-white/30">→</span>
                <span className="text-white/90">{targetObj?.name || mor.target}</span>
            </div>
            <div className="text-[10px] text-white/25 mt-0.5 font-mono">{mor.id}</div>
            {mor.notes && (
                <div className="mt-3">
                    <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Notes</div>
                    <div className="text-xs text-white/40">{mor.notes}</div>
                </div>
            )}
        </div>
    )
})
