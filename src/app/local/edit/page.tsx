'use client'

// Install global error handlers early to suppress known harmless errors (Monaco "Canceled", etc.)
import '@/lib/errorSuppression'

import { useState, useEffect, useCallback, Suspense, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Panel, PanelGroup } from 'react-resizable-panels'
import { useGraphData, type GraphNode } from '@/hooks/useGraphData'
import { useAnalysisData } from '@/hooks/useAnalysisData'
import { useEditorGraphData } from '@/hooks/useEditorGraphData'
import { useViewportPersistence } from '@/hooks/useViewportPersistence'
import { useEditorActions } from '@/hooks/useEditorActions'
import { useUiPreferencesPersistence } from '@/hooks/useUiPreferencesPersistence'

import { useNodeNotes } from '@/hooks/useNodeNotes'
import { useDialogState } from '@/hooks/useDialogState'
import { groupNodesByNamespace } from '@/lib/graphProcessing'
import { EditorTopBar } from '@/components/local/edit/EditorTopBar'
import { EditorLeftSidebar } from '@/components/local/edit/EditorLeftSidebar'
import { EditorStatusBar } from '@/components/local/edit/EditorStatusBar'
import { EditorOverlays } from '@/components/local/edit/EditorOverlays'
import { TauriRequiredView, NoProjectSelectedView } from '@/components/local/edit/ProjectStateViews'
import { GraphViewport } from '@/components/canvas/GraphViewport'
import { InspectorPanel } from '@/components/inspector/InspectorPanel'
import { NodeInspector } from '@/components/inspector/NodeInspector'
import { ConnectionsPanel } from '@/components/inspector/ConnectionsPanel'
import type { SelectedEdge } from '@/components/inspector/types'
import { useCanvasStore } from '@/lib/canvasStore'
import { useStore } from '@/lib/store'
import { updateViewport } from '@/lib/api'

import type { PhysicsParams } from '@/components/graph3d/ForceGraph3D'
import { DEFAULT_PHYSICS } from '@/components/graph3d/ForceLayout'

import { useLensStore } from '@/lib/lensStore'

import { useUndoShortcut } from '@/hooks/useUndoShortcut'
import { graphActions } from '@/lib/history/graphActions'
import { viewportActions } from '@/lib/history/viewportActions'
import { useSelectionStore } from '@/lib/selectionStore'
import { highlightNamespaceUndoable, selectNodeUndoable } from '@/lib/history/selectionActions'

type ViewMode = '2d' | '3d'

function LocalEditorContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const projectPath = searchParams.get('path') || ''
    const projectName = projectPath.split('/').pop() || 'Project'

    // ── Tauri check ──
    const [isTauri, setIsTauri] = useState(false)
    useEffect(() => {
        setIsTauri(!!(window as any).__TAURI_INTERNALS__)
        // Default to READ tab
        useStore.getState().setMainViewTab('read')
    }, [])

    // ── Panel / UI chrome state ──
    const [searchPanelOpen, setSearchPanelOpen] = useState(true)
    const [searchPanelKey, setSearchPanelKey] = useState(0)
    const [leftPanelMode, setLeftPanelMode] = useState<'search' | 'settings'>('settings')

    const [viewMode, setViewMode] = useState<ViewMode>('3d')
    const [toolPanelView, setToolPanelView] = useState<'edges' | 'notes' | 'style' | 'neighbors' | null>(null)

    // ── Focus targets ──
    const [focusNodeId, setFocusNodeId] = useState<string | null>(null)
    const [focusEdgeId, setFocusEdgeId] = useState<string | null>(null)
    const [focusClusterPosition, setFocusClusterPosition] = useState<[number, number, number] | null>(null)

    // ── Selection (via selectionStore, undoable) ──
    const highlightedNamespace = useSelectionStore(state => state.highlightedNamespace)
    const storeSelectedNodeId = useSelectionStore(state => state.selectedNodeId)

    // ── Canvas display toggles ──
    const [showLabels, setShowLabels] = useState(false)
    const [showBridges, setShowBridges] = useState(false)
    const [highlightedPath, setHighlightedPath] = useState<string[]>([])
    const getPositionsRef = useRef<(() => Map<string, [number, number, number]>) | null>(null)

    // ── Physics settings ──
    const [physics, setPhysics] = useState<PhysicsParams>({ ...DEFAULT_PHYSICS })

    // ── Undo/Redo ──
    useUndoShortcut()

    // ── Canvas store (individual selectors to avoid re-renders on position updates) ──
    const visibleNodes = useCanvasStore(s => s.visibleNodes)
    const customNodes = useCanvasStore(s => s.customNodes)
    const customEdges = useCanvasStore(s => s.customEdges)
    const knowledgeNodes = useCanvasStore(s => s.knowledgeNodes)
    const knowledgeEdges = useCanvasStore(s => s.knowledgeEdges)
    const positionsLoaded = useCanvasStore(s => s.positionsLoaded)
    const setCanvasProjectPath = useCanvasStore(s => s.setProjectPath)
    const loadCanvas = useCanvasStore(s => s.loadCanvas)
    const resetAllData = useCanvasStore(s => s.resetAllData)

    // ── Dialog / modal state (reducer) ──
    const dialogs = useDialogState()

    // ── Edge/node interaction modes ──
    const [isAddingEdge, setIsAddingEdge] = useState(false)
    const [addingEdgeDirection, setAddingEdgeDirection] = useState<'outgoing' | 'incoming'>('outgoing')
    const [isRemovingNodes, setIsRemovingNodes] = useState(false)

    // ── Pending edge config (for EdgeConfigDialog) ──
    const [pendingEdge, setPendingEdge] = useState<{ source: string; target: string; sourceName: string; targetName: string } | null>(null)

    // ── Edges panel collapse state ──
    const [customDepsExpanded, setCustomDepsExpanded] = useState(true)
    const [customUsedByExpanded, setCustomUsedByExpanded] = useState(true)
    const [provenDepsExpanded, setProvenDepsExpanded] = useState(true)
    const [provenUsedByExpanded, setProvenUsedByExpanded] = useState(true)

    // ── Analysis panel state ──
    const [sizeMappingMode, setSizeMappingMode] = useState<'default' | 'pagerank' | 'indegree' | 'depth' | 'bottleneck' | 'reachability' | 'betweenness' | 'clustering' | 'katz' | 'hub' | 'authority'>('default')
    const [sizeCurveControl, setSizeCurveControl] = useState({ x: 0.25, y: 0.75 })
    const [colorMappingMode, setColorMappingMode] = useState<'kind' | 'namespace' | 'community' | 'layer' | 'spectral' | 'curvature' | 'anomaly' | 'embedding' | 'motif'>('kind')
    const [layoutClusterMode, setLayoutClusterMode] = useState<'none' | 'namespace' | 'community' | 'layer' | 'spectral' | 'embedding' | 'curvature' | 'anomaly' | 'motif'>('none')

    // ── Graph data from backend ──
    const {
        nodes: allNodes, edges: allEdges,
        legacyNodes: graphNodes, links: graphLinks,
        loading: graphLoading, reload: reloadGraph, reloadMeta,
        rawNodeCount, filterOptions, setFilterOptions, filterStats,
    } = useGraphData(projectPath)

    const { analysisData, analysisLoading } = useAnalysisData(projectPath, allNodes.length)

    // ── Auto-select lens for large graphs ──
    const autoSelectLens = useLensStore(state => state.autoSelectLens)
    const activeLensId = useLensStore(state => state.activeLensId)
    const hasAutoSelectedRef = useRef(false)
    useEffect(() => {
        if (!hasAutoSelectedRef.current && rawNodeCount > 300) {
            hasAutoSelectedRef.current = true
            autoSelectLens(rawNodeCount)
        }
    }, [rawNodeCount, autoSelectLens])
    useEffect(() => { hasAutoSelectedRef.current = false }, [projectPath])

    // ── Namespace index (empty - no LSP) ──
    const namespaceIndex = new Map()

    // ── Selected node ──
    const [selectedNode, setSelectedNodeState] = useState<GraphNode | null>(null)
    const [nodeClickCount, setNodeClickCount] = useState(0)

    // ── Selected edge ──
    const [selectedEdge, setSelectedEdge] = useState<SelectedEdge | null>(null)

    // ── Node notes (extracted hook) ──
    const notes = useNodeNotes(projectPath, selectedNode?.id ?? null)

    // ── setSelectedNode with side effects ──
    const setSelectedNode = useCallback((node: GraphNode | null) => {
        setSelectedNodeState(node)
        setNodeClickCount(c => c + 1)
        selectNodeUndoable(node?.id ?? null)

        const isOnCanvas = node && (
            visibleNodes.includes(node.id) || customNodes.some(cn => cn.id === node.id) || knowledgeNodes.some((kn: any) => kn.id === node.id)
        )
        if (isOnCanvas) setFocusNodeId(node.id)

        if (node && selectedEdge) {
            if (node.id !== selectedEdge.source && node.id !== selectedEdge.target) {
                setSelectedEdge(null)
            }
        }
        if (projectPath) {
            updateViewport(projectPath, { selected_node_id: node?.id }).catch((err) => {
                console.error('[page] Failed to save selected node:', err)
            })
        }
    }, [visibleNodes, customNodes, knowledgeNodes, projectPath, selectedEdge])

    // Sync selectedNode meta when graphNodes updates
    useEffect(() => {
        if (selectedNode && graphNodes.length > 0) {
            const updatedNode = graphNodes.find(n => n.id === selectedNode.id)
            if (updatedNode && (
                updatedNode.customSize !== selectedNode.customSize ||
                updatedNode.customEffect !== selectedNode.customEffect ||
                updatedNode.customColor !== selectedNode.customColor
            )) {
                setSelectedNodeState(updatedNode)
            }
        }
    }, [graphNodes, selectedNode])

    // Sync local selectedNode with store (for undo/redo)
    useEffect(() => {
        const currentId = selectedNode?.id ?? null
        if (storeSelectedNodeId !== currentId) {
            if (storeSelectedNodeId === null) {
                setSelectedNodeState(null)
            } else {
                const node = graphNodes.find(n => n.id === storeSelectedNodeId)
                    || customNodes.find(n => n.id === storeSelectedNodeId) as GraphNode | undefined
                if (node) {
                    setSelectedNodeState(node)
                    setNodeClickCount(c => c + 1)
                }
            }
        }
    }, [storeSelectedNodeId, graphNodes, customNodes, selectedNode?.id])

    // ── Edge creation handling ──
    const handleAddCustomEdge = useCallback(async (targetNodeId: string) => {
        if (!selectedNode || !isAddingEdge) return
        const source = addingEdgeDirection === 'outgoing' ? selectedNode.id : targetNodeId
        const target = addingEdgeDirection === 'outgoing' ? targetNodeId : selectedNode.id
        if (source === target) { setIsAddingEdge(false); return }

        // For knowledge nodes, show the EdgeConfigDialog to pick relation/strict
        const knowledgeNodeIds = new Set(useCanvasStore.getState().knowledgeNodes.map(n => n.id))
        if (knowledgeNodeIds.has(source) && knowledgeNodeIds.has(target)) {
            const sNode = graphNodes.find(n => n.id === source) || customNodes.find(n => n.id === source)
            const tNode = graphNodes.find(n => n.id === target) || customNodes.find(n => n.id === target)
            setPendingEdge({
                source, target,
                sourceName: sNode?.name || source,
                targetName: tNode?.name || target,
            })
            setIsAddingEdge(false)
            return
        }

        // For non-knowledge nodes, create directly
        try {
            const leanEdges = allEdges.map(e => ({ source: e.source, target: e.target }))
            const result = await graphActions.createCustomEdge(source, target, leanEdges)
            if (result.error) { alert(result.error) }
        } catch (err) {
            console.error('[page] Failed to create edge:', err)
        }
        setIsAddingEdge(false)
    }, [selectedNode, isAddingEdge, addingEdgeDirection, allEdges, graphNodes, customNodes])

    const handleEdgeConfigConfirm = useCallback(async (notes: string, strict: boolean) => {
        if (!pendingEdge) return
        try {
            const result = await graphActions.createKnowledgeEdge(pendingEdge.source, pendingEdge.target, notes, strict)
            if (result.error) { alert(result.error) }
        } catch (err) {
            console.error('[page] Failed to create knowledge edge:', err)
        }
        setPendingEdge(null)
    }, [pendingEdge])

    const cancelAddingEdge = useCallback(() => { setIsAddingEdge(false) }, [])

    // ── Save custom node name ──
    const saveCustomNodeName = useCallback(async () => {
        if (!selectedNode || selectedNode.type !== 'custom' || !dialogs.editingCustomNodeNameValue.trim()) {
            dialogs.setIsEditingCustomNodeName(false)
            return
        }
        const newName = dialogs.editingCustomNodeNameValue.trim()
        if (newName !== selectedNode.name) {
            await graphActions.updateCustomNode(selectedNode.id, newName, selectedNode.name)
            setSelectedNodeState(prev => prev ? { ...prev, name: newName } : null)
        }
        dialogs.setIsEditingCustomNodeName(false)
    }, [selectedNode, dialogs.editingCustomNodeNameValue, dialogs.setIsEditingCustomNodeName])

    // ── Undoable filter/physics updates ──
    const updateFilterOptionsUndoable = useCallback(async (newOptions: typeof filterOptions) => {
        if (!projectPath) return
        await viewportActions.updateFilterOptions(projectPath, newOptions, filterOptions, setFilterOptions)
    }, [projectPath, filterOptions, setFilterOptions])

    const updatePhysicsUndoable = useCallback(async (newPhysics: typeof physics) => {
        if (!projectPath) return
        await viewportActions.updatePhysics(projectPath, newPhysics, physics, setPhysics)
    }, [projectPath, physics])

    // Auto-focus when node is added to canvas
    const prevVisibleNodesRef = useRef<string[]>([])
    useEffect(() => {
        if (selectedNode && visibleNodes.includes(selectedNode.id)) {
            if (!prevVisibleNodesRef.current.includes(selectedNode.id)) {
                setFocusNodeId(selectedNode.id)
            }
        }
        prevVisibleNodesRef.current = visibleNodes
    }, [visibleNodes, selectedNode])

    // ── Unified node selection entry point ──
    const selectNode = useCallback((node: GraphNode | null) => {
        setSelectedNode(node)
        setHighlightedPath([])
        if (node) {
            notes.initNote(node.notes || '')
        } else {
            notes.initNote('')
        }
    }, [setSelectedNode, notes])

    // ── Style changes ──
    const handleStyleChange = useCallback(async (nodeId: string, style: { effect?: string; size?: number }) => {
        if (!projectPath) return
        const node = graphNodes.find(n => n.id === nodeId)
        const oldStyle = { effect: node?.customEffect, size: node?.customSize }
        try {
            await graphActions.updateNodeMeta(
                projectPath, nodeId,
                { size: style.size, effect: style.effect },
                { size: oldStyle.size, effect: oldStyle.effect },
                'Change node style'
            )
            reloadMeta()
            loadCanvas()
        } catch (err) {
            console.error('[handleStyleChange] Failed:', err)
        }
    }, [projectPath, reloadMeta, loadCanvas, graphNodes])

    const handleEdgeStyleChange = useCallback(async (edgeId: string, style: { effect?: string; style?: string }) => {
        if (!projectPath) return
        const edge = allEdges.find(e => e.id === edgeId) || customEdges.find(e => e.id === edgeId)
        const oldStyle = { effect: edge?.effect, style: edge?.style }
        try {
            await graphActions.updateEdgeMeta(
                projectPath, edgeId,
                { effect: style.effect, style: style.style },
                { effect: oldStyle.effect, style: oldStyle.style },
                'Change edge style'
            )
            reloadMeta()
            loadCanvas()
        } catch (err) {
            console.error('[handleEdgeStyleChange] Failed:', err)
        }
    }, [projectPath, reloadMeta, loadCanvas, allEdges, customEdges])

    // ── Tool panel toggle ──
    const handleToggleToolView = (tool: 'edges' | 'notes' | 'style' | 'neighbors') => {
        setToolPanelView(toolPanelView === tool ? null : tool)
    }

    const [rightPanelOpen, setRightPanelOpen] = useState(true)
    const [pinnedCardIds, setPinnedCardIds] = useState<string[]>([])

    // ── Initialize canvasStore ──
    useEffect(() => {
        if (projectPath) { setCanvasProjectPath(projectPath); loadCanvas() }
    }, [projectPath, setCanvasProjectPath, loadCanvas])

    // ── Viewport persistence ──
    const { initialViewport, viewportLoaded, handleCameraChange } = useViewportPersistence({
        projectPath, filterOptions, setFilterOptions, setPhysics,
        graphNodes, customNodes, graphEdges: allEdges, customEdges,
        setSelectedNodeState, setEditingNote: notes.setEditingNote,
        setFocusNodeId, setSelectedEdge, setFocusEdgeId,
    })

    // ── Restore UI preferences from viewport ──
    const uiPrefsRestoredRef = useRef(false)
    useEffect(() => {
        if (!initialViewport?.ui_preferences || uiPrefsRestoredRef.current) return
        uiPrefsRestoredRef.current = true
        const prefs = initialViewport.ui_preferences
        if (prefs.layoutPreset) useStore.getState().setLayoutPreset(prefs.layoutPreset as any)
        if (prefs.mainViewTab) useStore.getState().setMainViewTab(prefs.mainViewTab as any)
        if (prefs.searchPanelOpen !== undefined) setSearchPanelOpen(prefs.searchPanelOpen)
        if (prefs.rightPanelOpen !== undefined) setRightPanelOpen(prefs.rightPanelOpen)
        if (prefs.pinnedCardIds) setPinnedCardIds(prefs.pinnedCardIds)
        if (prefs.themeMode) useStore.getState().setThemeMode(prefs.themeMode as any)
    }, [initialViewport])
    useEffect(() => { uiPrefsRestoredRef.current = false }, [projectPath])

    // ── Save UI preferences ──
    const layoutPreset = useStore(s => s.layoutPreset)
    const mainViewTab = useStore(s => s.mainViewTab)
    const themeMode = useStore(s => s.themeMode)
    useUiPreferencesPersistence({
        projectPath,
        viewportLoaded,
        preferences: {
            layoutPreset,
            mainViewTab,
            searchPanelOpen,
            rightPanelOpen,
            pinnedCardIds,
            themeMode,
        },
    })

    // ── Derived graph data ──
    const {
        typeColors, namespaceData, nodeCommunities, namespaceDepthPreview,
        canvasNodes, canvasEdges, namespacesOnCanvas,
        nodesWithHiddenNeighbors, visibleCustomNodes, visibleCustomEdges,
    } = useEditorGraphData({
        graphNodes: allNodes, graphEdges: allEdges, visibleNodes, customNodes, customEdges,
        knowledgeNodeIds: knowledgeNodes.map((kn: any) => kn.id),
        activeLensId, sizeMappingMode, sizeCurveControl, colorMappingMode, layoutClusterMode,
        analysisData, clusteringDepth: physics.clusteringDepth,
        showBridges, highlightedPath,
    })

    // ── Namespace click ──
    const handleNamespaceClick = useCallback((namespace: string) => {
        if (!getPositionsRef.current) return
        const positions = getPositionsRef.current()
        const namespaceGroups = groupNodesByNamespace(canvasNodes as any, physics.clusteringDepth)
        const nodesInNamespace = namespaceGroups.get(namespace)
        if (!nodesInNamespace || nodesInNamespace.length === 0) return
        const nodeIds = new Set(nodesInNamespace.map((n: any) => n.id))
        let sumX = 0, sumY = 0, sumZ = 0, count = 0
        for (const node of nodesInNamespace) {
            const pos = positions.get(node.id)
            if (pos) { sumX += pos[0]; sumY += pos[1]; sumZ += pos[2]; count++ }
        }
        if (count > 0) {
            setFocusClusterPosition([sumX / count, sumY / count, sumZ / count])
            highlightNamespaceUndoable(namespace, nodeIds)
        }
    }, [canvasNodes, physics.clusteringDepth])

    // ── Editor actions ──
    const {
        handleGraphNodeSelect, handleGraphBackgroundClick,
        handleClearCanvas, toggleNodeToRemove: actionToggleNodeToRemove,
        selectAllNodesToRemove, deselectAllNodesToRemove, removeSelectedNodes, clearAllNodes,
        handleResetAllData, confirmResetAllData, handleCreateCustomNode,
        handleSearchResultSelect, handleEdgeSelect, navigateToNode,
        handleJumpToCode, handleJumpToNamespace, handleRefreshCanvas,
        toggleLabels, toggleBridges, openCustomNodeDialog, toggleRemoveMode,
    } = useEditorActions({
        projectPath, graphNodes, customNodes, customEdges, knowledgeNodes, graphEdges: allEdges, visibleNodes,
        namespaceIndex, selectedNode, selectedEdge, isAddingEdge, isRemovingNodes,
        addingEdgeDirection, selectedNodesToRemove: dialogs.selectedNodesToRemove,
        canvasNodes, customNodeName: dialogs.customNodeName, highlightedNamespace,
        reloadGraph, loadCanvas, resetAllData, selectNode, setSelectedNode,
        handleAddCustomEdge, cancelAddingEdge, setSelectedEdge,
        setFocusNodeId, setFocusEdgeId, setFocusClusterPosition,
        setToolPanelView, setSearchPanelKey,
        setShowCustomNodeDialog: dialogs.setShowCustomNodeDialog,
        setCustomNodeName: dialogs.setCustomNodeName,
        setShowResetConfirm: dialogs.setShowResetConfirm,
        setShowReloadPrompt: dialogs.setShowReloadPrompt,
        setShowClearCanvasDialog: dialogs.setShowClearCanvasDialog,
        setSelectedNodesToRemove: dialogs.setSelectedNodesToRemove,
        setShowLabels, setShowBridges, setIsRemovingNodes, setIsAddingEdge,
    })

    const goHome = useCallback(() => { router.push('/') }, [router])

    // ── Early returns for project state ──
    if (!isTauri) return <TauriRequiredView />
    if (!projectPath) return <NoProjectSelectedView onHome={goHome} />

    return (
        <div className="h-full flex flex-col bg-black text-white">
            <EditorTopBar
                projectName={projectName}
                searchPanelOpen={searchPanelOpen}
                rightPanelOpen={rightPanelOpen}
                onHome={goHome}
                onToggleSearchPanel={() => setSearchPanelOpen(!searchPanelOpen)}
                onToggleRightPanel={() => setRightPanelOpen(!rightPanelOpen)}
            />

            <div className="flex-1 min-h-0 flex">
                <PanelGroup direction="horizontal" className="flex-1" autoSaveId="editor-main-v2">
                    <EditorLeftSidebar
                        ctx={{
                            searchPanelOpen, leftPanelMode, setLeftPanelMode, searchPanelKey,
                            selectedNode, handleSearchResultSelect, viewMode,
                            filterOptions, updateFilterOptionsUndoable, physics, updatePhysicsUndoable,
                            analysisData, analysisLoading,
                            sizeMappingMode, setSizeMappingMode, sizeCurveControl, setSizeCurveControl,
                            colorMappingMode, setColorMappingMode, layoutClusterMode, setLayoutClusterMode,
                            namespaceDepthPreview, namespaceData, namespacesOnCanvas, handleNamespaceClick,
                            graphNodes: allNodes, visibleNodes, canvasNodes, handleClearCanvas, handleResetAllData,
                        }}
                    />

                    <Panel id="main-content" defaultSize={75} minSize={30}>
                        <GraphViewport
                            viewMode={viewMode}
                            positionsLoaded={positionsLoaded}
                            canvasNodes={canvasNodes}
                            canvasEdges={canvasEdges}
                            visibleCustomNodes={visibleCustomNodes}
                            visibleCustomEdges={visibleCustomEdges}
                            knowledgeNodes={knowledgeNodes}
                            knowledgeEdges={knowledgeEdges}
                            selectedNode={selectedNode}
                            focusNodeId={focusNodeId}
                            focusEdgeId={focusEdgeId}
                            focusClusterPosition={focusClusterPosition}
                            selectedEdge={selectedEdge}
                            highlightedNamespace={highlightedNamespace}
                            onNodeSelect={handleGraphNodeSelect}
                            onBackgroundClick={handleGraphBackgroundClick}
                            onEdgeSelect={handleEdgeSelect}
                            showLabels={showLabels}
                            initialCameraPosition={initialViewport?.camera_position}
                            initialCameraTarget={initialViewport?.camera_target}
                            onCameraChange={handleCameraChange}
                            physics={physics}
                            isAddingEdge={isAddingEdge}
                            isRemovingNodes={isRemovingNodes}
                            nodesWithHiddenNeighbors={nodesWithHiddenNeighbors}
                            getPositionsRef={getPositionsRef}
                            nodeCommunities={nodeCommunities}
                            onJumpToCode={handleJumpToCode}
                            onJumpToNamespace={handleJumpToNamespace}
                            projectPath={projectPath}
                            graphLoading={graphLoading}
                            toolbarProps={{
                                canvasNodeCount: canvasNodes.length,
                                totalNodeCount: allNodes.length,
                                hideTechnical: filterOptions.hideTechnical,
                                removedNodes: filterStats.removedNodes,
                                orphanedNodes: filterStats.orphanedNodes,
                                onBuildLsp: async () => {},
                                lspBuilding: false,
                                graphLoading,
                                namespaceCount: 0,
                                onRefresh: handleRefreshCanvas,
                                showLabels,
                                onToggleLabels: toggleLabels,
                                showBridges,
                                onToggleBridges: toggleBridges,
                                bridgesAvailable: !!analysisData.bridges && analysisData.bridges.length > 0,
                                onAddCustomNode: async () => { await graphActions.createKnowledgeNode() },
                                isRemovingNodes,
                                onToggleRemoveMode: toggleRemoveMode,
                            }}
                            detailContent={
                                <>
                                    <NodeInspector
                                        selectedNode={selectedNode}
                                        visibleNodes={visibleNodes}
                                        graphNodes={graphNodes}
                                        customNodes={customNodes}
                                        setSelectedNode={setSelectedNode}
                                        handleToggleToolView={handleToggleToolView}
                                        toolPanelView={toolPanelView}
                                        typeColors={typeColors}
                                        handleStyleChange={handleStyleChange}
                                        isEditingCustomNodeName={dialogs.isEditingCustomNodeName}
                                        customNodeNameInputRef={dialogs.customNodeNameInputRef}
                                        editingCustomNodeNameValue={dialogs.editingCustomNodeNameValue}
                                        setEditingCustomNodeNameValue={dialogs.setEditingCustomNodeNameValue}
                                        saveCustomNodeName={saveCustomNodeName}
                                        setIsEditingCustomNodeName={dialogs.setIsEditingCustomNodeName}
                                        editingNote={notes.editingNote}
                                        notesExpanded={notes.notesExpanded}
                                        setNotesExpanded={notes.setNotesExpanded}
                                        isAddingEdge={isAddingEdge}
                                        cancelAddingEdge={cancelAddingEdge}
                                        setAddingEdgeDirection={setAddingEdgeDirection}
                                        setIsAddingEdge={setIsAddingEdge}
                                        setIsRemovingNodes={setIsRemovingNodes}
                                        projectPath={projectPath}
                                        highlightedPath={highlightedPath}
                                        setHighlightedPath={setHighlightedPath}
                                        customEdges={customEdges}
                                        graphLinks={graphLinks}
                                        selectedEdge={selectedEdge}
                                        graphEdges={allEdges}
                                        setSelectedEdge={setSelectedEdge}
                                        setFocusEdgeId={setFocusEdgeId}
                                        navigateToNode={navigateToNode}
                                        handleEdgeStyleChange={handleEdgeStyleChange}
                                        isRemovingNodes={isRemovingNodes}
                                    />
                                    {selectedNode && !knowledgeNodes.some(kn => kn.id === selectedNode.id) && (
                                        <div className="border-t border-white/10 flex flex-col">
                                            <div className="px-3 py-2 text-[10px] font-semibold tracking-wider text-white/50 uppercase">
                                                Notes
                                            </div>
                                            <textarea
                                                value={notes.editingNote}
                                                onChange={(e) => notes.handleNoteChange(e.target.value)}
                                                placeholder="Write notes in Markdown... Supports **bold**, *italic*, $E = mc^2$"
                                                className="w-full bg-transparent text-white/90 text-xs font-mono px-3 pb-3 resize-none focus:outline-none placeholder-white/30 leading-relaxed min-h-[120px]"
                                                spellCheck={false}
                                            />
                                            <div className="px-3 py-1.5 border-t border-white/10 text-[10px] text-white/30">
                                                Markdown supported. Auto-saves as you type.
                                            </div>
                                        </div>
                                    )}
                                </>
                            }
                        />
                    </Panel>

                    <InspectorPanel
                        rightPanelVisible={rightPanelOpen}
                        pinnedCardIds={pinnedCardIds}
                        nodeClickCount={nodeClickCount}
                        onPinCard={(id: string) => {
                            setPinnedCardIds(prev => prev.includes(id) ? prev : [...prev, id])
                        }}
                        onUnpinCard={(id: string) => {
                            setPinnedCardIds(prev => prev.filter(x => x !== id))
                        }}
                        connections={{
                            selectedNode,
                            isAddingEdge,
                            cancelAddingEdge,
                            setAddingEdgeDirection,
                            setIsAddingEdge,
                            setIsRemovingNodes,
                            projectPath,
                            highlightedPath,
                            setHighlightedPath,
                            customEdges,
                            graphLinks,
                            graphNodes,
                            customNodes,
                            typeColors,
                            visibleNodes,
                            selectedEdge,
                            graphEdges: allEdges,
                            setSelectedEdge,
                            setFocusEdgeId,
                            navigateToNode,
                            handleEdgeStyleChange,
                            handleStyleChange,
                        }}
                    />
                </PanelGroup>
            </div>

            <EditorStatusBar
                projectName={projectName}
                selectedNode={selectedNode}
            />

            <EditorOverlays
                ctx={{
                    showCustomNodeDialog: dialogs.showCustomNodeDialog,
                    setShowCustomNodeDialog: dialogs.setShowCustomNodeDialog,
                    customNodeName: dialogs.customNodeName,
                    setCustomNodeName: dialogs.setCustomNodeName,
                    handleCreateCustomNode,
                    showResetConfirm: dialogs.showResetConfirm,
                    setShowResetConfirm: dialogs.setShowResetConfirm,
                    confirmResetAllData,
                    showReloadPrompt: dialogs.showReloadPrompt,
                    setShowReloadPrompt: dialogs.setShowReloadPrompt,
                    showClearCanvasDialog: dialogs.showClearCanvasDialog,
                    setShowClearCanvasDialog: dialogs.setShowClearCanvasDialog,
                    canvasNodes,
                    selectedNodesToRemove: dialogs.selectedNodesToRemove,
                    toggleNodeToRemove: actionToggleNodeToRemove,
                    selectAllNodesToRemove,
                    deselectAllNodesToRemove,
                    removeSelectedNodes,
                    clearAllNodes,
                    pendingEdge,
                    handleEdgeConfigConfirm,
                    setPendingEdge,
                }}
            />
        </div>
    )
}

export default function LocalEditPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-white/60">Loading...</div>
            </div>
        }>
            <LocalEditorContent />
        </Suspense>
    )
}
