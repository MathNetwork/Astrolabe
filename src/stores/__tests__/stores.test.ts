/**
 * dataStore + viewStore 测试
 *
 * selection 测试在 selection.test.ts 中。
 */
import { describe, it, expect, beforeEach } from 'vitest'

import { useSelectObjStore } from '../selectObjStore'
import { useDataStore } from '../dataStore'
import { useViewStore } from '../viewStore'
import { usePhysicsStore } from '../physicsStore'
import { useAnalysisStore } from '../analysisStore'

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
        useDataStore.getState().setObjects([
            { id: 'a', name: 'Theorem A', sort: 'theorem', status: 'stated' },
            { id: 'b', name: 'Definition B', sort: 'definition', status: 'stated' },
        ])
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
            layoutMode: 'single',
            showLabels: false,
            showBridges: false,
        })
    })

    it('初始状态', () => {
        expect(useViewStore.getState().layoutMode).toBe('single')
        expect(useViewStore.getState().showLabels).toBe(false)
    })

    it('setLayoutMode 切换布局', () => {
        useViewStore.getState().setLayoutMode('split-right')
        expect(useViewStore.getState().layoutMode).toBe('split-right')
    })

    it('toggleLabels', () => {
        useViewStore.getState().toggleLabels()
        expect(useViewStore.getState().showLabels).toBe(true)
    })
})

describe('physicsStore', () => {
    it('存在且有初始状态', () => {
        const state = usePhysicsStore.getState()
        expect(state).toHaveProperty('gravity')
        expect(state).toHaveProperty('repulsion')
        expect(state).toHaveProperty('linkDistance')
    })
})

describe('analysisStore', () => {
    it('存在且有初始状态', () => {
        const state = useAnalysisStore.getState()
        expect(state).toHaveProperty('data')
        expect(state).toHaveProperty('loading')
    })

    it('data 初始为空对象', () => {
        expect(useAnalysisStore.getState().data).toEqual({})
    })
})

describe('store 独立性', () => {
    it('修改 obj selection 不影响 dataStore', () => {
        const dataBefore = useDataStore.getState()
        useSelectObjStore.getState().select('abc')
        const dataAfter = useDataStore.getState()
        expect(dataBefore.objects).toBe(dataAfter.objects)
    })

    it('修改 view 不影响 obj selection', () => {
        useSelectObjStore.getState().select('abc')
        useViewStore.getState().setLayoutMode('split-right')
        expect(useSelectObjStore.getState().selectedHash).toBe('abc')
    })
})
