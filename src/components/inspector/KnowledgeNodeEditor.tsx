'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { updateKnowledgeNode } from '@/lib/api'
import { useCanvasStore } from '@/lib/canvasStore'
import type { KnowledgeNode } from '@/lib/api'
import MarkdownRenderer from '@/components/MarkdownRenderer'

const PRESET_KINDS = [
    'theorem', 'lemma', 'definition', 'proposition', 'corollary',
    'axiom', 'conjecture', 'insight', 'open_question',
    'example', 'technique', 'heuristic', 'analogy',
]

const VALID_STATUSES = ['stated', 'proven', 'wip', 'review', 'open']

const CUSTOM_SENTINEL = '__custom__'

function KindSelector({ kind, onChange }: { kind: string; onChange: (v: string) => void }) {
    const [isCustomInput, setIsCustomInput] = useState(false)
    const [customValue, setCustomValue] = useState('')
    const inputRef = useRef<HTMLInputElement>(null)

    const isPreset = PRESET_KINDS.includes(kind)

    useEffect(() => {
        if (isCustomInput && inputRef.current) {
            inputRef.current.focus()
        }
    }, [isCustomInput])

    if (isCustomInput) {
        return (
            <input
                ref={inputRef}
                value={customValue}
                onChange={e => setCustomValue(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                onKeyDown={e => {
                    if (e.key === 'Enter' && customValue.trim()) {
                        onChange(customValue.trim())
                        setIsCustomInput(false)
                    } else if (e.key === 'Escape') {
                        setIsCustomInput(false)
                    }
                }}
                onBlur={() => {
                    if (customValue.trim()) {
                        onChange(customValue.trim())
                    }
                    setIsCustomInput(false)
                }}
                placeholder="e.g. remark, notation, exercise..."
                className="flex-1 text-[10px] bg-white/10 border border-orange-400/40 rounded px-2 py-1 text-white/80 focus:outline-none focus:border-orange-400/60"
            />
        )
    }

    return (
        <select
            value={isPreset ? kind : CUSTOM_SENTINEL}
            onChange={e => {
                if (e.target.value === CUSTOM_SENTINEL) {
                    setCustomValue(isPreset ? '' : kind)
                    setIsCustomInput(true)
                } else {
                    onChange(e.target.value)
                }
            }}
            className="flex-1 text-[10px] bg-white/10 border border-white/20 rounded px-2 py-1 text-white/80 focus:outline-none capitalize"
        >
            {PRESET_KINDS.map(k => (
                <option key={k} value={k} className="bg-[#111118] capitalize">
                    {k.replace('_', ' ')}
                </option>
            ))}
            {!isPreset && (
                <option value={CUSTOM_SENTINEL} className="bg-[#111118]">
                    {kind.replace('_', ' ')}
                </option>
            )}
            <option value={CUSTOM_SENTINEL} className="bg-[#111118] text-orange-400">
                Custom...
            </option>
        </select>
    )
}

function MathField({
    label, value, onChange, placeholder, rows = 3, minH = 'min-h-[60px]',
}: {
    label: string; value: string; onChange: (v: string) => void
    placeholder: string; rows?: number; minH?: string
}) {
    const [editing, setEditing] = useState(false)
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    useEffect(() => {
        if (editing && textareaRef.current) {
            textareaRef.current.focus()
            const len = textareaRef.current.value.length
            textareaRef.current.setSelectionRange(len, len)
        }
    }, [editing])

    return (
        <div className="border-t border-white/10 mt-2 pt-2">
            <div className="text-[10px] font-semibold tracking-wider text-white/40 uppercase mb-1">{label}</div>
            {editing ? (
                <textarea
                    ref={textareaRef}
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    onBlur={() => setEditing(false)}
                    placeholder={placeholder}
                    spellCheck={false}
                    className={`w-full bg-transparent text-white/90 text-xs font-mono resize-none focus:outline-none placeholder-white/30 leading-relaxed ${minH}`}
                    rows={rows}
                />
            ) : (
                <div
                    onClick={() => setEditing(true)}
                    className={`cursor-text ${minH}`}
                >
                    {value ? (
                        <MarkdownRenderer
                            content={value}
                            className="text-xs text-white/90 leading-relaxed [&_.katex]:text-xs"
                        />
                    ) : (
                        <div className="text-xs text-white/30">{placeholder}</div>
                    )}
                </div>
            )}
        </div>
    )
}

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
                <KindSelector kind={kind} onChange={(v) => { setKind(v); saveField({ kind: v }) }} />
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

            <MathField label="Statement" value={statement} onChange={setStatement} placeholder="Formal statement..." rows={3} />
            <MathField label="Proof" value={proof} onChange={setProof} placeholder="Proof or sketch..." rows={3} />
            <MathField label="Intuition" value={intuition} onChange={setIntuition} placeholder="Key insight or intuition..." rows={2} minH="min-h-[48px]" />
            <MathField label="Notes" value={notes} onChange={setNotes} placeholder="Additional notes... Supports Markdown." rows={2} minH="min-h-[48px]" />

            <div className="border-t border-white/10 mt-2 pt-1.5 text-[10px] text-white/30">
                Auto-saves as you type.
            </div>
        </div>
    )
}
