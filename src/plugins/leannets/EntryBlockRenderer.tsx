'use client'

import { useState, useEffect } from 'react'
import { useSelectObjStore } from '@/stores/selectObjStore'
import { API_BASE } from '@/lib/apiBase'
import { InlineMath } from '@/components/mdx/InlineMath'
import { LeanCode } from './LeanHighlight'
import { LeanBadge } from './LeanBadge'
import { SORT_LABELS, parseRecord } from './utils'

/** Find the cross-source lean counterpart for a tex atom. */
function useLeanCounterpart(hash: string, source: string | undefined, projectPath: string) {
    const [leanEntry, setLeanEntry] = useState<{ hash: string; record: Record<string, any> } | null>(null)

    useEffect(() => {
        if (source !== 'tex' || !hash || !projectPath) { setLeanEntry(null); return }
        fetch(`${API_BASE}/api/astrolabe/entries?path=${encodeURIComponent(projectPath)}&degree=1`)
            .then(r => r.ok ? r.json() : {})
            .then(async (edges: Record<string, any>) => {
                // Find degree-1 entry where one ref is this hash, other is a lean atom
                for (const [, edge] of Object.entries(edges)) {
                    const ref = (edge as any).ref as string[]
                    if (ref.length !== 2) continue
                    const otherHash = ref[0] === hash ? ref[1] : ref[1] === hash ? ref[0] : null
                    if (!otherHash) continue
                    try {
                        const r = await fetch(`${API_BASE}/api/astrolabe/entries/${otherHash}?path=${encodeURIComponent(projectPath)}`)
                        if (!r.ok) continue
                        const otherEntry = await r.json()
                        if (!otherEntry?.record) continue
                        const parsed = parseRecord(otherEntry.record)
                        if (parsed?.source === 'lean') {
                            setLeanEntry({ hash: otherHash, record: parsed })
                            return
                        }
                    } catch { continue }
                }
                setLeanEntry(null)
            })
            .catch(() => setLeanEntry(null))
    }, [hash, source, projectPath])

    return leanEntry
}

/** Find proof entries for a lean theorem via (theorem, proof) edges. */
function useLeanProofs(leanHash: string | undefined, projectPath: string) {
    const [proofEntries, setProofEntries] = useState<{ hash: string; record: Record<string, any> }[]>([])

    useEffect(() => {
        if (!leanHash || !projectPath) { setProofEntries([]); return }
        fetch(`${API_BASE}/api/astrolabe/entries?path=${encodeURIComponent(projectPath)}&degree=1`)
            .then(r => r.ok ? r.json() : {})
            .then(async (edges: Record<string, any>) => {
                const proofHashes: string[] = []
                for (const [, edge] of Object.entries(edges) as [string, any][]) {
                    if (edge.ref[0] === leanHash) {
                        try {
                            const s = JSON.parse(edge.record).sort || ''
                            if (s.endsWith(', proof)')) proofHashes.push(edge.ref[1])
                        } catch { /* skip */ }
                    }
                }
                if (proofHashes.length === 0) { setProofEntries([]); return }
                const results = await Promise.all(proofHashes.map(async h => {
                    try {
                        const r = await fetch(`${API_BASE}/api/astrolabe/entries/${h}?path=${encodeURIComponent(projectPath)}`)
                        if (!r.ok) return null
                        const e = await r.json()
                        if (!e?.record) return null
                        return { hash: h, record: parseRecord(e.record) }
                    } catch { return null }
                }))
                setProofEntries(results.filter((r): r is { hash: string; record: Record<string, any> } => r !== null))
            })
            .catch(() => setProofEntries([]))
    }, [leanHash, projectPath])

    return proofEntries
}

