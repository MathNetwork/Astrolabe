'use client'

/**
 * SortOverview — Sort 概览浮层面板
 *
 * 展示当前 knowledge.json 中 obj/mor 的 sort 分布。
 * 订阅 dataStore 获取数据，用 computeSortStats 计算统计。
 */
import { memo, useMemo } from 'react'
import { useDataStore } from '@/stores/dataStore'
import { computeSortStats, type SortStat } from '@/lib/sortStats'

export const SortOverview = memo(function SortOverview() {
    const objects = useDataStore(s => s.objects)
    const morphisms = useDataStore(s => s.morphisms)

    const stats = useMemo(
        () => computeSortStats(objects, morphisms),
        [objects, morphisms],
    )

    return (
        <div className="p-3 space-y-3 text-xs">
            {/* Obj Sorts */}
            <div>
                <div className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5">Obj Sorts</div>
                {stats.objSorts.length === 0 && stats.objNoSort === 0 && (
                    <div className="text-[11px] text-white/20">No objects</div>
                )}
                {stats.objSorts.map(s => (
                    <SortRow key={s.sort} sort={s} />
                ))}
                {stats.objNoSort > 0 && (
                    <div className="flex items-center justify-between px-2 py-0.5 text-[11px] text-white/30">
                        <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: '#A1A1AA' }} />
                            <span className="italic">(no sort)</span>
                        </div>
                        <span className="font-mono text-white/20">{stats.objNoSort}</span>
                    </div>
                )}
            </div>

            {/* Mor Sorts */}
            <div>
                <div className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5">Mor Sorts</div>
                {stats.morSorts.length === 0 && stats.morNoSort === 0 && (
                    <div className="text-[11px] text-white/20">No morphisms</div>
                )}
                {stats.morSorts.map(s => (
                    <SortRow key={s.sort} sort={s} />
                ))}
                {stats.morNoSort > 0 && (
                    <div className="flex items-center justify-between px-2 py-0.5 text-[11px] text-white/30">
                        <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: '#6b7280' }} />
                            <span className="italic">(no sort)</span>
                        </div>
                        <span className="font-mono text-white/20">{stats.morNoSort}</span>
                    </div>
                )}
            </div>
        </div>
    )
})

function SortRow({ sort }: { sort: SortStat }) {
    return (
        <div className="flex items-center justify-between px-2 py-0.5 text-[11px] text-white/50">
            <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: sort.color }} />
                <span>{sort.sort}</span>
            </div>
            <span className="font-mono text-white/30">{sort.count}</span>
        </div>
    )
}
