import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { ConnectionsPanel, type ConnectionsPanelProps } from '@/components/inspector/ConnectionsPanel'

export interface InspectorPanelProps {
    rightPanelVisible: boolean
    connections?: ConnectionsPanelProps
}

export function InspectorPanel({
    rightPanelVisible,
    connections,
}: InspectorPanelProps) {
    if (!rightPanelVisible) return null

    return (
        <>
            <PanelResizeHandle style={{ width: 1, background: 'rgba(252, 175, 69, 0.5)' }} className="cursor-col-resize hover:brightness-150 transition-all" />
            <Panel defaultSize={25} minSize={15} maxSize={55}>
                <PanelGroup direction="vertical" className="h-full">
                    <Panel defaultSize={40} minSize={10}>
                        <div className="h-full bg-black" />
                    </Panel>
                    <PanelResizeHandle style={{ height: 1, background: 'rgba(252, 175, 69, 0.5)' }} className="cursor-row-resize hover:brightness-150 transition-all" />
                    <Panel defaultSize={60} minSize={20}>
                        <div className="h-full bg-black">
                            <BottomPanel connections={connections} />
                        </div>
                    </Panel>
                </PanelGroup>
            </Panel>
        </>
    )
}

type BottomTab = 'edges' | 'neighbors' | 'style'

import { useState } from 'react'
import {
    ArrowLongRightIcon,
    ArrowsPointingOutIcon,
    SwatchIcon,
} from '@heroicons/react/24/outline'
import NodeStylePanel from '@/components/NodeStylePanel'
import { EdgesTool } from '@/components/inspector/tools/EdgesTool'
import { NeighborsTool } from '@/components/inspector/tools/NeighborsTool'

function BottomPanel({ connections }: {
    connections?: ConnectionsPanelProps
}) {
    const [activeTab, setActiveTab] = useState<BottomTab>('edges')
    const hasNode = !!connections?.selectedNode

    const tabs: { id: BottomTab; label: string; visible: boolean }[] = [
        { id: 'edges', label: 'EDGES', visible: hasNode },
        { id: 'neighbors', label: 'NEIGHBORS', visible: hasNode },
        { id: 'style', label: 'STYLE', visible: hasNode },
    ]

    const visibleTabs = tabs.filter(t => t.visible)

    const currentTab = visibleTabs.find(t => t.id === activeTab) ? activeTab : visibleTabs[0]?.id ?? 'edges'

    if (visibleTabs.length === 0) {
        return (
            <div className="h-full flex items-center justify-center text-white/30 text-xs">
                Select a node to view details
            </div>
        )
    }

    return (
        <div className="h-full flex flex-col">
            {/* Tab bar */}
            <div className="flex border-b border-white/10 shrink-0">
                {visibleTabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-3 py-2 text-[10px] font-semibold tracking-wider transition-colors ${
                            currentTab === tab.id ? '' : 'text-white/40 hover:text-white/60'
                        }`}
                        style={currentTab === tab.id ? { color: '#FCAF45', borderBottom: '2px solid #FCAF45' } : undefined}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="flex-1 min-h-0 overflow-y-auto">
                {currentTab === 'edges' && connections?.selectedNode && (
                    <div className="p-3">
                        <EdgesTool
                            selectedNode={connections.selectedNode}
                            isAddingEdge={connections.isAddingEdge}
                            cancelAddingEdge={connections.cancelAddingEdge}
                            setAddingEdgeDirection={connections.setAddingEdgeDirection}
                            setIsAddingEdge={connections.setIsAddingEdge}
                            setIsRemovingNodes={connections.setIsRemovingNodes}
                            projectPath={connections.projectPath}
                            highlightedPath={connections.highlightedPath}
                            setHighlightedPath={connections.setHighlightedPath}
                            customEdges={connections.customEdges}
                            graphLinks={connections.graphLinks}
                            graphNodes={connections.graphNodes}
                            customNodes={connections.customNodes}
                            typeColors={connections.typeColors}
                            visibleNodes={connections.visibleNodes}
                            selectedEdge={connections.selectedEdge}
                            graphEdges={connections.graphEdges}
                            setSelectedEdge={connections.setSelectedEdge}
                            setFocusEdgeId={connections.setFocusEdgeId}
                            navigateToNode={connections.navigateToNode}
                            handleEdgeStyleChange={connections.handleEdgeStyleChange}
                        />
                    </div>
                )}
                {currentTab === 'neighbors' && connections?.selectedNode && (
                    <div className="p-3">
                        <NeighborsTool
                            selectedNode={connections.selectedNode}
                            customEdges={connections.customEdges}
                            graphLinks={connections.graphLinks}
                            customNodes={connections.customNodes}
                            graphNodes={connections.graphNodes}
                            visibleNodes={connections.visibleNodes}
                            navigateToNode={connections.navigateToNode}
                            typeColors={connections.typeColors}
                        />
                    </div>
                )}
                {currentTab === 'style' && connections?.selectedNode && (
                    <div className="p-3">
                        <NodeStylePanel
                            nodeId={connections.selectedNode.id}
                            initialSize={connections.selectedNode.customSize ?? 1.0}
                            initialEffect={connections.selectedNode.customEffect}
                            onStyleChange={connections.handleStyleChange}
                            compact
                        />
                    </div>
                )}
            </div>
        </div>
    )
}
