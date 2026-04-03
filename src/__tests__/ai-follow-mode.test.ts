/**
 * Phase 6D: AI Follow Mode — contract tests.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

describe('Phase 6D: AI Follow Mode contracts', () => {

    it('viewStore has aiFollowMode field', () => {
        const src = readFileSync(join(__dirname, '..', 'stores', 'viewStore.ts'), 'utf-8')
        expect(src).toMatch(/aiFollowMode/)
    })

    it('viewStore has toggleAiFollow action', () => {
        const src = readFileSync(join(__dirname, '..', 'stores', 'viewStore.ts'), 'utf-8')
        expect(src).toMatch(/toggleAiFollow/)
    })

    it('ChatPanel imports hashExtractor', () => {
        const src = readFileSync(join(__dirname, '..', 'components', 'ai-chat', 'ChatPanel.tsx'), 'utf-8')
        expect(src).toMatch(/hashExtractor|extractLastValidHash/)
    })

    it('ChatPanel reads aiFollowMode', () => {
        const src = readFileSync(join(__dirname, '..', 'components', 'ai-chat', 'ChatPanel.tsx'), 'utf-8')
        expect(src).toMatch(/aiFollowMode/)
    })

    it('ChatPanel references selectObjStore or select', () => {
        const src = readFileSync(join(__dirname, '..', 'components', 'ai-chat', 'ChatPanel.tsx'), 'utf-8')
        expect(src).toMatch(/selectObjStore|useSelectObjStore/)
    })

    it('NetworkSettings has AI Follow toggle', () => {
        const src = readFileSync(join(__dirname, '..', 'panels', 'workspace', 'NetworkSettings.tsx'), 'utf-8')
        expect(src).toMatch(/aiFollow|AI Follow/i)
    })

    it('hashExtractor is a pure module (no React/store imports)', () => {
        const src = readFileSync(join(__dirname, '..', 'lib', 'hashExtractor.ts'), 'utf-8')
        expect(src).not.toMatch(/import.*react/i)
        expect(src).not.toMatch(/import.*store/i)
        expect(src).not.toMatch(/import.*zustand/i)
    })
})
