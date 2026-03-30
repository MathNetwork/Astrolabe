'use client'

/**
 * EntryDetail — entry viewer
 *
 * Shows hash, ref (clickable), and record. Colors match NetworkView via sortColors.
 */
import { memo, useEffect, useState } from 'react'
import { useSelectObjStore } from '@/stores/selectObjStore'
import { API_BASE } from '@/lib/apiBase'
import { getEntryColor, onColorsUpdated } from '@/lib/entryColor'
import { usePluginStore } from '@/plugins/registry'
import { InlineMath } from '@/components/mdx/InlineMath'
import { LeanCode } from '@/plugins/mathnetwork/LeanHighlight'

interface Entry {
    ref: string[]
    record: string
}

export const EntryDetail = memo(function EntryDetail({ id }: { id: string }) {
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

    // Fetch colors for each ref entry
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

    if (error) {
        return <div className="p-3 text-white/30 text-xs font-mono">not found: {id}</div>
    }
    if (!entry) {
        return <div className="p-3 text-white/20 text-xs animate-pulse">loading...</div>
    }

    const sortColor = getEntryColor(id, entry.record)

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

            {/* record — plugin renders by convention, otherwise raw JSON */}
            {usePluginStore.getState().enabled.has('mathnetwork')
                ? <RecordView record={entry.record} color={sortColor} entryId={id} projectPath={projectPath} />
                : <Row label="record">
                    <span className="text-white/50 whitespace-pre-wrap break-all text-[11px] font-mono">
                        {(() => { try { return JSON.stringify(JSON.parse(entry.record), null, 2) } catch { return entry.record || '—' } })()}
                    </span>
                  </Row>
            }

            {/* Plugin detail sections */}
            <PluginSections entryId={id} />
        </div>
    )
})

function RecordView({ record, color, entryId, projectPath }: { record: string; color: string; entryId?: string; projectPath?: string }) {
    let parsed: any = null
    try { parsed = JSON.parse(record) } catch {}

    // Find proofs for this statement via edges (frontend lookup)
    const [proofHashes, setProofHashes] = useState<string[]>([])
    const isMergeOn = usePluginStore(s => (s as any).mnMergeProofs || false)
    const isAtom = parsed && parsed.sort !== 'proof'  // any non-proof atom can have proofs

    useEffect(() => {
        if (!isMergeOn || !isAtom || !entryId || !projectPath) { setProofHashes([]); return }
        fetch(`${API_BASE}/api/astrolabe/entries?path=${encodeURIComponent(projectPath)}&degree=1`)
            .then(r => r.ok ? r.json() : {})
            .then(edges => {
                const pHashes: string[] = []
                for (const [, edge] of Object.entries(edges) as [string, any][]) {
                    if (edge.ref[0] === entryId) {
                        try {
                            const s = JSON.parse(edge.record).sort || ''
                            if (s.endsWith(', proof)')) pHashes.push(edge.ref[1])
                        } catch {}
                    }
                }
                setProofHashes(pHashes)
            })
            .catch(() => setProofHashes([]))
    }, [isMergeOn, isAtom, entryId, projectPath])

    if (!parsed || typeof parsed !== 'object') {
        return <div className="text-white/50 text-xs">{record || '—'}</div>
    }

    const { sort, source, title, notes, content, state, key } = parsed

    return (
        <div className="space-y-1.5">
            {/* sort + source badges */}
            <div className="flex items-center gap-1.5 flex-wrap">
                {sort && <span className="px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ backgroundColor: `${color}20`, color }}>{sort}</span>}
                {source && <span className="px-1.5 py-0.5 rounded text-[10px] bg-white/5 text-white/30">{source}</span>}
                {state && (
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${state === 'proven' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                        {state}
                    </span>
                )}
                {key && <span className="px-1.5 py-0.5 rounded text-[10px] bg-white/5 text-white/40 font-mono">{key}</span>}
            </div>

            {/* title */}
            {title && <div className="text-sm font-medium text-white/80">{title}</div>}

            {/* notes — render LaTeX + entryref */}
            {notes && (
                <div className="text-white/60 text-xs leading-relaxed">
                    <InlineMath>{notes}</InlineMath>
                </div>
            )}

            {/* content — Lean code with syntax highlighting */}
            {content && (source === 'lean'
                ? <LeanCode>{content}</LeanCode>
                : <pre className="text-[11px] font-mono text-white/40 bg-black/30 rounded p-2 overflow-x-auto whitespace-pre-wrap">{content}</pre>
            )}

            {/* nested proofs (when merge is on, found via edges) */}
            {proofHashes.length > 0 && <NestedProofs proofHashes={proofHashes} />}
        </div>
    )
}

function NestedProofs({ proofHashes }: { proofHashes: string[] }) {
    const [proofs, setProofs] = useState<Record<string, any>>({})
    const [open, setOpen] = useState(false)

    const projectPath = typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('path') || ''
        : ''

    useEffect(() => {
        if (!projectPath || proofHashes.length === 0) return
        Promise.all(proofHashes.map(h =>
            fetch(`${API_BASE}/api/astrolabe/entries/${h}?path=${encodeURIComponent(projectPath)}`)
                .then(r => r.ok ? r.json() : null)
                .then(e => {
                    if (!e?.record) return null
                    try { return [h, JSON.parse(e.record)] } catch { return null }
                })
                .catch(() => null)
        )).then(results => {
            const map: Record<string, any> = {}
            for (const r of results) if (r) map[r[0]] = r[1]
            setProofs(map)
        })
    }, [proofHashes, projectPath])

    if (Object.keys(proofs).length === 0) return null

    return (
        <div className="mt-1 border-l border-white/10 pl-2">
            <button
                onClick={() => setOpen(!open)}
                className="text-[10px] text-white/30 hover:text-white/50 flex items-center gap-1"
            >
                <span>{open ? '▾' : '▸'}</span>
                <span>Proof ({Object.keys(proofs).length})</span>
            </button>
            {open && Object.entries(proofs).map(([h, p]) => (
                <div key={h} className="mt-1">
                    {p.source && <span className="text-[9px] px-1 py-0.5 rounded bg-white/5 text-white/25 mr-1">{p.source}</span>}
                    {p.notes && (
                        <div className="text-white/50 text-xs leading-relaxed mt-1">
                            <InlineMath>{p.notes}</InlineMath>
                        </div>
                    )}
                    {p.content && (p.source === 'lean'
                        ? <div className="mt-1"><LeanCode>{p.content}</LeanCode></div>
                        : <pre className="text-[10px] font-mono text-white/30 bg-black/30 rounded p-1.5 mt-1 overflow-x-auto whitespace-pre-wrap">{p.content}</pre>
                    )}
                </div>
            ))}
        </div>
    )
}

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
