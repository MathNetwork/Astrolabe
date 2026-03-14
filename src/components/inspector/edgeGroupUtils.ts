/**
 * 边按 relation 分组的工具函数
 */

type Edge = { source: string; target: string; relation?: string }

export type EdgeGroup = { relation: string; label: string; edges: Edge[] }

const RELATION_LABELS: Record<string, { out: string; in: string }> = {
    proves: { out: 'Proves', in: 'Proved by' },
    uses: { out: 'Uses', in: 'Used by' },
    generalizes: { out: 'Generalizes', in: 'Generalized by' },
    specializes: { out: 'Specializes', in: 'Specialized by' },
    motivates: { out: 'Motivates', in: 'Motivated by' },
    contradicts: { out: 'Contradicts', in: 'Contradicted by' },
    related: { out: 'Related', in: 'Related' },
}

export function getRelationLabel(relation: string, direction: 'in' | 'out'): string {
    const entry = RELATION_LABELS[relation]
    if (entry) return entry[direction]
    // Fallback: capitalize first letter, replace underscores
    const display = relation.charAt(0).toUpperCase() + relation.slice(1).replace(/_/g, ' ')
    return direction === 'out' ? display : `${display} (inverse)`
}

export function groupEdgesByRelation(edges: Edge[], direction: 'in' | 'out'): EdgeGroup[] {
    const groups = new Map<string, Edge[]>()

    for (const edge of edges) {
        const rel = edge.relation || 'related'
        if (!groups.has(rel)) groups.set(rel, [])
        groups.get(rel)!.push(edge)
    }

    return Array.from(groups.entries()).map(([relation, edgeList]) => ({
        relation,
        label: getRelationLabel(relation, direction),
        edges: edgeList,
    }))
}
