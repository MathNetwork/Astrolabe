import {
  buildRefViewNodes,
  buildRefViewLinks,
  DEGREE_COLORS,
  degreeRadius,
  type RefViewNode,
  type RefViewLink,
} from '../lib/refView'

const MOCK_NODES = [
  { id: 'a1', degree: 0, stage: 0, name: 'atom1' },
  { id: 'a2', degree: 0, stage: 0, name: 'atom2' },
  { id: 'e1', degree: 1, stage: 1, sort: 'uses' },
  { id: 'f1', degree: 2, stage: 1, sort: 'chain' },
  { id: 'm1', degree: 1, stage: 2, sort: 'meta' },
]

const MOCK_LINKS = [
  { source: 'e1', target: 'a1', position: 0 },
  { source: 'e1', target: 'a2', position: 1 },
  { source: 'f1', target: 'a1', position: 0 },
  { source: 'f1', target: 'a2', position: 1 },
  { source: 'f1', target: 'a1', position: 2 },
  { source: 'm1', target: 'e1', position: 0 },
  { source: 'm1', target: 'f1', position: 1 },
]

describe('buildRefViewNodes', () => {
  test('includes all entries as nodes', () => {
    const nodes = buildRefViewNodes(MOCK_NODES)
    expect(nodes.length).toBe(5)
  })

  test('node color by degree', () => {
    const nodes = buildRefViewNodes(MOCK_NODES)
    const byId = Object.fromEntries(nodes.map(n => [n.id, n]))
    expect(byId['a1'].color).toBe(DEGREE_COLORS[0])
    expect(byId['e1'].color).toBe(DEGREE_COLORS[1])
    expect(byId['f1'].color).toBe(DEGREE_COLORS[2])
  })

  test('node radius decreases with degree', () => {
    const nodes = buildRefViewNodes(MOCK_NODES)
    const byId = Object.fromEntries(nodes.map(n => [n.id, n]))
    expect(byId['a1'].radius).toBeGreaterThan(byId['e1'].radius)
    expect(byId['e1'].radius).toBeGreaterThan(byId['f1'].radius)
  })

  test('preserves id and name', () => {
    const nodes = buildRefViewNodes(MOCK_NODES)
    const a1 = nodes.find(n => n.id === 'a1')!
    expect(a1.name).toBe('atom1')
  })

  test('preserves degree and stage', () => {
    const nodes = buildRefViewNodes(MOCK_NODES)
    const m1 = nodes.find(n => n.id === 'm1')!
    expect(m1.degree).toBe(1)
    expect(m1.stage).toBe(2)
  })
})

describe('buildRefViewLinks', () => {
  test('returns all ref links', () => {
    const links = buildRefViewLinks(MOCK_LINKS)
    expect(links.length).toBe(7)
  })

  test('preserves source, target, position', () => {
    const links = buildRefViewLinks(MOCK_LINKS)
    const first = links.find(l => l.source === 'e1' && l.position === 0)!
    expect(first.target).toBe('a1')
  })
})

describe('DEGREE_COLORS', () => {
  test('has colors for degrees 0-4', () => {
    expect(DEGREE_COLORS[0]).toBeDefined()
    expect(DEGREE_COLORS[1]).toBeDefined()
    expect(DEGREE_COLORS[2]).toBeDefined()
    expect(DEGREE_COLORS[3]).toBeDefined()
    expect(DEGREE_COLORS[4]).toBeDefined()
  })

  test('degree 0 is darkest', () => {
    // atom color should be distinct from higher degrees
    expect(DEGREE_COLORS[0]).not.toBe(DEGREE_COLORS[1])
  })
})

describe('degreeRadius', () => {
  test('degree 0 has largest radius', () => {
    expect(degreeRadius(0)).toBeGreaterThan(degreeRadius(1))
  })

  test('radius decreases with degree', () => {
    expect(degreeRadius(1)).toBeGreaterThan(degreeRadius(2))
    expect(degreeRadius(2)).toBeGreaterThan(degreeRadius(3))
  })

  test('radius has minimum', () => {
    expect(degreeRadius(100)).toBeGreaterThanOrEqual(3)
  })
})
