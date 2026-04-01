'use client'

import { useState } from 'react'
import { useSelectObjStore } from '@/stores/selectObjStore'
import { InlineMath } from '@/components/mdx/InlineMath'
import { LeanCode } from './LeanHighlight'
import { SORT_LABELS, parseRecord } from './utils'

export function LeanNetsEntryBlock({ hash, record, color, number, collapsible, children }: {
    hash: string; record: string; color: string; number?: string; collapsible?: boolean; children?: React.ReactNode
}) {
    const [open, setOpen] = useState(false)
    const selectObj = useSelectObjStore(s => s.select)

    const parsed = parseRecord(record)
    if (!parsed || typeof parsed !== 'object') {
        return <div className="my-2 text-xs text-white/20 font-mono">entry: {hash}</div>
    }

    const label = SORT_LABELS[parsed.sort] || parsed.sort || ''
    const displayText = parsed.notes || parsed.content || ''
    const isLean = parsed.sort?.startsWith('lean-') || parsed.source === 'lean'
    const showBody = !collapsible || open

    const numberStr = number ? ` ${number}` : ''

    return (
        <div className="my-3 pl-3 rounded-r" style={{ borderLeftColor: color, borderLeftWidth: 2, opacity: 0.9 }}>
            <div className="text-xs font-semibold mb-1 flex items-center gap-1" style={{ color }}>
                {collapsible && (
                    <button
                        onClick={(e) => { e.stopPropagation(); setOpen(!open) }}
                        className="text-white/30 hover:text-white/60 w-3"
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
                    {parsed.state === 'sorry' && <span className="ml-1 text-red-400/70">sorry</span>}
                    <span className="ml-2 font-mono text-white/15 font-normal">{hash}</span>
                </span>
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
                    {children}
                </>
            )}
        </div>
    )
}
