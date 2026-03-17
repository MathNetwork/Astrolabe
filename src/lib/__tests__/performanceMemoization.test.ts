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

describe('Performance: MarkdownRenderer memo wrapper', () => {
  const filePath = path.resolve(__dirname, '../../components/MarkdownRenderer.tsx')
  const source = fs.readFileSync(filePath, 'utf-8')

  it('should wrap default export in React.memo()', () => {
    // MarkdownRenderer is used in CardStack for each pinned card.
    // Without memo(), every knowledgeNodes change triggers expensive KaTeX re-parsing
    // for ALL cards. memo() skips re-render when props (content, className) haven't changed.
    const hasMemoExport = /export\s+default\s+memo\(/.test(source)
    expect(hasMemoExport).toBe(true)
  })

  it('should import memo from react', () => {
    const hasMemoImport = /import\s*\{[^}]*\bmemo\b[^}]*\}\s*from\s*['"]react['"]/.test(source)
    expect(hasMemoImport).toBe(true)
  })
})

describe('Performance: BatchedEdges no string allocation in useFrame', () => {
  const filePath = path.resolve(__dirname, '../../components/graph3d/BatchedEdges.tsx')
  const source = fs.readFileSync(filePath, 'utf-8')

  it('should NOT construct edge key strings inside useFrame callback', () => {
    // With 200 edges at 60fps, `${edge.source}->${edge.target}` creates
    // 12000 temporary strings per second just for Set lookup.
    // Instead, pre-compute a lookup array outside useFrame.
    const useFrameBody = extractUseFrameBody(source)
    expect(useFrameBody).toBeDefined()
    // The useFrame body should NOT contain template literal edge key construction
    const hasTemplateEdgeKey = /`\$\{.*?source.*?}->\$\{.*?target.*?\}`/.test(useFrameBody!)
    expect(hasTemplateEdgeKey).toBe(false)
  })

  it('should pre-compute highlight status array with useMemo', () => {
    // A pre-computed array (edge index → color status) should be built via useMemo
    // that depends on highlightedEdgeIds/dimmedEdgeIds, not recomputed every frame.
    const useMemoBlocks = extractUseMemoBlocks(source)
    const highlightMemo = useMemoBlocks.find(block =>
      (block.includes('highlightedEdgeIds') || block.includes('dimmedEdgeIds')) &&
      (block.includes('highlight') || block.includes('color'))
    )
    expect(highlightMemo).toBeDefined()
  })
})

describe('Performance: consolidated selectedNode sync effects in page.tsx', () => {
  const filePath = path.resolve(__dirname, '../../app/local/edit/page.tsx')
  const source = fs.readFileSync(filePath, 'utf-8')

  it('should have a single useEffect for selectedNode sync (not two separate ones)', () => {
    // Two overlapping useEffects that both modify selectedNode state cause
    // redundant work and potential race conditions. They should be consolidated.
    // Count useEffect blocks that reference both setSelectedNodeState and graphNodes
    const useEffectBlocks = extractUseEffectBlocks(source)
    const syncEffects = useEffectBlocks.filter(block =>
      block.includes('setSelectedNodeState') &&
      block.includes('graphNodes')
    )
    // Should be exactly 1 consolidated effect, not 2 separate ones
    expect(syncEffects.length).toBe(1)
  })
})

describe('Performance: headingComponents as module-level constant', () => {
  const filePath = path.resolve(__dirname, '../../components/NetworkRead.tsx')
  const source = fs.readFileSync(filePath, 'utf-8')

  it('should define headingComponents outside any component function', () => {
    // headingComponents with useMemo([]) creates functions that don't depend on
    // any external state. Moving to module level avoids useMemo overhead entirely.
    // It should NOT appear inside a useMemo call.
    const hasUseMemoHeading = /useMemo\(\s*\(\)\s*=>\s*\(\{[\s\S]*?h1:[\s\S]*?h4:[\s\S]*?\}\)[\s\S]*?\[\s*\]\s*\)/.test(source)
    expect(hasUseMemoHeading).toBe(false)
  })

  it('should have headingComponents as a const at module level', () => {
    // headingComponents should be declared as a module-level const (outside component body)
    // Find it before the NetworkRead component definition
    const componentStart = source.indexOf('export const NetworkRead')
    expect(componentStart).toBeGreaterThan(-1)
    const beforeComponent = source.substring(0, componentStart)
    const hasModuleLevelHeading = /const\s+headingComponents\s*[=:]/.test(beforeComponent)
    expect(hasModuleLevelHeading).toBe(true)
  })
})

// ── Helpers ──

/** Extract the body of the useFrame callback */
function extractUseFrameBody(source: string): string | undefined {
  const lines = source.split('\n')
  let inFrame = false
  let body = ''
  let parenDepth = 0

  for (const line of lines) {
    if (line.includes('useFrame(') && !line.trim().startsWith('//')) {
      inFrame = true
      parenDepth = 0
      body = ''
    }
    if (inFrame) {
      body += line + '\n'
      for (const ch of line) {
        if (ch === '(') parenDepth++
        if (ch === ')') parenDepth--
      }
      if (parenDepth <= 0 && body.length > 10) {
        return body
      }
    }
  }
  return undefined
}

/** Extract all useEffect block bodies from source */
function extractUseEffectBlocks(source: string): string[] {
  const blocks: string[] = []
  const lines = source.split('\n')
  let inEffect = false
  let currentBlock = ''
  let parenDepth = 0

  for (const line of lines) {
    if (line.includes('useEffect(') && !line.trim().startsWith('//')) {
      inEffect = true
      parenDepth = 0
      currentBlock = ''
    }
    if (inEffect) {
      currentBlock += line + '\n'
      for (const ch of line) {
        if (ch === '(') parenDepth++
        if (ch === ')') parenDepth--
      }
      if (parenDepth <= 0 && currentBlock.length > 10) {
        blocks.push(currentBlock)
        inEffect = false
        currentBlock = ''
      }
    }
  }
  return blocks
}

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
