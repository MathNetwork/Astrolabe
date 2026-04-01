/**
 * Entry renderer plugin interface tests.
 *
 * Core EntryBlock/EntryLink must not parse record content.
 * Plugin provides renderers via the interface.
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'

const pluginTypes = fs.readFileSync('src/plugins/types.ts', 'utf-8')
const entryBlock = fs.readFileSync('src/components/mdx/EntryBlock.tsx', 'utf-8')
const entryLink = fs.readFileSync('src/components/mdx/EntryLink.tsx', 'utf-8')

describe('Plugin interface has entry renderers', () => {
    it('has EntryBlockRenderer', () => {
        expect(pluginTypes).toContain('EntryBlockRenderer')
    })

    it('has EntryRefRenderer', () => {
        expect(pluginTypes).toContain('EntryRefRenderer')
    })
})

describe('Core EntryBlock does not parse record', () => {
    it('no JSON.parse', () => {
        expect(entryBlock).not.toContain('JSON.parse')
    })

    it('no sort field access', () => {
        expect(entryBlock).not.toMatch(/entry\.sort|\.sort\b/)
    })

    it('no SORT_LABELS', () => {
        expect(entryBlock).not.toContain('SORT_LABELS')
    })
})

describe('Core EntryLink does not parse record', () => {
    it('no JSON.parse', () => {
        expect(entryLink).not.toContain('JSON.parse')
    })

    it('no sort field access', () => {
        expect(entryLink).not.toMatch(/entry\.sort|\.sort\b/)
    })
})
