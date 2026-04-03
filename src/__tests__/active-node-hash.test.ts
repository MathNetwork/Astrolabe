/**
 * Phase 6F: activeNodeHash — AI-detected node gets work state ring.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

describe('Phase 6F: activeNodeHash', () => {

    it('highlightStore has activeNodeHash field', async () => {
        const { useHighlightStore } = await import('../stores/highlightStore')
        const state = useHighlightStore.getState()
        expect('activeNodeHash' in state).toBe(true)
        expect(typeof state.setActiveNode).toBe('function')
    })

    it('NetworkView uses provingHash || activeNodeHash for work state', () => {
        const src = readFileSync(join(__dirname, '..', 'panels', 'workspace', 'NetworkView.tsx'), 'utf-8')
        expect(src).toMatch(/activeNodeHash/)
        expect(src).toMatch(/provingHash.*\|\|.*activeNodeHash|activeNodeHash.*\|\|.*provingHash/)
    })

    it('ChatPanel calls setActiveNode', () => {
        const src = readFileSync(join(__dirname, '..', 'components', 'ai-chat', 'ChatPanel.tsx'), 'utf-8')
        expect(src).toMatch(/setActiveNode/)
    })
})
