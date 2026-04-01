'use client'

import { useSelectObjStore } from '@/stores/selectObjStore'
import { SORT_LABELS, parseRecord } from './utils'

export function LeanNetsEntryRef({ hash, record, color, number, displayText }: {
    hash: string; record: string; color: string; number?: string; displayText?: string
}) {
    const selectObj = useSelectObjStore(s => s.select)

    // If displayText is provided, use it; otherwise derive from record
    let text = displayText
    if (!text && number) {
        const parsed = parseRecord(record)
        const label = parsed ? (SORT_LABELS[parsed.sort] || parsed.sort || '') : ''
        text = label ? `${label} ${number}` : number
    }

    return (
        <span
            className="cursor-pointer hover:opacity-70 underline decoration-dotted underline-offset-2"
            style={{ color }}
            onClick={(e) => { e.stopPropagation(); selectObj(hash) }}
            title={`entry: ${hash}`}
        >
            {text || hash.slice(0, 8)}
        </span>
    )
}
