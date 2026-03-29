'use client'

import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'

function extractText(node: any): string {
    if (typeof node === 'string') return node
    if (Array.isArray(node)) return node.map(extractText).join('')
    if (node?.props?.children) return extractText(node.props.children)
    return ''
}

/** Re-render children through KaTeX for math inside HTML tags. */
export function InlineMath({ children }: { children: any }) {
    const text = extractText(children)
    return (
        <ReactMarkdown
            remarkPlugins={[remarkMath]}
            rehypePlugins={[rehypeKatex]}
            components={{ p: ({ children }: any) => <>{children}</> }}
        >
            {text}
        </ReactMarkdown>
    )
}
