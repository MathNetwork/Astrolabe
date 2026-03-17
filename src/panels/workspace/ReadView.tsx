'use client'

/**
 * ReadView — MDX 阅读器
 *
 * Step 5.1: 文件加载 + 缓存
 * Step 5.2: 左侧栏文档导航
 * Step 5.3: MDX 渲染（KaTeX + objblock + objref）
 * Step 5.4: 右侧 TOC（extractHeadings + IntersectionObserver）
 * Step 5.5: Obj 编号系统（跨文档全局编号 → dataStore.nodeNumbering）
 * Step 5.6: 字号控制 + 刷新按钮
 *
 * 订阅: dataStore（objblock/objref 用）
 * 写入: selectObjStore（点击 objref 时）, dataStore.setNodeNumbering
 */
import { memo, useState, useEffect, useRef, useMemo, useCallback } from 'react'
import Markdown from 'react-markdown'
import remarkMath from 'remark-math'
import remarkGfm from 'remark-gfm'
import rehypeKatex from 'rehype-katex'
import rehypeRaw from 'rehype-raw'
import 'katex/dist/katex.min.css'
import { useDataStore } from '@/stores/dataStore'
import { useSelectObjStore } from '@/stores/selectObjStore'
import { ObjRef } from '@/components/shared/ObjRef'
import { ObjBlock, parseShowFields } from '@/components/shared/ObjBlock'
import { buildGlobalObjNumbering, type ObjInfo, type DocEntry } from '@/components/objNumbering'

const API_BASE = 'http://127.0.0.1:8765'

// ── Types ──

type DocFile = { name: string; path: string; title: string }
type TocItem = { id: string; text: string; level: number }

// ── 5.4: extractHeadings ──

