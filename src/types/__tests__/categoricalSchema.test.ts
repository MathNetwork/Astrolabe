/**
 * 范畴论 schema 前端类型测试
 *
 * Object (节点) 用 sort 字段标识类型。
 * Morphism (边) 无 sort 字段，含义通过 notes 描述。
 */
import { describe, it, expect } from 'vitest'

import type { NetMathNode, NetMathEdge } from '../graph'

describe('NetMathNode (Object)', () => {
    it('使用 sort 字段而非 kind', () => {
        const node: NetMathNode = {
            id: 'abc',
            name: 'Test',
            sort: 'theorem',
            status: 'stated',
            defaultColor: '#888',
            defaultSize: 1,
            defaultShape: 'sphere',
            pinned: false,
            visible: true,
        }
        expect(node.sort).toBe('theorem')
        // @ts-expect-error - kind should not exist on NetMathNode
        expect(node.kind).toBeUndefined()
    })
})

describe('NetMathEdge (Morphism)', () => {
    it('无 sort 字段', () => {
        const edge: NetMathEdge = {
            id: 'xyz',
            source: 'a',
            target: 'b',
            fromLean: false,
            defaultColor: '#888',
            defaultWidth: 1,
            defaultStyle: 'solid',
            visible: true,
        }
        // sort should not exist on NetMathEdge
        expect((edge as any).sort).toBeUndefined()
        // @ts-expect-error - relation should not exist on NetMathEdge
        expect(edge.relation).toBeUndefined()
    })
})
