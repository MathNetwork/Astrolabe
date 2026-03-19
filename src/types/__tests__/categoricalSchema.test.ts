/**
 * 范畴论 schema 前端类型测试
 *
 * Object (节点) 用 sort 字段标识类型。
 * Morphism (边) 无 sort 字段，含义通过 notes 描述。
 */
import { describe, it, expect } from 'vitest'

import type { AstroNode, AstroEdge } from '../graph'

describe('AstroNode (Object)', () => {
    it('使用 sort 字段而非 kind', () => {
        const node: AstroNode = {
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
        // @ts-expect-error - kind should not exist on AstroNode
        expect(node.kind).toBeUndefined()
    })
})

describe('AstroEdge (Morphism)', () => {
    it('无 sort 字段（legacy 图类型）', () => {
        const edge: AstroEdge = {
            id: 'xyz',
            source: 'a',
            target: 'b',
            fromLean: false,
            defaultColor: '#888',
            defaultWidth: 1,
            defaultStyle: 'solid',
            visible: true,
        }
        // @ts-expect-error - relation should not exist on AstroEdge
        expect(edge.relation).toBeUndefined()
    })
})

describe('KnowledgeMorphism sort 字段', () => {
    it('支持可选 sort 字段', () => {
        // KnowledgeMorphism 定义在 dataStore 中
        const source = require('fs').readFileSync('src/stores/dataStore.ts', 'utf-8')
        // 接口中应包含 sort?: string
        expect(source).toMatch(/sort\?\s*:\s*string/)
    })

    it('KnowledgeMorphism 接口包含标准 mor 字段', () => {
        const source = require('fs').readFileSync('src/stores/dataStore.ts', 'utf-8')
        expect(source).toContain('id: string')
        expect(source).toContain('source: string')
        expect(source).toContain('target: string')
    })
})
