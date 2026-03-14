import { ArrowLongRightIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { groupEdgesByRelation } from '../edgeGroupUtils'
import { MORPHISM_DEFAULT } from '../../../../assets/morphismSortConfig'

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
                    const nodeKind = node ? ('sort' in node ? (node as any).sort : ('type' in node ? node.type : undefined)) : undefined
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
                            {/* Knowledge edge indicator */}
                            {isKnowledgeEdge && (
                                <span
                                    className="text-[9px] flex-shrink-0 px-1 rounded"
                                    style={{ color: MORPHISM_DEFAULT.color }}
                                >
                                    &#8594;
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

                // Group edges by relation
                const allIncoming = [...customIncoming.map(e => ({ ...e, _custom: true })), ...provenIncoming.map(e => ({ ...e, _custom: false }))]
                const allOutgoing = [...customOutgoing.map(e => ({ ...e, _custom: true })), ...provenOutgoing.map(e => ({ ...e, _custom: false }))]

                const inGroups = groupEdgesByRelation(allIncoming, 'in')
                const outGroups = groupEdgesByRelation(allOutgoing, 'out')

                return (
                    <div className="space-y-2">
                        {/* Incoming edges grouped by relation */}
                        <div>
                            <div className="text-[10px] text-cyan-400/70 mb-1 flex items-center gap-1">
                                <ArrowLongRightIcon className="w-3 h-3 rotate-180" />
                                <span>Incoming ({totalIncoming})</span>
                            </div>
                            {totalIncoming === 0 ? (
                                <span className="text-[10px] text-white/30 pl-1">None</span>
                            ) : (
                                <div className="space-y-1.5">
                                    {inGroups.map(group => (
                                        <div key={group.relation} className="space-y-0.5">
                                            {group.edges.map(e => renderEdgeItem(e, (e as any)._custom, 'in'))}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        {/* Outgoing edges grouped by relation */}
                        <div>
                            <div className="text-[10px] text-orange-400/70 mb-1 flex items-center gap-1">
                                <ArrowLongRightIcon className="w-3 h-3" />
                                <span>Outgoing ({totalOutgoing})</span>
                            </div>
                            {totalOutgoing === 0 ? (
                                <span className="text-[10px] text-white/30 pl-1">None</span>
                            ) : (
                                <div className="space-y-1.5">
                                    {outGroups.map(group => (
                                        <div key={group.relation} className="space-y-0.5">
                                            {group.edges.map(e => renderEdgeItem(e, (e as any)._custom, 'out'))}
                                        </div>
                                    ))}
                                </div>
                            )}
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
    edgeId, strict, sourceName, targetName,
}: {
    edgeId: string; strict: boolean
    sourceName: string; targetName: string; projectPath: string
}) {
    const knowledgeEdges = useCanvasStore(s => s.knowledgeEdges)
    const edge = knowledgeEdges.find(e => e.id === edgeId)

    return (
        <div className="border-t border-white/10 pt-3 mt-3 space-y-3">
            <div className="text-sm text-white/50 font-mono truncate">
                {sourceName} → {targetName}
            </div>
            <div className="space-y-2.5 text-sm">
                <div>
                    <span className="text-white/40 text-xs uppercase tracking-wider">Strength</span>
                    <div className="text-white/70 mt-1">{strict ? 'Strict' : 'Loose'}</div>
                </div>
                {edge?.label && (
                    <div>
                        <span className="text-white/40 text-xs uppercase tracking-wider">Label</span>
                        <div className="text-white/70 mt-1">{edge.label}</div>
                    </div>
                )}
                {edge?.notes && (
                    <div>
                        <span className="text-white/40 text-xs uppercase tracking-wider">Notes</span>
                        <div className="text-white/60 mt-1">{edge.notes}</div>
                    </div>
                )}
                <div>
                    <span className="text-white/40 text-xs uppercase tracking-wider">ID</span>
                    <div className="text-white/30 font-mono text-xs mt-1">{edgeId}</div>
                </div>
            </div>
        </div>
    )
}
