/**
 * 范畴论 schema 前端类型测试
 *
 * 验证前端类型定义使用 sort 而非 kind/relation。
 * Object (节点) 和 Morphism (边) 都用 sort 字段标识其 sort。
 */
import { describe, it, expect } from 'vitest'

import type { NetMathNode, NetMathEdge } from '../graph'

describe('NetMathNode (Object)', () => {
    it('使用 sort 字段而非 kind', () => {
        // 如果类型定义正确，这段代码应该可以编译通过
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
    it('使用 sort 字段而非 relation', () => {
        const edge: NetMathEdge = {
            id: 'xyz',
            source: 'a',
            target: 'b',
            fromLean: false,
            sort: 'uses',
            defaultColor: '#888',
            defaultWidth: 1,
            defaultStyle: 'solid',
            visible: true,
        }
        expect(edge.sort).toBe('uses')
        // @ts-expect-error - relation should not exist on NetMathEdge
        expect(edge.relation).toBeUndefined()
    })
})
