'use client'

import { useState, useEffect } from 'react'
import { useSelectObjStore } from '@/stores/selectObjStore'
import { API_BASE } from '@/lib/apiBase'
import { getSortFill, parseSortFromRecord } from '@/lib/sortColors'

/** Inline clickable reference to an astrolabe entry. */
export function EntryLink({ id, children }: { id: string; children?: any }) {
    const [color, setColor] = useState('#888')
    const [, forceUpdate] = useState(0)
    const selectObj = useSelectObjStore(s => s.select)

    const projectPath = typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('path') || ''
        : ''

    // Listen for skeleton color changes
    useEffect(() => {
        const handler = () => forceUpdate(n => n + 1)
        window.addEventListener('skeleton-settings-changed', handler)
        return () => window.removeEventListener('skeleton-settings-changed', handler)
    }, [])

    useEffect(() => {
        if (!id) return
        // Check skeleton color first
        const skeletonColor = (window as any).__skeletonColors?.[id]
        if (skeletonColor) { setColor(skeletonColor); return }
        // Fallback to sort-based color
        if (!projectPath) return
        fetch(`${API_BASE}/api/astrolabe/entries/${id}?path=${encodeURIComponent(projectPath)}`)
            .then(r => r.ok ? r.json() : null)
            .then(data => {
                if (!data?.record) return
                setColor(getSortFill(parseSortFromRecord(data.record)))
            })
            .catch(() => {})
    }, [id, projectPath, forceUpdate])

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
