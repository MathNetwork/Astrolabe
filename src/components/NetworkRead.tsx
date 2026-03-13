'use client'

import { memo, useCallback, useEffect, useState, type ReactNode } from 'react'
import Markdown from 'react-markdown'
import remarkMath from 'remark-math'
import remarkGfm from 'remark-gfm'
import rehypeKatex from 'rehype-katex'
import rehypeRaw from 'rehype-raw'
import 'katex/dist/katex.min.css'
import { useStore } from '@/lib/store'
import { useCanvasStore } from '@/lib/canvasStore'
import { selectNodeUndoable } from '@/lib/history/selectionActions'

const API_BASE = 'http://127.0.0.1:8765'

/* ── Types ── */

type DocFile = { name: string; path: string; title: string }

/* ── Custom components for MDX tags ── */

function Theorem({ env, number, title, children }: {
    env?: string; number?: number; title?: string; children?: ReactNode
}) {
    const kind = (env || 'theorem').charAt(0).toUpperCase() + (env || 'theorem').slice(1)
    return (
        <div className="my-4 border-l-2 border-[#FCAF45]/60 pl-4">
            <div className="font-semibold text-white/90 mb-1">
                {kind}{number != null ? ` ${number}` : ''}{title ? ` (${title})` : ''}
            </div>
            <div className="text-white/75 italic">{children}</div>
        </div>
    )
}

function Proof({ children }: { children?: ReactNode }) {
    return (
        <div className="my-2 pl-4 text-white/60 text-[13px]">
            <span className="font-semibold not-italic text-white/50">Proof. </span>
            {children}
            <span className="ml-1">∎</span>
        </div>
    )
}

function Ref({ label }: { label?: string }) {
    const short = (label || '').replace(/^lem:|^thm:|^def:|^prop:/, '')
    return <span className="text-[#FCAF45]/80 font-medium">{short}</span>
}

function NodeRef({ id }: { id?: string }) {
    const knowledgeNodes = useCanvasStore(s => s.knowledgeNodes)
    const setMainViewTab = useStore(s => s.setMainViewTab)

    const node = knowledgeNodes.find(n => n.id === id)
    const displayName = node?.name || id || '???'
    const nodeColor = node?.style?.color || '#FCAF45'

    const handleClick = useCallback(() => {
        if (!id) return
        selectNodeUndoable(id)
        setMainViewTab('detail')
    }, [id, setMainViewTab])

    return (
        <button
            onClick={handleClick}
            className="font-medium underline underline-offset-2 transition-colors cursor-pointer"
            style={{ color: nodeColor, textDecorationColor: `${nodeColor}66` }}
            onMouseEnter={e => { e.currentTarget.style.textDecorationColor = `${nodeColor}bb` }}
            onMouseLeave={e => { e.currentTarget.style.textDecorationColor = `${nodeColor}66` }}
            title={id ? `Node: ${id}` : undefined}
        >
            {displayName}
        </button>
    )
}

/* ── Memoized markdown renderer ── */

const remarkPlugins = [remarkMath, remarkGfm]
const rehypePlugins = [rehypeKatex, rehypeRaw]
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mdxComponents: Record<string, any> = {
    theorem: Theorem,
    proof: Proof,
    ref: Ref,
    noderef: NodeRef,
}

const RenderedContent = memo(function RenderedContent({ source }: { source: string }) {
    return (
        <Markdown
            remarkPlugins={remarkPlugins}
            rehypePlugins={rehypePlugins}
            components={mdxComponents as any}
        >
            {source}
        </Markdown>
    )
})

/* ── Main component ── */

const FONT_SIZES = [14, 16, 18, 20, 22, 24]
const DEFAULT_FONT_INDEX = 2 // 18px

