/**
 * Unified entry color lookup.
 *
 * Priority:
 * 1. Skeleton color (if skeleton mode active and has computed color)
 * 2. Sort-based color (default)
 *
 * All UI components (NetworkView, EntryBlock, EntryLink, EntryDetail)
 * call getEntryColor(id) for consistent coloring.
 */
import { getSortFill, parseSortFromRecord } from './sortColors'

/** Get the current color for an entry by its hash. */
export function getEntryColor(id: string, record?: string): string {
    // 1. Check skeleton colors
    if (typeof window !== 'undefined') {
        const sc = (window as any).__skeletonColors?.[id]
        if (sc) return sc
    }
    // 2. Fallback: sort-based color from record
    if (record) {
        return getSortFill(parseSortFromRecord(record))
    }
    return '#888888'
}

/** Notify all listeners that colors have been updated. */
export function notifyColorsUpdated() {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('entry-colors-updated'))
    }
}

/** Subscribe to color updates. Returns unsubscribe function. */
export function onColorsUpdated(callback: () => void): () => void {
    if (typeof window === 'undefined') return () => {}
    window.addEventListener('entry-colors-updated', callback)
    return () => window.removeEventListener('entry-colors-updated', callback)
}
