/**
 * Sort configuration — runtime sort colors
 *
 * Projects define their own sorts in .astrolabe/sorts.json.
 * This module provides:
 *   - Fallback defaults (math sorts) when no project config exists
 *   - Runtime override via setCustomSortConfig()
 *   - getObjectSort() for looking up sort → color
 *   - MORPHISM_DEFAULT for edge color
 */

export interface SortVisual {
    color: string
}

/** Fallback sort colors (used when project has no sorts.json) */
const DEFAULT_SORTS: Record<string, SortVisual> = {
    definition:  { color: '#5B8FB9' },
    theorem:     { color: '#D4A843' },
    lemma:       { color: '#3AAFA9' },
    proposition: { color: '#B8963E' },
    corollary:   { color: '#9B72CF' },
    example:     { color: '#2ECC71' },
    axiom:       { color: '#4A90D9' },
    remark:      { color: '#7B68AE' },
    conjecture:  { color: '#D4A843' },
    reference:   { color: '#708090' },
}

const SORT_FALLBACK: SortVisual = { color: '#A1A1AA' }

/** Project-level custom sorts (from .astrolabe/sorts.json) */
let customSorts: Record<string, SortVisual> | null = null

/** Set project-level sort config (called by useProjectLoader) */
export function setCustomSortConfig(config: Record<string, { color: string }> | null) {
    if (!config) { customSorts = null; return }
    customSorts = {}
    for (const [sort, { color }] of Object.entries(config)) {
        customSorts[sort] = { color }
    }
}

/** Get sort visual: custom → default → fallback */
export function getObjectSort(sort: string | undefined): SortVisual {
    if (!sort) return SORT_FALLBACK
    return customSorts?.[sort] || DEFAULT_SORTS[sort] || SORT_FALLBACK
}

/** Get all available sorts */
export function getAllSorts(): Record<string, SortVisual> {
    return { ...DEFAULT_SORTS, ...customSorts }
}

/** Morphism default color */
export const MORPHISM_DEFAULT = { color: '#6b7280' }

// Backward-compatible aliases
export const getNodeKindVisual = getObjectSort
