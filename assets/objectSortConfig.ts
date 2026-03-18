/**
 * Centralized object sort → shape/color mapping for knowledge nodes.
 *
 * In category-theoretic terms, node kinds are object sorts
 * in a multi-sorted category. This file mirrors morphismSortConfig.ts
 * which handles morphism sorts (edge relations).
 *
 * Two families (matching OpenPoincaré visual spec):
 *   • Network Objects — polyhedra (formal mathematical content)
 *   • Meta-cognitive Objects — organic/rounded (annotations & observations)
 *
 * Import this from any layer (useGraphData, ForceGraph3D, UI panels, etc.)
 * instead of hardcoding shape/color lookups.
 */

export interface ObjectSortVisual {
  shape: string
  color: string
  size?: number  // relative size multiplier (default 1.0)
}

export const OBJECT_SORT_CONFIG: Record<string, ObjectSortVisual> = {
  // Network objects (polyhedra)
  definition:  { shape: 'box',            color: '#5B8FB9' },   // steel blue
  theorem:     { shape: 'dodecahedron',   color: '#D4A843' },   // gold
  lemma:       { shape: 'icosahedron',    color: '#3AAFA9' },   // teal
  proposition: { shape: 'octahedron',     color: '#B8963E' },   // dark gold
  corollary:   { shape: 'tetrahedron',    color: '#9B72CF' },   // lavender
  example:     { shape: 'cylinder',       color: '#2ECC71' },   // green
  axiom:       { shape: 'cone',           color: '#4A90D9' },   // blue

  // Meta-cognitive objects (organic/rounded)
  remark:      { shape: 'ring',           color: '#7B68AE' },   // blue-purple
  conjecture:  { shape: 'cinquefoilKnot', color: '#D4A843' },   // amber/gold
  insight:     { shape: 'torus',          color: '#E8D44D' },   // yellow
  question:    { shape: 'capsule',        color: '#E74C6F' },   // pink-red
  connection:  { shape: 'fatTorus',       color: '#2EC4B6' },   // teal-cyan
  summary:     { shape: 'sphere',         color: '#9B59B6' },   // purple
  gap:         { shape: 'trefoilKnot',    color: '#E06C5F' },   // coral-red
  motivation:  { shape: 'longCapsule',    color: '#5EBA7D' },   // green

  // Lean node types
  structure:   { shape: 'box',            color: '#1abc9c' },
  class:       { shape: 'dodecahedron',   color: '#3498db' },
  instance:    { shape: 'octahedron',     color: '#669aba' },

  // Bibliography
  reference:   { shape: 'cylinder',       color: '#708090', size: 1.8 },   // slate gray, larger

  // Legacy / extra aliases
  method:      { shape: 'octahedron',     color: '#95a5a6' },
  open_question: { shape: 'capsule',      color: '#e67e22' },
  technique:   { shape: 'capsule',        color: '#1abc9c' },
  heuristic:   { shape: 'cone',           color: '#3498db' },
  analogy:     { shape: 'torusKnot',      color: '#669aba' },
}

/** Default visual for unknown object sorts */
export const OBJECT_SORT_DEFAULT: ObjectSortVisual = {
  shape: 'sphere',
  color: '#A1A1AA',
}

/**
 * Dynamic custom sort override from project's sorts.json.
 * Set by useProjectLoader when a project has .netmath/sorts.json.
 */
let customSortConfig: Record<string, ObjectSortVisual> | null = null

/** Override default sorts with project-specific config */
export function setCustomSortConfig(config: Record<string, { color: string }> | null) {
  if (!config) { customSortConfig = null; return }
  customSortConfig = {}
  for (const [sort, { color }] of Object.entries(config)) {
    customSortConfig[sort] = { shape: 'sphere', color }
  }
}

/** Get the visual config for a given object sort (custom → default → fallback) */
export function getObjectSort(kind: string | undefined): ObjectSortVisual {
  if (!kind) return OBJECT_SORT_DEFAULT
  return customSortConfig?.[kind] || OBJECT_SORT_CONFIG[kind] || OBJECT_SORT_DEFAULT
}

// ── Backward-compatible re-exports ──
// TODO: Remove these once all consumers are migrated
export const NODE_KIND_CONFIG = OBJECT_SORT_CONFIG
export const NODE_KIND_DEFAULT = OBJECT_SORT_DEFAULT
export const getNodeKindVisual = getObjectSort
export type NodeKindVisual = ObjectSortVisual
