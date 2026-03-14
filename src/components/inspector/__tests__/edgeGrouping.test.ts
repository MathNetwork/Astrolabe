/**
 * 边工具函数测试
 *
 * 态射无 sort 分类，所有边统一分组。
 */
import { describe, it, expect } from 'vitest'

type Edge = { source: string; target: string }

import { groupEdgesByRelation, getRelationLabel } from '../edgeGroupUtils'

describe('getRelationLabel', () => {
    it('出边返回 Outgoing', () => {
        expect(getRelationLabel('anything', 'out')).toBe('Outgoing')
    })

    it('入边返回 Incoming', () => {
        expect(getRelationLabel('anything', 'in')).toBe('Incoming')
    })
})

describe('groupEdgesByRelation', () => {
    it('所有边放入一个组', () => {
        const edges: Edge[] = [
            { source: 'a', target: 'b' },
            { source: 'a', target: 'c' },
            { source: 'a', target: 'd' },
        ]
        const groups = groupEdgesByRelation(edges, 'out')
        expect(groups).toHaveLength(1)
        expect(groups[0].edges).toHaveLength(3)
    })

    it('空数组返回空', () => {
        expect(groupEdgesByRelation([], 'out')).toHaveLength(0)
    })

    it('label 使用正确的方向', () => {
        const edges: Edge[] = [{ source: 'a', target: 'b' }]
        expect(groupEdgesByRelation(edges, 'out')[0].label).toBe('Outgoing')
        expect(groupEdgesByRelation(edges, 'in')[0].label).toBe('Incoming')
    })
})
