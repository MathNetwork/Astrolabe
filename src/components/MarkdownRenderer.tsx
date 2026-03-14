'use client'

import { useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import rehypeRaw from 'rehype-raw'
import 'katex/dist/katex.min.css'
import { useCanvasStore } from '@/lib/canvasStore'
import { useStore } from '@/lib/store'
import { selectNodeUndoable } from '@/lib/history/selectionActions'
import { getNodeKindVisual } from '../../assets/nodeKindConfig'

function NodeRefInline({ id, children }: { id?: string; children?: React.ReactNode }) {
    const knowledgeNodes = useCanvasStore(s => s.knowledgeNodes)
    const nodeLabel = useCanvasStore(s => id ? s.getNodeLabel(id) : undefined)
    const setMainViewTab = useStore(s => s.setMainViewTab)
    const node = knowledgeNodes.find(n => n.id === id)
    const displayName = children || nodeLabel || node?.name || id || '???'
    const color = getNodeKindVisual(node?.sort).color

    const handleClick = useCallback(() => {
        if (!id) return
        selectNodeUndoable(id)
        setMainViewTab('detail')
    }, [id, setMainViewTab])

    return (
        <button
            onClick={handleClick}
            className="font-medium underline underline-offset-2 transition-colors cursor-pointer"
            style={{ color, textDecorationColor: `${color}66` }}
            onMouseEnter={e => { e.currentTarget.style.textDecorationColor = `${color}bb` }}
            onMouseLeave={e => { e.currentTarget.style.textDecorationColor = `${color}66` }}
            title={node ? `${node.sort}: ${node.name}` : id}
        >
            {displayName}
        </button>
    )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const components: Record<string, any> = {
    noderef: NodeRefInline,
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
}

const remarkPlugins = [remarkGfm, remarkMath]
const rehypePlugins = [rehypeKatex, rehypeRaw]

interface Props {
    content: string
    className?: string
}

export default function MarkdownRenderer({ content, className }: Props) {
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
}
