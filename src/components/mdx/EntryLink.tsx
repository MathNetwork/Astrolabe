'use client'

import { useState, useEffect } from 'react'
import { useSelectObjStore } from '@/stores/selectObjStore'
import { API_BASE } from '@/lib/apiBase'
import { getEntryColor, onColorsUpdated } from '@/lib/entryColor'
import { usePluginStore } from '@/plugins/registry'

export function EntryLink({ id, number, auto, children }: { id: string; number?: string; auto?: boolean; children?: any }) {
    const [color, setColor] = useState('#888')
    const [record, setRecord] = useState<string | null>(null)
    const selectObj = useSelectObjStore(s => s.select)

    const projectPath = typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('path') || ''
        : ''

    const updateColor = () => {
        if (!id) return
        const c = getEntryColor(id)
        if (c !== '#888888') setColor(c)
        // Always fetch record for plugin renderer (title fallback, etc.)
        if (!projectPath) return
        if (record !== null) return  // already have it
        fetch(`${API_BASE}/api/astrolabe/entries/${id}?path=${encodeURIComponent(projectPath)}`)
            .then(r => r.ok ? r.json() : null)
            .then(data => {
                if (!data?.record) return
                if (c === '#888888') setColor(getEntryColor(id, data.record))
                setRecord(data.record)
            })
            .catch(() => {})
    }

    useEffect(updateColor, [id, projectPath])
    useEffect(() => onColorsUpdated(updateColor), [id, projectPath])

    // Manual mode: \entryref{hash}{text} — children contains the display text
    const displayText = !auto && children ? (typeof children === 'string' ? children : undefined) : undefined

    const PluginRenderer = usePluginStore.getState().getEntryRefRenderer()
    if (PluginRenderer && (record !== null || auto)) {
        return (
            <PluginRenderer
                hash={id}
                record={record || ''}
                color={color}
                number={number}
                displayText={displayText}
            />
        )
    }

    // Raw fallback
    let fallbackText: string
    if (!auto && children) {
        fallbackText = typeof children === 'string' ? children : id.slice(0, 8)
    } else if (number) {
        fallbackText = `[${number}]`
    } else {
        fallbackText = id.slice(0, 8)
    }

    return (
        <span
            className="cursor-pointer hover:opacity-70 underline decoration-dotted underline-offset-2"
            style={{ color }}
            onClick={(e) => { e.stopPropagation(); selectObj(id) }}
            title={`entry: ${id}`}
        >
            {fallbackText}
        </span>
    )
}
