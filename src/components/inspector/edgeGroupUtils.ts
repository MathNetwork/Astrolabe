/**
 * 边按 relation 分组的工具函数
 *
 * Active labels (out) come from morphismSortConfig (single source of truth).
 * Passive labels (in) are defined here as UI-layer display logic.
 */
import { MORPHISM_SORT_CONFIG } from '../../../assets/morphismSortConfig'

type Edge = { source: string; target: string; relation?: string }

export type EdgeGroup = { relation: string; label: string; edges: Edge[] }

const PASSIVE_LABELS: Record<string, string> = {
    proves: 'Proved by',
    uses: 'Used by',
    motivates: 'Motivated by',
    contradicts: 'Contradicted by',
    related: 'Related',
}

export function getRelationLabel(relation: string, direction: 'in' | 'out'): string {
    if (direction === 'out') {
        const config = MORPHISM_SORT_CONFIG[relation]
        if (config) return config.label
    } else {
        const passive = PASSIVE_LABELS[relation]
        if (passive) return passive
    }
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
