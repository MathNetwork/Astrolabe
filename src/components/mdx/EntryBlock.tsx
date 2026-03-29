'use client'

import { useState, useEffect } from 'react'
import { useSelectObjStore } from '@/stores/selectObjStore'
import { API_BASE } from '@/lib/apiBase'
import { getSortStyle } from '@/lib/sortColors'
import { InlineMath } from './InlineMath'

const SORT_LABELS: Record<string, string> = {
    definition: 'Definition', theorem: 'Theorem', lemma: 'Lemma',
    proposition: 'Proposition', corollary: 'Corollary', proof: 'Proof',
    citation: 'Citation',
    'lean-definition': 'Lean Definition', 'lean-theorem': 'Lean Theorem',
    'lean-lemma': 'Lean Lemma', 'lean-instance': 'Lean Instance',
    'lean-proof': 'Lean Proof',
}

/** Block-level astrolabe entry, optionally collapsible, supports nesting. */
export function EntryBlock({ id, collapsible, children: nested }: { id?: string; collapsible?: string; children?: any }) {
    const [entry, setEntry] = useState<{ sort: string; title?: string; notes?: string; content?: string; state?: string } | null>(null)
    const [open, setOpen] = useState(false)
    const selectObj = useSelectObjStore(s => s.select)
    const isCollapsible = collapsible === 'true' || collapsible === ''

    const projectPath = typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('path') || ''
        : ''

    useEffect(() => {
        if (!id || !projectPath) return
        fetch(`${API_BASE}/api/astrolabe/entries/${id}?path=${encodeURIComponent(projectPath)}`)
            .then(r => r.ok ? r.json() : null)
            .then(data => {
                if (!data?.record) return
                try { setEntry(JSON.parse(data.record)) } catch { setEntry({ sort: 'note', notes: data.record }) }
            })
            .catch(() => {})
    }, [id, projectPath])

    if (!entry) {
        return <div className="my-2 text-xs text-white/20 font-mono">entry: {id || '?'}</div>
    }

    const style = getSortStyle(entry.sort)
    const label = SORT_LABELS[entry.sort] || entry.sort
    const displayText = entry.notes || entry.content || ''
    const isLean = entry.sort?.startsWith('lean-')
    const showBody = !isCollapsible || open

    return (
        <div className="my-3 pl-3 rounded-r" style={style.borderStyle}>
            <div className="text-xs font-semibold mb-1 flex items-center gap-1" style={style.textStyle}>
                {isCollapsible && (
                    <button
                        onClick={(e) => { e.stopPropagation(); setOpen(!open) }}
                        className="text-white/30 hover:text-white/60 w-3"
                    >
                        {open ? '▾' : '▸'}
                    </button>
                )}
                <span
                    className="cursor-pointer hover:opacity-80"
                    onClick={(e) => { e.stopPropagation(); id && selectObj(id) }}
                    title={`Click to select entry ${id}`}
                >
                    {label}{entry.title ? ` (${entry.title})` : ''}
                    {entry.state === 'sorry' && <span className="ml-1 text-red-400/70">sorry</span>}
                    <span className="ml-2 font-mono text-white/15 font-normal">{id}</span>
                </span>
            </div>
            {showBody && (
                <>
                    <div className="text-white/70">
                        {isLean ? (
                            <pre className="text-[11px] font-mono text-white/50 whitespace-pre-wrap overflow-x-auto">{displayText}</pre>
                        ) : (
                            <InlineMath>{displayText}</InlineMath>
                        )}
                    </div>
                    {nested}
                </>
            )}
        </div>
    )
}
