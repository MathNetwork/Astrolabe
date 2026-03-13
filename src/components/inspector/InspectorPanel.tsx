import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { ConnectionsPanel, type ConnectionsPanelProps } from '@/components/inspector/ConnectionsPanel'
import { useCanvasStore } from '@/lib/canvasStore'
import { useRef, useEffect, useCallback } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import MarkdownRenderer from '@/components/MarkdownRenderer'

export interface InspectorPanelProps {
    rightPanelVisible: boolean
    pinnedCardIds: string[]
    nodeClickCount: number
    onPinCard: (id: string) => void
    onUnpinCard: (id: string) => void
    connections?: ConnectionsPanelProps
}

export function InspectorPanel({
    rightPanelVisible,
    pinnedCardIds,
    nodeClickCount,
    onPinCard,
    onUnpinCard,
    connections,
}: InspectorPanelProps) {
    if (!rightPanelVisible) return null

    // Auto-pin selected node
    const selectedId = connections?.selectedNode?.id
    const prevSelectedId = useRef<string | null>(null)
    useEffect(() => {
        if (selectedId && selectedId !== prevSelectedId.current) {
            onPinCard(selectedId)
        }
        prevSelectedId.current = selectedId ?? null
    }, [selectedId, onPinCard])

    return (
        <>
            <PanelResizeHandle style={{ width: 1, background: 'rgba(252, 175, 69, 0.5)' }} className="cursor-col-resize hover:brightness-150 transition-all" />
            <Panel id="right-inspector" defaultSize={25} minSize={15} maxSize={55}>
                <PanelGroup direction="vertical" className="h-full">
                    <Panel id="inspector-top" defaultSize={40} minSize={10}>
                        <div className="h-full bg-black">
                            <CardStack
                                pinnedCardIds={pinnedCardIds}
                                nodeClickCount={nodeClickCount}
                                onUnpinCard={onUnpinCard}
                                selectedNodeId={selectedId ?? null}
                                navigateToNode={connections?.navigateToNode}
                            />
                        </div>
                    </Panel>
                    <PanelResizeHandle style={{ height: 1, background: 'rgba(252, 175, 69, 0.5)' }} className="cursor-row-resize hover:brightness-150 transition-all" />
                    <Panel id="inspector-bottom" defaultSize={60} minSize={20}>
                        <div className="h-full bg-black">
                            <BottomPanel connections={connections} />
                        </div>
                    </Panel>
                </PanelGroup>
            </Panel>
        </>
    )
}

function scrollCardToCenter(scrollRef: React.RefObject<HTMLDivElement | null>, cardRefs: React.RefObject<Map<string, HTMLDivElement>>, id: string) {
    const el = cardRefs.current?.get(id)
    const container = scrollRef.current
    if (!el || !container) return
    const cardTop = el.offsetTop
    const cardHeight = el.offsetHeight
    const containerHeight = container.clientHeight
    container.scrollTo({
        top: cardTop - containerHeight / 2 + cardHeight / 2,
        behavior: 'smooth',
    })
}

function CardStack({
    pinnedCardIds,
    nodeClickCount,
    onUnpinCard,
    selectedNodeId,
    navigateToNode,
}: {
    pinnedCardIds: string[]
    nodeClickCount: number
    onUnpinCard: (id: string) => void
    selectedNodeId: string | null
    navigateToNode?: (id: string) => void
}) {
    const knowledgeNodes = useCanvasStore(s => s.knowledgeNodes)
    const scrollRef = useRef<HTMLDivElement>(null)
    const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map())

    // Scroll selected card to visual center on every click (including re-clicks on same node)
    useEffect(() => {
        if (selectedNodeId && pinnedCardIds.includes(selectedNodeId)) {
            requestAnimationFrame(() => {
                scrollCardToCenter(scrollRef, cardRefs, selectedNodeId)
            })
        }
    }, [selectedNodeId, nodeClickCount, pinnedCardIds])

    const setCardRef = useCallback((id: string, el: HTMLDivElement | null) => {
        if (el) cardRefs.current.set(id, el)
        else cardRefs.current.delete(id)
    }, [])

    if (pinnedCardIds.length === 0) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="text-white/20 text-xs text-center px-4">
                    Select a node to view details
                </div>
            </div>
        )
    }

    return (
        <div ref={scrollRef} className="h-full overflow-y-auto p-2 space-y-2">
            {pinnedCardIds.map(id => {
                const knNode = knowledgeNodes.find(n => n.id === id)
                const name = knNode?.name || id.split('.').pop() || id
                const statement = knNode?.statement || ''
                const color = knNode?.style?.color || '#888'
                const isSelected = id === selectedNodeId

                return (
                    <div
                        key={id}
                        ref={(el) => setCardRef(id, el)}
                        onClick={() => navigateToNode?.(id)}
                        className={`rounded border p-2.5 transition-colors cursor-pointer ${
                            isSelected
                                ? 'border-white/30 bg-white/5'
                                : 'border-white/10 bg-white/[0.02] hover:bg-white/5'
                        }`}
                    >
                        <div className="flex items-start gap-1.5">
                            <div className="flex-1 min-w-0">
                                <div
                                    className="text-xs font-semibold truncate"
                                    style={{ color }}
                                    title={knNode?.name || id}
                                >
                                    {name}
                                </div>
                                {statement && (
                                    <MarkdownRenderer
                                        content={statement}
                                        className="mt-1 text-[11px] text-white/60 leading-relaxed break-words [&_.katex]:text-[11px]"
                                    />
                                )}
                                {!statement && !knNode && (
                                    <div className="text-[10px] text-white/30 mt-1 italic">
                                        No statement
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={(e) => { e.stopPropagation(); onUnpinCard(id) }}
                                className="text-white/30 hover:text-white/60 transition-colors shrink-0 mt-0.5"
                                title="Remove card"
                            >
                                <XMarkIcon className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

type BottomTab = 'edges' | 'neighbors'

import { useState } from 'react'
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
            </div>
        </div>
    )
}
