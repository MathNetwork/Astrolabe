/**
 * ReadView contract tests.
 *
 * ReadView 只做一件事：加载 MDX 文件，显示源代码。
 * 没有 Markdown 渲染，没有 KaTeX，没有 objblock，没有 TOC。
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Read the actual component source
const source = readFileSync(
    resolve(__dirname, '../workspace/ReadView.tsx'), 'utf-8'
)

describe('ReadView structure', () => {

    it('is less than 120 lines', () => {
        const lines = source.split('\n').length
        expect(lines).toBeLessThan(120)
    })

    it('has exactly one useEffect call', () => {
        const count = (source.match(/\buseEffect\(/g) || []).length
        expect(count).toBe(1)
    })

    it('has no useRef', () => {
        expect(source).not.toContain('useRef')
    })

    it('has no cancelled flag', () => {
        expect(source).not.toContain('cancelled')
    })

    it('has finally { setLoading(false) }', () => {
        expect(source).toContain('finally')
        expect(source).toContain('setLoading(false)')
    })

    it('uses plain object for contents, not Map', () => {
        expect(source).not.toContain('new Map')
    })

    it('renders raw source with <pre>, no Markdown', () => {
        expect(source).toContain('<pre')
        expect(source).not.toContain('react-markdown')
        expect(source).not.toContain('remarkMath')
        expect(source).not.toContain('rehypeKatex')
    })

    it('has no TOC', () => {
        expect(source).not.toContain('PageToc')
        expect(source).not.toContain('extractHeadings')
    })

    it('has no objblock', () => {
        expect(source).not.toContain('ObjBlock')
        expect(source).not.toContain('objblock')
    })

    it('has no font size control', () => {
        expect(source).not.toContain('FONT_SIZES')
        expect(source).not.toContain('fontSizeIndex')
    })

    it('has no numbering system', () => {
        expect(source).not.toContain('objNumbering')
        expect(source).not.toContain('buildGlobalObjNumbering')
    })

    it('fetches /api/docs/list', () => {
        expect(source).toContain('/api/docs/list')
    })

    it('fetches /api/docs/read', () => {
        expect(source).toContain('/api/docs/read')
    })
})
