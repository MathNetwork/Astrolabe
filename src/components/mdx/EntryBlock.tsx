'use client'

import { useState, useEffect } from 'react'
import { useSelectObjStore } from '@/stores/selectObjStore'
import { API_BASE } from '@/lib/apiBase'
import { getEntryColor, onColorsUpdated } from '@/lib/entryColor'
import { usePluginStore } from '@/plugins/registry'

export function EntryBlock({ id, collapsible, number, children: nested }: { id?: string; collapsible?: string; number?: string; children?: any }) {
    const [record, setRecord] = useState<string | null>(null)
    const [, rerender] = useState(0)
    const selectObj = useSelectObjStore(s => s.select)
    const isCollapsible = collapsible === 'true' || collapsible === ''
    const [open, setOpen] = useState(false)

    const projectPath = typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('path') || ''
        : ''

    useEffect(() => onColorsUpdated(() => rerender(n => n + 1)), [])

    useEffect(() => {
        if (!id || !projectPath) return
        fetch(`${API_BASE}/api/astrolabe/entries/${id}?path=${encodeURIComponent(projectPath)}`)
            .then(r => r.ok ? r.json() : null)
            .then(data => { if (data?.record != null) setRecord(data.record) })
            .catch(() => {})
    }, [id, projectPath])

    if (record === null) {
        return <div className="my-2 text-xs text-white/20 font-mono">entry: {id || '?'}</div>
    }

    const color = getEntryColor(id || '', record)
    const PluginRenderer = usePluginStore.getState().getEntryBlockRenderer()

    if (PluginRenderer) {
        return (
            <PluginRenderer
                hash={id || ''}
                record={record}
                color={color}
                number={number}
                collapsible={isCollapsible}
            >
                {nested}
            </PluginRenderer>
        )
    }

    // Raw fallback: no record parsing
    const showBody = !isCollapsible || open
    return (
        <div className="my-3 pl-3 rounded-r" style={{ borderLeftColor: color, borderLeftWidth: 2, opacity: 0.9 }}>
            <div className="text-xs font-semibold mb-1 flex items-center gap-1" style={{ color }}>
                {isCollapsible && (
                    <button onClick={(e) => { e.stopPropagation(); setOpen(!open) }} className="text-white/30 hover:text-white/60 w-3">
                        {open ? '▾' : '▸'}
                    </button>
                )}
                <span className="cursor-pointer hover:opacity-80" onClick={(e) => { e.stopPropagation(); id && selectObj(id) }}>
                    {number && <span className="text-white/40 mr-1">[{number}]</span>}
                    <span className="font-mono text-white/25">{id}</span>
                </span>
            </div>
            {showBody && (
                <>
                    <div className="text-white/50 text-xs font-mono whitespace-pre-wrap">{record}</div>
                    {nested}
                </>
            )}
        </div>
    )
}
