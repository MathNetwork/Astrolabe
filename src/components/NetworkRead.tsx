'use client'

import { memo, useEffect, useMemo, useState, type ReactNode } from 'react'
import Markdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import rehypeRaw from 'rehype-raw'
import 'katex/dist/katex.min.css'
import { readFullFile } from '@/lib/api'

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

/* ── Memoized markdown renderer ── */

const remarkPlugins = [remarkMath]
const rehypePlugins = [rehypeKatex, rehypeRaw]
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mdxComponents: Record<string, any> = {
    theorem: Theorem,
    proof: Proof,
    ref: Ref,
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

export const NetworkRead = memo(function NetworkRead({ projectPath }: { projectPath: string }) {
    const [mdxSource, setMdxSource] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!projectPath) return
        let cancelled = false
        const mdxPath = `${projectPath}/.netmath/network.mdx`

        setLoading(true)
        readFullFile(mdxPath)
            .then(file => {
                if (cancelled) return
                setMdxSource(file.content)
                setLoading(false)
            })
            .catch(() => {
                if (cancelled) return
                setError('not-found')
                setLoading(false)
            })

        return () => { cancelled = true }
    }, [projectPath])

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center text-white/40 bg-[#0a0a0f]">
                Loading...
            </div>
        )
    }

    if (error || !mdxSource) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-white/40 bg-[#0a0a0f]">
                <div className="text-lg mb-2">No documents yet</div>
                <div className="text-sm text-white/25">Add a <code className="bg-white/5 px-1 rounded">network.mdx</code> file to <code className="bg-white/5 px-1 rounded">.netmath/</code> to display here</div>
            </div>
        )
    }

    return (
        <div className="h-full overflow-y-auto bg-[#0a0a0f]">
            <article className="blueprint-content max-w-3xl mx-auto px-8 py-10 text-white/80 text-sm leading-relaxed">
                <RenderedContent source={mdxSource} />
            </article>
        </div>
    )
})
