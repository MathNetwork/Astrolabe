/**
 * Phase 0: 新 store 设计测试
 *
 * 三个独立 store，各 Panel 只订阅需要的 store。
 * 改变 selection 不触发 physics 订阅者重渲染，反之亦然。
 */
import { describe, it, expect, beforeEach } from 'vitest'

// These imports will fail until we implement the stores
import { useSelectionStore } from '../selectionStore'
import { useDataStore } from '../dataStore'
import { useViewStore } from '../viewStore'

describe('selectionStore', () => {
    beforeEach(() => {
        useSelectionStore.setState({
            selectedNodeId: null,
            selectedEdgeId: null,
            focusNodeId: null,
        })
    })

    it('初始状态：无选中', () => {
        const state = useSelectionStore.getState()
        expect(state.selectedNodeId).toBeNull()
        expect(state.selectedEdgeId).toBeNull()
        expect(state.focusNodeId).toBeNull()
    })

    it('selectNode 设置 selectedNodeId', () => {
        useSelectionStore.getState().selectNode('abc123')
        expect(useSelectionStore.getState().selectedNodeId).toBe('abc123')
    })

    it('selectNode 清除 selectedEdgeId', () => {
        useSelectionStore.setState({ selectedEdgeId: 'edge1' })
        useSelectionStore.getState().selectNode('abc123')
        expect(useSelectionStore.getState().selectedEdgeId).toBeNull()
    })

    it('selectNode(null) 清除选中', () => {
        useSelectionStore.getState().selectNode('abc123')
        useSelectionStore.getState().selectNode(null)
        expect(useSelectionStore.getState().selectedNodeId).toBeNull()
    })

    it('selectEdge 设置 selectedEdgeId 并清除 selectedNodeId', () => {
        useSelectionStore.setState({ selectedNodeId: 'node1' })
        useSelectionStore.getState().selectEdge('edge1')
        expect(useSelectionStore.getState().selectedEdgeId).toBe('edge1')
        expect(useSelectionStore.getState().selectedNodeId).toBeNull()
    })

    it('focusNode 设置 focusNodeId', () => {
        useSelectionStore.getState().focusNode('abc123')
        expect(useSelectionStore.getState().focusNodeId).toBe('abc123')
    })
})

describe('dataStore', () => {
    beforeEach(() => {
        useDataStore.setState({
            objects: [],
            morphisms: [],
            nodeNumbering: new Map(),
        })
    })

    it('初始状态：空数据', () => {
        const state = useDataStore.getState()
        expect(state.objects).toEqual([])
        expect(state.morphisms).toEqual([])
        expect(state.nodeNumbering.size).toBe(0)
    })

    it('setObjects 设置节点数据', () => {
        const objs = [
            { id: 'a', name: 'Theorem A', sort: 'theorem', status: 'stated' },
            { id: 'b', name: 'Definition B', sort: 'definition', status: 'stated' },
        ]
        useDataStore.getState().setObjects(objs)
        expect(useDataStore.getState().objects).toHaveLength(2)
        expect(useDataStore.getState().objects[0].name).toBe('Theorem A')
    })

    it('setMorphisms 设置边数据', () => {
        const mors = [
            { id: 'e1', source: 'a', target: 'b' },
        ]
        useDataStore.getState().setMorphisms(mors)
        expect(useDataStore.getState().morphisms).toHaveLength(1)
    })

    it('setNodeNumbering 设置编号', () => {
        const numbering = new Map([['a', 'Theorem 1.1']])
        useDataStore.getState().setNodeNumbering(numbering)
        expect(useDataStore.getState().nodeNumbering.get('a')).toBe('Theorem 1.1')
    })

    it('getNodeLabel 通过 id 查编号', () => {
        const numbering = new Map([['a', 'Theorem 1.1']])
        useDataStore.getState().setNodeNumbering(numbering)
        expect(useDataStore.getState().getNodeLabel('a')).toBe('Theorem 1.1')
        expect(useDataStore.getState().getNodeLabel('zzz')).toBeUndefined()
    })

    it('getObjectById 通过 id 查节点', () => {
        useDataStore.getState().setObjects([
            { id: 'a', name: 'Theorem A', sort: 'theorem', status: 'stated' },
        ])
        expect(useDataStore.getState().getObjectById('a')?.name).toBe('Theorem A')
        expect(useDataStore.getState().getObjectById('zzz')).toBeUndefined()
    })
})

describe('viewStore', () => {
    beforeEach(() => {
        useViewStore.setState({
            viewMode: 'read',
            layoutPreset: 'read',
            showLabels: false,
            showBridges: false,
        })
    })

    it('初始状态', () => {
        const state = useViewStore.getState()
        expect(state.viewMode).toBe('read')
        expect(state.showLabels).toBe(false)
    })

    it('setViewMode 切换视图', () => {
        useViewStore.getState().setViewMode('network')
        expect(useViewStore.getState().viewMode).toBe('network')
    })

    it('toggleLabels 切换标签', () => {
        useViewStore.getState().toggleLabels()
        expect(useViewStore.getState().showLabels).toBe(true)
        useViewStore.getState().toggleLabels()
        expect(useViewStore.getState().showLabels).toBe(false)
    })

    it('setLayoutPreset 切换布局', () => {
        useViewStore.getState().setLayoutPreset('network')
        expect(useViewStore.getState().layoutPreset).toBe('network')
    })
})

describe('store 独立性', () => {
    it('修改 selection 不影响 dataStore', () => {
        const dataBefore = useDataStore.getState()
        useSelectionStore.getState().selectNode('abc')
        const dataAfter = useDataStore.getState()
        // 同一个引用说明没有触发更新
        expect(dataBefore.objects).toBe(dataAfter.objects)
    })

    it('修改 view 不影响 selectionStore', () => {
        useSelectionStore.getState().selectNode('abc')
        useViewStore.getState().setViewMode('network')
        expect(useSelectionStore.getState().selectedNodeId).toBe('abc')
    })
})
