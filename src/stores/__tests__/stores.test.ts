/**
 * Store 设计测试
 *
 * selectionStore: 选中的 hash（obj 或 mor）
 * dataStore: knowledge.json 的数据
 * viewStore: 视图状态
 */
import { describe, it, expect, beforeEach } from 'vitest'

import { useSelectionStore } from '../selectionStore'
import { useDataStore } from '../dataStore'
import { useViewStore } from '../viewStore'

describe('selectionStore', () => {
    beforeEach(() => {
        useSelectionStore.setState({
            selectedObjHash: null,
            selectedMorHash: null,
            focusObjHash: null,
        })
    })

    it('初始状态：无选中', () => {
        const state = useSelectionStore.getState()
        expect(state.selectedObjHash).toBeNull()
        expect(state.selectedMorHash).toBeNull()
        expect(state.focusObjHash).toBeNull()
    })

    it('selectObj 设置 selectedObjHash', () => {
        useSelectionStore.getState().selectObj('dfb777a7655b')
        expect(useSelectionStore.getState().selectedObjHash).toBe('dfb777a7655b')
    })

    it('selectObj 清除 selectedMorHash', () => {
        useSelectionStore.setState({ selectedMorHash: 'mor123' })
        useSelectionStore.getState().selectObj('dfb777a7655b')
        expect(useSelectionStore.getState().selectedMorHash).toBeNull()
    })

    it('selectObj(null) 清除选中', () => {
        useSelectionStore.getState().selectObj('dfb777a7655b')
        useSelectionStore.getState().selectObj(null)
        expect(useSelectionStore.getState().selectedObjHash).toBeNull()
    })

    it('selectMor 设置 selectedMorHash 并清除 selectedObjHash', () => {
        useSelectionStore.setState({ selectedObjHash: 'obj123' })
        useSelectionStore.getState().selectMor('42a3671557f9')
        expect(useSelectionStore.getState().selectedMorHash).toBe('42a3671557f9')
        expect(useSelectionStore.getState().selectedObjHash).toBeNull()
    })

    it('selectMor(null) 清除选中', () => {
        useSelectionStore.getState().selectMor('42a3671557f9')
        useSelectionStore.getState().selectMor(null)
        expect(useSelectionStore.getState().selectedMorHash).toBeNull()
    })

    it('focusObj 设置 focusObjHash（用于 3D 跳转）', () => {
        useSelectionStore.getState().focusObj('dfb777a7655b')
        expect(useSelectionStore.getState().focusObjHash).toBe('dfb777a7655b')
    })

    it('同一时刻只能选中 obj 或 mor，不能同时', () => {
        useSelectionStore.getState().selectObj('obj123')
        expect(useSelectionStore.getState().selectedMorHash).toBeNull()

        useSelectionStore.getState().selectMor('mor456')
        expect(useSelectionStore.getState().selectedObjHash).toBeNull()
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
    })

    it('setMorphisms 设置边数据', () => {
        useDataStore.getState().setMorphisms([{ id: 'e1', source: 'a', target: 'b' }])
        expect(useDataStore.getState().morphisms).toHaveLength(1)
    })

    it('setNodeNumbering 设置编号', () => {
        useDataStore.getState().setNodeNumbering(new Map([['a', 'Theorem 1.1']]))
        expect(useDataStore.getState().nodeNumbering.get('a')).toBe('Theorem 1.1')
    })

    it('getNodeLabel 通过 hash 查编号', () => {
        useDataStore.getState().setNodeNumbering(new Map([['a', 'Theorem 1.1']]))
        expect(useDataStore.getState().getNodeLabel('a')).toBe('Theorem 1.1')
        expect(useDataStore.getState().getNodeLabel('zzz')).toBeUndefined()
    })

    it('getObjectById 通过 hash 查 obj', () => {
        useDataStore.getState().setObjects([
            { id: 'dfb777', name: 'Tangent Cone', sort: 'definition', status: 'stated' },
        ])
        expect(useDataStore.getState().getObjectById('dfb777')?.name).toBe('Tangent Cone')
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
        expect(useViewStore.getState().viewMode).toBe('read')
        expect(useViewStore.getState().showLabels).toBe(false)
    })

    it('setViewMode 切换视图', () => {
        useViewStore.getState().setViewMode('network')
        expect(useViewStore.getState().viewMode).toBe('network')
    })

    it('toggleLabels', () => {
        useViewStore.getState().toggleLabels()
        expect(useViewStore.getState().showLabels).toBe(true)
    })
})

describe('store 独立性', () => {
    it('修改 selection 不影响 dataStore', () => {
        const dataBefore = useDataStore.getState()
        useSelectionStore.getState().selectObj('abc')
        const dataAfter = useDataStore.getState()
        expect(dataBefore.objects).toBe(dataAfter.objects)
    })

    it('修改 view 不影响 selectionStore', () => {
        useSelectionStore.getState().selectObj('abc')
        useViewStore.getState().setViewMode('network')
        expect(useSelectionStore.getState().selectedObjHash).toBe('abc')
    })
})
