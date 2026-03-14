/**
 * Edge utility functions for the inspector panel.
 *
 * Morphisms have no sort — all edges are grouped together by direction.
 */

type Edge = { source: string; target: string; sort?: string }

export type EdgeGroup = { relation: string; label: string; edges: Edge[] }

export function getRelationLabel(_relation: string, direction: 'in' | 'out'): string {
    return direction === 'out' ? 'Outgoing' : 'Incoming'
}

export function groupEdgesByRelation(edges: Edge[], direction: 'in' | 'out'): EdgeGroup[] {
    if (edges.length === 0) return []
    return [{
        relation: 'morphism',
        label: direction === 'out' ? 'Outgoing' : 'Incoming',
        edges,
    }]
}
