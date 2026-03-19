/**
 * Sort configuration — deterministic sort colors
 *
 * Color lookup: DEFAULT_SORTS[sort] → autoColor(sort)
 * No external config needed — any sort automatically gets a color.
 */

export interface SortVisual {
    color: string
}

/** Curated colors for common math sorts */
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

/**
 * Deterministic color from sort name via FNV-1a hash → HSL color wheel.
 * Same sort string always produces the same color.
 */
function autoColor(sort: string): string {
    // FNV-1a hash for good distribution even on short strings
    let hash = 0x811c9dc5
    for (let i = 0; i < sort.length; i++) {
        hash ^= sort.charCodeAt(i)
        hash = Math.imul(hash, 0x01000193)
    }
    const hue = ((hash >>> 0) % 360)
    return `hsl(${hue}, 55%, 55%)`
}

/** Get sort visual: curated default → auto-generated color */
export function getObjectSort(sort: string | undefined): SortVisual {
    if (!sort) return SORT_FALLBACK
    return DEFAULT_SORTS[sort] || { color: autoColor(sort) }
}

/** Get all curated sorts (for UI listing) */
export function getAllSorts(): Record<string, SortVisual> {
    return { ...DEFAULT_SORTS }
}

/** Morphism default color */
export const MORPHISM_DEFAULT = { color: '#6b7280' }

// Backward-compatible alias
export const getNodeKindVisual = getObjectSort
