'use client'

import { type ReactNode, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { CanvasToolbar, type CanvasToolbarProps } from '@/components/canvas/CanvasToolbar'
import { useStore, type MainViewTab, type LayoutPreset } from '@/lib/store'

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

const NetworkRead = dynamic(() => import('@/components/NetworkRead').then(m => ({ default: m.NetworkRead })), {
    ssr: false,
})

/* ── Layout preset icons ── */

const LAYOUT_PRESETS: { id: LayoutPreset; label: string; icon: ReactNode }[] = [
    {
        id: 'tabs',
        label: 'Single view',
        icon: (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="1" y="1" width="12" height="12" rx="1" stroke="currentColor" strokeWidth="1.2" />
            </svg>
        ),
    },
    {
        id: 'read',
        label: 'READ focus',
        icon: (
            <svg width="16" height="14" viewBox="0 0 16 14" fill="none">
                <rect x="0.5" y="0.5" width="10" height="13" rx="1" stroke="currentColor" strokeWidth="1" fill="currentColor" fillOpacity="0.15" />
                <rect x="11.5" y="0.5" width="4" height="6" rx="0.5" stroke="currentColor" strokeWidth="0.8" />
                <rect x="11.5" y="7.5" width="4" height="6" rx="0.5" stroke="currentColor" strokeWidth="0.8" />
            </svg>
        ),
    },
    {
        id: 'network',
        label: 'NETWORK focus',
        icon: (
            <svg width="16" height="14" viewBox="0 0 16 14" fill="none">
                <rect x="0.5" y="0.5" width="4" height="6" rx="0.5" stroke="currentColor" strokeWidth="0.8" />
                <rect x="0.5" y="7.5" width="4" height="6" rx="0.5" stroke="currentColor" strokeWidth="0.8" />
                <rect x="5.5" y="0.5" width="10" height="13" rx="1" stroke="currentColor" strokeWidth="1" fill="currentColor" fillOpacity="0.15" />
            </svg>
        ),
    },
    {
        id: 'detail',
        label: 'DETAIL focus',
        icon: (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="0.5" y="0.5" width="6" height="7" rx="0.5" stroke="currentColor" strokeWidth="0.8" />
                <rect x="7.5" y="0.5" width="6" height="7" rx="0.5" stroke="currentColor" strokeWidth="1" fill="currentColor" fillOpacity="0.15" />
                <rect x="0.5" y="8.5" width="13" height="5" rx="0.5" stroke="currentColor" strokeWidth="0.8" />
            </svg>
        ),
    },
]

const TABS: { id: MainViewTab; label: string }[] = [
    { id: 'read', label: 'READ' },
    { id: 'network', label: 'NETWORK' },
    { id: 'detail', label: 'DETAIL' },
]

/* ── Orange resize handle ── */

function HResizeHandle() {
    return (
        <PanelResizeHandle
            style={{ width: 1, background: 'rgba(252, 175, 69, 0.5)' }}
            className="cursor-col-resize hover:brightness-150 transition-all"
        />
    )
}

function VResizeHandle() {
    return (
        <PanelResizeHandle
            style={{ height: 1, background: 'rgba(252, 175, 69, 0.5)' }}
            className="cursor-row-resize hover:brightness-150 transition-all"
        />
    )
}

/* ── Panel label (non-tabs mode) ── */

function PanelLabel({ label }: { label: string }) {
    return (
        <div className="absolute top-0 left-0 right-0 h-5 flex items-center px-2 bg-black/50 z-10">
            <span className="text-[9px] font-semibold tracking-wider text-white/40 uppercase">{label}</span>
        </div>
    )
}

/* ── Top bar ── */

function TopBar() {
    const layoutPreset = useStore(s => s.layoutPreset)
    const setLayoutPreset = useStore(s => s.setLayoutPreset)
    const mainViewTab = useStore(s => s.mainViewTab)
    const setMainViewTab = useStore(s => s.setMainViewTab)

    return (
        <div className="flex items-center px-3 h-8 bg-[#0a0a0f] border-b border-white/10 shrink-0">
            <div className="flex items-center gap-1 flex-1">
                {layoutPreset === 'tabs' ? (
                    TABS.map(tab => {
                        const isActive = mainViewTab === tab.id
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setMainViewTab(tab.id)}
                                className={`relative px-3 py-1 text-[11px] font-medium tracking-wider transition-colors ${isActive ? '' : 'text-white/40 hover:text-white/60'}`}
                                style={isActive ? { color: '#FCAF45' } : undefined}
                            >
                                {tab.label}
                                {isActive && (
                                    <span className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full" style={{ background: '#FCAF45' }} />
                                )}
                            </button>
                        )
                    })
                ) : (
                    <span className="text-[10px] text-white/30 tracking-wider">
                        {layoutPreset.toUpperCase()} focus
                    </span>
                )}
            </div>

            <div className="flex items-center gap-0.5 ml-2">
                {LAYOUT_PRESETS.map(p => (
                    <button
                        key={p.id}
                        onClick={() => setLayoutPreset(p.id)}
                        className={`p-1 rounded transition-colors ${
                            layoutPreset === p.id
                                ? 'text-[#FCAF45]'
                                : 'text-white/30 hover:text-white/60'
                        }`}
                        title={p.label}
                    >
                        {p.icon}
                    </button>
                ))}
            </div>
        </div>
    )
}

