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
    // Phase 6B
    highlightedHashes: Set<string>
    highlightMode: 'none' | 'propagation' | 'proving'
    provingHash: string | null
    setHighlight: (hashes: string[], mode: 'propagation' | 'proving') => void
    clearHighlight: () => void
    setProving: (hash: string | null) => void
    // Phase 6E
    statusText: string | null
    setStatusText: (text: string | null) => void
    // Phase 6F
    activeNodeHash: string | null
    setActiveNode: (hash: string | null) => void
    // Phase 6G
    batchProgress: {
        total: number
        completed: string[]
        currentHash: string | null
    } | null
    setBatchProgress: (p: HighlightState['batchProgress']) => void
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
    statusText: null,
    setStatusText: (text) => set({ statusText: text }),
    activeNodeHash: null,
    setActiveNode: (hash) => set({ activeNodeHash: hash }),
    batchProgress: null,
    setBatchProgress: (p) => set({ batchProgress: p }),
}))
