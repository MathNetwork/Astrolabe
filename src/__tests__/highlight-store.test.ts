/**
 * Phase 6B: Highlight store for propagation and proving state.
 */
import { describe, it, expect } from 'vitest'

describe('Phase 6B: highlightStore', () => {

    it('highlightStore module exists', async () => {
        const mod = await import('../stores/highlightStore')
        expect(mod.useHighlightStore).toBeDefined()
    })

    it('has setHighlight method', async () => {
        const { useHighlightStore } = await import('../stores/highlightStore')
        expect(typeof useHighlightStore.getState().setHighlight).toBe('function')
    })

    it('has clearHighlight method', async () => {
        const { useHighlightStore } = await import('../stores/highlightStore')
        expect(typeof useHighlightStore.getState().clearHighlight).toBe('function')
    })

    it('setHighlight stores hashes and mode', async () => {
        const { useHighlightStore } = await import('../stores/highlightStore')
        useHighlightStore.getState().setHighlight(['abc123def456', 'fed987cba654'], 'propagation')
        const state = useHighlightStore.getState()
        expect(state.highlightedHashes.has('abc123def456')).toBe(true)
        expect(state.highlightedHashes.has('fed987cba654')).toBe(true)
        expect(state.highlightMode).toBe('propagation')
    })

    it('clearHighlight resets to empty', async () => {
        const { useHighlightStore } = await import('../stores/highlightStore')
        useHighlightStore.getState().setHighlight(['abc123def456'], 'propagation')
        useHighlightStore.getState().clearHighlight()
        const state = useHighlightStore.getState()
        expect(state.highlightedHashes.size).toBe(0)
        expect(state.highlightMode).toBe('none')
    })

    it('has provingHash for Phase 6C', async () => {
        const { useHighlightStore } = await import('../stores/highlightStore')
        const state = useHighlightStore.getState()
        expect('provingHash' in state).toBe(true)
        expect(typeof state.setProving).toBe('function')
    })
})
