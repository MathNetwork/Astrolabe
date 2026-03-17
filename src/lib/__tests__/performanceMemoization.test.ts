import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

/**
 * Performance regression tests for memoization patterns.
 *
 * These tests verify that inline object literals are not passed as props
 * to child components (causing unnecessary re-renders), and that large
 * useMemo blocks are properly decomposed.
 */

describe('Performance: memoized ctx/toolbarProps in page.tsx', () => {
  const filePath = path.resolve(__dirname, '../../app/local/edit/page.tsx')
  const source = fs.readFileSync(filePath, 'utf-8')

  it('should wrap EditorLeftSidebar ctx in useMemo', () => {
    // The ctx object passed to EditorLeftSidebar should be created via useMemo,
    // not as an inline object literal in JSX. An inline object creates a new
    // reference every render, causing EditorLeftSidebar to re-render unnecessarily.
    //
    // BAD:  <EditorLeftSidebar ctx={{ searchPanelOpen, ... }} />
    // GOOD: const sidebarCtx = useMemo(() => ({ ... }), [deps])
    //       <EditorLeftSidebar ctx={sidebarCtx} />

    // Check that EditorLeftSidebar receives a variable reference, not an inline object
    const inlineCtxPattern = /<EditorLeftSidebar\s+ctx=\{\{/
    const hasInlineCtx = inlineCtxPattern.test(source)
    expect(hasInlineCtx).toBe(false)
  })

  it('should wrap GraphViewport toolbarProps in useMemo', () => {
    // The toolbarProps object passed to GraphViewport should be created via useMemo,
    // not as an inline object literal in JSX.
    //
    // BAD:  toolbarProps={{ canvasNodeCount: ..., ... }}
    // GOOD: const toolbarProps = useMemo(() => ({ ... }), [deps])
    //       toolbarProps={memoizedToolbarProps}

    // Check that toolbarProps receives a variable reference, not an inline object
    const inlineToolbarPattern = /toolbarProps=\{\{/
    const hasInlineToolbar = inlineToolbarPattern.test(source)
    expect(hasInlineToolbar).toBe(false)
  })

  it('should import useMemo from react', () => {
    // useMemo must be imported for the memoization to work
    const hasUseMemo = /import\s*\{[^}]*useMemo[^}]*\}\s*from\s*['"]react['"]/.test(source)
    expect(hasUseMemo).toBe(true)
  })
})

describe('Performance: split canvasNodes useMemo in useEditorGraphData.ts', () => {
  const filePath = path.resolve(__dirname, '../../hooks/useEditorGraphData.ts')
  const source = fs.readFileSync(filePath, 'utf-8')

  it('should have separate useMemo for size mapping logic', () => {
    // The size mapping logic (getNodeSize) should be in its own useMemo,
    // so that changing colorMappingMode doesn't recompute sizes and vice versa.
    // Look for a useMemo that depends on sizeMappingMode but NOT colorMappingMode.
    const useMemoBlocks = extractUseMemoBlocks(source)
    const sizeMemo = useMemoBlocks.find(block =>
      block.includes('sizeMappingMode') && !block.includes('colorMappingMode')
    )
    expect(sizeMemo).toBeDefined()
  })

  it('should have separate useMemo for color mapping logic', () => {
    // The color mapping logic (getNodeColor) should be in its own useMemo,
    // so that changing sizeMappingMode doesn't recompute colors.
    const useMemoBlocks = extractUseMemoBlocks(source)
    const colorMemo = useMemoBlocks.find(block =>
      block.includes('colorMappingMode') && !block.includes('sizeMappingMode')
    )
    expect(colorMemo).toBeDefined()
  })

  it('should NOT have a single useMemo with both size and color mapping deps', () => {
    // There should be no single useMemo dependency array containing both
    // sizeMappingMode and colorMappingMode — that defeats memoization.
    const depArrays = extractUseMemoDepArrays(source)
    const combinedDep = depArrays.find(deps =>
      deps.includes('sizeMappingMode') && deps.includes('colorMappingMode')
    )
    expect(combinedDep).toBeUndefined()
  })
})

// ── Helpers ──

/** Extract all useMemo block bodies (including dependency arrays) from source */
function extractUseMemoBlocks(source: string): string[] {
  const blocks: string[] = []
  const lines = source.split('\n')
  let depth = 0
  let inMemo = false
  let currentBlock = ''
  let parenDepth = 0

  for (const line of lines) {
    if (line.includes('useMemo(') && !line.trim().startsWith('//')) {
      inMemo = true
      depth = 0
      parenDepth = 0
      currentBlock = ''
    }
    if (inMemo) {
      currentBlock += line + '\n'
      for (const ch of line) {
        if (ch === '(') parenDepth++
        if (ch === ')') parenDepth--
      }
      // useMemo(...) ends when parens balance
      if (parenDepth <= 0 && currentBlock.length > 10) {
        blocks.push(currentBlock)
        inMemo = false
        currentBlock = ''
      }
    }
  }
  return blocks
}

/** Extract dependency arrays from useMemo calls */
function extractUseMemoDepArrays(source: string): string[] {
  const depArrays: string[] = []
  // Match the dependency array portion: , [dep1, dep2, ...])
  const memoBlocks = extractUseMemoBlocks(source)
  for (const block of memoBlocks) {
    // Find the last [...] in the block (the dependency array)
    const matches = block.match(/\[([^\]]*)\]\s*\)\s*$/)
    if (matches) {
      depArrays.push(matches[1])
    }
  }
  return depArrays
}
