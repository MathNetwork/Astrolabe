'use client'

import { memo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import rehypeRaw from 'rehype-raw'
import 'katex/dist/katex.min.css'

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
    // ── Theorem-like environments ──
    definition: ({ number, title, children }: any) => (
        <div className="my-3 border-l-2 border-blue-400/50 pl-3">
            <div className="text-xs font-semibold text-blue-400/80 mb-1">Definition{number ? ` ${number}` : ''}{title ? ` (${title})` : ''}</div>
            <div className="text-white/70">{children}</div>
        </div>
    ),
    theorem: ({ number, title, children }: any) => (
        <div className="my-3 border-l-2 border-amber-400/50 pl-3">
            <div className="text-xs font-semibold text-amber-400/80 mb-1">Theorem{number ? ` ${number}` : ''}{title ? ` (${title})` : ''}</div>
            <div className="text-white/70">{children}</div>
        </div>
    ),
    lemma: ({ number, title, children }: any) => (
        <div className="my-3 border-l-2 border-green-400/50 pl-3">
            <div className="text-xs font-semibold text-green-400/80 mb-1">Lemma{number ? ` ${number}` : ''}{title ? ` (${title})` : ''}</div>
            <div className="text-white/70">{children}</div>
        </div>
    ),
    proposition: ({ number, title, children }: any) => (
        <div className="my-3 border-l-2 border-purple-400/50 pl-3">
            <div className="text-xs font-semibold text-purple-400/80 mb-1">Proposition{number ? ` ${number}` : ''}{title ? ` (${title})` : ''}</div>
            <div className="text-white/70">{children}</div>
        </div>
    ),
    corollary: ({ number, title, children }: any) => (
        <div className="my-3 border-l-2 border-cyan-400/50 pl-3">
            <div className="text-xs font-semibold text-cyan-400/80 mb-1">Corollary{number ? ` ${number}` : ''}{title ? ` (${title})` : ''}</div>
            <div className="text-white/70">{children}</div>
        </div>
    ),
    proof: ({ children }: any) => (
        <div className="my-2 pl-3 border-l border-white/10">
            <div className="text-xs italic text-white/40 mb-1">Proof.</div>
            <div className="text-white/60 text-sm">{children}</div>
            <div className="text-right text-white/30 text-xs">∎</div>
        </div>
    ),
}

const remarkPlugins = [remarkGfm, remarkMath]
const rehypePlugins = [rehypeKatex, rehypeRaw]

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
