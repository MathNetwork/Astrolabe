import { describe, it, expect } from 'vitest'
import { getSortFill, getSortStyle, parseSortFromRecord } from '../sortColors'

describe('sortColors', () => {
    // ── Determinism ──
    it('same sort always returns same color', () => {
        expect(getSortFill('theorem')).toBe(getSortFill('theorem'))
        expect(getSortFill('lean-definition')).toBe(getSortFill('lean-definition'))
        expect(getSortFill('(theorem, proof)')).toBe(getSortFill('(theorem, proof)'))
    })

    // ── Distinctness ──
    it('different atomic sorts return different colors', () => {
        const sorts = ['definition', 'theorem', 'lemma', 'proposition', 'corollary', 'proof', 'citation']
        const colors = sorts.map(getSortFill)
        const unique = new Set(colors)
        expect(unique.size).toBe(sorts.length)
    })

    it('lean sorts are distinct from paper sorts', () => {
        expect(getSortFill('theorem')).not.toBe(getSortFill('lean-theorem'))
        expect(getSortFill('definition')).not.toBe(getSortFill('lean-definition'))
    })

    // ── Derived sorts ──
    it('derived sort "(a, b)" returns a color', () => {
        const color = getSortFill('(theorem, proof)')
        expect(color).toMatch(/^(#[0-9a-f]{6}|hsl\()/)
    })

    it('derived sort is different from both atomic sorts', () => {
        const a = getSortFill('theorem')
        const b = getSortFill('proof')
        const ab = getSortFill('(theorem, proof)')
        expect(ab).not.toBe(a)
        expect(ab).not.toBe(b)
    })

    it('different derived sorts are different', () => {
        expect(getSortFill('(theorem, proof)')).not.toBe(getSortFill('(theorem, definition)'))
        expect(getSortFill('(lemma, proof)')).not.toBe(getSortFill('(theorem, proof)'))
    })

    // ── Empty / unknown ──
    it('empty sort returns a fallback color', () => {
        const color = getSortFill('')
        expect(color).toBeTruthy()
    })

    it('unknown sort returns a stable color', () => {
        expect(getSortFill('foo-bar')).toBe(getSortFill('foo-bar'))
    })

    // ── getSortStyle ──
    it('getSortStyle returns borderStyle and textStyle with matching fill', () => {
        const style = getSortStyle('theorem')
        expect(style.fill).toBe(getSortFill('theorem'))
        expect(style.borderStyle.borderLeftColor).toBe(style.fill)
        expect(style.textStyle.color).toBe(style.fill)
    })

    // ── parseSortFromRecord ──
    it('parses sort from JSON record', () => {
        expect(parseSortFromRecord('{"sort": "theorem", "title": "X"}')).toBe('theorem')
        expect(parseSortFromRecord('{"sort": "(lemma, proof)"}')).toBe('(lemma, proof)')
    })

    it('returns empty string for non-JSON record', () => {
        expect(parseSortFromRecord('just a string')).toBe('')
        expect(parseSortFromRecord('')).toBe('')
    })
})
