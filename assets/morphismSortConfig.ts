/**
 * Morphism visual config for knowledge edges.
 *
 * Morphisms have no sort classification — meaning is expressed through notes.
 * This file provides a single default visual for all edges.
 */

export interface MorphismVisual {
  color: string
  label: string
}

/** Default visual for all morphisms */
export const MORPHISM_DEFAULT: MorphismVisual = {
  color: '#6b7280',
  label: 'Morphism',
}

/** Get the visual config for a morphism (always returns default) */
export function getMorphismVisual(): MorphismVisual {
  return MORPHISM_DEFAULT
}

// ── Backward-compatible re-exports ──
/** @deprecated Use MORPHISM_DEFAULT */
export const MORPHISM_SORT_CONFIG: Record<string, MorphismVisual> = {}
/** @deprecated Use MORPHISM_DEFAULT */
export const MORPHISM_SORT_DEFAULT = MORPHISM_DEFAULT
/** @deprecated Use getMorphismVisual */
export const getMorphismSort = getMorphismVisual
/** @deprecated */
export const EDGE_RELATION_CONFIG = MORPHISM_SORT_CONFIG
/** @deprecated */
export const EDGE_RELATION_DEFAULT = MORPHISM_DEFAULT
/** @deprecated */
export const getEdgeRelationVisual = getMorphismVisual
/** @deprecated */
export type MorphismSortVisual = MorphismVisual
/** @deprecated */
export type EdgeRelationVisual = MorphismVisual
