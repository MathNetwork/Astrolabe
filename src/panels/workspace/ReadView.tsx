'use client'

/**
 * ReadView — MDX rendered viewer
 *
 * Left: file list from .astrolabe/docs/
 * Right: rendered markdown with KaTeX math
 */
import { useState, useEffect } from 'react'
import { API_BASE } from '@/lib/apiBase'
import MarkdownRenderer from '@/components/MarkdownRenderer'

interface DocFile {
    name: string
    path: string
    title: string
}

export function ReadView() {
    const [files, setFiles] = useState<DocFile[]>([])
    const [selected, setSelected] = useState<string | null>(null)
    const [content, setContent] = useState('')

    const projectPath = typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('path') || ''
        : ''

    // Load file list
    useEffect(() => {
        if (!projectPath) return
        fetch(`${API_BASE}/api/docs/list?path=${encodeURIComponent(projectPath)}`)
            .then(r => r.json())
            .then(data => {
                const f = data.files || []
                setFiles(f)
                if (f.length > 0 && !selected) setSelected(f[0].path)
            })
            .catch(() => {})
    }, [projectPath])

    // Load selected file content
    useEffect(() => {
        if (!selected) return
        fetch(`${API_BASE}/api/docs/read?path=${encodeURIComponent(selected)}`)
            .then(r => r.json())
            .then(d => setContent(d?.content || ''))
            .catch(() => setContent('Failed to load'))
    }, [selected])

    return (
        <div className="h-full flex">
            {/* File list */}
            <div className="w-48 shrink-0 border-r border-white/5 overflow-y-auto">
                {files.length === 0 ? (
                    <div className="p-3 text-xs text-white/20">No docs</div>
                ) : (
                    files.map(f => (
                        <button
                            key={f.path}
                            onClick={() => setSelected(f.path)}
                            className={`w-full text-left px-3 py-2 text-xs truncate transition-colors ${
                                selected === f.path
                                    ? 'bg-white/10 text-white/80'
                                    : 'text-white/40 hover:text-white/60 hover:bg-white/5'
                            }`}
                        >
                            {f.name}
                        </button>
                    ))
                )}
            </div>
            {/* Rendered content */}
            <div className="flex-1 overflow-auto p-6">
                {content ? (
                    <MarkdownRenderer content={content} className="text-sm max-w-3xl" />
                ) : (
                    <div className="text-xs text-white/20">Select a file</div>
                )}
            </div>
        </div>
    )
}
