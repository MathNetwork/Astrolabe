/**
 * Undo/Redo 功能测试
 *
 * 验证 temporal 中间件的 undo/redo 实际工作。
 */
import { describe, it, expect, beforeEach } from 'vitest'

import { useSelectObjStore } from '../selectObjStore'
import { useSelectMorStore } from '../selectMorStore'
import { useViewStore } from '../viewStore'

describe('selectObjStore undo/redo', () => {
    beforeEach(() => {
        // 重置 store 和历史
        useSelectObjStore.setState({ selectedHash: null })
        useSelectObjStore.temporal.getState().clear()
    })

    it('undo 回退选中操作', () => {
        useSelectObjStore.getState().select('aaa')
        useSelectObjStore.getState().select('bbb')

        expect(useSelectObjStore.getState().selectedHash).toBe('bbb')

        useSelectObjStore.temporal.getState().undo()
        expect(useSelectObjStore.getState().selectedHash).toBe('aaa')

        useSelectObjStore.temporal.getState().undo()
        expect(useSelectObjStore.getState().selectedHash).toBeNull()
    })

    it('redo 重做选中操作', () => {
        useSelectObjStore.getState().select('aaa')
        useSelectObjStore.temporal.getState().undo()

        expect(useSelectObjStore.getState().selectedHash).toBeNull()

        useSelectObjStore.temporal.getState().redo()
        expect(useSelectObjStore.getState().selectedHash).toBe('aaa')
    })
})

describe('selectMorStore undo/redo', () => {
    beforeEach(() => {
        useSelectMorStore.setState({ selectedHash: null })
        useSelectMorStore.temporal.getState().clear()
    })

    it('undo 回退边选中', () => {
        useSelectMorStore.getState().select('edge1')
        useSelectMorStore.temporal.getState().undo()
        expect(useSelectMorStore.getState().selectedHash).toBeNull()
    })
})

describe('viewStore undo/redo', () => {
    beforeEach(() => {
        useViewStore.setState({ viewMode: 'read', layoutPreset: 'read', showLabels: false, showBridges: false })
        useViewStore.temporal.getState().clear()
    })

    it('undo 回退视图切换', () => {
        useViewStore.getState().setViewMode('network')
        useViewStore.getState().setViewMode('detail')

        useViewStore.temporal.getState().undo()
        expect(useViewStore.getState().viewMode).toBe('network')

        useViewStore.temporal.getState().undo()
        expect(useViewStore.getState().viewMode).toBe('read')
    })
})
