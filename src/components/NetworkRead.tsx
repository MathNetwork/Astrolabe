'use client'

import { createContext, memo, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
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
import { buildGlobalNodeNumbering, type NodeInfo, type DocEntry } from './nodeNumbering'

const API_BASE = 'http://127.0.0.1:8765'

/* ── Node numbering context ── */
const NodeNumberingContext = createContext<Map<string, string>>(new Map())

/* ── Types ── */

type DocFile = { name: string; path: string; title: string }

/* ── Custom components for MDX tags ── */

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

function NodeRef({ id, children }: { id?: string; children?: React.ReactNode }) {
    const knowledgeNodes = useCanvasStore(s => s.knowledgeNodes)
    const setMainViewTab = useStore(s => s.setMainViewTab)
    const numbering = useContext(NodeNumberingContext)

    const node = knowledgeNodes.find(n => n.id === id)
    // Custom text > numbered label > node name > fallback
    const displayName = children || (id && numbering.get(id)) || node?.name || id || '???'
    const nodeColor = getNodeKindVisual(node?.sort).color

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

const VALID_SHOW_FIELDS = new Set(['statement', 'proof', 'intuition', 'notes'])

export function parseShowFields(dataShow: string | undefined): string[] {
    if (!dataShow || !dataShow.trim()) return ['statement']
    const fields = dataShow.split(',').map(s => s.trim()).filter(s => VALID_SHOW_FIELDS.has(s))
    return fields.length > 0 ? fields : ['statement']
}

function ProofCollapsible({ source, color }: { source: string; color: string }) {
    const [open, setOpen] = useState(false)
    return (
        <div style={{ borderTop: `1px solid ${color}33` }} className="mt-3 pt-2">
            <div
                style={{ color: `${color}cc` }}
                className="cursor-pointer text-sm font-semibold select-none"
                onClick={() => setOpen(o => !o)}
            >
                {open ? 'Proof ▾' : 'Proof ▸'}
            </div>
            {open && (
                <div className="mt-2 text-[0.92em] opacity-90">
                    <RenderedContent source={source} />
                </div>
            )}
        </div>
    )
}

function NodeBlock({ id, showFields }: { id?: string; showFields?: string[] }) {
    const knowledgeNodes = useCanvasStore(s => s.knowledgeNodes)
    const setMainViewTab = useStore(s => s.setMainViewTab)
    const numbering = useContext(NodeNumberingContext)

    const handleClick = useCallback(() => {
        if (!id) return
        selectNodeUndoable(id)
        setMainViewTab('detail')
    }, [id, setMainViewTab])

    const node = knowledgeNodes.find(n => n.id === id)
    if (!node) return <div className="text-white/30 text-sm italic">Node not found: {id}</div>

    const { color } = getNodeKindVisual(node.sort)
    const numberLabel = id ? numbering.get(id) : undefined
    const kindLabel = (node.sort || '').replace('_', ' ')
    const kindDisplay = numberLabel || (kindLabel.charAt(0).toUpperCase() + kindLabel.slice(1))

    return (
        <div
            style={{ borderLeft: `3px solid ${color}`, background: `${color}11` }}
            className="rounded-r-md my-4 px-5 py-4 cursor-pointer"
            onClick={handleClick}
            title="Click to select node"
        >
            <div className="mb-2">
                <span style={{ color }} className="font-semibold">{kindDisplay}</span>
                {node.name && <span style={{ color }} className="ml-1">({node.name}).</span>}
            </div>
            {(showFields || ['statement']).map(field => {
                const value = (node as any)[field]
                if (!value) return null
                if (field === 'proof') {
                    return <ProofCollapsible key={field} source={value} color={color} />
                }
                return <RenderedContent key={field} source={value} />
            })}
        </div>
    )
}

/* ── Memoized markdown renderer ── */

const remarkPlugins = [remarkMath, remarkGfm]
const rehypePlugins = [rehypeKatex, rehypeRaw]
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mdxComponents: Record<string, any> = {
    ref: Ref,
    noderef: NodeRef,
    div: ({ className, children, node: _node, ...props }: any) => {
        if (className === 'nodeblock') {
            const id = typeof children === 'string' ? children.trim() : Array.isArray(children) ? String(children[0]).trim() : ''
            const dataShow = props['data-show'] || props.dataShow
            return <NodeBlock id={id} showFields={parseShowFields(dataShow)} />
        }
        return <div className={className} {...props}>{children}</div>
    },
}

const RenderedContent = memo(function RenderedContent({ source, extraComponents }: { source: string; extraComponents?: Record<string, any> }) {
    const components = extraComponents ? { ...mdxComponents, ...extraComponents } : mdxComponents
    return (
        <div className="rendered-math-content">
            <Markdown
                remarkPlugins={remarkPlugins}
                rehypePlugins={rehypePlugins}
                components={components as any}
            >
                {source}
            </Markdown>
        </div>
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

function PageToc({ headings, activeId, open, onToggle, scrollContainer }: { headings: TocItem[]; activeId: string | null; open: boolean; onToggle: () => void; scrollContainer?: React.RefObject<HTMLDivElement | null> }) {
    if (headings.length === 0) return null

    const handleClick = useCallback((e: React.MouseEvent, id: string) => {
        e.preventDefault()
        const container = scrollContainer?.current
        if (!container) return
        const el = container.querySelector(`#${CSS.escape(id)}`)
        if (el) {
            const containerRect = container.getBoundingClientRect()
            const elRect = el.getBoundingClientRect()
            container.scrollTo({
                top: container.scrollTop + elRect.top - containerRect.top - 16,
                behavior: 'smooth',
            })
        }
    }, [scrollContainer])

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
                            onClick={(e) => handleClick(e, h.id)}
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
    const contentCacheRef = useRef<Map<string, string>>(new Map())
    const filesKey = useMemo(() => files.map(f => f.path).join('|'), [files])
    const [fontSizeIndex, setFontSizeIndex] = useState(DEFAULT_FONT_INDEX)
    const [activeTocId, setActiveTocId] = useState<string | null>(null)
    const [docSidebarOpen, setDocSidebarOpen] = useState(true)
    const [pageTocOpen, setPageTocOpen] = useState(true)
    const scrollRef = useRef<HTMLDivElement>(null)
    const pendingScrollRef = useRef<number | null>(null)

    // Restore scroll position after content re-render
    useEffect(() => {
        if (pendingScrollRef.current != null && scrollRef.current && !loading) {
            const target = pendingScrollRef.current
            pendingScrollRef.current = null
            // Wait for KaTeX rendering to complete
            setTimeout(() => {
                if (scrollRef.current) scrollRef.current.scrollTop = target
            }, 100)
        }
    }, [content, loading])

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

    // Preload all file contents on project open
    useEffect(() => {
        if (files.length === 0) return
        let cancelled = false
        const cache = contentCacheRef.current

        Promise.all(
            files.map(f =>
                fetch(`${API_BASE}/api/docs/read?path=${encodeURIComponent(f.path)}`)
                    .then(r => r.json())
                    .then(data => { cache.set(f.path, data.content || '') })
                    .catch(() => { cache.set(f.path, '') })
            )
        ).then(() => {
            if (cancelled) return
            // Set initial content if activeFile is already set
            if (activeFile && cache.has(activeFile)) {
                setContent(cache.get(activeFile)!)
                setLoading(false)
            }
        })
        return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filesKey])

    // Switch active file content from cache (instant)
    useEffect(() => {
        if (!activeFile) return
        const cache = contentCacheRef.current
        if (cache.has(activeFile)) {
            setContent(cache.get(activeFile)!)
            setLoading(false)
        } else {
            // Fallback: fetch if not cached yet
            setLoading(true)
            fetch(`${API_BASE}/api/docs/read?path=${encodeURIComponent(activeFile)}`)
                .then(r => r.json())
                .then(data => {
                    cache.set(activeFile, data.content || '')
                    setContent(data.content || '')
                    setLoading(false)
                })
                .catch(() => {
                    setContent(null)
                    setLoading(false)
                })
        }
    }, [activeFile])

    const headings = useMemo(() => content ? extractHeadings(content) : [], [content])

    // Reload knowledge nodes when active file changes (picks up newly created nodes)
    const reloadKnowledge = useCanvasStore(s => s.reloadKnowledge)
    useEffect(() => {
        reloadKnowledge()
    }, [activeFile, reloadKnowledge])

    // Global node numbering system (across all documents)
    const knowledgeNodes = useCanvasStore(s => s.knowledgeNodes)
    const [allDocContents, setAllDocContents] = useState<DocEntry[]>([])

    // Load all doc contents for global numbering (once, when file list stabilizes)
    useEffect(() => {
        if (files.length === 0) return
        let cancelled = false
        Promise.all(
            files.map(f =>
                fetch(`${API_BASE}/api/docs/read?path=${encodeURIComponent(f.path)}`)
                    .then(r => r.json())
                    .then(data => ({ filename: f.name, content: data.content || '' }))
                    .catch(() => ({ filename: f.name, content: '' }))
            )
        ).then(docs => {
            if (!cancelled) setAllDocContents(docs)
        })
        return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filesKey])

    const setNodeNumbering = useCanvasStore(s => s.setNodeNumbering)
    const nodeNumbering = useMemo(() => {
        if (allDocContents.length === 0) return new Map<string, string>()
        const nodeMap: Record<string, NodeInfo> = {}
        for (const n of knowledgeNodes) {
            nodeMap[n.id] = { sort: n.sort, name: n.name }
        }
        return buildGlobalNodeNumbering(allDocContents, nodeMap)
    }, [allDocContents, knowledgeNodes])

    // Sync numbering to global store so other components can access it
    useEffect(() => {
        setNodeNumbering(nodeNumbering)
    }, [nodeNumbering, setNodeNumbering])

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
                {/* Toolbar: refresh + font size */}
                <div className="flex justify-between px-3 py-1 shrink-0 border-b border-white/5">
                    <button
                        onClick={() => {
                            pendingScrollRef.current = scrollRef.current?.scrollTop ?? 0
                            reloadKnowledge()
                            if (activeFile) {
                                setLoading(true)
                                fetch(`${API_BASE}/api/docs/read?path=${encodeURIComponent(activeFile)}`)
                                    .then(r => r.json())
                                    .then(data => { setContent(data.content || ''); setLoading(false) })
                                    .catch(() => setLoading(false))
                            }
                        }}
                        className="px-2 py-1 text-[10px] text-white/40 hover:text-white/70 transition-colors"
                        title="Reload document and knowledge nodes"
                    >
                        ↻ Refresh
                    </button>
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
                            onClick={(e) => {
                                const target = (e.target as HTMLElement).closest('a')
                                if (!target) return
                                const href = target.getAttribute('href')
                                if (!href || !href.startsWith('./')) return
                                e.preventDefault()
                                const slug = href.replace('./', '')
                                const match = files.find(f => f.name.replace(/\.mdx$/, '') === slug)
                                if (match) setActiveFile(match.path)
                            }}
                        >
                            {content != null ? (
                                <NodeNumberingContext.Provider value={nodeNumbering}>
                                    <RenderedContent source={content} extraComponents={headingComponents} />
                                </NodeNumberingContext.Provider>
                            ) : (
                                <div className="text-white/30">Failed to load document</div>
                            )}
                        </article>
                    </div>
                    {/* Page-level TOC (right sidebar, collapsible) */}
                    {headings.length > 1 && (
                        <PageToc headings={headings} activeId={activeTocId} open={pageTocOpen} onToggle={() => setPageTocOpen(o => !o)} scrollContainer={scrollRef} />
                    )}
                </div>
            </div>
        </div>
    )
})
