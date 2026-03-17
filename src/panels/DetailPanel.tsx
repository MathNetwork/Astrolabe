'use client'

import { memo, useRef, useEffect, useCallback } from 'react'
import { useSelectionStore } from '@/stores/selectionStore'
import { useDataStore } from '@/stores/dataStore'
import { getNodeKindVisual } from '../../assets/nodeKindConfig'
import MarkdownRenderer from '@/components/MarkdownRenderer'

/**
 * DetailPanel — 显示选中节点的详情
 *
 * 订阅: selectionStore.selectedNodeId + dataStore.objects
 * 零 props，完全自治。
 */
export const DetailPanel = memo(function DetailPanel() {
    const selectedNodeId = useSelectionStore(s => s.selectedNodeId)
    const objects = useDataStore(s => s.objects)
    const getNodeLabel = useDataStore(s => s.getNodeLabel)

    const node = selectedNodeId ? objects.find(o => o.id === selectedNodeId) : null

    if (!node) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="text-center text-white/20">
                    <div className="text-4xl mb-3">◇</div>
                    <div className="text-xs">Select a node to view details</div>
                    <div className="text-xs text-white/10 mt-1">Click on any node in the graph</div>
                </div>
            </div>
        )
    }

    const { color } = getNodeKindVisual(node.sort)
    const label = getNodeLabel(node.id)
    const sortDisplay = node.sort ? node.sort.charAt(0).toUpperCase() + node.sort.slice(1) : ''
    const displayTitle = label || sortDisplay

    return (
        <div className="h-full overflow-y-auto">
            <NodeCard
                node={node}
                color={color}
                displayTitle={displayTitle}
                isSelected
            />
        </div>
    )
})

/**
 * NodeCard — 单个节点卡片
 */
const NodeCard = memo(function NodeCard({
    node,
    color,
    displayTitle,
    isSelected,
}: {
    node: { id: string; name: string; sort: string; statement?: string; proof?: string; intuition?: string; notes?: string }
    color: string
    displayTitle: string
    isSelected: boolean
}) {
    return (
        <div
            style={{ borderLeft: `3px solid ${color}`, background: `${color}11` }}
            className={`m-2 rounded-r-md px-4 py-3 ${isSelected ? 'ring-1 ring-white/20' : ''}`}
        >
            {/* Header */}
            <div className="mb-2">
                <div className="flex items-center gap-2">
                    <span style={{ color }} className="text-xs font-semibold uppercase tracking-wider">
                        {displayTitle}
                    </span>
                </div>
                {node.name && (
                    <div className="text-sm font-medium text-white/90 mt-1">{node.name}</div>
                )}
                <div className="text-[10px] text-white/30 mt-0.5 font-mono">{node.id}</div>
            </div>

            {/* Statement */}
            {node.statement && (
                <div className="mt-3">
                    <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Statement</div>
                    <MarkdownRenderer
                        content={node.statement}
                        className="text-sm text-white/70 leading-relaxed"
                    />
                </div>
            )}

            {/* Proof (collapsible) */}
            {node.proof && (
                <ProofSection proof={node.proof} color={color} />
            )}

            {/* Intuition */}
            {node.intuition && (
                <div className="mt-3">
                    <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Intuition</div>
                    <MarkdownRenderer
                        content={node.intuition}
                        className="text-sm text-white/60 leading-relaxed italic"
                    />
                </div>
            )}

            {/* Notes */}
            {node.notes && (
                <div className="mt-3">
                    <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Notes</div>
                    <div className="text-xs text-white/40">{node.notes}</div>
                </div>
            )}
        </div>
    )
})

/**
 * ProofSection — 可折叠的证明区域
 */
import { useState } from 'react'

function ProofSection({ proof, color }: { proof: string; color: string }) {
    const [open, setOpen] = useState(false)
    return (
        <div style={{ borderTop: `1px solid ${color}33` }} className="mt-3 pt-2">
            <div
                style={{ color: `${color}cc` }}
                className="cursor-pointer text-[10px] font-semibold uppercase tracking-wider select-none"
                onClick={() => setOpen(o => !o)}
            >
                {open ? 'Proof ▾' : 'Proof ▸'}
            </div>
            {open && (
                <div className="mt-2">
                    <MarkdownRenderer
                        content={proof}
                        className="text-sm text-white/60 leading-relaxed"
                    />
                </div>
            )}
        </div>
    )
}

export default DetailPanel
