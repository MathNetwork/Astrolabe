'use client'

/**
 * EntryDetail — entry viewer
 *
 * Shows hash, ref (clickable), and record. Colors match NetworkView via sortColors.
 */
import { memo, useEffect, useState } from 'react'
import { useSelectObjStore } from '@/stores/selectObjStore'
import { API_BASE } from '@/lib/apiBase'
import { getSortFill, parseSortFromRecord } from '@/lib/sortColors'
import { usePluginStore } from '@/plugins/registry'

interface Entry {
    ref: string[]
    record: string
}

export const EntryDetail = memo(function EntryDetail({ id }: { id: string }) {
    const [entry, setEntry] = useState<Entry | null>(null)
    const [refColors, setRefColors] = useState<Record<string, string>>({})
    const [error, setError] = useState(false)
    const selectObj = useSelectObjStore(s => s.select)

    const projectPath = typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('path') || ''
        : ''

    useEffect(() => {
        if (!id || !projectPath) return
        setError(false)
        setRefColors({})
        fetch(`${API_BASE}/api/astrolabe/entries/${id}?path=${encodeURIComponent(projectPath)}`)
            .then(r => {
                if (!r.ok) throw new Error(r.statusText)
                return r.json()
            })
            .then(setEntry)
            .catch(() => setError(true))
    }, [id, projectPath])

    // Fetch colors for each ref entry
    useEffect(() => {
        if (!entry || !projectPath) return
        const refs = entry.ref.filter(h => h !== id)
        if (refs.length === 0) return
        Promise.all(refs.map(h =>
            fetch(`${API_BASE}/api/astrolabe/entries/${h}?path=${encodeURIComponent(projectPath)}`)
                .then(r => r.ok ? r.json() : null)
                .then(e => [h, e ? getSortFill(parseSortFromRecord(e.record)) : '#888'] as const)
                .catch(() => [h, '#888'] as const)
        )).then(pairs => setRefColors(Object.fromEntries(pairs)))
    }, [entry, id, projectPath])

    if (error) {
        return <div className="p-3 text-white/30 text-xs font-mono">not found: {id}</div>
    }
    if (!entry) {
        return <div className="p-3 text-white/20 text-xs animate-pulse">loading...</div>
    }

    const sort = parseSortFromRecord(entry.record)
    const sortColor = getSortFill(sort || '')

    return (
        <div className="p-3 space-y-2 text-xs" style={{ borderLeft: `2px solid ${sortColor}40` }}>
            {/* hash + sort color dot */}
            <div className="font-mono text-white/25 flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: sortColor }} />
                {id}
            </div>

            {/* ref */}
            <Row label="ref">
                <span className="font-mono">
                    [{entry.ref.map((hash, i) => {
                        const isSelf = hash === id
                        return (
                            <span key={i}>
                                {i > 0 && ', '}
                                {isSelf ? (
                                    <span className="text-white/25">self</span>
                                ) : (
                                    <button
                                        onClick={() => selectObj(hash)}
                                        className="hover:opacity-80 cursor-pointer"
                                        style={{ color: refColors[hash] || '#888' }}
                                    >
                                        {hash}
                                    </button>
                                )}
                            </span>
                        )
                    })}]
                </span>
            </Row>

            {/* record */}
            <Row label="record">
                {(() => {
                    let parsed: any = null
                    try { parsed = JSON.parse(entry.record) } catch {}
                    if (parsed && typeof parsed === 'object') {
                        return (
                            <span className="text-white/70 whitespace-pre-wrap break-all">
                                {JSON.stringify(parsed, null, 2)}
                            </span>
                        )
                    }
                    return <span className="text-white/70 whitespace-pre-wrap break-all">{entry.record || '—'}</span>
                })()}
            </Row>

            {/* Plugin detail sections */}
            <PluginSections entryId={id} />
        </div>
    )
})

function PluginSections({ entryId }: { entryId: string }) {
    const plugins = usePluginStore(s => s.plugins)
    const enabled = usePluginStore(s => s.enabled)

    return <>
        {plugins.filter(p => enabled.has(p.id) && p.DetailSection).map(p => {
            const Section = p.DetailSection!
            return <Section key={p.id} entryId={entryId} />
        })}
    </>
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <span className="text-white/30 mr-2">{label}:</span>
            {children}
        </div>
    )
}
