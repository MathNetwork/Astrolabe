/**
 * Astrolabe Graph Types
 *
 * Unified Node and Edge type definitions
 * This is the sole source of Node/Edge types for the entire project
 */

import { getObjectSort } from '../lib/sortConfig'

// ============================================
// 基础枚举类型
// ============================================

export type ObjectSort = string  // Free-form: presets (theorem, lemma, definition, ...) or any custom sort
export type NodeKind = ObjectSort  // Compat alias

export type NodeStatus =
  | 'proven'   // Proof complete, no sorry
  | 'sorry'    // Has sorry, proof incomplete
  | 'error'    // Has compilation errors
  | 'stated'   // Declaration only, no proof content
  | 'unknown'  // Status unknown

// ============================================
// Node type
// ============================================

export interface AstroNode {
  // Identity
  id: string
  name: string

  // Classification
  sort: NodeKind
  status: NodeStatus

  // Content (from meta.json user edit)
  notes?: string         // User notes

  // Default styles (obtained from theme based on sort)
  defaultColor: string
  defaultSize: number
  defaultShape: string

  // Visual style overrides (from meta.json user edit)
  // Note: color removed - always use defaultColor based on sort
  size?: number
  shape?: string
  effect?: string

  // Layout
  position?: { x: number; y: number; z: number }  // 3D position (optional, from backend)
  pinned: boolean
  visible: boolean
}

// ============================================
// Edge type
// ============================================

export interface AstroEdge {
  // Identity (source-target combination)
  id: string
  source: string
  target: string

  // Source marker
  fromLean: boolean  // From Lean code analysis

  // Default styles (obtained from theme based on fromLean)
  defaultColor: string
  defaultWidth: number
  defaultStyle: string  // 'solid' | 'dashed' | 'polyline'

  // Semantic
  strict?: boolean   // Strict (solid) or weak (dashed) dependency

  // Visual style overrides (from meta.json user edit)
  // Note: color and width removed - always use defaults based on fromLean
  style?: string
  effect?: string
  notes?: string
  visible: boolean

  // Shortcut edge info (for virtual edges that skip technical nodes)
  skippedNodes?: string[]  // IDs of technical nodes that this edge bypasses
}

// ============================================
// Legacy compatibility type aliases (for transition period)
// ============================================

/** @deprecated Use AstroNode instead */
export interface GraphNode {
  id: string
  name: string
  type: NodeKind  // Old code uses type, new code uses sort
  status: NodeStatus
  notes?: string  // User notes
  customColor?: string
  customSize?: number
  customEffect?: string
  x?: number
  y?: number
  z?: number
}

/** @deprecated Use AstroEdge instead */
export interface GraphLink {
  source: string
  target: string
  type?: 'latex' | 'lean' | 'both'
}

// ============================================
// Conversion functions
// ============================================

/**
 * Convert old GraphNode to new AstroNode
 */
export function toAstroNode(old: GraphNode): AstroNode {
  const sortVisual = getObjectSort(old.type)
  return {
    id: old.id,
    name: old.name,
    sort: old.type,
    status: old.status,
    notes: old.notes,
    // Default styles from sort config
    defaultColor: old.customColor ?? sortVisual.color,
    defaultSize: old.customSize ?? 1.0,
    defaultShape: 'circle',
    // User overrides (color removed)
    size: old.customSize,
    position: (old.x !== undefined && old.y !== undefined && old.z !== undefined)
      ? { x: old.x, y: old.y, z: old.z }
      : undefined,
    pinned: false,
    visible: true,
  }
}

/**
 * Convert new AstroNode to old GraphNode (legacy code compatibility)
 */
export function toGraphNode(node: AstroNode): GraphNode {
  return {
    id: node.id,
    name: node.name,
    type: node.sort,
    status: node.status,
    notes: node.notes,
    customColor: node.defaultColor,  // Use default color
    customSize: node.size,
    x: node.position?.x,
    y: node.position?.y,
    z: node.position?.z,
  }
}

/**
 * Convert old GraphLink to new AstroEdge
 */
export function toAstroEdge(old: GraphLink): AstroEdge {
  const fromLean = old.type === 'lean' || old.type === 'both'
  return {
    id: `${old.source}->${old.target}`,
    source: old.source,
    target: old.target,
    fromLean,
    // Default styles
    defaultColor: fromLean ? '#2ecc71' : '#888888',
    defaultWidth: fromLean ? 1.0 : 0.8,
    defaultStyle: fromLean ? 'solid' : 'dashed',
    visible: true,
  }
}

/**
 * Convert new AstroEdge to old GraphLink (legacy code compatibility)
 */
export function toGraphLink(edge: AstroEdge): GraphLink {
  return {
    source: edge.source,
    target: edge.target,
    type: 'lean',
  }
}
