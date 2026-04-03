/**
 * Phase 6B: Propagation highlight contract tests.
 */
import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'

const ENTRY_DETAIL = readFileSync(join(__dirname, '..', 'components', 'detail', 'EntryDetail.tsx'), 'utf-8')
const NETWORK_VIEW = readFileSync(join(__dirname, '..', 'panels', 'workspace', 'NetworkView.tsx'), 'utf-8')

describe('Phase 6B: Propagation highlight contracts', () => {

    // EntryDetail
    it('EntryDetail has Show Impact button', () => {
        expect(ENTRY_DETAIL).toMatch(/Impact/i)
    })

    it('EntryDetail calls propagate API', () => {
        expect(ENTRY_DETAIL).toMatch(/propagate/)
    })

    it('EntryDetail imports highlightStore', () => {
        expect(ENTRY_DETAIL).toMatch(/highlightStore|useHighlightStore/)
    })

    // NetworkView
    it('NetworkView imports highlightStore', () => {
        expect(NETWORK_VIEW).toMatch(/highlightStore|useHighlightStore/)
    })

    it('NetworkView checks highlightedHashes', () => {
        expect(NETWORK_VIEW).toMatch(/highlightedHashes/)
    })

    it('NetworkView adjusts opacity for non-highlighted nodes', () => {
        expect(NETWORK_VIEW).toMatch(/globalAlpha/)
    })
})
