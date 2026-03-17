'use client'

/**
 * ReadView — MDX 阅读器
 *
 * Step 5.1: 文件加载 + 缓存
 * Step 5.2: 左侧栏文档导航
 * Step 5.3: MDX 渲染（KaTeX + nodeblock + noderef）
 *
 * 订阅: dataStore（nodeblock/noderef 用）
 * 写入: selectObjStore（点击 noderef 时）
 */
import { memo, useState, useEffect, useRef, useMemo } from 'react'
import Markdown from 'react-markdown'
import remarkMath from 'remark-math'
import remarkGfm from 'remark-gfm'
import rehypeKatex from 'rehype-katex'
import rehypeRaw from 'rehype-raw'
import 'katex/dist/katex.min.css'
import { useDataStore } from '@/stores/dataStore'
import { useSelectObjStore } from '@/stores/selectObjStore'
import { NodeRef } from '@/components/shared/NodeRef'
import { NodeBlock, parseShowFields } from '@/components/shared/NodeBlock'

const API_BASE = 'http://127.0.0.1:8765'

// ── Types ──

type DocFile = { name: string; path: string; title: string }

// ── MDX Components ──

const remarkPlugins = [remarkMath, remarkGfm]
const rehypePlugins = [rehypeKatex, rehypeRaw]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mdxComponents: Record<string, any> = {
    noderef: NodeRef,
    div: ({ className, children, ...props }: any) => {
        if (className === 'nodeblock') {
            const id = typeof children === 'string' ? children.trim() : Array.isArray(children) ? String(children[0]).trim() : ''
            const dataShow = props['data-show'] || props.dataShow
            return <NodeBlock id={id} showFields={parseShowFields(dataShow)} />
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

// ── Main Component ──

export const ReadView = memo(function ReadView() {
    const [files, setFiles] = useState<DocFile[]>([])
    const [activeFile, setActiveFile] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const contentCacheRef = useRef<Map<string, string>>(new Map())
    const visitedFilesRef = useRef<Set<string>>(new Set())
    const scrollRef = useRef<HTMLDivElement>(null)

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

    // 5.1: 预加载所有文件内容
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
            setLoading(false)
        })

        return () => { cancelled = true }
    }, [files])

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center text-white/30 text-sm">
                Loading documents...
            </div>
        )
    }

    return (
        <div className="h-full flex">
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
                    className="max-w-4xl mx-auto px-8 py-10 text-white/80"
                    onClick={(e) => {
                        // 文档内链接跳转
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
        </div>
    )
})