/* ── Main component ── */

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
    const layoutPreset = useStore(s => s.layoutPreset)
    const mainViewTab = useStore(s => s.mainViewTab)
    const isTabsMode = layoutPreset === 'tabs'

    const highlightedEdge = selectedEdge ? {
        id: selectedEdge.id,
        source: selectedEdge.source,
        target: selectedEdge.target,
    } : null

    // Trigger resize when layout changes so Three.js re-measures
    const isFirstRender = useRef(true)
    useEffect(() => {
        if (isFirstRender.current) { isFirstRender.current = false; return }
        const t = setTimeout(() => window.dispatchEvent(new Event('resize')), 80)
        return () => clearTimeout(t)
    }, [layoutPreset, mainViewTab])

    /* ── View renderers ── */

    const networkContent = (
        <>
            {!isTabsMode && <PanelLabel label="Network" />}
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
                    <div className="text-sm">Double-click to create a node</div>
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
        </>
    )

    const readContent = (
        <>
            {!isTabsMode && <PanelLabel label="Read" />}
            <div className={`absolute inset-0 ${!isTabsMode ? 'pt-5' : ''}`}>
                <NetworkRead projectPath={projectPath} />
            </div>
        </>
    )

    const detailContentBlock = (
        <>
            {!isTabsMode && <PanelLabel label="Detail" />}
            <div className={`${!isTabsMode ? 'pt-5' : ''}`}>
                {detailContent || (
                    <div className="h-full flex flex-col items-center justify-center text-white/40 pt-20">
                        <div className="text-lg mb-2">No node selected</div>
                        <div className="text-sm text-white/25">Select a node in Network</div>
                    </div>
                )}
            </div>
        </>
    )

    /* ── Tabs mode ── */
    if (isTabsMode) {
        return (
            <div className="h-full w-full flex flex-col overflow-hidden bg-[#0a0a0f]">
                <TopBar />
                <div className="flex-1 min-h-0 relative">
                    {/* NETWORK: always mounted, display toggled */}
                    <div className="absolute inset-0 overflow-hidden" style={{ display: mainViewTab === 'network' ? 'block' : 'none' }}>
                        {networkContent}
                    </div>
                    {mainViewTab === 'read' && (
                        <div className="absolute inset-0 overflow-hidden">
                            {readContent}
                        </div>
                    )}
                    {mainViewTab === 'detail' && (
                        <div className="absolute inset-0 overflow-y-auto">
                            {detailContentBlock}
                        </div>
                    )}
                </div>
            </div>
        )
    }

    /* ── Focus modes — resizable panels ── */

    const renderView = (view: MainViewTab, className: string) => {
        switch (view) {
            case 'network':
                return <div className={`${className} relative overflow-hidden`}>{networkContent}</div>
            case 'read':
                return <div className={`${className} relative overflow-hidden`}>{readContent}</div>
            case 'detail':
                return <div className={`${className} relative overflow-y-auto`}>{detailContentBlock}</div>
        }
    }

    const vc = 'h-full w-full bg-[#0a0a0f]'

    // Detail focus: READ+DETAIL on top (side by side), NETWORK on bottom (full width)
    if (layoutPreset === 'detail') {
        return (
            <div className="h-full w-full flex flex-col overflow-hidden bg-[#0a0a0f]">
                <TopBar />
                <div className="flex-1 min-h-0">
                    <PanelGroup direction="vertical" className="h-full" autoSaveId="detail-v">
                        {/* Top: READ + DETAIL side by side */}
                        <Panel id="detail-top" defaultSize={55} minSize={15}>
                            <PanelGroup direction="horizontal" className="h-full" autoSaveId="detail-h">
                                <Panel id="detail-top-read" defaultSize={40} minSize={10} collapsible collapsedSize={0}>
                                    {renderView('read', vc)}
                                </Panel>
                                <HResizeHandle />
                                <Panel id="detail-top-detail" defaultSize={60} minSize={15} collapsible collapsedSize={0}>
                                    {renderView('detail', vc)}
                                </Panel>
                            </PanelGroup>
                        </Panel>
                        <VResizeHandle />
                        {/* Bottom: NETWORK full width */}
                        <Panel id="detail-bottom-network" defaultSize={45} minSize={10} collapsible collapsedSize={0}>
                            {renderView('network', vc)}
                        </Panel>
                    </PanelGroup>
                </div>
            </div>
        )
    }

    const primary = layoutPreset as MainViewTab
    const secondaryViews = (['read', 'network', 'detail'] as MainViewTab[]).filter(v => v !== primary)

    // Network focus: secondary stacked LEFT, primary (network) RIGHT — matches icon
    if (layoutPreset === 'network') {
        return (
            <div className="h-full w-full flex flex-col overflow-hidden bg-[#0a0a0f]">
                <TopBar />
                <div className="flex-1 min-h-0">
                    <PanelGroup direction="horizontal" className="h-full" autoSaveId="network-h">
                        <Panel id="net-secondary-stack" defaultSize={35} minSize={15}>
                            <PanelGroup direction="vertical" className="h-full" autoSaveId="network-v">
                                <Panel id="net-secondary-0" defaultSize={50} minSize={10} collapsible collapsedSize={0}>
                                    {renderView(secondaryViews[0], vc)}
                                </Panel>
                                <VResizeHandle />
                                <Panel id="net-secondary-1" defaultSize={50} minSize={10} collapsible collapsedSize={0}>
                                    {renderView(secondaryViews[1], vc)}
                                </Panel>
                            </PanelGroup>
                        </Panel>
                        <HResizeHandle />
                        <Panel id="net-primary" defaultSize={65} minSize={20} collapsible collapsedSize={0}>
                            {renderView('network', vc)}
                        </Panel>
                    </PanelGroup>
                </div>
            </div>
        )
    }

    // Read focus: primary (read) LEFT, secondary stacked RIGHT
    return (
        <div className="h-full w-full flex flex-col overflow-hidden bg-[#0a0a0f]">
            <TopBar />
            <div className="flex-1 min-h-0">
                <PanelGroup direction="horizontal" className="h-full" autoSaveId="read-h">
                    <Panel id="read-primary" defaultSize={65} minSize={20} collapsible collapsedSize={0}>
                        {renderView('read', vc)}
                    </Panel>
                    <HResizeHandle />
                    <Panel id="read-secondary-stack" defaultSize={35} minSize={15}>
                        <PanelGroup direction="vertical" className="h-full" autoSaveId="read-v">
                            <Panel id="read-secondary-0" defaultSize={50} minSize={10} collapsible collapsedSize={0}>
                                {renderView(secondaryViews[0], vc)}
                            </Panel>
                            <VResizeHandle />
                            <Panel id="read-secondary-1" defaultSize={50} minSize={10} collapsible collapsedSize={0}>
                                {renderView(secondaryViews[1], vc)}
                            </Panel>
                        </PanelGroup>
                    </Panel>
                </PanelGroup>
            </div>
        </div>
    )
}