export function LeanNetsEntryBlock({ hash, record, color, number, collapsible, children }: {
    hash: string; record: string; color: string; number?: string; collapsible?: boolean; children?: React.ReactNode
}) {
    const [open, setOpen] = useState(false)
    const [leanExpanded, setLeanExpanded] = useState(false)
    const [proofOpen, setProofOpen] = useState(false)
    const selectObj = useSelectObjStore(s => s.select)

    const projectPath = typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('path') || ''
        : ''

    const parsed = parseRecord(record)
    if (!parsed || typeof parsed !== 'object') {
        return <div className="my-2 text-xs text-white/20 font-mono">entry: {hash}</div>
    }

    const label = SORT_LABELS[parsed.sort] || parsed.sort || ''
    const displayText = parsed.notes || parsed.content || ''
    const isLean = parsed.sort?.startsWith('lean-') || parsed.source === 'lean'
    const isTex = parsed.source === 'tex'
    const showBody = !collapsible || open
    const numberStr = number ? ` ${number}` : ''

    // Scenario A: tex entry — look for cross-source lean counterpart
    const leanCounterpart = useLeanCounterpart(hash, parsed.source, projectPath)
    // Find proofs for the lean counterpart (if any)
    const leanProofs = useLeanProofs(leanCounterpart?.hash, projectPath)

    return (
        <div className="my-3 pl-3 rounded-r" style={{ borderLeftColor: color, borderLeftWidth: 2, opacity: 0.9 }}>
            <div className="font-semibold flex items-center" style={{ color, fontSize: '0.85em', gap: '0.3em', marginBottom: '0.25em' }}>
                {collapsible && (
                    <button
                        onClick={(e) => { e.stopPropagation(); setOpen(!open) }}
                        className="text-white/30 hover:text-white/60"
                        style={{ width: '1em' }}
                    >
                        {open ? '▾' : '▸'}
                    </button>
                )}
                <span
                    className="cursor-pointer hover:opacity-80"
                    onClick={(e) => { e.stopPropagation(); selectObj(hash) }}
                    title={`Click to select entry ${hash}`}
                >
                    {label}{numberStr}{parsed.title ? ` (${parsed.title})` : ''}
                    {parsed.state === 'sorry' && <span className="text-red-400/70" style={{ marginLeft: '0.3em' }}>sorry</span>}
                    <span className="font-mono text-white/15 font-normal" style={{ marginLeft: '0.5em', fontSize: '0.85em' }}>{hash}</span>
                </span>
                {/* Scenario B: lean source → static badge */}
                {isLean && <LeanBadge interactive={false} state={parsed.state} />}
                {/* Scenario A: tex with lean counterpart → interactive badge */}
                {isTex && leanCounterpart && (
                    <LeanBadge
                        interactive={true}
                        state={leanCounterpart.record.state}
                        onClick={() => setLeanExpanded(!leanExpanded)}
                    />
                )}
            </div>
            {showBody && (
                <>
                    <div className="text-white/70">
                        {isLean ? (
                            <LeanCode>{displayText}</LeanCode>
                        ) : (
                            <InlineMath>{displayText}</InlineMath>
                        )}
                    </div>
                    {/* Cross-source lean panel */}
                    {leanExpanded && leanCounterpart && (
                        <div className="border-l-2 border-green-500/30" style={{ marginTop: '0.4em', paddingLeft: '0.5em' }}>
                            <div className="flex items-center" style={{ gap: '0.4em', marginBottom: '0.25em', fontSize: '0.8em' }}>
                                <span className="font-medium text-green-400/70">
                                    {SORT_LABELS[leanCounterpart.record.sort] || leanCounterpart.record.sort || 'Lean'}
                                </span>
                                {leanCounterpart.record.title && (
                                    <span className="text-white/40">{leanCounterpart.record.title}</span>
                                )}
                                {leanCounterpart.record.state && (
                                    <span className={`rounded ${leanCounterpart.record.state === 'proven' ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'}`} style={{ fontSize: '0.85em', padding: '0 0.3em' }}>
                                        {leanCounterpart.record.state}
                                    </span>
                                )}
                            </div>
                            {leanCounterpart.record.content && (
                                <LeanCode>{leanCounterpart.record.content}</LeanCode>
                            )}
                            {/* Nested lean proof (collapsible) */}
                            {leanProofs.length > 0 && (
                                <div className="border-l border-white/10" style={{ marginTop: '0.3em', paddingLeft: '0.5em' }}>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setProofOpen(!proofOpen) }}
                                        className="text-white/30 hover:text-white/50 flex items-center"
                                        style={{ fontSize: '0.8em', gap: '0.3em' }}
                                    >
                                        <span>{proofOpen ? '▾' : '▸'}</span>
                                        <span>Proof ({leanProofs.length})</span>
                                    </button>
                                    {proofOpen && leanProofs.map(p => (
                                        <div key={p.hash} style={{ marginTop: '0.3em' }}>
                                            {p.record.content && (
                                                <LeanCode>{p.record.content}</LeanCode>
                                            )}
                                            {p.record.notes && !p.record.content && (
                                                <div className="text-white/50 leading-relaxed" style={{ marginTop: '0.25em' }}>
                                                    <InlineMath>{p.record.notes}</InlineMath>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                    {children}
                </>
            )}
        </div>
    )
}
