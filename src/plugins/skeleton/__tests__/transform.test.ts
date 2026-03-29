import { describe, it, expect } from 'vitest'
import { groupEdgesBySort } from '../transform'

// Mock astrolabe data
const entries: Record<string, { ref: string[]; record: string }> = {
    // Atoms
    'aaa': { ref: ['aaa'], record: '{"sort":"theorem","title":"Rigidity"}' },
    'bbb': { ref: ['bbb'], record: '{"sort":"proof","title":"Proof of Rigidity"}' },
    'ccc': { ref: ['ccc'], record: '{"sort":"definition","title":"Active set"}' },
    'ddd': { ref: ['ddd'], record: '{"sort":"lemma","title":"Unique Hamilton cycle"}' },
    'eee': { ref: ['eee'], record: '{"sort":"lean-theorem","title":"HessenbergDigraphs.rigid"}' },
    // Degree-1 edges
    'e1': { ref: ['aaa', 'bbb'], record: '{"sort":"(theorem, proof)"}' },
    'e2': { ref: ['aaa', 'ccc'], record: '{"sort":"(theorem, definition)"}' },
    'e3': { ref: ['aaa', 'ddd'], record: '{"sort":"(theorem, lemma)"}' },
    'e4': { ref: ['ddd', 'aaa'], record: '{"sort":"(lemma, theorem)"}' },
    'e5': { ref: ['aaa', 'eee'], record: '{"sort":"(theorem, lean-theorem)"}' },
}

describe('groupEdgesBySort', () => {
    it('returns outgoing and incoming edges for a given atom', () => {
        const result = groupEdgesBySort('aaa', entries)
        expect(result.outgoing.length).toBeGreaterThan(0)
        expect(result.incoming.length).toBeGreaterThan(0)
    })

    it('outgoing edges have ref[0] = selected atom', () => {
        const result = groupEdgesBySort('aaa', entries)
        for (const edge of result.outgoing) {
            expect(edge.ref[0]).toBe('aaa')
        }
    })

    it('incoming edges have ref[1] = selected atom', () => {
        const result = groupEdgesBySort('aaa', entries)
        for (const edge of result.incoming) {
            expect(edge.ref[1]).toBe('aaa')
        }
    })

    it('groups outgoing by sort', () => {
        const result = groupEdgesBySort('aaa', entries)
        const sorts = result.outgoing.map(e => e.sort)
        expect(sorts).toContain('(theorem, proof)')
        expect(sorts).toContain('(theorem, definition)')
        expect(sorts).toContain('(theorem, lemma)')
        expect(sorts).toContain('(theorem, lean-theorem)')
    })

    it('groups incoming by sort', () => {
        const result = groupEdgesBySort('aaa', entries)
        const sorts = result.incoming.map(e => e.sort)
        expect(sorts).toContain('(lemma, theorem)')
    })

    it('each edge has targetId, targetTitle, sort, edgeHash', () => {
        const result = groupEdgesBySort('aaa', entries)
        const edge = result.outgoing[0]
        expect(edge).toHaveProperty('targetId')
        expect(edge).toHaveProperty('targetTitle')
        expect(edge).toHaveProperty('sort')
        expect(edge).toHaveProperty('edgeHash')
    })

    it('returns empty for atom with no edges', () => {
        const result = groupEdgesBySort('eee', entries)
        // eee has one incoming (e5) but no outgoing
        expect(result.outgoing).toHaveLength(0)
        expect(result.incoming).toHaveLength(1)
    })

    it('returns empty for unknown atom', () => {
        const result = groupEdgesBySort('zzz', entries)
        expect(result.outgoing).toHaveLength(0)
        expect(result.incoming).toHaveLength(0)
    })
})
