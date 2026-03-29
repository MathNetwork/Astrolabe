'use client'

import { memo, useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import rehypeRaw from 'rehype-raw'
import 'katex/dist/katex.min.css'
import { API_BASE } from '@/lib/apiBase'
import { useSelectObjStore } from '@/stores/selectObjStore'
import { getSortStyle, getSortFill, parseSortFromRecord } from '@/lib/sortColors'

// ── Sort → label mapping ──

const SORT_LABELS: Record<string, string> = {
    definition: 'Definition', theorem: 'Theorem', lemma: 'Lemma',
    proposition: 'Proposition', corollary: 'Corollary', proof: 'Proof',
    citation: 'Citation',
    'lean-definition': 'Lean Definition', 'lean-theorem': 'Lean Theorem',
    'lean-lemma': 'Lean Lemma', 'lean-instance': 'Lean Instance',
    'lean-proof': 'Lean Proof',
}

// ── EntryBlock: fetches an astrolabe entry and renders it inline ──

// ── EntryBlock: renders an astrolabe entry inline ──
// collapsible="true" → content hidden by default, click to expand
// collapsible not set → always visible

function EntryBlock({ id, collapsible, children: nested }: { id?: string; collapsible?: string; children?: any }) {
    const [entry, setEntry] = useState<{ sort: string; title?: string; notes?: string; content?: string; state?: string } | null>(null)
    const [open, setOpen] = useState(false)
    const selectObj = useSelectObjStore(s => s.select)
    const isCollapsible = collapsible === 'true' || collapsible === ''

    const projectPath = typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('path') || ''
        : ''

    useEffect(() => {
        if (!id || !projectPath) return
        fetch(`${API_BASE}/api/astrolabe/entries/${id}?path=${encodeURIComponent(projectPath)}`)
            .then(r => r.ok ? r.json() : null)
            .then(data => {
                if (!data?.record) return
                try { setEntry(JSON.parse(data.record)) } catch { setEntry({ sort: 'note', notes: data.record }) }
            })
            .catch(() => {})
    }, [id, projectPath])

    if (!entry) {
        return <div className="my-2 text-xs text-white/20 font-mono">entry: {id || '?'}</div>
    }

    const style = getSortStyle(entry.sort)
    const label = SORT_LABELS[entry.sort] || entry.sort
    const displayText = entry.notes || entry.content || ''
    const isLean = entry.sort?.startsWith('lean-')
    const showBody = !isCollapsible || open

    return (
        <div className="my-3 pl-3 rounded-r" style={style.borderStyle}>
            <div className="text-xs font-semibold mb-1 flex items-center gap-1" style={style.textStyle}>
                {isCollapsible && (
                    <button
                        onClick={(e) => { e.stopPropagation(); setOpen(!open) }}
                        className="text-white/30 hover:text-white/60 w-3"
                    >
                        {open ? '▾' : '▸'}
                    </button>
                )}
                <span
                    className="cursor-pointer hover:opacity-80"
                    onClick={(e) => { e.stopPropagation(); id && selectObj(id) }}
                    title={`Click to select entry ${id}`}
                >
                    {label}{entry.title ? ` (${entry.title})` : ''}
                    {entry.state === 'sorry' && <span className="ml-1 text-red-400/70">sorry</span>}
                    <span className="ml-2 font-mono text-white/15 font-normal">{id}</span>
                </span>
            </div>
            {showBody && (
                <>
                    <div className="text-white/70">
                        {isLean ? (
                            <pre className="text-[11px] font-mono text-white/50 whitespace-pre-wrap overflow-x-auto">{displayText}</pre>
                        ) : (
                            <InlineMath>{displayText}</InlineMath>
                        )}
                    </div>
                    {nested}
                </>
            )}
        </div>
    )
}

// ── EntryLink: inline clickable reference to an entry ──

function EntryLink({ id, children }: { id: string; children?: any }) {
    const [color, setColor] = useState<string>('#888')
    const selectObj = useSelectObjStore(s => s.select)

    const projectPath = typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('path') || ''
        : ''

    useEffect(() => {
        if (!id || !projectPath) return
        fetch(`${API_BASE}/api/astrolabe/entries/${id}?path=${encodeURIComponent(projectPath)}`)
            .then(r => r.ok ? r.json() : null)
            .then(data => {
                if (!data?.record) return
                const sort = parseSortFromRecord(data.record)
                setColor(getSortFill(sort))
            })
            .catch(() => {})
    }, [id, projectPath])

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const components: Record<string, any> = {
    h1: ({ children }: any) => (
        <h1 className="text-lg font-bold text-white/90 mb-2 mt-3 first:mt-0">{children}</h1>
    ),
    h2: ({ children }: any) => (
        <h2 className="text-base font-semibold text-white/85 mb-2 mt-3">{children}</h2>
    ),
    h3: ({ children }: any) => (
        <h3 className="text-sm font-semibold text-white/80 mb-1.5 mt-2">{children}</h3>
    ),
    p: ({ children }: any) => (
        <p className="text-inherit text-white/70 mb-2 leading-relaxed">{children}</p>
    ),
    ul: ({ children }: any) => (
        <ul className="list-disc list-inside text-inherit text-white/70 mb-2 space-y-0.5">{children}</ul>
    ),
    ol: ({ children }: any) => (
        <ol className="list-decimal list-inside text-inherit text-white/70 mb-2 space-y-0.5">{children}</ol>
    ),
    li: ({ children }: any) => (
        <li className="text-white/70">{children}</li>
    ),
    code: ({ className, children, ...props }: any) => {
        const isInline = !className
        if (isInline) {
            return (
                <code className="bg-white/10 text-cyan-400 px-1 py-0.5 rounded text-[11px] font-mono" {...props}>
                    {children}
                </code>
            )
        }
        return (
            <code className={`block bg-black/40 text-green-400 p-2 rounded text-[11px] font-mono overflow-x-auto ${className}`} {...props}>
                {children}
            </code>
        )
    },
    pre: ({ children }: any) => (
        <pre className="bg-black/40 rounded p-2 mb-2 overflow-x-auto">{children}</pre>
    ),
    blockquote: ({ children }: any) => (
        <blockquote className="border-l-2 border-white/30 pl-3 text-white/60 italic mb-2">{children}</blockquote>
    ),
    a: ({ href, children }: any) => (
        <a href={href} className="text-cyan-400 hover:text-cyan-300 underline" target="_blank" rel="noopener noreferrer">
            {children}
        </a>
    ),
    table: ({ children }: any) => (
        <div className="overflow-x-auto mb-2">
            <table className="text-xs border-collapse">{children}</table>
        </div>
    ),
    th: ({ children }: any) => (
        <th className="border border-white/20 bg-white/5 px-2 py-1 text-left text-white/80">{children}</th>
    ),
    td: ({ children }: any) => (
        <td className="border border-white/20 px-2 py-1 text-white/70">{children}</td>
    ),
    hr: () => <hr className="border-white/20 my-3" />,
    strong: ({ children }: any) => (
        <strong className="font-semibold text-white/90">{children}</strong>
    ),
    em: ({ children }: any) => (
        <em className="italic text-white/80">{children}</em>
    ),
    input: ({ checked, ...props }: any) => (
        <input type="checkbox" checked={checked} readOnly className="mr-1.5 accent-cyan-500" {...props} />
    ),
    // ── div: data-entry → EntryBlock ──
    div: ({ node, children, ...props }: any) => {
        const entryId = node?.properties?.dataEntry
        if (entryId) {
            const collapsible = node?.properties?.dataCollapsible
            return <EntryBlock id={entryId} collapsible={collapsible}>{children}</EntryBlock>
        }
        return <div {...props}>{children}</div>
    },
    // ── span: data-entry → EntryLink (inline clickable link to entry) ──
    span: ({ node, children, ...props }: any) => {
        const entryId = node?.properties?.dataEntry
        if (entryId) return <EntryLink id={entryId}>{children}</EntryLink>
        return <span {...props}>{children}</span>
    },
    // ── Fallback theorem-like environments (for raw MDX tags, prefer data-entry) ──
    definition: ({ number, title, children }: any) => { const s = getSortStyle('definition'); return <div className="my-3 pl-3" style={s.borderStyle}><div className="text-xs font-semibold mb-1" style={s.textStyle}>Definition{number ? ` ${number}` : ''}{title ? ` (${title})` : ''}</div><div className="text-white/70"><InlineMath>{children}</InlineMath></div></div> },
    theorem: ({ number, title, children }: any) => { const s = getSortStyle('theorem'); return <div className="my-3 pl-3" style={s.borderStyle}><div className="text-xs font-semibold mb-1" style={s.textStyle}>Theorem{number ? ` ${number}` : ''}{title ? ` (${title})` : ''}</div><div className="text-white/70"><InlineMath>{children}</InlineMath></div></div> },
    lemma: ({ number, title, children }: any) => { const s = getSortStyle('lemma'); return <div className="my-3 pl-3" style={s.borderStyle}><div className="text-xs font-semibold mb-1" style={s.textStyle}>Lemma{number ? ` ${number}` : ''}{title ? ` (${title})` : ''}</div><div className="text-white/70"><InlineMath>{children}</InlineMath></div></div> },
    proposition: ({ number, title, children }: any) => { const s = getSortStyle('proposition'); return <div className="my-3 pl-3" style={s.borderStyle}><div className="text-xs font-semibold mb-1" style={s.textStyle}>Proposition{number ? ` ${number}` : ''}{title ? ` (${title})` : ''}</div><div className="text-white/70"><InlineMath>{children}</InlineMath></div></div> },
    corollary: ({ number, title, children }: any) => { const s = getSortStyle('corollary'); return <div className="my-3 pl-3" style={s.borderStyle}><div className="text-xs font-semibold mb-1" style={s.textStyle}>Corollary{number ? ` ${number}` : ''}{title ? ` (${title})` : ''}</div><div className="text-white/70"><InlineMath>{children}</InlineMath></div></div> },
    proof: ({ children }: any) => { const s = getSortStyle('proof'); return <div className="my-2 pl-3" style={s.borderStyle}><div className="text-xs italic mb-1" style={s.textStyle}>Proof.</div><div className="text-white/60 text-sm"><InlineMath>{children}</InlineMath></div><div className="text-right text-white/30 text-xs">∎</div></div> },
}

const remarkPlugins = [remarkGfm, remarkMath]
const rehypePlugins = [rehypeKatex, rehypeRaw]

// Extract text from React children tree (for re-rendering math inside HTML tags)
function extractText(node: any): string {
    if (typeof node === 'string') return node
    if (Array.isArray(node)) return node.map(extractText).join('')
    if (node?.props?.children) return extractText(node.props.children)
    return ''
}

// Inline math renderer — used inside custom HTML tags where remark-math doesn't reach
function InlineMath({ children }: { children: any }) {
    const text = extractText(children)
    return (
        <ReactMarkdown remarkPlugins={remarkPlugins} rehypePlugins={[rehypeKatex]}
            components={{ p: ({ children }) => <>{children}</> } as any}
        >{text}</ReactMarkdown>
    )
}

interface Props {
    content: string
    className?: string
}

export default memo(function MarkdownRenderer({ content, className }: Props) {
    return (
        <div className={className}>
            <ReactMarkdown
                remarkPlugins={remarkPlugins}
                rehypePlugins={rehypePlugins}
                components={components as any}
            >
                {content}
            </ReactMarkdown>
        </div>
    )
})
