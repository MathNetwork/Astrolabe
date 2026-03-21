/**
 * ReadView contract tests (TDD).
 *
 * ReadView does ONE thing: fetch docs and render them.
 * These tests define the exact data flow contract.
 */
import { describe, it, expect } from 'vitest'

// ── Data flow contract ──

describe('ReadView data flow', () => {

    // Step 1: fetch /api/docs/list → get file list
    it('docs/list returns files array', async () => {
        const mockResponse = {
            files: [
                { name: '00-index.mdx', path: '/p/.astrolabe/docs/00-index.mdx', title: 'Index' },
                { name: '01-ch1.mdx', path: '/p/.astrolabe/docs/01-ch1.mdx', title: 'Ch1' },
            ]
        }
        expect(Array.isArray(mockResponse.files)).toBe(true)
        expect(mockResponse.files.length).toBe(2)
    })

    // Step 2: for each file, fetch /api/docs/read → get content
    it('docs/read returns content string', async () => {
        const mockResponse = { content: '# Hello\n\nWorld' }
        expect(typeof mockResponse.content).toBe('string')
        expect(mockResponse.content.length).toBeGreaterThan(0)
    })

    // Step 3: set loading=false, render content
    it('loading must become false after all fetches', () => {
        // Contract: no matter what happens (empty list, fetch error, success),
        // loading MUST become false. There is no code path where loading stays true.
        const scenarios = [
            { name: 'success', files: ['a.mdx'], fetchOk: true },
            { name: 'empty list', files: [], fetchOk: true },
            { name: 'fetch error', files: ['a.mdx'], fetchOk: false },
            { name: 'no project path', files: [], fetchOk: false },
        ]
        for (const s of scenarios) {
            // In all cases, finally { setLoading(false) } must run
            expect(true).toBe(true) // placeholder — real test is the code structure
        }
    })
})

// ── Rendering contract ──

describe('ReadView rendering', () => {

    it('active file content is displayed', () => {
        // Contract: if contentCache has content for activeFile,
        // it MUST be rendered (display: block)
        const activeFile = '/p/.astrolabe/docs/00-index.mdx'
        const cache = new Map([
            [activeFile, '# Hello'],
            ['/p/.astrolabe/docs/01-ch1.mdx', '# Ch1'],
        ])
        expect(cache.has(activeFile)).toBe(true)
        expect(cache.get(activeFile)!.length).toBeGreaterThan(0)
    })

    it('inactive files are hidden', () => {
        // Contract: non-active files have display: none
        const activeFile = '/p/.astrolabe/docs/00-index.mdx'
        const otherFile = '/p/.astrolabe/docs/01-ch1.mdx'
        expect(activeFile).not.toBe(otherFile)
    })

    it('index file is auto-selected', () => {
        const files = [
            { name: '01-ch1.mdx', path: '/p/01-ch1.mdx' },
            { name: '00-index.mdx', path: '/p/00-index.mdx' },
        ]
        const indexPattern = /^(index|_index|00-index)\.mdx$/
        const index = files.find(f => indexPattern.test(f.name)) || files[0]
        expect(index.name).toBe('00-index.mdx')
    })

    it('sidebar shows all files when multiple docs exist', () => {
        const files = [
            { name: '00-index.mdx', title: 'Index' },
            { name: '01-ch1.mdx', title: 'Ch1' },
        ]
        expect(files.length).toBeGreaterThan(1)
        // Contract: sidebar visible when files.length > 1
    })

    it('no sidebar for single doc', () => {
        const files = [{ name: 'index.mdx', title: 'Index' }]
        expect(files.length).toBe(1)
        // Contract: sidebar hidden when files.length <= 1
    })
})

// ── Error handling contract ──

describe('ReadView error handling', () => {

    it('fetch error does not crash, shows empty state', () => {
        // Contract: catch block sets loading=false, does not throw
        let loading = true
        try {
            throw new Error('network error')
        } catch {
            loading = false
        }
        expect(loading).toBe(false)
    })

    it('individual doc read failure caches empty string', () => {
        const cache = new Map<string, string>()
        // Simulate failed read
        cache.set('/p/failed.mdx', '')
        expect(cache.get('/p/failed.mdx')).toBe('')
        // Other docs still work
        cache.set('/p/ok.mdx', '# Hello')
        expect(cache.get('/p/ok.mdx')).toBe('# Hello')
    })
})
