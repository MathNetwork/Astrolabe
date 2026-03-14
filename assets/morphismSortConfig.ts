/**
 * Centralized morphism sort → visual mapping for knowledge edges.
 *
 * In category-theoretic terms, edge relations are morphism sorts
 * in a multi-sorted category. This file mirrors objectSortConfig.ts
 * which handles object sorts (node kinds).
 *
 * Import this from any layer (inspector, dialogs, force graph, etc.)
 * instead of hardcoding relation lookups.
 */

export interface MorphismSortVisual {
  color: string
  label: string
}

export const MORPHISM_SORT_CONFIG: Record<string, MorphismSortVisual> = {
  proves:      { color: '#22c55e', label: 'Proves' },
  uses:        { color: '#3b82f6', label: 'Uses' },
  motivates:   { color: '#f59e0b', label: 'Motivates' },
  contradicts: { color: '#ef4444', label: 'Contradicts' },
  related:     { color: '#6b7280', label: 'Related' },
}

/** Default visual for unknown morphism sorts */
export const MORPHISM_SORT_DEFAULT: MorphismSortVisual = {
  color: '#6b7280',
  label: 'Related',
}

/** Get the visual config for a given morphism sort (with fallback) */
export function getMorphismSort(relation: string | undefined): MorphismSortVisual {
  if (!relation) return MORPHISM_SORT_DEFAULT
  return MORPHISM_SORT_CONFIG[relation] || MORPHISM_SORT_DEFAULT
}

// ── Backward-compatible re-exports ──
// TODO: Remove these once all consumers are migrated
export const EDGE_RELATION_CONFIG = MORPHISM_SORT_CONFIG
export const EDGE_RELATION_DEFAULT = MORPHISM_SORT_DEFAULT
export const getEdgeRelationVisual = getMorphismSort
export type EdgeRelationVisual = MorphismSortVisual
