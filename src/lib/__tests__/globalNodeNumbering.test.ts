/**
 * 测试：全局节点编号应存储在 canvasStore 中，
 * 使任何组件（不仅是 NetworkRead）都能通过 hash 查询编号。
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { useCanvasStore } from '../canvasStore'

describe('canvasStore nodeNumbering', () => {
    beforeEach(() => {
        // Reset store
        useCanvasStore.setState({ nodeNumbering: new Map() })
    })

    it('store 应该有 nodeNumbering 字段', () => {
        const state = useCanvasStore.getState()
        expect(state).toHaveProperty('nodeNumbering')
    })

    it('nodeNumbering 初始值是空 Map', () => {
        const state = useCanvasStore.getState()
        expect(state.nodeNumbering).toBeInstanceOf(Map)
        expect(state.nodeNumbering.size).toBe(0)
    })

    it('setNodeNumbering 应该更新编号数据', () => {
        const numbering = new Map([
            ['abc123', 'Theorem 7.1'],
            ['def456', 'Corollary 7.1'],
        ])
        useCanvasStore.getState().setNodeNumbering(numbering)

        const state = useCanvasStore.getState()
        expect(state.nodeNumbering.get('abc123')).toBe('Theorem 7.1')
        expect(state.nodeNumbering.get('def456')).toBe('Corollary 7.1')
    })

    it('getNodeLabel 通过 hash 查询编号', () => {
        const numbering = new Map([
            ['abc123', 'Theorem 7.1'],
        ])
        useCanvasStore.getState().setNodeNumbering(numbering)

        expect(useCanvasStore.getState().getNodeLabel('abc123')).toBe('Theorem 7.1')
        expect(useCanvasStore.getState().getNodeLabel('unknown')).toBeUndefined()
    })
})
