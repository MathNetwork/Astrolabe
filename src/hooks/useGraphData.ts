/**
 * useGraphData Hook
 *
 * Reads knowledge data from canvasStore and converts to NetMathNode/NetMathEdge
 * for downstream consumers (useEditorGraphData, NodeInspector, ConnectionsPanel, etc.)
 */

import { useState, useCallback, useMemo } from 'react'
import type {
  NetMathNode,
  NetMathEdge,
  GraphNode,
  GraphLink,
} from '@/types/graph'
import {
  processGraph,
  type GraphFilterOptions,
  DEFAULT_FILTER_OPTIONS,
} from '@/lib/graphProcessing'
import { useCanvasStore } from '@/lib/canvasStore'
import { profiler } from '@/lib/profiler'

// Re-export types for backward compatibility
export type { GraphNode, GraphLink } from '@/types/graph'
export type { GraphFilterOptions } from '@/lib/graphProcessing'
export { DEFAULT_FILTER_OPTIONS } from '@/lib/graphProcessing'

export interface FilterStats {
  removedNodes: number
  virtualEdgesCreated: number
  orphanedNodes: number
  transitiveEdgesRemoved: number
}

export interface GraphData {
  // Processed (filtered) nodes/edges
  nodes: NetMathNode[]
  edges: NetMathEdge[]

  // Raw data counts
  rawNodeCount: number
  rawEdgeCount: number

  // Legacy compatibility
  legacyNodes: GraphNode[]
  links: GraphLink[]

  loading: boolean
  reload: () => void
  reloadMeta: () => void

  // Filtering
  filterOptions: GraphFilterOptions
  setFilterOptions: (options: GraphFilterOptions) => void
  filterStats: FilterStats
}

export function useGraphData(projectPath: string): GraphData {
  const knowledgeNodes = useCanvasStore(s => s.knowledgeNodes)
  const knowledgeEdges = useCanvasStore(s => s.knowledgeEdges)
  const reloadKnowledge = useCanvasStore(s => s.reloadKnowledge)
  const loadCanvas = useCanvasStore(s => s.loadCanvas)

  const [filterOptions, setFilterOptions] = useState<GraphFilterOptions>(DEFAULT_FILTER_OPTIONS)

  const reload = useCallback(() => {
    loadCanvas()
  }, [loadCanvas])

  const reloadMeta = useCallback(() => {
    reloadKnowledge()
  }, [reloadKnowledge])

  // Convert knowledge nodes to NetMathNode format
  const rawNodes: NetMathNode[] = useMemo(() => {
    return knowledgeNodes.map(kn => ({
      id: kn.id,
      name: kn.name,
      kind: kn.kind as NetMathNode['kind'],
      status: kn.status as NetMathNode['status'],
      notes: kn.notes || '',
      defaultColor: kn.style?.color || '#888',
      defaultSize: kn.style?.size || 1.0,
      defaultShape: kn.style?.shape || 'sphere',
      position: kn.position,
      pinned: true,  // Knowledge nodes are user-created; never filter as orphans
      visible: true,
    }))
  }, [knowledgeNodes])

  // Convert knowledge edges to NetMathEdge format
  const rawEdges: NetMathEdge[] = useMemo(() => {
    return knowledgeEdges.map(ke => ({
      id: ke.id,
      source: ke.source,
      target: ke.target,
      fromLean: false,
      defaultColor: ke.strict ? '#aaa' : '#555',
      defaultWidth: ke.strict ? 1.5 : 1,
      defaultStyle: ke.strict ? 'solid' : 'dashed',
      relation: ke.relation,
      strict: ke.strict,
      visible: true,
      notes: ke.notes || '',
    }))
  }, [knowledgeEdges])

  // Apply graph processing (filtering + through-links)
  const { nodes, edges, stats: filterStats } = useMemo(
    () => {
      const t0 = performance.now()
      const result = processGraph(rawNodes, rawEdges, filterOptions)
      profiler.recordOneShot('graph.processGraph', performance.now() - t0, {
        inputNodes: rawNodes.length,
        outputNodes: result.nodes.length,
      })
      return result
    },
    [rawNodes, rawEdges, filterOptions]
  )

  // Legacy compatibility
  const legacyNodes: GraphNode[] = nodes.map(node => ({
    id: node.id,
    name: node.name,
    type: node.kind,
    status: node.status,
    notes: node.notes,
    customColor: node.defaultColor,
    customSize: node.size ?? node.defaultSize,
    customEffect: node.effect,
    x: node.position?.x,
    y: node.position?.y,
    z: node.position?.z,
  }))

  const links: GraphLink[] = edges.map(edge => ({
    source: edge.source,
    target: edge.target,
    type: 'lean' as const,
  }))

  return {
    nodes,
    edges,
    rawNodeCount: rawNodes.length,
    rawEdgeCount: rawEdges.length,
    legacyNodes,
    links,
    loading: false,
    reload,
    reloadMeta,
    filterOptions,
    setFilterOptions,
    filterStats,
  }
}
