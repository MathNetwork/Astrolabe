'use client'

import { useState, useEffect } from 'react'
import { useSelectObjStore } from '@/stores/selectObjStore'
import { usePluginStore } from '@/plugins/registry'
import { API_BASE } from '@/lib/apiBase'
import { getEntryColor } from '@/lib/entryColor'
import { groupEdgesBySort, type EdgeInfo } from './transform'

/** Skeleton plugin detail section: shows edges grouped by sort. Only visible in skeleton mode. */
export function DetailEdges({ entryId }: { entryId: string }) {
    const modeActive = usePluginStore(s => s.isModeActive('skeleton'))
    const [edges, setEdges] = useState<{ outgoing: EdgeInfo[]; incoming: EdgeInfo[] } | null>(null)
    const selectObj = useSelectObjStore(s => s.select)

    const projectPath = typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('path') || ''
        : ''

    useEffect(() => {
        if (!modeActive || !entryId || !projectPath) return
        fetch(`${API_BASE}/api/astrolabe/entries?path=${encodeURIComponent(projectPath)}`)
            .then(r => r.ok ? r.json() : {})
            .then(allEntries => {
                const entry = allEntries[entryId]
                if (!entry || entry.ref.length !== 1) { setEdges(null); return }
                setEdges(groupEdgesBySort(entryId, allEntries))
            })
            .catch(() => setEdges(null))
    }, [modeActive, entryId, projectPath])

    if (!modeActive || !edges) return null
    if (edges.outgoing.length === 0 && edges.incoming.length === 0) return null

    // Group by sort
    const outBySort = groupBy(edges.outgoing, e => e.sort)
    const inBySort = groupBy(edges.incoming, e => e.sort)

    return (
        <div className="border-t border-white/5 mt-2 pt-2">
            {Object.entries(outBySort).map(([sort, items]) => (
                <EdgeGroup key={`out-${sort}`} sort={sort} items={items} direction="out" onSelect={selectObj} />
            ))}
            {Object.entries(inBySort).map(([sort, items]) => (
                <EdgeGroup key={`in-${sort}`} sort={sort} items={items} direction="in" onSelect={selectObj} />
            ))}
        </div>
    )
}

function EdgeGroup({ sort, items, direction, onSelect }: {
    sort: string; items: EdgeInfo[]; direction: 'out' | 'in'; onSelect: (id: string) => void
}) {
    const color = getEntryColor('', `{"sort":"${sort}"}`)  // edge sort color
    const arrow = direction === 'out' ? '→' : '←'

    return (
        <div className="mb-2">
            <div className="text-[10px] text-white/30 flex items-center gap-1 mb-0.5">
                <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                <span>{sort}</span>
                <span className="text-white/15">({items.length})</span>
            </div>
            {items.map(item => {
                const targetColor = getEntryColor(item.targetId)
                return (
                <button
                    key={item.edgeHash}
                    onClick={() => onSelect(item.targetId)}
                    className="w-full text-left px-2 py-0.5 text-xs hover:bg-white/5 rounded transition-colors flex items-center gap-1"
                    style={targetColor ? { color: targetColor } : { color: 'rgba(255,255,255,0.5)' }}
                >
                    <span style={{ opacity: 0.4 }}>{arrow}</span>
                    <span className="truncate">{item.targetTitle || item.targetId}</span>
                </button>
                )
            })}
        </div>
    )
}

function groupBy<T>(items: T[], key: (item: T) => string): Record<string, T[]> {
    const result: Record<string, T[]> = {}
    for (const item of items) {
        const k = key(item)
        if (!result[k]) result[k] = []
        result[k].push(item)
    }
    return result
}
