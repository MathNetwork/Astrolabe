'use client'

import { useCanvasStore } from '@/lib/canvasStore'
import { getNodeKindVisual } from '../../../assets/nodeKindConfig'
import MarkdownRenderer from '@/components/MarkdownRenderer'

export function KnowledgeNodeEditor({ nodeId }: {
    nodeId: string
    projectPath: string
}) {
    const knowledgeNodes = useCanvasStore(s => s.knowledgeNodes)
    const node = knowledgeNodes.find(n => n.id === nodeId)

    if (!node) return null

    const { color } = getNodeKindVisual(node.kind)
    const kindLabel = (node.kind || '').replace('_', ' ')
    const kindDisplay = kindLabel.charAt(0).toUpperCase() + kindLabel.slice(1)

    return (
        <div className="flex flex-col gap-3 text-white/80">
            {/* Kind & Status */}
            <div className="flex items-center gap-2 text-xs">
                <span className="font-semibold capitalize" style={{ color }}>{kindDisplay}</span>
                <span className="text-white/30">·</span>
                <span className="text-white/50 capitalize">{node.status}</span>
            </div>

            {node.statement && (
                <div>
                    <div className="text-xs font-semibold tracking-wider text-white/40 uppercase mb-1">Statement</div>
                    <MarkdownRenderer content={node.statement} className="text-base leading-relaxed" />
                </div>
            )}

            {node.proof && (
                <div>
                    <div className="text-xs font-semibold tracking-wider text-white/40 uppercase mb-1">Proof</div>
                    <MarkdownRenderer content={node.proof} className="text-base leading-relaxed" />
                </div>
            )}

            {node.intuition && (
                <div>
                    <div className="text-xs font-semibold tracking-wider text-white/40 uppercase mb-1">Intuition</div>
                    <MarkdownRenderer content={node.intuition} className="text-base leading-relaxed" />
                </div>
            )}

            {node.notes && (
                <div>
                    <div className="text-xs font-semibold tracking-wider text-white/40 uppercase mb-1">Notes</div>
                    <MarkdownRenderer content={node.notes} className="text-base leading-relaxed" />
                </div>
            )}
        </div>
    )
}
