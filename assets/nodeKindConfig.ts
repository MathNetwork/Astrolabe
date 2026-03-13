/**
 * Centralized kind → shape/color mapping for knowledge nodes.
 *
 * Two families (matching OpenPoincaré visual spec):
 *   • Network Nodes — polyhedra (formal mathematical content)
 *   • Meta-cognitive Nodes — organic/rounded (annotations & observations)
 *
 * Import this from any layer (useGraphData, ForceGraph3D, UI panels, etc.)
 * instead of hardcoding shape/color lookups.
 */

export interface NodeKindVisual {
  shape: string
  color: string
}

// ── Network Nodes (polyhedra family) ──
// ── Meta-cognitive Nodes (organic/rounded family) ──
// ── Legacy / extra aliases ──
export const NODE_KIND_CONFIG: Record<string, NodeKindVisual> = {
  // Network nodes (polyhedra)
  definition:  { shape: 'box',            color: '#5B8FB9' },   // steel blue
  theorem:     { shape: 'dodecahedron',   color: '#D4A843' },   // gold
  lemma:       { shape: 'icosahedron',    color: '#3AAFA9' },   // teal
  proposition: { shape: 'octahedron',     color: '#B8963E' },   // dark gold
  corollary:   { shape: 'tetrahedron',    color: '#9B72CF' },   // lavender
  example:     { shape: 'cylinder',       color: '#2ECC71' },   // green
  axiom:       { shape: 'cone',           color: '#4A90D9' },   // blue

  // Meta-cognitive nodes (organic/rounded)
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

  // Legacy / extra aliases
  method:      { shape: 'octahedron',     color: '#95a5a6' },
  open_question: { shape: 'capsule',      color: '#e67e22' },
  technique:   { shape: 'capsule',        color: '#1abc9c' },
  heuristic:   { shape: 'cone',           color: '#3498db' },
  analogy:     { shape: 'torusKnot',      color: '#669aba' },
}

/** Default visual for unknown kinds */
export const NODE_KIND_DEFAULT: NodeKindVisual = {
  shape: 'sphere',
  color: '#A1A1AA',
}

/** Get the visual config for a given kind (with fallback) */
export function getNodeKindVisual(kind: string | undefined): NodeKindVisual {
  if (!kind) return NODE_KIND_DEFAULT
  return NODE_KIND_CONFIG[kind] || NODE_KIND_DEFAULT
}
