/**
 * rehypeStatementCards — group do Carmo numbered statements into cards.
 *
 * A faithful transcription writes each statement as a heading + body:
 *
 *     ### 2.1 Definition (differentiable manifold)
 *     <paragraphs, lists, display math …>
 *
 * This plugin (run after rehype-raw, before rehype-katex) folds the `### N.M
 * Kind (name)` heading together with every sibling up to the next `##`/`###`
 * into a single `div.statement-card`, carrying the kind/number/name as data
 * attributes. The card chrome (sort-colored border + badge) is drawn by the
 * `div` component in MarkdownRenderer; the body keeps full-markdown rendering.
 */
import type { Root, Element, RootContent } from 'hast'

const KINDS = ['Definition', 'Lemma', 'Theorem', 'Proposition', 'Corollary', 'Remark', 'Example']
const KIND_RE = new RegExp(`^(\\d+\\.\\d+)\\s+(${KINDS.join('|')})(?:\\s+\\((.+)\\))?\\s*$`)

function textOf(node: any): string {
    if (!node) return ''
    if (node.type === 'text') return node.value
    if (node.children) return node.children.map(textOf).join('')
    return ''
}

export function rehypeStatementCards() {
    return (tree: Root) => {
        const kids = tree.children
        const out: RootContent[] = []
        for (let i = 0; i < kids.length; i++) {
            const n = kids[i] as Element
            if (n.type === 'element' && n.tagName === 'h3') {
                const m = textOf(n).match(KIND_RE)
                if (m) {
                    const [, num, kind, name] = m
                    const body: RootContent[] = []
                    let j = i + 1
                    for (; j < kids.length; j++) {
                        const t = kids[j] as Element
                        if (t.type === 'element' && (t.tagName === 'h2' || t.tagName === 'h3')) break
                        body.push(kids[j])
                    }
                    out.push({
                        type: 'element',
                        tagName: 'div',
                        properties: {
                            className: ['statement-card'],
                            dataStmtKind: kind.toLowerCase(),
                            dataStmtNum: num,
                            dataStmtName: name || '',
                        },
                        children: body as any,
                    })
                    i = j - 1
                    continue
                }
            }
            out.push(kids[i])
        }
        tree.children = out
    }
}
