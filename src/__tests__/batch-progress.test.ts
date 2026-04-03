/**
 * Phase 6G: Batch operation progress — three-color node rendering.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

describe('Phase 6G: Batch progress', () => {

    it('highlightStore has batchProgress field', async () => {
        const { useHighlightStore } = await import('../stores/highlightStore')
        const state = useHighlightStore.getState()
        expect('batchProgress' in state).toBe(true)
        expect(state.batchProgress).toBeNull()
    })

    it('highlightStore has setBatchProgress action', async () => {
        const { useHighlightStore } = await import('../stores/highlightStore')
        expect(typeof useHighlightStore.getState().setBatchProgress).toBe('function')
    })

    it('setBatchProgress sets and clears', async () => {
        const { useHighlightStore } = await import('../stores/highlightStore')
        useHighlightStore.getState().setBatchProgress({
            total: 5,
            completed: ['aaa'],
            currentHash: 'bbb',
        })
        const bp = useHighlightStore.getState().batchProgress
        expect(bp).not.toBeNull()
        expect(bp!.total).toBe(5)
        expect(bp!.completed).toContain('aaa')
        expect(bp!.currentHash).toBe('bbb')

        useHighlightStore.getState().setBatchProgress(null)
        expect(useHighlightStore.getState().batchProgress).toBeNull()
    })

    it('NetworkView reads batchProgress for rendering', () => {
        const src = readFileSync(join(__dirname, '..', 'panels', 'workspace', 'NetworkView.tsx'), 'utf-8')
        expect(src).toMatch(/batchProgress/)
    })

    it('ChatPanel handles batch progress updates', () => {
        const src = readFileSync(join(__dirname, '..', 'components', 'ai-chat', 'ChatPanel.tsx'), 'utf-8')
        expect(src).toMatch(/batchProgress|setBatchProgress/)
    })
})
