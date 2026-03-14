/**
 * 测试：toNetMathNode 应从 objectSortConfig 读取 sort 对应的 size
 */
import { describe, it, expect } from 'vitest'

import { toNetMathNode } from '../graph'
import type { GraphNode } from '../graph'

function makeGraphNode(overrides: Partial<GraphNode> = {}): GraphNode {
  return {
    id: 'test-1',
    name: 'Test Node',
    type: 'definition',
    status: 'stated' as const,
    ...overrides,
  }
}

describe('toNetMathNode sort-based defaultSize', () => {
  it('reference sort 使用 objectSortConfig 中定义的较大 size', () => {
    const node = toNetMathNode(makeGraphNode({ type: 'reference' }))
    expect(node.defaultSize).toBe(1.8)
  })

  it('普通 sort 没有配置 size 时使用默认 1.0', () => {
    const node = toNetMathNode(makeGraphNode({ type: 'theorem' }))
    expect(node.defaultSize).toBe(1.0)
  })

  it('用户自定义 customSize 优先于 sort config', () => {
    const node = toNetMathNode(makeGraphNode({ type: 'reference', customSize: 3.0 }))
    expect(node.defaultSize).toBe(3.0)
  })

  it('defaultShape 从 objectSortConfig 读取', () => {
    const node = toNetMathNode(makeGraphNode({ type: 'reference' }))
    expect(node.defaultShape).toBe('cylinder')
  })

  it('defaultColor 从 objectSortConfig 读取（无 customColor 时）', () => {
    const node = toNetMathNode(makeGraphNode({ type: 'reference' }))
    expect(node.defaultColor).toBe('#708090')
  })

  it('customColor 优先于 sort config color', () => {
    const node = toNetMathNode(makeGraphNode({ type: 'reference', customColor: '#ff0000' }))
    expect(node.defaultColor).toBe('#ff0000')
  })
})
