'use client'

import { useState } from 'react'
import {
    ArrowLongRightIcon,
    ArrowsPointingOutIcon,
    SwatchIcon,
} from '@heroicons/react/24/outline'
import NodeStylePanel from '@/components/NodeStylePanel'
import { EdgesTool } from '@/components/inspector/tools/EdgesTool'
import { NeighborsTool } from '@/components/inspector/tools/NeighborsTool'
import type { GraphNode, GraphLink, NetMathEdge } from '@/types/graph'
import type { CustomNode, CustomEdge } from '@/lib/canvasStore'
import type { SelectedEdge } from '@/components/inspector/types'

export interface ConnectionsPanelProps {
    selectedNode: GraphNode | null
    // EdgesTool
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
    // Style
    handleStyleChange: (nodeId: string, style: { effect?: string; size?: number }) => void
}

type Tab = 'edges' | 'neighbors' | 'style'

const TABS: { id: Tab; label: string; icon: typeof ArrowLongRightIcon }[] = [
    { id: 'edges', label: 'EDGES', icon: ArrowLongRightIcon },
    { id: 'neighbors', label: 'NEIGHBORS', icon: ArrowsPointingOutIcon },
    { id: 'style', label: 'STYLE', icon: SwatchIcon },
]

export function ConnectionsPanel(props: ConnectionsPanelProps) {
    const [activeTab, setActiveTab] = useState<Tab>('edges')
    const { selectedNode } = props

    if (!selectedNode) {
        return (
            <div className="h-full flex items-center justify-center text-white/30 text-xs">
                Select a node to view connections
            </div>
        )
    }

    return (
        <div className="h-full flex flex-col">
            <div className="flex border-b border-white/10 shrink-0">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 px-2 py-2 text-[10px] font-medium tracking-wider transition-colors flex items-center justify-center gap-1 ${
                            activeTab === tab.id ? '' : 'text-white/40 hover:text-white/60'
                        }`}
                        style={activeTab === tab.id ? { color: '#FCAF45', borderBottom: '2px solid #FCAF45' } : undefined}
                    >
                        <tab.icon className="w-3 h-3" />
                        {tab.label}
                    </button>
                ))}
            </div>
            <div className="flex-1 overflow-y-auto p-3">
                {activeTab === 'edges' && (
                    <EdgesTool
                        selectedNode={selectedNode}
                        isAddingEdge={props.isAddingEdge}
                        cancelAddingEdge={props.cancelAddingEdge}
                        setAddingEdgeDirection={props.setAddingEdgeDirection}
                        setIsAddingEdge={props.setIsAddingEdge}
                        setIsRemovingNodes={props.setIsRemovingNodes}
                        projectPath={props.projectPath}
                        highlightedPath={props.highlightedPath}
                        setHighlightedPath={props.setHighlightedPath}
                        customEdges={props.customEdges}
                        graphLinks={props.graphLinks}
                        graphNodes={props.graphNodes}
                        customNodes={props.customNodes}
                        typeColors={props.typeColors}
                        visibleNodes={props.visibleNodes}
                        selectedEdge={props.selectedEdge}
                        graphEdges={props.graphEdges}
                        setSelectedEdge={props.setSelectedEdge}
                        setFocusEdgeId={props.setFocusEdgeId}
                        navigateToNode={props.navigateToNode}
                        handleEdgeStyleChange={props.handleEdgeStyleChange}
                    />
                )}
                {activeTab === 'neighbors' && (
                    <NeighborsTool
                        selectedNode={selectedNode}
                        customEdges={props.customEdges}
                        graphLinks={props.graphLinks}
                        customNodes={props.customNodes}
                        graphNodes={props.graphNodes}
                        visibleNodes={props.visibleNodes}
                        navigateToNode={props.navigateToNode}
                        typeColors={props.typeColors}
                    />
                )}
                {activeTab === 'style' && (
                    <NodeStylePanel
                        nodeId={selectedNode.id}
                        initialSize={selectedNode.customSize ?? 1.0}
                        initialEffect={selectedNode.customEffect}
                        onStyleChange={props.handleStyleChange}
                        compact
                    />
                )}
            </div>
        </div>
    )
}
