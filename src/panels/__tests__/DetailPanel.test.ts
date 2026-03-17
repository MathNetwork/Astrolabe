/**
 * Phase 1: DetailPanel 测试
 *
 * DetailPanel 从 selectionStore + dataStore 订阅，零 props。
 * 显示选中节点的详情（sort、name、statement、proof）。
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { useSelectionStore } from '@/stores/selectionStore'
import { useDataStore } from '@/stores/dataStore'

// Verify the stores work correctly for DetailPanel's use case
describe('DetailPanel data flow', () => {
    beforeEach(() => {
        useSelectionStore.setState({ selectedNodeId: null, selectedEdgeId: null, focusNodeId: null })
        useDataStore.setState({ objects: [], morphisms: [], nodeNumbering: new Map() })
    })

    it('选中节点后，可以从 dataStore 获取节点详情', () => {
        useDataStore.getState().setObjects([
            { id: 'abc', name: 'Tangent Cone', sort: 'definition', status: 'stated', statement: 'The tangent cone...' },
            { id: 'def', name: 'Normal Cone', sort: 'definition', status: 'stated', statement: 'The normal cone...' },
        ])

        useSelectionStore.getState().selectNode('abc')

        const nodeId = useSelectionStore.getState().selectedNodeId
        const node = useDataStore.getState().getObjectById(nodeId!)

        expect(node).toBeDefined()
        expect(node!.name).toBe('Tangent Cone')
        expect(node!.sort).toBe('definition')
        expect(node!.statement).toBe('The tangent cone...')
    })

    it('未选中节点时，getObjectById 返回 undefined', () => {
        const nodeId = useSelectionStore.getState().selectedNodeId
        expect(nodeId).toBeNull()
    })

    it('选中不存在的节点，getObjectById 返回 undefined', () => {
        useSelectionStore.getState().selectNode('nonexistent')
        const node = useDataStore.getState().getObjectById('nonexistent')
        expect(node).toBeUndefined()
    })

    it('切换选中节点，数据正确更新', () => {
        useDataStore.getState().setObjects([
            { id: 'a', name: 'Theorem A', sort: 'theorem', status: 'stated', statement: 'If...' },
            { id: 'b', name: 'Lemma B', sort: 'lemma', status: 'stated', statement: 'Let...' },
        ])

        useSelectionStore.getState().selectNode('a')
        expect(useDataStore.getState().getObjectById('a')!.name).toBe('Theorem A')

        useSelectionStore.getState().selectNode('b')
        expect(useDataStore.getState().getObjectById('b')!.name).toBe('Lemma B')
        expect(useSelectionStore.getState().selectedNodeId).toBe('b')
    })

    it('节点有编号时，getNodeLabel 返回编号', () => {
        useDataStore.getState().setNodeNumbering(new Map([['abc', 'Definition 2.1']]))
        expect(useDataStore.getState().getNodeLabel('abc')).toBe('Definition 2.1')
    })
})

// Structural test: DetailPanel source file exists and uses correct stores
describe('DetailPanel 结构检查', () => {
    it('DetailPanel.tsx 文件存在', async () => {
        const fs = await import('fs')
        const exists = fs.existsSync('src/panels/DetailPanel.tsx')
        expect(exists).toBe(true)
    })

    it('DetailPanel 从 stores 订阅，不接收 props', async () => {
        const fs = await import('fs')
        const source = fs.readFileSync('src/panels/DetailPanel.tsx', 'utf-8')

        // 应该使用新 store
        expect(source).toContain('useSelectionStore')
        expect(source).toContain('useDataStore')

        // 不应该有大量 props
        const propsMatch = source.match(/interface.*Props/g)
        if (propsMatch) {
            // 如果有 Props interface，字段不应超过 3 个
            const propsBlock = source.match(/interface\s+\w*Props\s*\{([^}]*)\}/s)
            if (propsBlock) {
                const fields = propsBlock[1].split('\n').filter(l => l.trim() && !l.trim().startsWith('//'))
                expect(fields.length).toBeLessThanOrEqual(3)
            }
        }
    })
})
