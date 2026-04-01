'use client'

import { memo, useEffect, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import rehypeRaw from 'rehype-raw'
import 'katex/dist/katex.min.css'
import { getSortStyle } from '@/lib/sortColors'
import { preprocess } from './mdx/preprocess'
import { buildNumberMap, sectionFromFilename } from './mdx/numbering'
import { useViewStore } from '@/stores/viewStore'
import { InlineMath } from './mdx/InlineMath'
import { EntryBlock } from './mdx/EntryBlock'
import { EntryLink } from './mdx/EntryLink'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const components: Record<string, any> = {
    h1: ({ children }: any) => <h1 className="text-lg font-bold text-white/90 mb-2 mt-3 first:mt-0">{children}</h1>,
    h2: ({ children }: any) => <h2 className="text-base font-semibold text-white/85 mb-2 mt-3">{children}</h2>,
    h3: ({ children }: any) => <h3 className="text-sm font-semibold text-white/80 mb-1.5 mt-2">{children}</h3>,
    p: ({ children }: any) => <p className="text-inherit text-white/70 mb-2 leading-relaxed">{children}</p>,
    ul: ({ children }: any) => <ul className="list-disc list-inside text-inherit text-white/70 mb-2 space-y-0.5">{children}</ul>,
    ol: ({ children }: any) => <ol className="list-decimal list-inside text-inherit text-white/70 mb-2 space-y-0.5">{children}</ol>,
    li: ({ children }: any) => <li className="text-white/70">{children}</li>,
    code: ({ className, children, ...props }: any) => {
        if (!className) return <code className="bg-white/10 text-cyan-400 px-1 py-0.5 rounded text-[11px] font-mono" {...props}>{children}</code>
        return <code className={`block bg-black/40 text-green-400 p-2 rounded text-[11px] font-mono overflow-x-auto ${className}`} {...props}>{children}</code>
    },
    pre: ({ children }: any) => <pre className="bg-black/40 rounded p-2 mb-2 overflow-x-auto">{children}</pre>,
    blockquote: ({ children }: any) => <blockquote className="border-l-2 border-white/30 pl-3 text-white/60 italic mb-2">{children}</blockquote>,
    a: ({ href, children }: any) => <a href={href} className="text-cyan-400 hover:text-cyan-300 underline" target="_blank" rel="noopener noreferrer">{children}</a>,
    table: ({ children }: any) => <div className="overflow-x-auto mb-2"><table className="text-xs border-collapse">{children}</table></div>,
    th: ({ children }: any) => <th className="border border-white/20 bg-white/5 px-2 py-1 text-left text-white/80">{children}</th>,
    td: ({ children }: any) => <td className="border border-white/20 px-2 py-1 text-white/70">{children}</td>,
    hr: () => <hr className="border-white/20 my-3" />,
    strong: ({ children }: any) => <strong className="font-semibold text-white/90">{children}</strong>,
    em: ({ children }: any) => <em className="italic text-white/80">{children}</em>,
    input: ({ checked, ...props }: any) => <input type="checkbox" checked={checked} readOnly className="mr-1.5 accent-cyan-500" {...props} />,

    // Entry components
    div: ({ node, children, ...props }: any) => {
        const entryId = node?.properties?.dataEntry
        if (entryId) {
            const collapsible = node?.properties?.dataCollapsible
            const number = node?.properties?.dataNumber
            return <EntryBlock id={entryId} collapsible={collapsible} number={number}>{children}</EntryBlock>
        }
        return <div {...props}>{children}</div>
    },
    span: ({ node, children, ...props }: any) => {
        const entryId = node?.properties?.dataEntry
        if (entryId) {
            const number = node?.properties?.dataNumber
            const auto = node?.properties?.dataAuto === 'true'
            return <EntryLink id={entryId} number={number} auto={auto}>{children}</EntryLink>
        }
        return <span {...props}>{children}</span>
    },

    // Fallback theorem environments
    definition: ({ number, title, children }: any) => { const s = getSortStyle('definition'); return <div className="my-3 pl-3" style={s.borderStyle}><div className="text-xs font-semibold mb-1" style={s.textStyle}>Definition{number ? ` ${number}` : ''}{title ? ` (${title})` : ''}</div><div className="text-white/70"><InlineMath>{children}</InlineMath></div></div> },
    theorem: ({ number, title, children }: any) => { const s = getSortStyle('theorem'); return <div className="my-3 pl-3" style={s.borderStyle}><div className="text-xs font-semibold mb-1" style={s.textStyle}>Theorem{number ? ` ${number}` : ''}{title ? ` (${title})` : ''}</div><div className="text-white/70"><InlineMath>{children}</InlineMath></div></div> },
    lemma: ({ number, title, children }: any) => { const s = getSortStyle('lemma'); return <div className="my-3 pl-3" style={s.borderStyle}><div className="text-xs font-semibold mb-1" style={s.textStyle}>Lemma{number ? ` ${number}` : ''}{title ? ` (${title})` : ''}</div><div className="text-white/70"><InlineMath>{children}</InlineMath></div></div> },
    proposition: ({ number, title, children }: any) => { const s = getSortStyle('proposition'); return <div className="my-3 pl-3" style={s.borderStyle}><div className="text-xs font-semibold mb-1" style={s.textStyle}>Proposition{number ? ` ${number}` : ''}{title ? ` (${title})` : ''}</div><div className="text-white/70"><InlineMath>{children}</InlineMath></div></div> },
    corollary: ({ number, title, children }: any) => { const s = getSortStyle('corollary'); return <div className="my-3 pl-3" style={s.borderStyle}><div className="text-xs font-semibold mb-1" style={s.textStyle}>Corollary{number ? ` ${number}` : ''}{title ? ` (${title})` : ''}</div><div className="text-white/70"><InlineMath>{children}</InlineMath></div></div> },
    proof: ({ children }: any) => { const s = getSortStyle('proof'); return <div className="my-2 pl-3" style={s.borderStyle}><div className="text-xs italic mb-1" style={s.textStyle}>Proof.</div><div className="text-white/60 text-sm"><InlineMath>{children}</InlineMath></div><div className="text-right text-white/30 text-xs">∎</div></div> },
}

const remarkPlugins = [remarkGfm, remarkMath]
const rehypePlugins = [rehypeKatex, rehypeRaw]

interface Props {
    content: string
    className?: string
    /** Filename for section number extraction (e.g. "02-connectivity.mdx" → section 2) */
    filename?: string
    /** Entry data for proof exclusion from numbering */
    entries?: Record<string, { record: string }>
}

export default memo(function MarkdownRenderer({ content, className, filename, entries }: Props) {
    const section = filename ? sectionFromFilename(filename) : 0
    const numberMap = useMemo(() => buildNumberMap(content, section, entries), [content, section, entries])
    const setNumberMap = useViewStore(s => s.setNumberMap)

    useEffect(() => { setNumberMap(numberMap) }, [numberMap, setNumberMap])

    return (
        <div className={className}>
            <ReactMarkdown
                remarkPlugins={remarkPlugins}
                rehypePlugins={rehypePlugins}
                components={components}
            >
                {preprocess(content, numberMap)}
            </ReactMarkdown>
        </div>
    )
})
