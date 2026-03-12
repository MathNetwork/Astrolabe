'use client'

import type { ReactNode } from 'react'
import dynamic from 'next/dynamic'
import { CanvasToolbar, type CanvasToolbarProps } from '@/components/canvas/CanvasToolbar'
import { useStore, type MainViewTab } from '@/lib/store'

const SigmaGraph = dynamic(() => import('@/components/graph/SigmaGraph'), {
    ssr: false,
    loading: () => (
        <div className="h-full flex items-center justify-center text-white/40 bg-black">
            Loading 2D graph...
        </div>
    ),
})

const ForceGraph3D = dynamic(() => import('@/components/graph3d/ForceGraph3D'), {
    ssr: false,
    loading: () => (
        <div className="h-full flex items-center justify-center text-white/40 bg-black">
            Loading 3D graph...
        </div>
    ),
})

const TABS: { id: MainViewTab; label: string }[] = [
    { id: 'read', label: 'READ' },
    { id: 'network', label: 'NETWORK' },
    { id: 'detail', label: 'DETAIL' },
]

function MainViewTabBar() {
    const mainViewTab = useStore(state => state.mainViewTab)
    const setMainViewTab = useStore(state => state.setMainViewTab)

    return (
        <div className="flex items-center gap-1 px-3 h-8 bg-[#0a0a0f] border-b border-white/10 shrink-0">
            {TABS.map(tab => {
                const isActive = mainViewTab === tab.id
                return (
                    <button
                        key={tab.id}
                        onClick={() => setMainViewTab(tab.id)}
                        className={`
                            relative px-3 py-1 text-[11px] font-medium tracking-wider transition-colors
                            ${isActive
                                ? ''
                                : 'text-white/40 hover:text-white/60'
                            }
                        `}
                        style={isActive ? { color: '#FCAF45' } : undefined}
                    >
                        {tab.label}
                        {isActive && (
                            <span className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full" style={{ background: '#FCAF45' }} />
                        )}
                    </button>
                )
            })}
        </div>
    )
}

const NetworkRead = dynamic(() => import('@/components/NetworkRead').then(m => ({ default: m.NetworkRead })), {
    ssr: false,
})

type GraphViewportProps = {
    viewMode: '2d' | '3d'
    positionsLoaded: boolean
    canvasNodes: any[]
    canvasEdges: any[]
    visibleCustomNodes: any[]
    visibleCustomEdges: any[]
    knowledgeNodes: any[]
    knowledgeEdges: any[]
    selectedNode: any
    focusNodeId: string | null
    focusEdgeId: string | null
    focusClusterPosition: [number, number, number] | null
    selectedEdge: any
    highlightedNamespace: any
    onNodeSelect: (node: any) => void
    onBackgroundClick: () => void
    onBackgroundDoubleClick?: (position: [number, number, number]) => void
    onEdgeSelect: (edge: { id: string; source: string; target: string } | null) => void
    showLabels: boolean
    initialCameraPosition?: [number, number, number] | null
    initialCameraTarget?: [number, number, number] | null
    onCameraChange: (position: [number, number, number], target: [number, number, number]) => void
    physics: any
    isAddingEdge: boolean
    isRemovingNodes: boolean
    nodesWithHiddenNeighbors: Set<string>
    getPositionsRef: any
    nodeCommunities: Map<string, any> | null
    onJumpToCode: (filePath: string, lineNumber: number) => void
    onJumpToNamespace: (namespace: string) => Promise<void> | void
    projectPath: string
    graphLoading: boolean
    toolbarProps: CanvasToolbarProps
    detailContent?: ReactNode
}

