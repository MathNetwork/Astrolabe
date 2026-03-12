import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { CodeWorkspace, type CodeWorkspaceProps } from '@/components/inspector/CodeWorkspace'
import { ConnectionsPanel, type ConnectionsPanelProps } from '@/components/inspector/ConnectionsPanel'

export interface InspectorPanelProps {
    rightPanelVisible: boolean
    codeWorkspace: CodeWorkspaceProps
    connections?: ConnectionsPanelProps
}

export function InspectorPanel({
    rightPanelVisible,
    codeWorkspace,
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
                            <BottomPanel codeWorkspace={codeWorkspace} connections={connections} />
                        </div>
                    </Panel>
                </PanelGroup>
            </Panel>
        </>
    )
}

type BottomTab = 'lean' | 'edges' | 'neighbors' | 'style'

import { useState } from 'react'
import {
    ArrowLongRightIcon,
    ArrowsPointingOutIcon,
    SwatchIcon,
} from '@heroicons/react/24/outline'
import NodeStylePanel from '@/components/NodeStylePanel'
import { EdgesTool } from '@/components/inspector/tools/EdgesTool'
import { NeighborsTool } from '@/components/inspector/tools/NeighborsTool'

function BottomPanel({ codeWorkspace, connections }: {
    codeWorkspace: CodeWorkspaceProps
    connections?: ConnectionsPanelProps
}) {
    const [activeTab, setActiveTab] = useState<BottomTab>('lean')
    const hasNode = !!connections?.selectedNode

    const tabs: { id: BottomTab; label: string; visible: boolean }[] = [
        { id: 'lean', label: 'L∃∀N', visible: codeWorkspace.codeViewerOpen },
        { id: 'edges', label: 'EDGES', visible: hasNode },
        { id: 'neighbors', label: 'NEIGHBORS', visible: hasNode },
        { id: 'style', label: 'STYLE', visible: hasNode },
    ]

    const visibleTabs = tabs.filter(t => t.visible)

    // If active tab is no longer visible, switch to first visible
    if (!visibleTabs.find(t => t.id === activeTab) && visibleTabs.length > 0) {
        // Will be corrected on next render
    }

    const currentTab = visibleTabs.find(t => t.id === activeTab) ? activeTab : visibleTabs[0]?.id ?? 'lean'

    if (visibleTabs.length === 0) {
        return (
            <div className="h-full flex items-center justify-center text-white/30 text-xs">
                Select a node or open code viewer
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
                {codeWorkspace.codeViewerOpen && currentTab === 'lean' && (
                    <>
                        <div className="flex-1" />
                        <button
                            onClick={() => codeWorkspace.setCodeViewerOpen(false)}
                            className="px-3 py-2 text-white/40 hover:text-white/80 text-xs"
                            title="Close"
                        >
                            ✕
                        </button>
                    </>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 min-h-0 overflow-y-auto">
                {currentTab === 'lean' && <CodeContent codeWorkspace={codeWorkspace} />}
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
                            setCodeLocation={connections.setCodeLocation}
                            setCodeViewerOpen={connections.setCodeViewerOpen}
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

function CodeContent({ codeWorkspace }: { codeWorkspace: CodeWorkspaceProps }) {
    const { codeLoading, codeFile, codeLocation, selectedNode, nodeClickCount, nodeStatusLines, setCodeViewerOpen } = codeWorkspace

    return (
        <div className="h-full relative">
            {codeLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
                    <div className="text-white/40 text-sm">Loading...</div>
                </div>
            )}
            {codeFile ? (
                <LeanCodePanelWrapper
                    codeFile={codeFile}
                    codeLocation={codeLocation}
                    selectedNode={selectedNode}
                    nodeClickCount={nodeClickCount}
                    nodeStatusLines={nodeStatusLines}
                    setCodeViewerOpen={setCodeViewerOpen}
                />
            ) : !codeLoading && (
                <div className="h-full flex items-center justify-center">
                    <div className="text-white/40 text-sm">No content</div>
                </div>
            )}
        </div>
    )
}

import { LeanCodePanel } from '@/components/LeanCodePanel'

function LeanCodePanelWrapper({ codeFile, codeLocation, selectedNode, nodeClickCount, nodeStatusLines, setCodeViewerOpen }: any) {
    return (
        <LeanCodePanel
            key={`${codeLocation?.filePath || selectedNode?.leanFilePath || 'editor'}-${codeLocation?.lineNumber || 0}-${nodeClickCount}`}
            content={codeFile.content}
            filePath={codeLocation?.filePath || selectedNode?.leanFilePath}
            lineNumber={codeLocation?.lineNumber || selectedNode?.leanLineNumber}
            startLine={codeFile.startLine}
            endLine={codeFile.endLine}
            totalLines={codeFile.totalLines}
            nodeName={selectedNode?.name}
            nodeKind={selectedNode?.id.startsWith('group:') ? 'namespace' : selectedNode?.type}
            onClose={() => setCodeViewerOpen(false)}
            hideHeader
            readOnly
            nodeStatusLines={nodeStatusLines}
        />
    )
}
