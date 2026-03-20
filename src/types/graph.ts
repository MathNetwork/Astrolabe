/**
 * Astrolabe Graph Types
 *
 * Unified Node and Edge type definitions
 * This is the sole source of Node/Edge types for the entire project
 */

// rendering functor L: A(Σ) → P (d3-force implementation)

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

