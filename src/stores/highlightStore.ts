/**
 * highlightStore — propagation highlight and proving state.
 *
 * Used by:
 *   - EntryDetail: "Show Impact" sets propagation highlight
 *   - NetworkView: reads highlightedHashes for rendering
 *   - Phase 6C: provingHash for pulse animation
 */
import { create } from 'zustand'

interface HighlightState {
    highlightedHashes: Set<string>
    highlightMode: 'none' | 'propagation' | 'proving'
    provingHash: string | null
    setHighlight: (hashes: string[], mode: 'propagation' | 'proving') => void
    clearHighlight: () => void
    setProving: (hash: string | null) => void
}

export const useHighlightStore = create<HighlightState>((set) => ({
    highlightedHashes: new Set(),
    highlightMode: 'none',
    provingHash: null,
    setHighlight: (hashes, mode) => set({
        highlightedHashes: new Set(hashes),
        highlightMode: mode,
    }),
    clearHighlight: () => set({
        highlightedHashes: new Set(),
        highlightMode: 'none',
    }),
    setProving: (hash) => set({ provingHash: hash }),
}))
