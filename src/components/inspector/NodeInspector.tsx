import { type Ref, useState, useCallback, useEffect } from 'react'
import {
    CubeIcon,
    InformationCircleIcon,
} from '@heroicons/react/24/outline'
import { NodeHeader } from '@/components/inspector/NodeHeader'
import { graphActions } from '@/lib/history/graphActions'
import { NodeNotes } from '@/components/inspector/NodeNotes'
import { KnowledgeNodeEditor } from '@/components/inspector/KnowledgeNodeEditor'
import type { GraphNode, GraphLink, NetMathEdge } from '@/types/graph'
import { useCanvasStore, type CustomNode, type CustomEdge } from '@/lib/canvasStore'
import type { SelectedEdge } from '@/components/inspector/types'

export interface NodeInspectorProps {
    selectedNode: GraphNode | null
    visibleNodes: string[]
    graphNodes: GraphNode[]
    customNodes: CustomNode[]
    setSelectedNode: (node: GraphNode | null) => void
    handleToggleToolView: (tool: 'edges' | 'notes' | 'style' | 'neighbors') => void
    toolPanelView: 'edges' | 'notes' | 'style' | 'neighbors' | null
    typeColors: Record<string, string>
    handleStyleChange: (nodeId: string, style: { effect?: string; size?: number }) => void
    // NodeHeader-specific
    isEditingCustomNodeName: boolean
    customNodeNameInputRef: Ref<HTMLInputElement>
    editingCustomNodeNameValue: string
    setEditingCustomNodeNameValue: (v: string) => void
    saveCustomNodeName: () => void
    setIsEditingCustomNodeName: (v: boolean) => void
    // NodeNotes-specific
    editingNote: string
    notesExpanded: boolean
    setNotesExpanded: (v: boolean) => void
    // EdgesTool-specific
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
    selectedEdge: SelectedEdge | null
    graphEdges: NetMathEdge[]
    setSelectedEdge: (e: SelectedEdge | null) => void
    setFocusEdgeId: (id: string | null) => void
    navigateToNode: (id: string) => void
    handleEdgeStyleChange: (edgeId: string, style: { effect?: string; style?: string }) => void
    isRemovingNodes: boolean
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    proven: { label: 'Proven', color: '#2ecc71' },
    sorry: { label: 'Sorry', color: '#e67e22' },
    error: { label: 'Error', color: '#e74c3c' },
    stated: { label: 'Stated', color: '#95a5a6' },
    unknown: { label: 'Unknown', color: '#95a5a6' },
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex items-start gap-2 py-1">
            <span className="text-[10px] text-white/30 uppercase tracking-wider w-14 shrink-0 pt-0.5">{label}</span>
            <span className="text-xs text-white/70 break-all min-w-0">{children}</span>
        </div>
    )
}

function NodeInfo({ selectedNode, graphLinks, customEdges, graphEdges }: {
    selectedNode: GraphNode
    graphLinks: GraphLink[]
    customEdges: CustomEdge[]
    graphEdges: NetMathEdge[]
}) {
    const allEdges = [...graphEdges, ...customEdges.map(e => ({ source: e.source, target: e.target }))]
    const depsCount = allEdges.filter(e => e.source === selectedNode.id).length
    const usedByCount = allEdges.filter(e => e.target === selectedNode.id).length
    const status = STATUS_LABELS[selectedNode.status] || STATUS_LABELS.unknown

    return (
        <div className="space-y-0">
            <InfoRow label="Kind">
                <span className="capitalize">{selectedNode.type}</span>
                <span className="mx-1.5 text-white/20">·</span>
                <span style={{ color: status.color }}>{status.label}</span>
            </InfoRow>
            <InfoRow label="ID">
                <span className="font-mono text-[11px] text-white/50">{selectedNode.id}</span>
            </InfoRow>
            <InfoRow label="Stats">
                <span className="text-cyan-400/70">deps {depsCount}</span>
                <span className="mx-1.5 text-white/20">·</span>
                <span className="text-orange-400/70">used by {usedByCount}</span>
            </InfoRow>
        </div>
    )
}

function SectionHeader({ title, icon }: { title: string; icon?: React.ReactNode }) {
    return (
        <div className="px-3 py-2 text-[10px] font-semibold tracking-wider text-white/40 uppercase border-t border-white/10 flex items-center gap-1.5">
            {icon}
            {title}
        </div>
    )
}

