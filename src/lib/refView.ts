/**
 * Reference View — pure functions for the "all entries as nodes" visualization.
 *
 * Every astrolabe entry becomes a node.
 * Every ref relationship becomes a directed link (source → target).
 * Color by degree, size inversely proportional to degree.
 */

// ── Degree colors ──

export const DEGREE_COLORS: Record<number, string> = {
  0: '#1a1a2e',  // atoms: dark (important, large)
  1: '#3b82f6',  // 1-simplices: blue
  2: '#ef4444',  // 2-simplices: red
  3: '#8b5cf6',  // 3-forms: purple
  4: '#22c55e',  // 4-forms: green
}

function getDegreeColor(degree: number): string {
  if (degree in DEGREE_COLORS) return DEGREE_COLORS[degree]
  // Fallback: cycle through hues for degree >= 5
  const hue = (degree * 67) % 360
  return `hsl(${hue}, 60%, 55%)`
}

// ── Degree radius ──

export function degreeRadius(degree: number, baseRadius: number = 8): number {
  return Math.max(3, baseRadius - degree * 1.5)
}

// ── Types ──

export interface RefViewNode {
  id: string
  degree: number
  stage: number
  name?: string
  sort?: string
  color: string
  radius: number
  x?: number
  y?: number
  fx?: number | null
  fy?: number | null
}

export interface RefViewLink {
  source: string
  target: string
  position: number
}

// ── Builders ──

export function buildRefViewNodes(
  rawNodes: { id: string; degree: number; stage: number; name?: string; sort?: string }[],
): RefViewNode[] {
  return rawNodes.map(n => ({
    id: n.id,
    degree: n.degree,
    stage: n.stage,
    name: n.name,
    sort: n.sort,
    color: getDegreeColor(n.degree),
    radius: degreeRadius(n.degree),
  }))
}

export function buildRefViewLinks(
  rawLinks: { source: string; target: string; position: number }[],
): RefViewLink[] {
  return rawLinks.map(l => ({
    source: l.source,
    target: l.target,
    position: l.position,
  }))
}

// ── Collapse geometry ──

export function computeCollapseTarget(
  ref: string[],
  nodePositions: Record<string, { x: number; y: number }>,
): { x: number; y: number } {
  let sumX = 0
  let sumY = 0
  let count = 0
  for (const h of ref) {
    const pos = nodePositions[h]
    if (pos) {
      sumX += pos.x
      sumY += pos.y
      count++
    }
  }
  if (count === 0) return { x: 0, y: 0 }
  return { x: sumX / count, y: sumY / count }
}
