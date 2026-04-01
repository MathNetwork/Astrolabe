import { describe, it, expect } from 'vitest'
import { preprocess } from '../preprocess'

describe('preprocess', () => {
    it('converts \\entryref to span', () => {
        expect(preprocess('\\entryref{abc123}{Lemma 4}'))
            .toBe('<span data-entry="abc123">Lemma 4</span>')
    })

    it('converts simple \\entryblock to div', () => {
        expect(preprocess('\\entryblock{abc123}'))
            .toBe('<div data-entry="abc123"></div>')
    })

    it('converts collapsible \\entryblock', () => {
        expect(preprocess('\\entryblock{abc123}{collapsible}'))
            .toBe('<div data-entry="abc123" data-collapsible="true"></div>')
    })

    it('converts nested \\entryblock', () => {
        const input = '\\entryblock{aaa}{\n\\entryblock{bbb}{collapsible}\n}'
        const output = preprocess(input)
        expect(output).toContain('<div data-entry="aaa">')
        expect(output).toContain('<div data-entry="bbb" data-collapsible="true"></div>')
        expect(output).toContain('</div>')
    })

    it('handles mixed content', () => {
        const input = 'Before \\entryref{x}{link} and \\entryblock{y} after'
        const output = preprocess(input)
        expect(output).toContain('<span data-entry="x">link</span>')
        expect(output).toContain('<div data-entry="y"></div>')
        expect(output).toContain('Before')
        expect(output).toContain('after')
    })

    it('handles deeply nested blocks', () => {
        const input = '\\entryblock{a}{\n\\entryblock{b}{\n\\entryblock{c}{collapsible}\n}\n}'
        const output = preprocess(input)
        expect(output).toContain('data-entry="a"')
        expect(output).toContain('data-entry="b"')
        expect(output).toContain('data-entry="c"')
    })

    it('handles math with braces inside \\entryref', () => {
        const input = '\\entryref{abc}{enumerated by $F_{n-1} - \\lfloor \\frac{n-3}{2} \\rfloor$}'
        const output = preprocess(input)
        expect(output).toContain('data-entry="abc"')
        expect(output).toContain('$F_{n-1}')
        expect(output).toContain('\\rfloor$')
        expect(output).not.toContain('\\entryref')
    })

    it('passes through text without macros unchanged', () => {
        const input = 'Hello $x^2$ world'
        expect(preprocess(input)).toBe(input)
    })

    it('converts single-arg \\entryref (no text) to auto-mode span', () => {
        expect(preprocess('\\entryref{abc123}'))
            .toBe('<span data-entry="abc123" data-auto="true"></span>')
    })

    it('single-arg \\entryref followed by text is not greedy', () => {
        const output = preprocess('\\entryref{abc} and more text')
        expect(output).toBe('<span data-entry="abc" data-auto="true"></span> and more text')
    })

    it('single-arg \\entryref gets data-number from numberMap', () => {
        const map = new Map([['abc', '2.1']])
        expect(preprocess('\\entryref{abc}', map))
            .toBe('<span data-entry="abc" data-auto="true" data-number="2.1"></span>')
    })

    it('two-arg \\entryref still works', () => {
        expect(preprocess('\\entryref{abc}{my text}'))
            .toBe('<span data-entry="abc">my text</span>')
    })
})
