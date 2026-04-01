/**
 * API alignment tests — ensure frontend calls match backend endpoints.
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'

const useProjectLoader = fs.readFileSync('src/hooks/useProjectLoader.ts', 'utf-8')
const toolWidgets = fs.readFileSync('src/components/ai-chat/ToolWidgets.tsx', 'utf-8')

describe('useProjectLoader API alignment', () => {
    it('fetches /api/astrolabe/ref-graph (not /graph)', () => {
        expect(useProjectLoader).toContain('/api/astrolabe/ref-graph')
        expect(useProjectLoader).not.toContain('/api/astrolabe/graph')
    })

    it('reads response.nodes and response.links', () => {
        expect(useProjectLoader).toContain('.nodes')
        expect(useProjectLoader).toContain('.links')
    })
})

describe('ToolWidgets API alignment', () => {
    it('refreshData fetches /api/astrolabe/ref-graph (not /graph)', () => {
        expect(toolWidgets).toContain('/api/astrolabe/ref-graph')
        expect(toolWidgets).not.toMatch(/\/api\/astrolabe\/graph[^/]/)
    })

    it('reads response.nodes and response.links', () => {
        // refreshData should parse nodes and links from the response
        expect(toolWidgets).toMatch(/\.nodes/)
        expect(toolWidgets).toMatch(/\.links/)
    })
})
