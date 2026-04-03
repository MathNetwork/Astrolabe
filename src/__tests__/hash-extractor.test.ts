/**
 * Phase 6D: hashExtractor — pure function tests.
 */
import { describe, it, expect } from 'vitest'

describe('Phase 6D: hashExtractor', () => {
    let extractLastValidHash: (text: string, isValid: (h: string) => boolean) => string | null

    beforeAll(async () => {
        const mod = await import('../lib/hashExtractor')
        extractLastValidHash = mod.extractLastValidHash
    })

    const alwaysValid = () => true
    const noneValid = () => false

    it('extracts a single 12-char hex hash', () => {
        expect(extractLastValidHash('Entry abc123def456 found', alwaysValid)).toBe('abc123def456')
    })

    it('extracts the last hash when multiple present', () => {
        expect(extractLastValidHash('abc123def456 then 789012abcdef', alwaysValid)).toBe('789012abcdef')
    })

    it('returns null when hash fails validation', () => {
        expect(extractLastValidHash('abc123def456', noneValid)).toBeNull()
    })

    it('returns null for text with no hex hash', () => {
        expect(extractLastValidHash('hello world no hashes here', alwaysValid)).toBeNull()
    })

    it('strips ANSI escape codes before matching', () => {
        expect(extractLastValidHash('\x1b[32mabc123def456\x1b[0m', alwaysValid)).toBe('abc123def456')
    })

    it('ignores longer hex strings (not 12 chars)', () => {
        // 18-char hex should not match as a 12-char hash at word boundary
        expect(extractLastValidHash('abcdef123456789012', alwaysValid)).toBeNull()
    })

    it('returns null for empty string', () => {
        expect(extractLastValidHash('', alwaysValid)).toBeNull()
    })
})
