'use client'

/**
 * ReadView — 显示 MDX 文档内容
 *
 * 做一件事：fetch docs，渲染内容。
 */
import { memo, useState, useEffect, useMemo } from 'react'
import { API_BASE } from '@/lib/apiBase'

type DocFile = { name: string; path: string; title: string }

export const ReadView = memo(function ReadView() {
    const [files, setFiles] = useState<DocFile[]>([])
    const [activeFile, setActiveFile] = useState<string | null>(null)
    const [contents, setContents] = useState<Map<string, string>>(new Map())
    const [loading, setLoading] = useState(true)

    const projectPath = useMemo(() => {
        if (typeof window === 'undefined') return null
        return new URLSearchParams(window.location.search).get('path')
    }, [])

    useEffect(() => {
        if (!projectPath) { setLoading(false); return }

        async function load() {
            try {
                const res = await fetch(`${API_BASE}/api/docs/list?path=${encodeURIComponent(projectPath!)}`)
                const data = await res.json()
                const docs: DocFile[] = (data.files || []).map((f: any) => ({
                    name: f.name, path: f.path,
                    title: f.title || f.name.replace(/\.mdx$/, ''),
                }))
                setFiles(docs)

                if (docs.length > 0) {
                    const index = docs.find(f => /^(index|_index|00-index)\.mdx$/.test(f.name)) || docs[0]
                    setActiveFile(index.path)
                }

                const cache = new Map<string, string>()
                await Promise.all(docs.map(async (f) => {
                    try {
                        const r = await fetch(`${API_BASE}/api/docs/read?path=${encodeURIComponent(f.path)}`)
                        const d = await r.json()
                        cache.set(f.path, d.content || '')
                    } catch {
                        cache.set(f.path, '')
                    }
                }))
                setContents(cache)
            } catch {
                // network error
            } finally {
                setLoading(false)
            }
        }

        load()
    }, [projectPath])

    if (loading) {
        return <div className="h-full flex items-center justify-center text-white/30 text-sm">Loading documents...</div>
    }

    if (files.length === 0) {
        return <div className="h-full flex items-center justify-center text-white/30 text-sm">No documents</div>
    }

    const source = activeFile ? contents.get(activeFile) || '' : ''

    return (
        <div className="h-full flex flex-col">
            {/* Sidebar */}
            {files.length > 1 && (
                <div className="flex gap-1 px-3 py-2 border-b border-white/5 overflow-x-auto shrink-0">
                    {files.map(f => (
                        <button key={f.path} onClick={() => setActiveFile(f.path)}
                            className={`px-2 py-1 rounded text-xs whitespace-nowrap ${
                                activeFile === f.path ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white/70'
                            }`}>
                            {f.title}
                        </button>
                    ))}
                </div>
            )}

            {/* Content — raw MDX source */}
            <div className="flex-1 overflow-y-auto">
                <pre className="p-6 text-sm text-white/70 font-mono whitespace-pre-wrap">{source}</pre>
            </div>
        </div>
    )
})
