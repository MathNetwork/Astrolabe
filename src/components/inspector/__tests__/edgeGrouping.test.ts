/**
 * 边按 relation 分组显示
 *
 * 入边和出边不再固定显示为 "Depends on" / "Used by"，
 * 而是按 relation 类型分组，显示 relation 对应的标签。
 */
import { describe, it, expect } from 'vitest'

/**
 * 每条 relation 都有主动和被动形式：
 * - proves → "Proves" / "Proved by"
 * - uses → "Uses" / "Used by"
 * - specializes → "Specializes" / "Specialized by"
 * 等等。
 *
 * groupEdgesByRelation 将边按 relation 分组。
 */

type Edge = { source: string; target: string; relation?: string }

type EdgeGroup = { relation: string; label: string; edges: Edge[] }

import { groupEdgesByRelation, getRelationLabel } from '../edgeGroupUtils'

describe('getRelationLabel', () => {
    it('出边使用主动形式', () => {
        expect(getRelationLabel('specializes', 'out')).toBe('Specializes')
        expect(getRelationLabel('proves', 'out')).toBe('Proves')
        expect(getRelationLabel('uses', 'out')).toBe('Uses')
        expect(getRelationLabel('generalizes', 'out')).toBe('Generalizes')
        expect(getRelationLabel('motivates', 'out')).toBe('Motivates')
    })

    it('入边使用被动形式', () => {
        expect(getRelationLabel('specializes', 'in')).toBe('Specialized by')
        expect(getRelationLabel('proves', 'in')).toBe('Proved by')
        expect(getRelationLabel('uses', 'in')).toBe('Used by')
        expect(getRelationLabel('generalizes', 'in')).toBe('Generalized by')
        expect(getRelationLabel('motivates', 'in')).toBe('Motivated by')
    })

    it('未知 relation fallback 为首字母大写', () => {
        expect(getRelationLabel('foo_bar', 'out')).toBe('Foo bar')
        expect(getRelationLabel('foo_bar', 'in')).toBe('Foo bar (inverse)')
    })
})

describe('groupEdgesByRelation', () => {
    it('按 relation 分组', () => {
        const edges: Edge[] = [
            { source: 'a', target: 'b', relation: 'uses' },
            { source: 'a', target: 'c', relation: 'specializes' },
            { source: 'a', target: 'd', relation: 'uses' },
        ]
        const groups = groupEdgesByRelation(edges, 'out')
        expect(groups).toHaveLength(2)
        expect(groups[0].relation).toBe('uses')
        expect(groups[0].edges).toHaveLength(2)
        expect(groups[1].relation).toBe('specializes')
        expect(groups[1].edges).toHaveLength(1)
    })

    it('无 relation 的边归入 "related"', () => {
        const edges: Edge[] = [
            { source: 'a', target: 'b' },
            { source: 'a', target: 'c', relation: 'uses' },
        ]
        const groups = groupEdgesByRelation(edges, 'out')
        const relatedGroup = groups.find(g => g.relation === 'related')
        expect(relatedGroup).toBeDefined()
        expect(relatedGroup!.edges).toHaveLength(1)
    })

    it('空数组返回空', () => {
        expect(groupEdgesByRelation([], 'out')).toHaveLength(0)
    })

    it('label 使用正确的方向形式', () => {
        const edges: Edge[] = [
            { source: 'a', target: 'b', relation: 'specializes' },
        ]
        const outGroups = groupEdgesByRelation(edges, 'out')
        expect(outGroups[0].label).toBe('Specializes')

        const inGroups = groupEdgesByRelation(edges, 'in')
        expect(inGroups[0].label).toBe('Specialized by')
    })
})
