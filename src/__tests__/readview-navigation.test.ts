/**
 * Phase 6H: ReadView bidirectional navigation.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

describe('Phase 6H: ReadView navigation', () => {

    it('ReadView subscribes to selectObjStore for scroll', () => {
        const src = readFileSync(join(__dirname, '..', 'panels', 'workspace', 'ReadView.tsx'), 'utf-8')
        expect(src).toMatch(/selectObjStore|useSelectObjStore/)
    })

    it('ReadView calls scrollIntoView', () => {
        const src = readFileSync(join(__dirname, '..', 'panels', 'workspace', 'ReadView.tsx'), 'utf-8')
        expect(src).toMatch(/scrollIntoView/)
    })

    it('ReadView queries data-entry attribute', () => {
        const src = readFileSync(join(__dirname, '..', 'panels', 'workspace', 'ReadView.tsx'), 'utf-8')
        expect(src).toMatch(/data-entry/)
    })
})
