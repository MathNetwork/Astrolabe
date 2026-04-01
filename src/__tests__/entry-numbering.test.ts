/**
 * Entry numbering tests.
 *
 * buildNumberMap scans MDX source for \entryblock{hash} occurrences,
 * tracks section headings (##), and assigns numbers: <section>.<counter>.
 * Unified counting (Definition 2.1, Theorem 2.2, Lemma 2.3).
 */
import { describe, it, expect } from 'vitest'
import { buildNumberMap } from '../components/mdx/numbering'

describe('Entry numbering', () => {
    it('single section: sequential numbering', () => {
        const mdx = [
            '## Section One',
            '\\entryblock{aaa}',
            'some text',
            '\\entryblock{bbb}',
            '\\entryblock{ccc}',
        ].join('\n')
        const map = buildNumberMap(mdx)
        expect(map.get('aaa')).toBe('1.1')
        expect(map.get('bbb')).toBe('1.2')
        expect(map.get('ccc')).toBe('1.3')
    })

    it('across sections: counter resets', () => {
        const mdx = [
            '## Section One',
            '\\entryblock{aaa}',
            '\\entryblock{bbb}',
            '## Section Two',
            '\\entryblock{ccc}',
        ].join('\n')
        const map = buildNumberMap(mdx)
        expect(map.get('aaa')).toBe('1.1')
        expect(map.get('bbb')).toBe('1.2')
        expect(map.get('ccc')).toBe('2.1')
    })

    it('entryref resolves number from same document', () => {
        const mdx = [
            '## Intro',
            '\\entryblock{abc}',
            'See \\entryref{abc}{the theorem}.',
        ].join('\n')
        const map = buildNumberMap(mdx)
        expect(map.get('abc')).toBe('1.1')
    })

    it('unknown hash not in map', () => {
        const mdx = [
            '## Section',
            '\\entryblock{aaa}',
        ].join('\n')
        const map = buildNumberMap(mdx)
        expect(map.has('unknown')).toBe(false)
    })

    it('duplicate hash gets same number (first occurrence)', () => {
        const mdx = [
            '## Section',
            '\\entryblock{aaa}',
            '\\entryblock{bbb}',
            '\\entryblock{aaa}',  // duplicate
        ].join('\n')
        const map = buildNumberMap(mdx)
        expect(map.get('aaa')).toBe('1.1')
        expect(map.get('bbb')).toBe('1.2')
        // counter still advances past duplicate: next new hash would be 1.3
    })

    it('entries before first section get section 0', () => {
        const mdx = [
            '\\entryblock{aaa}',
            '## First Section',
            '\\entryblock{bbb}',
        ].join('\n')
        const map = buildNumberMap(mdx)
        expect(map.get('aaa')).toBe('0.1')
        expect(map.get('bbb')).toBe('1.1')
    })
})
