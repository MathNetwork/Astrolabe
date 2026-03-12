'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { updateKnowledgeNode } from '@/lib/api'
import { useCanvasStore } from '@/lib/canvasStore'
import type { KnowledgeNode } from '@/lib/api'

const VALID_KINDS = [
    'theorem', 'lemma', 'definition', 'proposition', 'corollary',
    'axiom', 'conjecture', 'insight', 'open_question',
    'example', 'technique', 'heuristic', 'analogy',
]

const VALID_STATUSES = ['stated', 'proven', 'wip', 'review', 'open']

function useDebounce(value: string, delay: number) {
    const [debounced, setDebounced] = useState(value)
    useEffect(() => {
        const t = setTimeout(() => setDebounced(value), delay)
        return () => clearTimeout(t)
    }, [value, delay])
    return debounced
}

export function KnowledgeNodeEditor({ nodeId, projectPath }: {
    nodeId: string
    projectPath: string
}) {
    const knowledgeNodes = useCanvasStore(s => s.knowledgeNodes)
    const node = knowledgeNodes.find(n => n.id === nodeId)

    const [kind, setKind] = useState('')
    const [status, setStatus] = useState('')
    const [statement, setStatement] = useState('')
    const [proof, setProof] = useState('')
    const [intuition, setIntuition] = useState('')
    const [notes, setNotes] = useState('')

    const prevNodeIdRef = useRef(nodeId)

    const syncFromNode = useCallback((n: KnowledgeNode) => {
        setKind(n.kind || 'insight')
        setStatus(n.status || 'stated')
        setStatement(n.statement || '')
        setProof(n.proof || '')
        setIntuition(n.intuition || '')
        setNotes(n.notes || '')
    }, [])

    useEffect(() => {
        if (node && nodeId !== prevNodeIdRef.current) {
            prevNodeIdRef.current = nodeId
            syncFromNode(node)
        } else if (node && !prevNodeIdRef.current) {
            prevNodeIdRef.current = nodeId
            syncFromNode(node)
        }
    }, [node, nodeId, syncFromNode])

    useEffect(() => {
        if (node) syncFromNode(node)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [nodeId])

    const saveField = useCallback(async (updates: Partial<KnowledgeNode>) => {
        if (!projectPath || !nodeId) return
        try {
            const updated = await updateKnowledgeNode(projectPath, nodeId, updates)
            const store = useCanvasStore.getState()
            const newNodes = store.knowledgeNodes.map(n => n.id === nodeId ? updated : n)
            useCanvasStore.setState({ knowledgeNodes: newNodes })
        } catch (e) {
            console.error('[KnowledgeNodeEditor] Save failed:', e)
        }
    }, [projectPath, nodeId])

    const debouncedStatement = useDebounce(statement, 800)
    const debouncedProof = useDebounce(proof, 800)
    const debouncedIntuition = useDebounce(intuition, 800)
    const debouncedNotes = useDebounce(notes, 800)

    const initializedRef = useRef(false)
    useEffect(() => {
        if (!initializedRef.current) { initializedRef.current = true; return }
        if (node && debouncedStatement !== (node.statement || '')) {
            saveField({ statement: debouncedStatement })
        }
    }, [debouncedStatement])

    useEffect(() => {
        if (!initializedRef.current) return
        if (node && debouncedProof !== (node.proof || '')) {
            saveField({ proof: debouncedProof })
        }
    }, [debouncedProof])

    useEffect(() => {
        if (!initializedRef.current) return
        if (node && debouncedIntuition !== (node.intuition || '')) {
            saveField({ intuition: debouncedIntuition })
        }
    }, [debouncedIntuition])

    useEffect(() => {
        if (!initializedRef.current) return
        if (node && debouncedNotes !== (node.notes || '')) {
            saveField({ notes: debouncedNotes })
        }
    }, [debouncedNotes])

    if (!node) return null

    return (
        <div className="flex flex-col">
            {/* Kind & Status */}
            <div className="flex items-center gap-2">
                <select
                    value={kind}
                    onChange={e => {
                        setKind(e.target.value)
                        saveField({ kind: e.target.value })
                    }}
                    className="flex-1 text-[10px] bg-white/10 border border-white/20 rounded px-2 py-1 text-white/80 focus:outline-none capitalize"
                >
                    {VALID_KINDS.map(k => (
                        <option key={k} value={k} className="bg-[#111118] capitalize">
                            {k.replace('_', ' ')}
                        </option>
                    ))}
                </select>
                <select
                    value={status}
                    onChange={e => {
                        setStatus(e.target.value)
                        saveField({ status: e.target.value })
                    }}
                    className="text-[10px] bg-white/10 border border-white/20 rounded px-2 py-1 text-white/80 focus:outline-none capitalize"
                >
                    {VALID_STATUSES.map(s => (
                        <option key={s} value={s} className="bg-[#111118] capitalize">
                            {s}
                        </option>
                    ))}
                </select>
            </div>

            {/* Statement */}
            <div className="border-t border-white/10 mt-3 pt-2">
                <div className="text-[10px] font-semibold tracking-wider text-white/40 uppercase mb-1">Statement</div>
                <textarea
                    value={statement}
                    onChange={e => setStatement(e.target.value)}
                    placeholder="Formal statement..."
                    spellCheck={false}
                    className="w-full bg-transparent text-white/90 text-xs font-mono resize-none focus:outline-none placeholder-white/30 leading-relaxed min-h-[60px]"
                    rows={3}
                />
            </div>

            {/* Proof */}
            <div className="border-t border-white/10 mt-2 pt-2">
                <div className="text-[10px] font-semibold tracking-wider text-white/40 uppercase mb-1">Proof</div>
                <textarea
                    value={proof}
                    onChange={e => setProof(e.target.value)}
                    placeholder="Proof or sketch..."
                    spellCheck={false}
                    className="w-full bg-transparent text-white/90 text-xs font-mono resize-none focus:outline-none placeholder-white/30 leading-relaxed min-h-[60px]"
                    rows={3}
                />
            </div>

            {/* Intuition */}
            <div className="border-t border-white/10 mt-2 pt-2">
                <div className="text-[10px] font-semibold tracking-wider text-white/40 uppercase mb-1">Intuition</div>
                <textarea
                    value={intuition}
                    onChange={e => setIntuition(e.target.value)}
                    placeholder="Key insight or intuition..."
                    spellCheck={false}
                    className="w-full bg-transparent text-white/90 text-xs font-mono resize-none focus:outline-none placeholder-white/30 leading-relaxed min-h-[48px]"
                    rows={2}
                />
            </div>

            {/* Notes */}
            <div className="border-t border-white/10 mt-2 pt-2">
                <div className="text-[10px] font-semibold tracking-wider text-white/40 uppercase mb-1">Notes</div>
                <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Additional notes... Supports Markdown."
                    spellCheck={false}
                    className="w-full bg-transparent text-white/90 text-xs font-mono resize-none focus:outline-none placeholder-white/30 leading-relaxed min-h-[48px]"
                    rows={2}
                />
            </div>

            <div className="border-t border-white/10 mt-2 pt-1.5 text-[10px] text-white/30">
                Auto-saves as you type.
            </div>
        </div>
    )
}
