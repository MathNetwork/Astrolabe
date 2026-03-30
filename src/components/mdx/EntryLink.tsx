'use client'

import { useState, useEffect } from 'react'
import { useSelectObjStore } from '@/stores/selectObjStore'
import { API_BASE } from '@/lib/apiBase'
import { getEntryColor, onColorsUpdated } from '@/lib/entryColor'

export function EntryLink({ id, children }: { id: string; children?: any }) {
    const [color, setColor] = useState('#888')
    const selectObj = useSelectObjStore(s => s.select)

    const projectPath = typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('path') || ''
        : ''

    const updateColor = () => {
        if (!id) return
        // Try skeleton color first (sync)
        const c = getEntryColor(id)
        if (c !== '#888888') { setColor(c); return }
        // Fallback: fetch record
        if (!projectPath) return
        fetch(`${API_BASE}/api/astrolabe/entries/${id}?path=${encodeURIComponent(projectPath)}`)
            .then(r => r.ok ? r.json() : null)
            .then(data => {
                if (!data?.record) return
                setColor(getEntryColor(id, data.record))
            })
            .catch(() => {})
    }

    useEffect(updateColor, [id, projectPath])
    useEffect(() => onColorsUpdated(updateColor), [id, projectPath])

    return (
        <span
            className="cursor-pointer hover:opacity-70 underline decoration-dotted underline-offset-2"
            style={{ color }}
            onClick={(e) => { e.stopPropagation(); selectObj(id) }}
            title={`entry: ${id}`}
        >
            {children}
        </span>
    )
}
