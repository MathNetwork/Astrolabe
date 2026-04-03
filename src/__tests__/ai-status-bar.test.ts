/**
 * Phase 6E: AI Status Bar — work indicator at bottom of NetworkView.
 *
 * Tests:
 * 1. highlightStore has statusText + setStatusText
 * 2. AIStatusBar component exists
 * 3. NetworkView renders AIStatusBar
 * 4. EntryDetail sets statusText on Prove/Sync click
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

describe('Phase 6E: AI Status Bar', () => {

    it('highlightStore has statusText field', async () => {
        const { useHighlightStore } = await import('../stores/highlightStore')
        const state = useHighlightStore.getState()
        expect('statusText' in state).toBe(true)
        expect(state.statusText).toBeNull()
    })

    it('highlightStore has setStatusText action', async () => {
        const { useHighlightStore } = await import('../stores/highlightStore')
        const state = useHighlightStore.getState()
        expect(typeof state.setStatusText).toBe('function')
    })

    it('setStatusText sets and clears text', async () => {
        const { useHighlightStore } = await import('../stores/highlightStore')
        useHighlightStore.getState().setStatusText('Proving entry abc123...')
        expect(useHighlightStore.getState().statusText).toBe('Proving entry abc123...')
        useHighlightStore.getState().setStatusText(null)
        expect(useHighlightStore.getState().statusText).toBeNull()
    })

    it('AIStatusBar component file exists', () => {
        expect(() => readFileSync(join(__dirname, '..', 'components', 'AIStatusBar.tsx'), 'utf-8')).not.toThrow()
    })

    it('NetworkView renders AIStatusBar', () => {
        const nv = readFileSync(join(__dirname, '..', 'panels', 'workspace', 'NetworkView.tsx'), 'utf-8')
        expect(nv).toMatch(/AIStatusBar/)
    })

    it('EntryDetail sets statusText on Prove button click', () => {
        const ed = readFileSync(join(__dirname, '..', 'components', 'detail', 'EntryDetail.tsx'), 'utf-8')
        expect(ed).toMatch(/setStatusText/)
    })
})
