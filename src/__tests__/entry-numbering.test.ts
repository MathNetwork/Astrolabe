/**
 * Entry numbering tests.
 *
 * buildNumberMap scans MDX source for \entryblock{hash} occurrences,
 * uses a fixed section number (from filename), and assigns numbers:
 * <section>.<counter> with unified counting.
 *
 * Proof entries are excluded from numbering.
 */
import { describe, it, expect } from 'vitest'
import { buildNumberMap } from '../components/mdx/numbering'

describe('Entry numbering', () => {
    it('single section: sequential numbering', () => {
        const mdx = [
            '# Section Title',
            '\\entryblock{aaa}',
            'some text',
            '\\entryblock{bbb}',
            '\\entryblock{ccc}',
        ].join('\n')
        const map = buildNumberMap(mdx, 1)
        expect(map.get('aaa')).toBe('1.1')
        expect(map.get('bbb')).toBe('1.2')
        expect(map.get('ccc')).toBe('1.3')
    })

    it('section number comes from parameter', () => {
        const mdx = [
            '# Connectivity',
            '\\entryblock{aaa}',
            '\\entryblock{bbb}',
        ].join('\n')
        const map = buildNumberMap(mdx, 3)
        expect(map.get('aaa')).toBe('3.1')
        expect(map.get('bbb')).toBe('3.2')
    })

    it('default section is 0 when not provided', () => {
        const mdx = '\\entryblock{aaa}'
        const map = buildNumberMap(mdx)
        expect(map.get('aaa')).toBe('0.1')
    })

    it('entryref resolves number from same document', () => {
        const mdx = [
            '\\entryblock{abc}',
            'See \\entryref{abc}{the theorem}.',
        ].join('\n')
        const map = buildNumberMap(mdx, 2)
        expect(map.get('abc')).toBe('2.1')
    })

    it('unknown hash not in map', () => {
        const mdx = '\\entryblock{aaa}'
        const map = buildNumberMap(mdx, 1)
        expect(map.has('unknown')).toBe(false)
    })

    it('duplicate hash gets same number (first occurrence)', () => {
        const mdx = [
            '\\entryblock{aaa}',
            '\\entryblock{bbb}',
            '\\entryblock{aaa}',
        ].join('\n')
        const map = buildNumberMap(mdx, 1)
        expect(map.get('aaa')).toBe('1.1')
        expect(map.get('bbb')).toBe('1.2')
    })
})

describe('Proof exclusion', () => {
    it('proof entries are excluded from numbering', () => {
        const entries: Record<string, { record: string }> = {
            'def1': { record: '{"sort":"definition"}' },
            'prf1': { record: '{"sort":"proof"}' },
            'thm1': { record: '{"sort":"theorem"}' },
        }
        const mdx = [
            '\\entryblock{def1}',
            '\\entryblock{prf1}',
            '\\entryblock{thm1}',
        ].join('\n')
        const map = buildNumberMap(mdx, 2, entries)
        expect(map.get('def1')).toBe('2.1')
        expect(map.has('prf1')).toBe(false)  // proof excluded
        expect(map.get('thm1')).toBe('2.2')  // counter not wasted on proof
    })

    it('proof exclusion without entries param falls back to numbering all', () => {
        const mdx = [
            '\\entryblock{def1}',
            '\\entryblock{prf1}',
            '\\entryblock{thm1}',
        ].join('\n')
        // No entries param → can't check sort → numbers everything
        const map = buildNumberMap(mdx, 1)
        expect(map.get('def1')).toBe('1.1')
        expect(map.get('prf1')).toBe('1.2')
        expect(map.get('thm1')).toBe('1.3')
    })
})
