'use client'

/**
 * EntryDetail — raw entry viewer
 *
 * Fetches /api/astrolabe/entries/{id}, displays hash, ref, and record as plain key-value.
 * No special rendering. Rendering is a plugin concern.
 */
import { memo, useEffect, useState } from 'react'
import { useSelectObjStore } from '@/stores/selectObjStore'
import { API_BASE } from '@/lib/apiBase'

interface Entry {
    ref: string[]
    record: string
}

export const EntryDetail = memo(function EntryDetail({ id }: { id: string }) {
    const [entry, setEntry] = useState<Entry | null>(null)
    const [error, setError] = useState(false)
    const selectObj = useSelectObjStore(s => s.select)

    const projectPath = typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('path') || ''
        : ''

    useEffect(() => {
        if (!id || !projectPath) return
        setError(false)
        fetch(`${API_BASE}/api/astrolabe/entries/${id}?path=${encodeURIComponent(projectPath)}`)
            .then(r => {
                if (!r.ok) throw new Error(r.statusText)
                return r.json()
            })
            .then(setEntry)
            .catch(() => setError(true))
    }, [id, projectPath])

    if (error) {
        return <div className="p-3 text-white/30 text-xs font-mono">not found: {id}</div>
    }
    if (!entry) {
        return <div className="p-3 text-white/20 text-xs animate-pulse">loading...</div>
    }

    return (
        <div className="p-3 space-y-2 text-xs">
            {/* hash */}
            <div className="font-mono text-white/25">{id}</div>

            {/* ref */}
            <Row label="ref">
                <span className="font-mono">
                    [
                    {entry.ref.map((hash, i) => {
                        const isSelf = hash === id
                        return (
                            <span key={i}>
                                {i > 0 && ', '}
                                {isSelf ? (
                                    <span className="text-white/25">self</span>
                                ) : (
                                    <button
                                        onClick={() => selectObj(hash)}
                                        className="text-blue-400/70 hover:text-blue-300 cursor-pointer"
                                    >
                                        {hash}
                                    </button>
                                )}
                            </span>
                        )
                    })}
                    ]
                </span>
            </Row>

            {/* record */}
            <Row label="record">
                <span className="text-white/70 whitespace-pre-wrap break-all">{entry.record}</span>
            </Row>
        </div>
    )
})

function Row({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <span className="text-white/30 mr-2">{label}:</span>
            {children}
        </div>
    )
}
