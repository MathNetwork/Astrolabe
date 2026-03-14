'use client'

import { memo, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import Markdown from 'react-markdown'
import remarkMath from 'remark-math'
import remarkGfm from 'remark-gfm'
import rehypeKatex from 'rehype-katex'
import rehypeRaw from 'rehype-raw'
import 'katex/dist/katex.min.css'
import { useStore } from '@/lib/store'
import { useCanvasStore } from '@/lib/canvasStore'
import { selectNodeUndoable } from '@/lib/history/selectionActions'
import { getNodeKindVisual } from '../../assets/nodeKindConfig'

const API_BASE = 'http://127.0.0.1:8765'

/* ── Types ── */

type DocFile = { name: string; path: string; title: string }

/* ── Custom components for MDX tags ── */

function Theorem({ env, number, title, children }: {
    env?: string; number?: number; title?: string; children?: ReactNode
}) {
    const kindStr = env || 'theorem'
    const kindLabel = kindStr.charAt(0).toUpperCase() + kindStr.slice(1)
    const borderColor = getNodeKindVisual(kindStr.toLowerCase()).color
    return (
        <div className="my-4 border-l-2 pl-4" style={{ borderColor: `${borderColor}99` }}>
            <div className="font-semibold text-white/90 mb-1">
                {kindLabel}{number != null ? ` ${number}` : ''}{title ? ` (${title})` : ''}
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
    const raw = label || ''
    const short = raw.replace(/^lem:|^thm:|^def:|^prop:|^cor:|^ex:|^ax:/, '')
    // Infer kind from label prefix to match node colors
    const kindByPrefix: Record<string, string> = {
        'thm:': 'theorem', 'def:': 'definition', 'lem:': 'lemma',
        'prop:': 'proposition', 'cor:': 'corollary', 'ex:': 'example', 'ax:': 'axiom',
    }
    const prefix = Object.keys(kindByPrefix).find(p => raw.startsWith(p))
    const color = getNodeKindVisual(prefix ? kindByPrefix[prefix] : undefined).color
    return <span className="font-medium" style={{ color, opacity: 0.85 }}>{short}</span>
}

function NodeRef({ id }: { id?: string }) {
    const knowledgeNodes = useCanvasStore(s => s.knowledgeNodes)
    const setMainViewTab = useStore(s => s.setMainViewTab)

    const node = knowledgeNodes.find(n => n.id === id)
    const displayName = node?.name || id || '???'
    const nodeColor = node?.style?.color || getNodeKindVisual(node?.kind).color

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

const RenderedContent = memo(function RenderedContent({ source, extraComponents }: { source: string; extraComponents?: Record<string, any> }) {
    const components = extraComponents ? { ...mdxComponents, ...extraComponents } : mdxComponents
    return (
        <Markdown
            remarkPlugins={remarkPlugins}
            rehypePlugins={rehypePlugins}
            components={components as any}
        >
            {source}
        </Markdown>
    )
})

/* ── Page-level TOC (right sidebar) ── */

type TocItem = { id: string; text: string; level: number }

function extractHeadings(markdown: string): TocItem[] {
    const items: TocItem[] = []
    const lines = markdown.split('\n')
    for (const line of lines) {
        const m = line.match(/^(#{1,4})\s+(.+)$/)
        if (m) {
            const level = m[1].length
            const text = m[2].replace(/\*\*/g, '').replace(/\*/g, '').replace(/`/g, '').trim()
            const id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-')
            items.push({ id, text, level })
        }
    }
    return items
}

function PageToc({ headings, activeId, open, onToggle }: { headings: TocItem[]; activeId: string | null; open: boolean; onToggle: () => void }) {
    if (headings.length === 0) return null
    return (
        <div className={`shrink-0 border-l border-white/10 flex flex-col transition-all ${open ? 'w-44' : 'w-7'}`}>
            <button
                onClick={onToggle}
                className="px-2 py-2 text-[10px] text-white/30 uppercase tracking-wider hover:text-white/50 transition-colors text-right"
                title={open ? 'Collapse' : 'On this page'}
            >
                {open ? 'ToC ▸' : '◂'}
            </button>
            {open && (
                <div className="flex-1 overflow-y-auto">
                    {headings.map((h, i) => (
                        <a
                            key={`${h.id}-${i}`}
                            href={`#${h.id}`}
                            className={`block px-3 py-1 text-[11px] transition-colors truncate hover:text-white/70 ${
                                activeId === h.id ? 'text-white/90' : 'text-white/40'
                            }`}
                            style={{ paddingLeft: `${(h.level - 1) * 10 + 12}px` }}
                            title={h.text}
                        >
                            {h.text}
                        </a>
                    ))}
                </div>
            )}
        </div>
    )
}

/* ── Main component ── */

const FONT_SIZES = [14, 16, 18, 20, 22, 24]
const DEFAULT_FONT_INDEX = 2 // 18px

export const NetworkRead = memo(function NetworkRead({ projectPath }: { projectPath: string }) {
    const [files, setFiles] = useState<DocFile[]>([])
    const [activeFile, setActiveFile] = useState<string | null>(null)
    const [content, setContent] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [fontSizeIndex, setFontSizeIndex] = useState(DEFAULT_FONT_INDEX)
    const [activeTocId, setActiveTocId] = useState<string | null>(null)
    const [docSidebarOpen, setDocSidebarOpen] = useState(true)
    const [pageTocOpen, setPageTocOpen] = useState(true)
    const scrollRef = useRef<HTMLDivElement>(null)

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
                    const index = docs.find(f => /^(index|_index|00-index)\.mdx$/.test(f.name)) || docs[0]
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

    const headings = useMemo(() => content ? extractHeadings(content) : [], [content])

    // Track which heading is currently in view
    useEffect(() => {
        if (headings.length === 0 || !scrollRef.current) return
        const container = scrollRef.current
        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        setActiveTocId(entry.target.id)
                        break
                    }
                }
            },
            { root: container, rootMargin: '0px 0px -70% 0px', threshold: 0.1 }
        )
        const elements = container.querySelectorAll('h1[id], h2[id], h3[id], h4[id]')
        elements.forEach(el => observer.observe(el))
        return () => observer.disconnect()
    }, [headings, content])

    // Heading components that inject id attributes for anchor linking
    const headingComponents = useMemo(() => ({
        h1: ({ children, ...props }: any) => {
            const text = String(children || '')
            const id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-')
            return <h1 id={id} {...props}>{children}</h1>
        },
        h2: ({ children, ...props }: any) => {
            const text = String(children || '')
            const id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-')
            return <h2 id={id} {...props}>{children}</h2>
        },
        h3: ({ children, ...props }: any) => {
            const text = String(children || '')
            const id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-')
            return <h3 id={id} {...props}>{children}</h3>
        },
        h4: ({ children, ...props }: any) => {
            const text = String(children || '')
            const id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-')
            return <h4 id={id} {...props}>{children}</h4>
        },
    }), [])

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
            {/* Documents sidebar (collapsible) */}
            {showToc && (
                <div className={`shrink-0 border-r border-white/10 flex flex-col transition-all ${docSidebarOpen ? 'w-48' : 'w-7'}`}>
                    <button
                        onClick={() => setDocSidebarOpen(o => !o)}
                        className="px-2 py-2 text-[10px] text-white/30 uppercase tracking-wider hover:text-white/50 transition-colors text-left"
                        title={docSidebarOpen ? 'Collapse' : 'Documents'}
                    >
                        {docSidebarOpen ? '◂ Docs' : '▸'}
                    </button>
                    {docSidebarOpen && (
                        <div className="flex-1 overflow-y-auto">
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
                <div className="flex-1 min-h-0 flex">
                    <div ref={scrollRef} className="flex-1 min-w-0 overflow-y-auto">
                        <article
                            className="blueprint-content max-w-6xl mx-auto px-8 py-10 text-white/80"
                            style={{ '--read-font-size': `${FONT_SIZES[fontSizeIndex]}px` } as React.CSSProperties}
                        >
                            {content != null ? (
                                <RenderedContent source={content} extraComponents={headingComponents} />
                            ) : (
                                <div className="text-white/30">Failed to load document</div>
                            )}
                        </article>
                    </div>
                    {/* Page-level TOC (right sidebar, collapsible) */}
                    {headings.length > 1 && (
                        <PageToc headings={headings} activeId={activeTocId} open={pageTocOpen} onToggle={() => setPageTocOpen(o => !o)} />
                    )}
                </div>
            </div>
        </div>
    )
})