export const NetworkRead = memo(function NetworkRead({ projectPath }: { projectPath: string }) {
    const [files, setFiles] = useState<DocFile[]>([])
    const [activeFile, setActiveFile] = useState<string | null>(null)
    const [content, setContent] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [fontSizeIndex, setFontSizeIndex] = useState(DEFAULT_FONT_INDEX)

    // Load file list
    useEffect(() => {
        if (!projectPath) return
        let cancelled = false

        setLoading(true)
        fetch(`${API_BASE}/api/docs/list?path=${encodeURIComponent(projectPath)}`)
            .then(r => r.json())
            .then(data => {
                if (cancelled) return
                const docs: DocFile[] = data.files || []
                setFiles(docs)
                // Auto-select index.mdx or first file
                if (docs.length > 0) {
                    const index = docs.find(f => f.name === 'index.mdx') || docs[0]
                    setActiveFile(index.path)
                } else {
                    setLoading(false)
                }
            })
            .catch(() => {
                if (cancelled) return
                setFiles([])
                setLoading(false)
            })

        return () => { cancelled = true }
    }, [projectPath])

    // Load active file content
    useEffect(() => {
        if (!activeFile) return
        let cancelled = false

        setLoading(true)
        fetch(`${API_BASE}/api/docs/read?path=${encodeURIComponent(activeFile)}`)
            .then(r => r.json())
            .then(data => {
                if (cancelled) return
                setContent(data.content || '')
                setLoading(false)
            })
            .catch(() => {
                if (cancelled) return
                setContent(null)
                setLoading(false)
            })

        return () => { cancelled = true }
    }, [activeFile])

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center text-white/40 bg-[#0a0a0f]">
                Loading...
            </div>
        )
    }

    // Empty state
    if (files.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-white/40 bg-[#0a0a0f]">
                <div className="text-lg mb-2">No documents yet</div>
                <div className="text-sm text-white/25">
                    Create <code className="bg-white/5 px-1.5 py-0.5 rounded text-white/40">.mdx</code> files in{' '}
                    <code className="bg-white/5 px-1.5 py-0.5 rounded text-white/40">.netmath/docs/</code> to get started
                </div>
            </div>
        )
    }

    const showToc = files.length > 1

    return (
        <div className="h-full flex bg-[#0a0a0f]">
            {/* TOC sidebar */}
            {showToc && (
                <div className="w-48 shrink-0 border-r border-white/10 overflow-y-auto py-3">
                    <div className="px-3 mb-2 text-[10px] text-white/30 uppercase tracking-wider">Documents</div>
                    {files.map(f => (
                        <button
                            key={f.path}
                            onClick={() => setActiveFile(f.path)}
                            className={`w-full text-left px-3 py-1.5 text-xs transition-colors truncate ${
                                activeFile === f.path
                                    ? 'text-white bg-white/10'
                                    : 'text-white/50 hover:text-white/70 hover:bg-white/5'
                            }`}
                            title={f.name}
                        >
                            {f.title}
                        </button>
                    ))}
                </div>
            )}

            {/* Content */}
            <div className="flex-1 min-w-0 flex flex-col">
                {/* Font size control */}
                <div className="flex justify-end px-3 py-1 shrink-0 border-b border-white/5">
                    <div className="flex items-center">
                        <button
                            onClick={() => setFontSizeIndex(i => Math.max(0, i - 1))}
                            disabled={fontSizeIndex === 0}
                            className="px-1.5 py-1 text-[10px] text-white/40 hover:text-white/70 disabled:text-white/15 transition-colors"
                        >
                            A−
                        </button>
                        <span className="text-[9px] text-white/25 w-5 text-center">{FONT_SIZES[fontSizeIndex]}</span>
                        <button
                            onClick={() => setFontSizeIndex(i => Math.min(FONT_SIZES.length - 1, i + 1))}
                            disabled={fontSizeIndex === FONT_SIZES.length - 1}
                            className="px-1.5 py-1 text-[11px] text-white/40 hover:text-white/70 disabled:text-white/15 transition-colors"
                        >
                            A+
                        </button>
                    </div>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto">
                    <article
                        className="blueprint-content max-w-3xl mx-auto px-8 py-10 text-white/80"
                        style={{ '--read-font-size': `${FONT_SIZES[fontSizeIndex]}px` } as React.CSSProperties}
                    >
                        {content != null ? (
                            <RenderedContent source={content} />
                        ) : (
                            <div className="text-white/30">Failed to load document</div>
                        )}
                    </article>
                </div>
            </div>
        </div>
    )
})