export function GraphViewport({
    viewMode,
    positionsLoaded,
    canvasNodes,
    canvasEdges,
    visibleCustomNodes,
    visibleCustomEdges,
    knowledgeNodes,
    knowledgeEdges,
    selectedNode,
    focusNodeId,
    focusEdgeId,
    focusClusterPosition,
    selectedEdge,
    highlightedNamespace,
    onNodeSelect,
    onBackgroundClick,
    onBackgroundDoubleClick,
    onEdgeSelect,
    showLabels,
    initialCameraPosition,
    initialCameraTarget,
    onCameraChange,
    physics,
    isAddingEdge,
    isRemovingNodes,
    nodesWithHiddenNeighbors,
    getPositionsRef,
    nodeCommunities,
    onJumpToCode,
    onJumpToNamespace,
    projectPath,
    graphLoading,
    toolbarProps,
    detailContent,
}: GraphViewportProps) {
    const mainViewTab = useStore(state => state.mainViewTab)
    const highlightedEdge = selectedEdge ? {
        id: selectedEdge.id,
        source: selectedEdge.source,
        target: selectedEdge.target,
    } : null

    return (
        <div className="h-full w-full flex flex-col overflow-hidden bg-[#0a0a0f]">
            <MainViewTabBar />

            {/* NETWORK view — use display:none to preserve 3D state */}
            <div className="flex-1 min-h-0 relative" style={{ display: mainViewTab === 'network' ? 'block' : 'none' }}>
                {!positionsLoaded ? (
                    <div className="h-full flex items-center justify-center text-white/40">
                        Loading canvas...
                    </div>
                ) : canvasNodes.length === 0 && visibleCustomNodes.length === 0 && knowledgeNodes.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-white/40"
                        onDoubleClick={() => {
                            if (onBackgroundDoubleClick) {
                                const spread = 5
                                onBackgroundDoubleClick([
                                    (Math.random() - 0.5) * spread,
                                    (Math.random() - 0.5) * spread,
                                    (Math.random() - 0.5) * spread,
                                ])
                            }
                        }}
                    >
                        <div className="text-lg mb-2">Canvas is empty</div>
                        <div className="text-sm">Double-click to create a node, or search from the left panel</div>
                    </div>
                ) : viewMode === '3d' ? (
                    <ForceGraph3D
                        nodes={canvasNodes}
                        edges={canvasEdges}
                        customNodes={visibleCustomNodes}
                        customEdges={visibleCustomEdges}
                        knowledgeNodes={knowledgeNodes}
                        knowledgeEdges={knowledgeEdges}
                        selectedNodeId={selectedNode?.id}
                        focusNodeId={focusNodeId}
                        focusEdgeId={focusEdgeId}
                        focusClusterPosition={focusClusterPosition}
                        highlightedEdge={highlightedEdge}
                        highlightedNamespace={highlightedNamespace}
                        onNodeSelect={onNodeSelect}
                        onBackgroundClick={onBackgroundClick}
                        onBackgroundDoubleClick={onBackgroundDoubleClick}
                        onEdgeSelect={onEdgeSelect}
                        showLabels={showLabels}
                        initialCameraPosition={initialCameraPosition ?? undefined}
                        initialCameraTarget={initialCameraTarget ?? undefined}
                        onCameraChange={onCameraChange}
                        physics={physics}
                        isAddingEdge={isAddingEdge}
                        isRemovingNodes={isRemovingNodes}
                        nodesWithHiddenNeighbors={nodesWithHiddenNeighbors}
                        getPositionsRef={getPositionsRef}
                        nodeCommunities={nodeCommunities}
                        onJumpToCode={onJumpToCode}
                        onJumpToNamespace={onJumpToNamespace}
                    />
                ) : (
                    <SigmaGraph
                        nodes={canvasNodes}
                        edges={canvasEdges}
                        projectPath={projectPath}
                        onNodeClick={onNodeSelect}
                        onEdgeSelect={onEdgeSelect}
                        selectedNodeId={selectedNode?.id}
                        focusNodeId={focusNodeId}
                        highlightedEdge={highlightedEdge}
                        showLabels={showLabels}
                    />
                )}

                {graphLoading && (
                    <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-20">
                        <div className="w-8 h-8 border-2 border-white/20 border-t-blue-400 rounded-full animate-spin mb-4" />
                        <div className="text-white/80 text-sm font-mono">Loading project...</div>
                        <div className="text-white/40 text-xs mt-2">Parsing Lean files</div>
                    </div>
                )}

                <CanvasToolbar {...toolbarProps} />
            </div>

            {/* READ view */}
            {mainViewTab === 'read' && (
                <div className="flex-1 min-h-0 relative">
                    <div className="absolute inset-0">
                        <NetworkRead projectPath={projectPath} />
                    </div>
                </div>
            )}

            {/* DETAIL view */}
            {mainViewTab === 'detail' && (
                <div className="flex-1 min-h-0 overflow-y-auto">
                    {detailContent || (
                        <div className="h-full flex flex-col items-center justify-center text-white/40">
                            <div className="text-lg mb-2">No node selected</div>
                            <div className="text-sm text-white/25">Select a node in NETWORK view to see details</div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
