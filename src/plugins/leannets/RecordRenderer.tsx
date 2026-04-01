'use client'

import { useState, useEffect } from 'react'
import { API_BASE } from '@/lib/apiBase'
import { usePluginStore } from '@/plugins/registry'
import { InlineMath } from '@/components/mdx/InlineMath'
import { LeanCode } from './LeanHighlight'

/** LeanNets record renderer — parses JSON record and renders sort/source/title/notes/content/state. */
export function RecordRenderer({ record, color, entryId, projectPath }: {
    record: string; color: string; entryId?: string; projectPath?: string
}) {
    let parsed: any = null
    try { parsed = JSON.parse(record) } catch {}

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
