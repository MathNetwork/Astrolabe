// @ts-nocheck
import { useCallback } from 'react'
import { graphActions } from '@/lib/history/graphActions'
import { clearHighlightUndoable } from '@/lib/history/selectionActions'
import { updateViewport } from '@/lib/api'
import type { GraphNode } from '@/hooks/useGraphData'
import type { NodeKind } from '@/types/graph'
import type { SearchResult } from '@/lib/canvasStore'
import type { Node } from '@/lib/store'

export function useEditorActions(ctx: any) {
    const {
        projectPath,
        graphNodes,
        customNodes,
        customEdges,
        graphEdges,
        visibleNodes,
        namespaceIndex,
        selectedNode,
        selectedEdge,
        isAddingEdge,
        isRemovingNodes,
        addingEdgeDirection,
        selectedNodesToRemove,
        canvasNodes,
        customNodeName,
        highlightedNamespace,
        reloadGraph,
        loadCanvas,
        resetAllData,
        selectNode,
        setSelectedNode,
        handleAddCustomEdge,
        cancelAddingEdge,
        setSelectedEdge,
        setFocusNodeId,
        setFocusEdgeId,
        setFocusClusterPosition,
        setToolPanelView,
        setSearchPanelKey,
        setShowCustomNodeDialog,
        setCustomNodeName,
        setShowResetConfirm,
        setShowReloadPrompt,
        setShowClearCanvasDialog,
        setSelectedNodesToRemove,
        setShowLabels,
        setShowBridges,
        setIsRemovingNodes,
        setIsAddingEdge,
    } = ctx

    const handleCanvasNodeClick = useCallback((node: Node | null) => {
        setSelectedEdge(null)

        if (!node) {
            if (isAddingEdge) {
                cancelAddingEdge()
            }
            if (isRemovingNodes) {
                setIsRemovingNodes(false)
            }
            setSelectedNode(null)
            return
        }

        if (isRemovingNodes) {
            // Knowledge nodes need to be fully deleted (not just removed from canvas)
            const knNode = ctx.knowledgeNodes?.find((kn: any) => kn.id === node.id)
            if (knNode) {
                graphActions.deleteKnowledgeNode(node.id, knNode.name || node.id)
            } else {
                graphActions.removeNodeFromCanvas(node.id)
            }
            if (selectedNode?.id === node.id) {
                setSelectedNode(null)
            }
            return
        }

        if (isAddingEdge && selectedNode) {
            handleAddCustomEdge(node.id)
            return
        }

        if (node.id.startsWith('group:')) {
            const namespace = node.id.replace('group:', '')
            setFocusNodeId(node.id)

            return
        }

        // Knowledge nodes
        const knNode = ctx.knowledgeNodes?.find((kn: any) => kn.id === node.id)
        if (knNode) {
            const fakeGraphNode: GraphNode = {
                id: knNode.id,
                name: knNode.name,
                type: knNode.sort || 'insight',
                status: knNode.status === 'proven' ? 'proven' : knNode.status === 'wip' ? 'sorry' : 'stated',

                notes: knNode.notes,
            }
            selectNode(fakeGraphNode)
            return
        }

        const customNode = customNodes.find((cn: any) => cn.id === node.id)
        if (customNode) {
            const fakeGraphNode: GraphNode = {
                id: customNode.id,
                name: customNode.name,
                type: 'custom',
                status: 'unknown',
                notes: customNode.notes,

            }
            selectNode(fakeGraphNode)
            return
        }

        const graphNode = graphNodes.find((gn: any) => gn.id === node.id)
        if (graphNode) {
            selectNode(graphNode)
        }
    }, [graphNodes, customNodes, selectNode, setSelectedNode, isAddingEdge, selectedNode, handleAddCustomEdge, cancelAddingEdge, isRemovingNodes, setSelectedEdge, setIsRemovingNodes, setFocusNodeId, namespaceIndex, projectPath])

    const handleGraphNodeSelect = useCallback((node: Node | null) => {
        if (highlightedNamespace && node && !highlightedNamespace.nodeIds.has(node.id)) {
            clearHighlightUndoable()
            setFocusClusterPosition(null)
        }
        handleCanvasNodeClick(node)
    }, [highlightedNamespace, handleCanvasNodeClick, setFocusClusterPosition])

    const handleGraphBackgroundClick = useCallback(() => {
        clearHighlightUndoable()
        setFocusClusterPosition(null)
    }, [setFocusClusterPosition])

    const handleClearCanvas = useCallback(() => {
        setSelectedNodesToRemove(new Set())
        setShowClearCanvasDialog(true)
    }, [setSelectedNodesToRemove, setShowClearCanvasDialog])

    const toggleNodeToRemove = useCallback((nodeId: string) => {
        setSelectedNodesToRemove((prev: Set<string>) => {
            const newSet = new Set(prev)
            if (newSet.has(nodeId)) {
                newSet.delete(nodeId)
            } else {
                newSet.add(nodeId)
            }
            return newSet
        })
    }, [setSelectedNodesToRemove])

    const selectAllNodesToRemove = useCallback(() => {
        const allIds = canvasNodes.map((n: any) => n.id)
        setSelectedNodesToRemove(new Set(allIds))
    }, [canvasNodes, setSelectedNodesToRemove])

    const deselectAllNodesToRemove = useCallback(() => {
        setSelectedNodesToRemove(new Set())
    }, [setSelectedNodesToRemove])

    const removeSelectedNodes = useCallback(async () => {
        const knowledgeNodeIds = new Set((ctx.knowledgeNodes || []).map((kn: any) => kn.id))
        for (const nodeId of selectedNodesToRemove) {
            if (knowledgeNodeIds.has(nodeId)) {
                const kn = ctx.knowledgeNodes?.find((n: any) => n.id === nodeId)
                await graphActions.deleteKnowledgeNode(nodeId, kn?.name || nodeId)
            } else {
                await graphActions.removeNodeFromCanvas(nodeId)
            }
        }
        setSelectedNodesToRemove(new Set())
        setSelectedNode(null)
        if (selectedNodesToRemove.size === canvasNodes.length) {
            setShowClearCanvasDialog(false)
        }
    }, [selectedNodesToRemove, setSelectedNode, canvasNodes.length, setSelectedNodesToRemove, setShowClearCanvasDialog, ctx.knowledgeNodes])

    const clearAllNodes = useCallback(async () => {
        await graphActions.clearCanvas()
        setSelectedNode(null)
        setShowClearCanvasDialog(false)
    }, [setSelectedNode, setShowClearCanvasDialog])

    const handleResetAllData = useCallback(() => {
        setShowResetConfirm(true)
    }, [setShowResetConfirm])

    const confirmResetAllData = useCallback(async () => {
        await resetAllData()
        setSelectedNode(null)
        setShowResetConfirm(false)
        setShowReloadPrompt(true)
    }, [resetAllData, setSelectedNode, setShowResetConfirm, setShowReloadPrompt])

    const handleCreateCustomNode = useCallback(async () => {
        const name = customNodeName.trim()
        if (!name) return

        const id = `custom-${Date.now()}`
        await graphActions.createCustomNode(id, name)

        setShowCustomNodeDialog(false)
        setCustomNodeName('')
        console.log('[page] Created custom node:', id, name)
    }, [customNodeName, setShowCustomNodeDialog, setCustomNodeName])

    const handleSearchResultSelect = useCallback((result: SearchResult) => {
        if (result.sort === 'custom') {
            const customNode = customNodes.find((cn: any) => cn.id === result.id)
            if (customNode) {
                const fakeGraphNode: GraphNode = {
                    id: customNode.id,
                    name: customNode.name,
                    type: 'custom',
                    status: 'proven',

                    notes: customNode.notes || '',
                }
                selectNode(fakeGraphNode)
                setFocusNodeId(customNode.id)
            }
            return
        }

        const isOnCanvas = visibleNodes.includes(result.id)
        const matchingNode = graphNodes.find((node: any) => node.id === result.id)

        const nodeToSelect: GraphNode = matchingNode || {
            id: result.id,
            name: result.name,
            type: result.sort as NodeKind,
            status: (result.status as any) || 'stated',

            notes: '',
        }
        selectNode(nodeToSelect)

        if (isOnCanvas) {
            setFocusNodeId(result.id)
        }
    }, [graphNodes, visibleNodes, selectNode, customNodes, setFocusNodeId])

    const handleEdgeSelect = useCallback((edge: { id: string; source: string; target: string } | null) => {
        if (!edge) {
            setSelectedEdge(null)
            if (projectPath) {
                updateViewport(projectPath, { selected_edge_id: '' }).catch((err) => {
                    console.error('[page] Failed to clear selected edge:', err)
                })
            }
            return
        }
        const sourceNode = graphNodes.find((n: any) => n.id === edge.source) || customNodes.find((n: any) => n.id === edge.source)
        const targetNode = graphNodes.find((n: any) => n.id === edge.target) || customNodes.find((n: any) => n.id === edge.target)
        const edgeData = graphEdges.find((e: any) => e.id === edge.id)
        const customEdge = customEdges.find((e: any) => e.id === edge.id)
        if (selectedEdge?.id === edge.id) {
            setSelectedEdge(null)
            if (projectPath) {
                updateViewport(projectPath, { selected_edge_id: '' }).catch((err) => {
                    console.error('[page] Failed to clear selected edge:', err)
                })
            }
        } else {
            setSelectedEdge({
                id: edge.id,
                source: edge.source,
                target: edge.target,
                sourceName: sourceNode?.name || edge.source,
                targetName: targetNode?.name || edge.target,
                style: edgeData?.style ?? customEdge?.style,
                effect: edgeData?.effect ?? customEdge?.effect,
                defaultStyle: edgeData?.defaultStyle ?? (customEdge ? 'dashed' : 'solid'),
                skippedNodes: edgeData?.skippedNodes,
            })
            setFocusEdgeId(edge.id)
            setToolPanelView('edges')
            if (projectPath) {
                updateViewport(projectPath, { selected_edge_id: edge.id }).catch((err) => {
                    console.error('[page] Failed to save selected edge:', err)
                })
            }
        }
    }, [graphNodes, customNodes, graphEdges, customEdges, selectedEdge, projectPath, setSelectedEdge, setFocusEdgeId, setToolPanelView])

    const navigateToNode = useCallback((nodeId: string) => {
        // Knowledge nodes
        const knNode = ctx.knowledgeNodes?.find((kn: any) => kn.id === nodeId)
        if (knNode) {
            const fakeGraphNode: GraphNode = {
                id: knNode.id,
                name: knNode.name,
                type: knNode.sort || 'insight',
                status: knNode.status === 'proven' ? 'proven' : knNode.status === 'wip' ? 'sorry' : 'stated',

                notes: knNode.notes,
            }
            selectNode(fakeGraphNode)
            setFocusNodeId(knNode.id)
            return
        }

        const customNode = customNodes.find((cn: any) => cn.id === nodeId)
        if (customNode) {
            const fakeGraphNode: GraphNode = {
                id: customNode.id,
                name: customNode.name,
                type: 'custom',
                status: 'unknown',
                notes: customNode.notes,

            }
            selectNode(fakeGraphNode)
            setFocusNodeId(customNode.id)
            return
        }

        const graphNode = graphNodes.find((n: any) => n.id === nodeId)
        if (graphNode) {
            selectNode(graphNode)
            setFocusNodeId(nodeId)
        }
    }, [graphNodes, customNodes, selectNode, setFocusNodeId])

    const handleJumpToCode = useCallback((_filePath: string, _lineNumber: number) => {
        // Code viewer removed - no-op
    }, [])

    const handleJumpToNamespace = useCallback(async (_namespace: string) => {
        // Code viewer removed - no-op
    }, [])

    const handleRefreshCanvas = useCallback(async () => {
        console.log('[Canvas] Refresh clicked')
        await reloadGraph()
        loadCanvas()
        setSearchPanelKey((k: number) => k + 1)
    }, [reloadGraph, loadCanvas, setSearchPanelKey])

    const toggleLabels = useCallback(() => {
        setShowLabels((prev: boolean) => !prev)
    }, [setShowLabels])

    const toggleBridges = useCallback(() => {
        setShowBridges((prev: boolean) => !prev)
    }, [setShowBridges])

    const openCustomNodeDialog = useCallback(() => {
        setShowCustomNodeDialog(true)
    }, [setShowCustomNodeDialog])

    const toggleRemoveMode = useCallback(() => {
        setIsRemovingNodes((prev: boolean) => {
            const next = !prev
            if (next) {
                setIsAddingEdge(false)
            }
            return next
        })
    }, [setIsRemovingNodes, setIsAddingEdge])

    return {
        handleCanvasNodeClick,
        handleGraphNodeSelect,
        handleGraphBackgroundClick,
        handleClearCanvas,
        toggleNodeToRemove,
        selectAllNodesToRemove,
        deselectAllNodesToRemove,
        removeSelectedNodes,
        clearAllNodes,
        handleResetAllData,
        confirmResetAllData,
        handleCreateCustomNode,
        handleSearchResultSelect,
        handleEdgeSelect,
        navigateToNode,
        handleJumpToCode,
        handleJumpToNamespace,
        handleRefreshCanvas,
        toggleLabels,
        toggleBridges,
        openCustomNodeDialog,
        toggleRemoveMode,
    }
}
