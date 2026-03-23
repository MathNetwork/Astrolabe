import { computeCollapseTarget } from '../lib/refView'

describe('viewMode toggle', () => {
  // viewStore integration tested via the store itself
  // here we test the collapse geometry

  test('collapse target is midpoint of two refs', () => {
    const nodePositions: Record<string, { x: number; y: number }> = {
      a1: { x: 0, y: 0 },
      a2: { x: 100, y: 0 },
    }
    const ref = ['a1', 'a2']
    const target = computeCollapseTarget(ref, nodePositions)
    expect(target.x).toBe(50)
    expect(target.y).toBe(0)
  })

  test('collapse target for 3 refs is centroid', () => {
    const nodePositions: Record<string, { x: number; y: number }> = {
      a1: { x: 0, y: 0 },
      a2: { x: 90, y: 0 },
      a3: { x: 0, y: 90 },
    }
    const ref = ['a1', 'a2', 'a3']
    const target = computeCollapseTarget(ref, nodePositions)
    expect(target.x).toBe(30)
    expect(target.y).toBe(30)
  })

  test('collapse target with missing positions returns origin', () => {
    const target = computeCollapseTarget(['a1', 'a2'], {})
    expect(target.x).toBe(0)
    expect(target.y).toBe(0)
  })

  test('collapse target with single ref returns that position', () => {
    const nodePositions = { a1: { x: 42, y: 99 } }
    const target = computeCollapseTarget(['a1'], nodePositions)
    expect(target.x).toBe(42)
    expect(target.y).toBe(99)
  })
})
