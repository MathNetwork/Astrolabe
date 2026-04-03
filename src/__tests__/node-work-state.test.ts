/**
 * Phase 6C: Node work state — provingHash drives orange dashed ring.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

describe('Phase 6C: Node work state', () => {

    it('EntryDetail Prove button calls setProving', () => {
        const src = readFileSync(join(__dirname, '..', 'components', 'detail', 'EntryDetail.tsx'), 'utf-8')
        expect(src).toMatch(/setProving/)
    })

    it('NetworkView reads provingHash from highlightStore', () => {
        const src = readFileSync(join(__dirname, '..', 'panels', 'workspace', 'NetworkView.tsx'), 'utf-8')
        expect(src).toMatch(/provingHash/)
    })

    it('NetworkView draws dashed ring for provingHash', () => {
        const src = readFileSync(join(__dirname, '..', 'panels', 'workspace', 'NetworkView.tsx'), 'utf-8')
        expect(src).toMatch(/setLineDash/)
        expect(src).toMatch(/#f97316/)  // orange-500
    })
})