export function extractHeadings(markdown: string): TocItem[] {
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

// ── MDX Components ──

const remarkPlugins = [remarkMath, remarkGfm]
const rehypePlugins = [rehypeKatex, rehypeRaw]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mdxComponents: Record<string, any> = {
    objref: ObjRef,
    div: ({ className, children, ...props }: any) => {
        if (className === 'objblock') {
            const id = typeof children === 'string' ? children.trim() : Array.isArray(children) ? String(children[0]).trim() : ''
            const dataShow = props['data-show'] || props.dataShow
            return <ObjBlock id={id} showFields={parseShowFields(dataShow)} />
        }
        return <div className={className} {...props}>{children}</div>
    },
}

// Heading components with auto-generated IDs for TOC
const headingComponents: Record<string, any> = {
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
}

const allComponents = { ...mdxComponents, ...headingComponents }

// ── Rendered Content (memoized) ──

const RenderedContent = memo(function RenderedContent({ source }: { source: string }) {
    return (
        <div className="rendered-math-content">
            <Markdown
                remarkPlugins={remarkPlugins}
                rehypePlugins={rehypePlugins}
                components={allComponents}
            >
                {source}
            </Markdown>
        </div>
    )
})

// ── 5.4: PageToc ──

function PageToc({ headings, activeTocId, pageTocOpen, onToggle, scrollContainer }: {
    headings: TocItem[]
    activeTocId: string | null
    pageTocOpen: boolean
    onToggle: () => void
    scrollContainer: React.RefObject<HTMLDivElement | null>
}) {
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
        <div className={`shrink-0 border-l border-white/10 flex flex-col transition-all ${pageTocOpen ? 'w-44' : 'w-7'}`}>
            <button
                onClick={onToggle}
                className="px-2 py-2 text-[10px] text-white/30 uppercase tracking-wider hover:text-white/50 transition-colors text-right"
                title={pageTocOpen ? 'Collapse' : 'On this page'}
            >
                {pageTocOpen ? 'ToC ▸' : '◂'}
            </button>
            {pageTocOpen && (
                <div className="flex-1 overflow-y-auto">
                    {headings.map((h, i) => (
                        <a
                            key={`${h.id}-${i}`}
                            href={`#${h.id}`}
                            onClick={(e) => handleClick(e, h.id)}
                            className={`block px-3 py-1 text-[11px] transition-colors truncate hover:text-white/70 ${
                                activeTocId === h.id ? 'text-white/90' : 'text-white/40'
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

// ── 5.6: Font sizes ──

const FONT_SIZES = [14, 16, 18, 20, 22, 24]
const DEFAULT_FONT_INDEX = 2 // 18px

// ── Main Component ──

export const ReadView = memo(function ReadView() {
    const [files, setFiles] = useState<DocFile[]>([])
    const [activeFile, setActiveFile] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const contentCacheRef = useRef<Map<string, string>>(new Map())
    const visitedFilesRef = useRef<Set<string>>(new Set())
    const scrollRef = useRef<HTMLDivElement>(null)
    const pendingScrollRef = useRef<number | null>(null)

    // 5.4: TOC state
    const [activeTocId, setActiveTocId] = useState<string | null>(null)
    const [pageTocOpen, setPageTocOpen] = useState(true)

    // 5.5: Obj numbering
    const [allDocContents, setAllDocContents] = useState<DocEntry[]>([])
    const objects = useDataStore(s => s.objects)
    const setNodeNumbering = useDataStore(s => s.setNodeNumbering)

    // 5.6: Font size
    const [fontSizeIndex, setFontSizeIndex] = useState(DEFAULT_FONT_INDEX)

    // 获取 projectPath（从 URL 参数）
    const projectPath = useMemo(() => {
        if (typeof window === 'undefined') return null
        return new URLSearchParams(window.location.search).get('path')
    }, [])

    // 5.1: 加载文件列表
    useEffect(() => {
        if (!projectPath) return
        let cancelled = false

        fetch(`${API_BASE}/api/docs/list?path=${encodeURIComponent(projectPath)}`)
            .then(r => r.json())
            .then(data => {
                if (cancelled) return
                const docs: DocFile[] = (data.files || []).map((f: any) => ({
                    name: f.name,
                    path: f.path,
                    title: f.title || f.name.replace(/\.mdx$/, ''),
                }))
                setFiles(docs)
                if (docs.length > 0) {
                    const index = docs.find(f => /^(index|_index|00-index)\.mdx$/.test(f.name)) || docs[0]
                    setActiveFile(index.path)
                }
            })
            .catch(() => {
                if (!cancelled) setLoading(false)
            })

        return () => { cancelled = true }
    }, [projectPath])

    // 5.1: 预加载所有文件内容 + 5.5: 收集编号数据
    useEffect(() => {
        if (files.length === 0) return
        let cancelled = false
        const cache = contentCacheRef.current

        Promise.all(
            files.map(f =>
                fetch(`${API_BASE}/api/docs/read?path=${encodeURIComponent(f.path)}`)
                    .then(r => r.json())
                    .then(data => {
                        const text = data.content || ''
                        cache.set(f.path, text)
                        return { filename: f.name, content: text }
                    })
                    .catch(() => {
                        cache.set(f.path, '')
                        return { filename: f.name, content: '' }
                    })
            )
        ).then((docs) => {
            if (cancelled) return
            setLoading(false)
            setAllDocContents(docs)
        })

        return () => { cancelled = true }
    }, [files])

    // 5.5: 构建全局编号表
    const nodeNumbering = useMemo(() => {
        if (allDocContents.length === 0) return new Map<string, string>()
        const objMap: Record<string, ObjInfo> = {}
        for (const o of objects) {
            objMap[o.id] = { sort: o.sort, name: o.name }
        }
        return buildGlobalObjNumbering(allDocContents, objMap)
    }, [allDocContents, objects])

    // 5.5: 同步编号到 dataStore
    useEffect(() => {
        setNodeNumbering(nodeNumbering)
    }, [nodeNumbering, setNodeNumbering])

    // 5.4: 当前活跃文件的内容（用于 TOC 提取）
    const activeContent = activeFile ? contentCacheRef.current.get(activeFile) || '' : ''
    const headings = useMemo(() => extractHeadings(activeContent), [activeContent])

    // 5.4: IntersectionObserver 追踪当前可见标题
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
    }, [headings, activeContent])

    // 5.6: 刷新后恢复滚动位置
    useEffect(() => {
        if (pendingScrollRef.current != null && scrollRef.current && !loading) {
            const target = pendingScrollRef.current
            pendingScrollRef.current = null
            setTimeout(() => {
                if (scrollRef.current) scrollRef.current.scrollTop = target
            }, 100)
        }
    }, [activeContent, loading])

    // 5.6: 刷新处理
    const handleRefresh = useCallback(() => {
        pendingScrollRef.current = scrollRef.current?.scrollTop ?? 0
        contentCacheRef.current.clear()
        if (files.length > 0) {
            setLoading(true)
            Promise.all(
                files.map(f =>
                    fetch(`${API_BASE}/api/docs/read?path=${encodeURIComponent(f.path)}`)
                        .then(r => r.json())
                        .then(data => {
                            const text = data.content || ''
                            contentCacheRef.current.set(f.path, text)
                            return { filename: f.name, content: text }
                        })
                        .catch(() => {
                            contentCacheRef.current.set(f.path, '')
                            return { filename: f.name, content: '' }
                        })
                )
            ).then((docs) => {
                setAllDocContents(docs)
                setLoading(false)
            })
        }
    }, [files])

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center text-white/30 text-sm">
                Loading documents...
            </div>
        )
    }

    return (
        <div className="h-full flex flex-col">
            {/* 5.6: Toolbar — 刷新 + 字号 */}
            <div className="flex justify-between px-3 py-1 shrink-0 border-b border-white/5">
                <button
                    onClick={handleRefresh}
                    className="px-2 py-1 text-[10px] text-white/40 hover:text-white/70 transition-colors"
                    title="Refresh documents and knowledge"
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

            {/* Content area */}
            <div className="flex-1 min-h-0 flex">
                {/* 5.2: 左侧栏 — 文档导航 */}
                {files.length > 1 && (
                    <div className="w-48 shrink-0 overflow-y-auto border-r border-white/5 bg-black/30">
                        <div className="p-2 space-y-0.5">
                            {files.map(f => (
                                <button
                                    key={f.path}
                                    onClick={() => setActiveFile(f.path)}
                                    className={`w-full text-left px-2 py-1.5 rounded text-xs truncate transition-colors ${
                                        activeFile === f.path
                                            ? 'bg-white/10 text-white'
                                            : 'text-white/50 hover:text-white/70 hover:bg-white/5'
                                    }`}
                                    title={f.title}
                                >
                                    {f.title}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* 5.3: MDX 渲染区域 */}
                <div ref={scrollRef} className="flex-1 min-w-0 overflow-y-auto">
                    <article
                        className="blueprint-content max-w-4xl mx-auto px-8 py-10 text-white/80"
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
                        {files.map(f => {
                            const cached = contentCacheRef.current.get(f.path)
                            const isActive = f.path === activeFile
                            const wasVisited = visitedFilesRef.current.has(f.path)
                            if (isActive && cached != null) visitedFilesRef.current.add(f.path)
                            if (!wasVisited && !isActive) return null
                            if (cached == null) return null
                            return (
                                <div key={f.path} style={{ display: isActive ? 'block' : 'none' }}>
                                    <RenderedContent source={cached} />
                                </div>
                            )
                        })}
                    </article>
                </div>

                {/* 5.4: 右侧 TOC */}
                {headings.length > 1 && (
                    <PageToc
                        headings={headings}
                        activeTocId={activeTocId}
                        pageTocOpen={pageTocOpen}
                        onToggle={() => setPageTocOpen(o => !o)}
                        scrollContainer={scrollRef}
                    />
                )}
            </div>
        </div>
    )
})
