'use client'

import { useState, useEffect } from 'react'
import { API_BASE } from '@/lib/apiBase'
import { usePluginStore } from '@/plugins/registry'
import { useViewStore } from '@/stores/viewStore'
import { InlineMath } from '@/components/mdx/InlineMath'
import { LeanCode } from './LeanHighlight'
import { SORT_LABELS, parseRecord } from './utils'

/** LeanNets record renderer — parses JSON record and renders sort/source/title/notes/content/state. */
export function RecordRenderer({ record, color, entryId, projectPath }: {
    record: string; color: string; entryId?: string; projectPath?: string
}) {
    const parsed = parseRecord(record)

    // Find proofs for this statement via edges (frontend lookup)
    const [proofHashes, setProofHashes] = useState<string[]>([])
    const isMergeOn = usePluginStore(s => (s as any).mnMergeProofs || false)
    const isAtom = parsed && parsed.sort !== 'proof'

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
        return <div className="text-white/50">{record || '—'}</div>
    }

    const { sort, source, title, notes, content, state, key } = parsed
    const number = useViewStore(s => entryId ? s.getNumber(entryId) : undefined)
    const sortLabel = sort ? (SORT_LABELS[sort] || sort) : ''
    const numberDisplay = sortLabel && number ? `${sortLabel} ${number}` : number ? `[${number}]` : null

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4em' }}>
            {/* number + sort + source badges */}
            <div className="flex items-center flex-wrap" style={{ gap: '0.4em' }}>
                {numberDisplay && <span className="rounded font-semibold" style={{ padding: '0.1em 0.4em', fontSize: '0.8em', backgroundColor: `${color}20`, color }}>{numberDisplay}</span>}
                {sort && !number && <span className="rounded font-medium" style={{ padding: '0.1em 0.4em', fontSize: '0.8em', backgroundColor: `${color}20`, color }}>{sort}</span>}
                {source && <span className="rounded bg-white/5 text-white/30" style={{ padding: '0.1em 0.4em', fontSize: '0.8em' }}>{source}</span>}
                {state && (
                    <span className={`rounded font-medium ${state === 'proven' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`} style={{ padding: '0.1em 0.4em', fontSize: '0.8em' }}>
                        {state}
                    </span>
                )}
                {key && <span className="rounded bg-white/5 text-white/40 font-mono" style={{ padding: '0.1em 0.4em', fontSize: '0.8em' }}>{key}</span>}
            </div>

            {/* title */}
            {title && <div className="font-medium text-white/80" style={{ fontSize: '1.1em' }}>{title}</div>}

            {/* notes — render LaTeX + entryref */}
            {notes && (
                <div className="text-white/60 leading-relaxed">
                    <InlineMath>{notes}</InlineMath>
                </div>
            )}

            {/* content — Lean code with syntax highlighting */}
            {content && (source === 'lean'
                ? <LeanCode>{content}</LeanCode>
                : <pre className="font-mono text-white/40 bg-black/30 rounded overflow-x-auto whitespace-pre-wrap" style={{ fontSize: '0.85em', padding: '0.5em' }}>{content}</pre>
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
        <div className="border-l border-white/10" style={{ marginTop: '0.3em', paddingLeft: '0.5em' }}>
            <button
                onClick={() => setOpen(!open)}
                className="text-white/30 hover:text-white/50 flex items-center"
                style={{ fontSize: '0.8em', gap: '0.3em' }}
            >
                <span>{open ? '▾' : '▸'}</span>
                <span>Proof ({Object.keys(proofs).length})</span>
            </button>
            {open && Object.entries(proofs).map(([h, p]) => (
                <div key={h} style={{ marginTop: '0.3em' }}>
                    {p.source && <span className="rounded bg-white/5 text-white/25" style={{ fontSize: '0.75em', padding: '0.1em 0.3em', marginRight: '0.3em' }}>{p.source}</span>}
                    {p.notes && (
                        <div className="text-white/50 leading-relaxed" style={{ marginTop: '0.25em' }}>
                            <InlineMath>{p.notes}</InlineMath>
                        </div>
                    )}
                    {p.content && (p.source === 'lean'
                        ? <div style={{ marginTop: '0.25em' }}><LeanCode>{p.content}</LeanCode></div>
                        : <pre className="font-mono text-white/30 bg-black/30 rounded overflow-x-auto whitespace-pre-wrap" style={{ fontSize: '0.8em', padding: '0.4em', marginTop: '0.25em' }}>{p.content}</pre>
                    )}
                </div>
            ))}
        </div>
    )
}
