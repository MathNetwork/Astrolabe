import { ArrowLongRightIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { useState, useCallback } from 'react'
import { updateKnowledgeEdge } from '@/lib/api'

const RELATION_TYPES = [
    { value: 'proves', label: 'Proves', color: '#22c55e' },
    { value: 'uses', label: 'Uses', color: '#3b82f6' },
    { value: 'generalizes', label: 'Generalizes', color: '#a855f7' },
    { value: 'specializes', label: 'Specializes', color: '#ec4899' },
    { value: 'motivates', label: 'Motivates', color: '#f59e0b' },
    { value: 'contradicts', label: 'Contradicts', color: '#ef4444' },
    { value: 'related', label: 'Related', color: '#6b7280' },
]

const RELATION_COLORS: Record<string, string> = Object.fromEntries(RELATION_TYPES.map(r => [r.value, r.color]))

import { graphActions } from '@/lib/history/graphActions'
import { useCanvasStore } from '@/lib/canvasStore'
import type { GraphNode, GraphLink, NetMathEdge } from '@/types/graph'
import type { CustomNode, CustomEdge } from '@/lib/canvasStore'
import type { SelectedEdge } from '@/components/inspector/types'

export interface EdgesToolProps {
    selectedNode: GraphNode
    isAddingEdge: boolean
    cancelAddingEdge: () => void
    setAddingEdgeDirection: (d: 'outgoing' | 'incoming') => void
    setIsAddingEdge: (v: boolean) => void
    setIsRemovingNodes: (v: boolean) => void
    projectPath: string
    highlightedPath: string[]
    setHighlightedPath: (v: string[]) => void
    customEdges: CustomEdge[]
    graphLinks: GraphLink[]
    graphNodes: GraphNode[]
    customNodes: CustomNode[]
    typeColors: Record<string, string>
    visibleNodes: string[]
    selectedEdge: SelectedEdge | null
    graphEdges: NetMathEdge[]
    setSelectedEdge: (e: SelectedEdge | null) => void
    setFocusEdgeId: (id: string | null) => void
    navigateToNode: (id: string) => void
    handleEdgeStyleChange: (edgeId: string, style: { effect?: string; style?: string }) => void
}

export function EdgesTool({
    selectedNode, isAddingEdge, cancelAddingEdge, setAddingEdgeDirection,
    setIsAddingEdge, setIsRemovingNodes, projectPath, highlightedPath,
    setHighlightedPath, customEdges, graphLinks, graphNodes, customNodes,
    typeColors, visibleNodes, selectedEdge, graphEdges, setSelectedEdge,
    setFocusEdgeId, navigateToNode,
    handleEdgeStyleChange,
}: EdgesToolProps) {
    const knowledgeNodeIds = new Set(useCanvasStore(s => s.knowledgeNodes).map(n => n.id))
    return (
        <div className="space-y-2">
            {/* Add Edge mode indicator */}
            {isAddingEdge && (
                <div className="p-1.5 bg-green-500/20 border border-green-500/30 rounded text-xs flex items-center justify-between">
                    <span className="text-green-400">Click node to connect</span>
                    <button onClick={cancelAddingEdge} className="text-white/50 hover:text-white">
                        <XMarkIcon className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            {/* Unified Edges List */}
            {(() => {
                // Collect all incoming edges (depends on)
                const customIncoming = customEdges.filter(e => e.target === selectedNode.id)
                const provenIncoming = graphLinks.filter(l => l.target === selectedNode.id)
                // Collect all outgoing edges (used by)
                const customOutgoing = customEdges.filter(e => e.source === selectedNode.id)
                const provenOutgoing = graphLinks.filter(l => l.source === selectedNode.id)

                const totalIncoming = customIncoming.length + provenIncoming.length
                const totalOutgoing = customOutgoing.length + provenOutgoing.length

                const renderEdgeItem = (edge: CustomEdge | GraphLink, isCustom: boolean, direction: 'in' | 'out') => {
                    const nodeId = direction === 'in' ? edge.source : edge.target
                    const node: (GraphNode | CustomNode | undefined) = graphNodes.find(n => n.id === nodeId) || customNodes.find(cn => cn.id === nodeId)
                    const nodeName = node?.name || nodeId
                    const nodeKind = node ? ('kind' in node ? node.kind : ('type' in node ? node.type : undefined)) : undefined
                    const knNode = useCanvasStore.getState().knowledgeNodes.find(n => n.id === nodeId)
                    const nodeColor = knNode?.style?.color || (nodeKind === 'custom' ? '#666' : (nodeKind ? typeColors[nodeKind] || '#888' : '#888'))
                    const isOnCanvas = node ? (visibleNodes.includes(node.id) || knowledgeNodeIds.has(node.id)) : false
                    const edgeId = isCustom ? (edge as CustomEdge).id : `${edge.source}->${edge.target}`
                    const isEdgeSelected = selectedEdge?.id === edgeId
                    // Check if this is a shortcut/virtual edge
                    const matchedGraphEdge = isCustom ? undefined : graphEdges.find(e => e.id === edgeId || e.id === `virtual-${edgeId}` || (e.source === edge.source && e.target === edge.target))
                    const skippedNodes = matchedGraphEdge?.skippedNodes
                    const isShortcut = skippedNodes && skippedNodes.length > 0
                    // Knowledge edges are any non-custom edge that isn't from Lean (fromLean=false)
                    const isKnowledgeEdge = !isCustom && matchedGraphEdge && !matchedGraphEdge.fromLean

                    return (
                        <div
                            key={edgeId}
                            onClick={() => {
                                if (isEdgeSelected) {
                                    setSelectedEdge(null)
                                    setFocusEdgeId(null)
                                } else {
                                    const resolvedEdge = matchedGraphEdge ?? (isCustom ? edge as CustomEdge : undefined)
                                    setSelectedEdge({
                                        id: matchedGraphEdge?.id ?? (isCustom ? (edge as CustomEdge).id : edgeId),
                                        source: edge.source,
                                        target: edge.target,
                                        sourceName: direction === 'in' ? nodeName : selectedNode.name,
                                        targetName: direction === 'in' ? selectedNode.name : nodeName,
                                        style: resolvedEdge?.style,
                                        effect: resolvedEdge?.effect,
                                        defaultStyle: isCustom ? 'dashed' : (matchedGraphEdge?.defaultStyle ?? 'solid'),
                                        skippedNodes,
                                    })
                                    setFocusEdgeId(matchedGraphEdge?.id ?? edgeId)
                                }
                            }}
                            className={`px-1.5 py-1.5 rounded text-xs flex items-center gap-1.5 cursor-pointer transition-colors ${
                                isEdgeSelected
                                    ? 'bg-cyan-500/30 ring-1 ring-cyan-500/50'
                                    : isShortcut
                                        ? 'bg-cyan-500/10 hover:bg-cyan-500/20 ring-1 ring-cyan-500/20'
                                        : 'bg-white/5 hover:bg-white/10'
                            }`}
                        >
                            {/* Shortcut indicator */}
                            {isShortcut && <span className="text-cyan-400 text-[9px] flex-shrink-0" title={`Shortcut: skips ${skippedNodes?.length} technical node(s)`}>&#9889;</span>}
                            {/* Custom indicator */}
                            {isCustom && !isShortcut && <span className="w-2 h-0 border-t border-dashed border-gray-400 flex-shrink-0" title="Custom edge" />}
                            {/* Relation label for knowledge edges */}
                            {isKnowledgeEdge && matchedGraphEdge?.relation && (
                                <span
                                    className="text-[9px] flex-shrink-0 px-1 rounded"
                                    style={{ color: RELATION_COLORS[matchedGraphEdge.relation] || '#6b7280' }}
                                    title={matchedGraphEdge.relation}
                                >
                                    {matchedGraphEdge.relation}
                                </span>
                            )}
                            {/* Node name */}
                            <span
                                className={`font-mono flex-1 truncate ${isOnCanvas ? '' : 'opacity-50'}`}
                                style={{ color: nodeColor }}
                            >
                                {nodeName.split('.').pop()}
                            </span>
                            {/* Goto button */}
                            {node && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); navigateToNode(nodeId) }}
                                    className="text-[9px] text-white/40 hover:text-cyan-300 transition-colors"
                                >
                                    &rarr;
                                </button>
                            )}
                            {/* Delete button for custom edges */}
                            {isCustom && (
                                <button
                                    onClick={(ev) => {
                                        ev.stopPropagation()
                                        const leanEdges = graphEdges.map(e => ({ source: e.source, target: e.target }))
                                        graphActions.deleteCustomEdge((edge as CustomEdge).id, edge.source, edge.target, leanEdges)
                                    }}
                                    className="text-red-400/40 hover:text-red-400 transition-colors"
                                >
                                    <XMarkIcon className="w-3 h-3" />
                                </button>
                            )}
                            {/* Delete button for knowledge edges */}
                            {isKnowledgeEdge && matchedGraphEdge && (
                                <button
                                    onClick={(ev) => {
                                        ev.stopPropagation()
                                        graphActions.deleteKnowledgeEdge(matchedGraphEdge.id, edge.source, edge.target)
                                    }}
                                    className="text-red-400/40 hover:text-red-400 transition-colors"
                                >
                                    <XMarkIcon className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                    )
                }

                return (
                    <div className="space-y-2">
                        {/* Depends on */}
                        <div>
                            <div className="text-[10px] text-cyan-400/70 mb-1 flex items-center gap-1">
                                <ArrowLongRightIcon className="w-3 h-3 rotate-180" />
                                <span>Depends on ({totalIncoming})</span>
                            </div>
                            <div className="space-y-0.5 max-h-32 overflow-y-auto">
                                {totalIncoming === 0 ? (
                                    <span className="text-[10px] text-white/30 pl-1">None</span>
                                ) : (
                                    <>
                                        {customIncoming.map(e => renderEdgeItem(e, true, 'in'))}
                                        {provenIncoming.map(e => renderEdgeItem(e, false, 'in'))}
                                    </>
                                )}
                            </div>
                        </div>
                        {/* Used by */}
                        <div>
                            <div className="text-[10px] text-orange-400/70 mb-1 flex items-center gap-1">
                                <ArrowLongRightIcon className="w-3 h-3" />
                                <span>Used by ({totalOutgoing})</span>
                            </div>
                            <div className="space-y-0.5 max-h-32 overflow-y-auto">
                                {totalOutgoing === 0 ? (
                                    <span className="text-[10px] text-white/30 pl-1">None</span>
                                ) : (
                                    <>
                                        {customOutgoing.map(e => renderEdgeItem(e, true, 'out'))}
                                        {provenOutgoing.map(e => renderEdgeItem(e, false, 'out'))}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )
            })()}

            {/* Inline edge editor for selected knowledge edge */}
            {selectedEdge && (() => {
                const knEdge = graphEdges.find(e =>
                    (e.id === selectedEdge.id || (e.source === selectedEdge.source && e.target === selectedEdge.target))
                    && !e.fromLean
                )
                if (!knEdge) return null
                return (
                    <KnowledgeEdgeEditor
                        edgeId={knEdge.id}
                        relation={knEdge.relation || 'related'}
                        strict={knEdge.strict ?? true}
                        sourceName={selectedEdge.sourceName}
                        targetName={selectedEdge.targetName}
                        projectPath={projectPath}
                    />
                )
            })()}

        </div>
    )
}

function KnowledgeEdgeEditor({
    edgeId, relation, strict, sourceName, targetName, projectPath,
}: {
    edgeId: string; relation: string; strict: boolean
    sourceName: string; targetName: string; projectPath: string
}) {
    const [currentRelation, setCurrentRelation] = useState(relation)
    const [currentStrict, setCurrentStrict] = useState(strict)
    const [saving, setSaving] = useState(false)

    const save = useCallback(async (updates: { relation?: string; strict?: boolean }) => {
        setSaving(true)
        try {
            const updated = await updateKnowledgeEdge(projectPath, edgeId, updates)
            // Update in canvasStore
            const store = useCanvasStore.getState()
            const newEdges = store.knowledgeEdges.map(e => e.id === edgeId ? updated : e)
            useCanvasStore.setState({ knowledgeEdges: newEdges })
        } catch (e) {
            console.error('[EdgeEditor] Save failed:', e)
        }
        setSaving(false)
    }, [projectPath, edgeId])

    return (
        <div className="border-t border-white/10 pt-2 mt-2 space-y-2">
            <div className="text-[10px] text-white/50 font-mono truncate">
                {sourceName} → {targetName}
            </div>

            {/* Relation selector */}
            <div>
                <div className="text-[9px] text-white/40 uppercase tracking-wider mb-1">Relation</div>
                <div className="grid grid-cols-2 gap-0.5">
                    {RELATION_TYPES.map(r => (
                        <button
                            key={r.value}
                            onClick={() => {
                                setCurrentRelation(r.value)
                                save({ relation: r.value })
                            }}
                            disabled={saving}
                            className={`px-1.5 py-1 text-[10px] rounded transition-colors text-left flex items-center gap-1.5 ${
                                currentRelation === r.value
                                    ? 'bg-white/15 ring-1 ring-white/20'
                                    : 'text-white/50 hover:bg-white/5 hover:text-white/70'
                            }`}
                        >
                            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: r.color }} />
                            <span style={currentRelation === r.value ? { color: r.color } : undefined}>{r.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Strict/Weak toggle */}
            <div>
                <div className="text-[9px] text-white/40 uppercase tracking-wider mb-1">Strength</div>
                <div className="flex gap-1">
                    <button
                        onClick={() => { setCurrentStrict(true); save({ strict: true }) }}
                        disabled={saving}
                        className={`flex-1 px-2 py-1 text-[10px] rounded transition-colors flex items-center justify-center gap-1.5 ${
                            currentStrict ? 'bg-white/15 text-white ring-1 ring-white/20' : 'text-white/50 hover:bg-white/5'
                        }`}
                    >
                        <span className="w-4 h-0 border-t border-white/80" />
                        Strict
                    </button>
                    <button
                        onClick={() => { setCurrentStrict(false); save({ strict: false }) }}
                        disabled={saving}
                        className={`flex-1 px-2 py-1 text-[10px] rounded transition-colors flex items-center justify-center gap-1.5 ${
                            !currentStrict ? 'bg-white/15 text-white ring-1 ring-white/20' : 'text-white/50 hover:bg-white/5'
                        }`}
                    >
                        <span className="w-4 h-0 border-t border-dashed border-white/40" />
                        Weak
                    </button>
                </div>
            </div>
        </div>
    )
}
