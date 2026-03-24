'use client'

/**
 * EntryDetail — 展示任意 astrolabe entry 的 ref 和 record。
 *
 * 直接 fetch /api/astrolabe/entries/{id}，不依赖 dataStore。
 * 点击 ref 中的 hash 可以跳转到对应 entry。
 */
import { memo, useEffect, useState } from 'react'
import { useSelectObjStore } from '@/stores/selectObjStore'
import { useDataStore } from '@/stores/dataStore'
import { getNodeKindVisual } from '@/lib/sortConfig'
import MarkdownRenderer from '@/components/MarkdownRenderer'
import { API_BASE } from '@/lib/apiBase'

interface Entry {
    ref: string[]
    record: Record<string, any>
}

export const EntryDetail = memo(function EntryDetail({ id }: { id: string }) {
    const [entry, setEntry] = useState<Entry | null>(null)
    const [error, setError] = useState(false)
    const selectObj = useSelectObjStore(s => s.select)
    const getObjectById = useDataStore(s => s.getObjectById)

    const projectPath = typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('path') || ''
        : ''

    useEffect(() => {
        if (!id || !projectPath) return
        setError(false)
        fetch(`${API_BASE}/api/astrolabe/entries/${id}?path=${encodeURIComponent(projectPath)}`)
            .then(r => {
                if (!r.ok) throw new Error(r.statusText)
                return r.json()
            })
            .then(setEntry)
            .catch(() => setError(true))
    }, [id, projectPath])

    if (error) {
        return (
            <div className="p-4 text-white/30 text-xs">
                Entry not found: <span className="font-mono">{id}</span>
            </div>
        )
    }
    if (!entry) {
        return <div className="p-4 text-white/20 text-xs animate-pulse">Loading...</div>
    }

    const sort = entry.record.sort || ''
    const name = entry.record.name || ''
    const { color } = getNodeKindVisual(sort)
    const degree = entry.ref.length - 1

    return (
        <div className="p-4 space-y-4">
            {/* Header: sort + name */}
            <div>
                {sort && (
                    <span style={{ color }} className="text-[10px] font-semibold uppercase tracking-wider">
                        {sort}
                    </span>
                )}
                {!sort && (
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
                        {degree === 0 ? 'Atom' : `${degree}-simplex`}
                    </span>
                )}
                {name && (
                    <div className="text-sm font-medium text-white/90 mt-1">{name}</div>
                )}
                <div className="text-[10px] text-white/25 mt-0.5 font-mono">{id}</div>
            </div>

            {/* Ref */}
            <Section label={`ref (${entry.ref.length})`}>
                <div className="flex flex-wrap gap-1">
                    {entry.ref.map((hash, i) => {
                        const refObj = getObjectById(hash)
                        const refName = refObj?.name || hash.slice(0, 8)
                        const refColor = getNodeKindVisual(refObj?.sort).color
                        const isSelf = hash === id

                        return (
                            <button
                                key={i}
                                onClick={() => !isSelf && selectObj(hash)}
                                disabled={isSelf}
                                className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                                    isSelf
                                        ? 'bg-white/5 text-white/25 cursor-default'
                                        : 'bg-white/5 hover:bg-white/10 cursor-pointer'
                                }`}
                                style={!isSelf ? { color: refColor } : undefined}
                                title={isSelf ? 'self' : `Jump to ${refName}`}
                            >
                                {isSelf ? 'self' : refName}
                            </button>
                        )
                    })}
                </div>
            </Section>

            {/* Record fields */}
            {Object.entries(entry.record).map(([key, value]) => {
                if (value === null || value === undefined || value === '') return null
                // skip sort and name — already shown in header
                if (key === 'sort' || key === 'name') return null

                const strValue = typeof value === 'string' ? value : JSON.stringify(value)
                const hasLatex = strValue.includes('$') || strValue.includes('\\')

                return (
                    <Section key={key} label={key}>
                        {hasLatex ? (
                            <MarkdownRenderer content={strValue} className="text-sm text-white/70 leading-relaxed" />
                        ) : (
                            <div className="text-xs text-white/50">{strValue}</div>
                        )}
                    </Section>
                )
            })}
        </div>
    )
})

function Section({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">{label}</div>
            {children}
        </div>
    )
}
