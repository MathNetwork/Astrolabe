/**
 * useGraphData Hook
 *
 * Simplified for knowledge-only projects.
 * Returns empty nodes/edges since knowledge data is loaded via canvasStore.
 * Keeps filter processing logic for any future use.
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
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
  const [rawNodes] = useState<NetMathNode[]>([])
  const [rawEdges] = useState<NetMathEdge[]>([])
  const [loading] = useState(false)
  const [filterOptions, setFilterOptions] = useState<GraphFilterOptions>(DEFAULT_FILTER_OPTIONS)

  const reload = useCallback(() => {
    // No-op: knowledge data is managed by canvasStore
    console.log('[useGraphData] reload called (no-op for knowledge-only)')
  }, [])

  const reloadMeta = useCallback(() => {
    // No-op: knowledge data is managed by canvasStore
    console.log('[useGraphData] reloadMeta called (no-op for knowledge-only)')
  }, [])

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
    leanFilePath: node.leanFile?.path,
    leanLineNumber: node.leanFile?.line,
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
    type: 'lean',
  }))

  return {
    nodes,
    edges,
    rawNodeCount: rawNodes.length,
    rawEdgeCount: rawEdges.length,
    legacyNodes,
    links,
    loading,
    reload,
    reloadMeta,
    filterOptions,
    setFilterOptions,
    filterStats,
  }
}
