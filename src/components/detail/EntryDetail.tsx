'use client'

/**
 * EntryDetail — entry viewer
 *
 * Shows hash, ref (clickable), and record. Colors match NetworkView via sortColors.
 */
import { memo, useEffect, useMemo, useState } from 'react'
import { useSelectObjStore } from '@/stores/selectObjStore'
import { API_BASE } from '@/lib/apiBase'
import { getEntryColor, onColorsUpdated } from '@/lib/entryColor'
import { usePluginStore } from '@/plugins/registry'
import { useViewStore } from '@/stores/viewStore'
import { useHighlightStore } from '@/stores/highlightStore'
import { InlineMath } from '@/components/mdx/InlineMath'

/** Send a command to the PTY terminal via Tauri invoke. */
async function ptyCommand(sessionId: string, command: string) {
    try {
        const { invoke } = await import('@tauri-apps/api/core')
        await invoke('pty_write', { sessionId, data: command })
    } catch { /* Tauri not available (SSR or non-desktop) */ }
}

interface Entry {
    ref: string[]
    record: string
}

export const EntryDetail = memo(function EntryDetail({ id }: { id: string }) {
    // ── All hooks at top, unconditionally ──
    const fontSize = useViewStore(s => s.fontSize)
    const number = useViewStore(s => s.getNumber(id))
    const [entry, setEntry] = useState<Entry | null>(null)
    const [refColors, setRefColors] = useState<Record<string, string>>({})
    const [error, setError] = useState(false)
    const [, rerender] = useState(0)
    const selectObj = useSelectObjStore(s => s.select)

    useEffect(() => onColorsUpdated(() => rerender(n => n + 1)), [])

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

    useEffect(() => {
        if (!entry || !projectPath) return
        const refs = entry.ref.filter(h => h !== id)
        if (refs.length === 0) return
        Promise.all(refs.map(h => {
            const c = getEntryColor(h)
            if (c !== '#888888') return Promise.resolve([h, c] as const)
            return fetch(`${API_BASE}/api/astrolabe/entries/${h}?path=${encodeURIComponent(projectPath)}`)
                .then(r => r.ok ? r.json() : null)
                .then(e => [h, getEntryColor(h, e?.record)] as const)
                .catch(() => [h, '#888'] as const)
        })).then(pairs => setRefColors(Object.fromEntries(pairs)))
    }, [entry, id, projectPath])

    const ptySessionId = useViewStore(s => s.ptySessionId)
    const highlightMode = useHighlightStore(s => s.highlightMode)
    const setHighlight = useHighlightStore(s => s.setHighlight)
    const clearHighlight = useHighlightStore(s => s.clearHighlight)
    const setStatusText = useHighlightStore(s => s.setStatusText)

    // ── Derived values (safe after all hooks) ──
    const sortColor = entry ? getEntryColor(id, entry.record) : '#888'
    const PluginRecordRenderer = usePluginStore.getState().getRecordRenderer()
    const parsed = useMemo(() => {
        if (!entry) return null
        try { return JSON.parse(entry.record) as Record<string, string> } catch { return null }
    }, [entry])
    const isLean = parsed?.source === 'lean'
    const isSorry = parsed?.state === 'sorry'

    // ── Render ──
    if (error) {
        return <div className="text-white/30 font-mono" style={{ padding: '0.75em' }}>not found: {id}</div>
    }
    if (!entry) {
        return <div className="text-white/20 animate-pulse" style={{ padding: '0.75em' }}>loading...</div>
    }

    return (
        <div style={{ padding: '0.75em', borderLeft: `2px solid ${sortColor}40` }}>
            {/* hash + number + sort color dot */}
            <div className="font-mono text-white/25 flex items-center" style={{ gap: '0.5em', marginBottom: '0.5em' }}>
                <span className="inline-block rounded-full" style={{ width: '0.5em', height: '0.5em', backgroundColor: sortColor }} />
                {number && <span className="text-white/40" style={{ fontFamily: 'inherit' }}>[{number}]</span>}
                {id}
            </div>

            {/* ref */}
            <div style={{ marginBottom: '0.5em' }}>
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
            </div>

            {/* record — plugin renders by convention, otherwise raw JSON */}
            <div style={{ fontSize }}>
            {PluginRecordRenderer
                ? <PluginRecordRenderer record={entry.record} color={sortColor} entryId={id} projectPath={projectPath} />
                : <Row label="record">
                    <span className="text-white/50 whitespace-pre-wrap break-all font-mono" style={{ fontSize: '0.85em' }}>
                        {(() => { try { return JSON.stringify(JSON.parse(entry.record), null, 2) } catch { return entry.record || '—' } })()}
                    </span>
                  </Row>
            }
            </div>

            {/* Plugin detail sections */}
            <PluginSections entryId={id} />

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-white/5">
                {/* Lean-specific buttons */}
                {isLean && isSorry && (
                    <button
                        disabled={!ptySessionId}
                        onClick={() => {
                            if (!ptySessionId) return
                            setStatusText(`Proving entry ${id}...`)
                            ptyCommand(ptySessionId, `/prove ${id}\n`)
                            setTimeout(() => setStatusText(null), 30000)
                        }}
                        className={`px-2 py-1 text-xs rounded bg-yellow-600/20 text-yellow-400 hover:bg-yellow-600/30 ${!ptySessionId ? 'opacity-30 cursor-not-allowed' : ''}`}
                    >
                        Prove
                    </button>
                )}
                {isLean && (
                    <button
                        disabled={!ptySessionId}
                        onClick={() => {
                            if (!ptySessionId) return
                            setStatusText('Syncing Lean state...')
                            ptyCommand(ptySessionId, '/sync-lean\n')
                            setTimeout(() => setStatusText(null), 10000)
                        }}
                        className={`px-2 py-1 text-xs rounded bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 ${!ptySessionId ? 'opacity-30 cursor-not-allowed' : ''}`}
                    >
                        Sync Lean
                    </button>
                )}
                {/* Show Impact — available for all atoms */}
                <button
                    onClick={async () => {
                        if (highlightMode === 'propagation') {
                            clearHighlight()
                            return
                        }
                        try {
                            const res = await fetch(
                                `${API_BASE}/api/astrolabe/propagate?changed=${id}&path=${encodeURIComponent(projectPath)}`
                            )
                            if (!res.ok) return
                            const data = await res.json()
                            const affected: string[] = data.affected || []
                            setHighlight([id, ...affected], 'propagation')
                        } catch { /* ignore */ }
                    }}
                    className={`px-2 py-1 text-xs rounded ${
                        highlightMode === 'propagation'
                            ? 'bg-orange-600/40 text-orange-300'
                            : 'bg-orange-600/20 text-orange-400 hover:bg-orange-600/30'
                    }`}
                >
                    {highlightMode === 'propagation' ? 'Clear Impact' : 'Show Impact'}
                </button>
            </div>
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
            <span className="text-white/30" style={{ marginRight: '0.5em' }}>{label}:</span>
            {children}
        </div>
    )
}