export function NodeInspector(props: NodeInspectorProps) {
    const { selectedNode } = props
    const knowledgeNodes = useCanvasStore(s => s.knowledgeNodes)
    const isKnowledgeNode = selectedNode ? knowledgeNodes.some(kn => kn.id === selectedNode.id) : false
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

    // Reset confirm state when switching nodes
    useEffect(() => { setShowDeleteConfirm(false) }, [selectedNode?.id])

    const handleDeleteConfirm = useCallback(() => {
        if (!selectedNode) return
        const isCustom = selectedNode.type === 'custom'
        const customData = isCustom ? props.customNodes.find(n => n.id === selectedNode.id) : undefined
        graphActions.deleteNodeWithMeta(
            selectedNode.id,
            selectedNode.name,
            isCustom,
            customData
        )
        props.setSelectedNode(null)
        setShowDeleteConfirm(false)
    }, [selectedNode, props.customNodes, props.setSelectedNode])

    return (
        <>
            {selectedNode ? (
                <div className="flex-1 overflow-y-auto">
                    {/* Node Header */}
                    <div className="p-3 border-b border-white/10">
                        <NodeHeader
                            selectedNode={selectedNode}
                            visibleNodes={props.visibleNodes}
                            customNodes={props.customNodes}
                            setSelectedNode={props.setSelectedNode}
                            handleToggleToolView={props.handleToggleToolView}
                            toolPanelView={props.toolPanelView}
                            typeColors={props.typeColors}
                            isEditingCustomNodeName={props.isEditingCustomNodeName}
                            customNodeNameInputRef={props.customNodeNameInputRef}
                            editingCustomNodeNameValue={props.editingCustomNodeNameValue}
                            setEditingCustomNodeNameValue={props.setEditingCustomNodeNameValue}
                            saveCustomNodeName={props.saveCustomNodeName}
                            setIsEditingCustomNodeName={props.setIsEditingCustomNodeName}
                        />
                        {!isKnowledgeNode && (
                            <NodeNotes
                                editingNote={props.editingNote}
                                notesExpanded={props.notesExpanded}
                                setNotesExpanded={props.setNotesExpanded}
                            />
                        )}
                    </div>

                    {isKnowledgeNode ? (
                        /* Knowledge node editor */
                        <div className="px-3 py-3">
                            <KnowledgeNodeEditor
                                nodeId={selectedNode.id}
                                projectPath={props.projectPath}
                            />
                        </div>
                    ) : (
                        <>
                            {/* Info */}
                            <SectionHeader title="Info" icon={<InformationCircleIcon className="w-3.5 h-3.5" />} />
                            <div className="px-3 pb-3">
                                <NodeInfo
                                    selectedNode={selectedNode}
                                    graphLinks={props.graphLinks}
                                    customEdges={props.customEdges}
                                    graphEdges={props.graphEdges}
                                />
                            </div>
                        </>
                    )}

                    {/* Delete */}
                    {(isKnowledgeNode || props.visibleNodes.includes(selectedNode.id) || selectedNode.type === 'custom') && (
                        <div className="px-3 py-4 border-t border-white/10">
                            {showDeleteConfirm ? (
                                <div className="flex items-center gap-2">
                                    <span className="text-[11px] text-red-400/80">Delete?</span>
                                    <button
                                        onClick={handleDeleteConfirm}
                                        className="text-[11px] px-2 py-0.5 bg-red-500/80 hover:bg-red-500 text-white rounded transition-colors"
                                    >
                                        Confirm
                                    </button>
                                    <button
                                        onClick={() => setShowDeleteConfirm(false)}
                                        className="text-[11px] text-white/40 hover:text-white/70 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setShowDeleteConfirm(true)}
                                    className="text-[11px] text-red-400/60 hover:text-red-400 transition-colors"
                                >
                                    Delete node
                                </button>
                            )}
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center flex-1 text-white/40 p-4">
                    <CubeIcon className="w-12 h-12 mb-3 opacity-50" />
                    <p className="text-sm text-center">Select a node to view details</p>
                    <p className="text-xs text-center mt-1 text-white/30">Click on any node in the graph</p>
                </div>
            )}
        </>
    )
}
