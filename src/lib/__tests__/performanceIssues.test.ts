import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

/**
 * Performance regression tests
 *
 * These tests verify that known performance anti-patterns are NOT present in the codebase.
 * Each test reads source code and checks for the specific pattern.
 */

describe('Performance: useCanvasStore selectors in page.tsx', () => {
  const filePath = path.resolve(__dirname, '../../app/local/edit/page.tsx')
  const source = fs.readFileSync(filePath, 'utf-8')

  it('should NOT destructure useCanvasStore() without a selector', () => {
    // Pattern: `} = useCanvasStore()` means full store subscription — every position
    // update triggers a re-render of the entire editor component.
    // Instead, each property should use an individual selector:
    //   const visibleNodes = useCanvasStore(s => s.visibleNodes)
    const hasFullStoreDestructure = /\}\s*=\s*useCanvasStore\(\s*\)/.test(source)
    expect(hasFullStoreDestructure).toBe(false)
  })

  it('should use individual selectors for each canvasStore property', () => {
    // Verify that the properties previously destructured are now accessed via selectors
    const selectorPattern = /useCanvasStore\(\s*s\s*=>\s*s\.\w+\s*\)/g
    const selectors = source.match(selectorPattern) || []
    // We expect at least the key properties: visibleNodes, customNodes, customEdges,
    // knowledgeNodes, knowledgeEdges, positionsLoaded, loadCanvas, resetAllData, setProjectPath
    expect(selectors.length).toBeGreaterThanOrEqual(5)
  })
})

describe('Performance: duplicate file loading in NetworkRead.tsx', () => {
  const filePath = path.resolve(__dirname, '../../components/NetworkRead.tsx')
  const source = fs.readFileSync(filePath, 'utf-8')

  it('should NOT have two separate useEffects that both fetch all doc files', () => {
    // Count how many useEffect blocks contain Promise.all fetching docs/read
    // There should be exactly ONE such effect (the merged preload + numbering effect),
    // not two separate ones.
    const effectBlocks: string[] = []
    // Find all useEffect calls and check which ones do Promise.all with docs/read
    const lines = source.split('\n')
    let depth = 0
    let inEffect = false
    let currentBlock = ''

    for (const line of lines) {
      if (line.includes('useEffect(') && !line.trim().startsWith('//')) {
        inEffect = true
        depth = 0
        currentBlock = ''
      }
      if (inEffect) {
        currentBlock += line + '\n'
        for (const ch of line) {
          if (ch === '{') depth++
          if (ch === '}') depth--
        }
        // Effect body ends when we return to depth 0 after entering
        if (depth <= 0 && currentBlock.length > 20) {
          effectBlocks.push(currentBlock)
          inEffect = false
          currentBlock = ''
        }
      }
    }

    const fetchAllEffects = effectBlocks.filter(block =>
      block.includes('Promise.all') && block.includes('docs/read')
    )

    expect(fetchAllEffects.length).toBeLessThanOrEqual(1)
  })
})

describe('Performance: unnecessary reloadKnowledge on file switch', () => {
  const filePath = path.resolve(__dirname, '../../components/NetworkRead.tsx')
  const source = fs.readFileSync(filePath, 'utf-8')

  it('should NOT trigger reloadKnowledge when activeFile changes', () => {
    // The useEffect that calls reloadKnowledge should NOT have activeFile
    // in its dependency array, since switching MDX files doesn't change knowledge data.
    // Look for the pattern: useEffect with reloadKnowledge() and [activeFile, ...] deps
    const hasActiveFileDep = /useEffect\(\s*\(\)\s*=>\s*\{[^}]*reloadKnowledge\(\)[^}]*\}\s*,\s*\[[^\]]*activeFile[^\]]*\]/.test(source)
    expect(hasActiveFileDep).toBe(false)
  })
})
