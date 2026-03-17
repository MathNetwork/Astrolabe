/**
 * obj/mor 选中状态测试
 *
 * 两个独立 store，互不影响。
 */
import { describe, it, expect, beforeEach } from 'vitest'

import { useSelectObjStore } from '../selectObjStore'
import { useSelectMorStore } from '../selectMorStore'

describe('selectObjStore', () => {
    beforeEach(() => {
        useSelectObjStore.setState({ selectedHash: null, focusHash: null })
    })

    it('初始状态：无选中', () => {
        expect(useSelectObjStore.getState().selectedHash).toBeNull()
        expect(useSelectObjStore.getState().focusHash).toBeNull()
    })

    it('select 设置 hash', () => {
        useSelectObjStore.getState().select('dfb777a7655b')
        expect(useSelectObjStore.getState().selectedHash).toBe('dfb777a7655b')
    })

    it('select(null) 清除', () => {
        useSelectObjStore.getState().select('dfb777a7655b')
        useSelectObjStore.getState().select(null)
        expect(useSelectObjStore.getState().selectedHash).toBeNull()
    })

    it('focus 设置跳转目标', () => {
        useSelectObjStore.getState().focus('dfb777a7655b')
        expect(useSelectObjStore.getState().focusHash).toBe('dfb777a7655b')
    })
})

describe('selectMorStore', () => {
    beforeEach(() => {
        useSelectMorStore.setState({ selectedHash: null })
    })

    it('初始状态：无选中', () => {
        expect(useSelectMorStore.getState().selectedHash).toBeNull()
    })

    it('select 设置 hash', () => {
        useSelectMorStore.getState().select('42a3671557f9')
        expect(useSelectMorStore.getState().selectedHash).toBe('42a3671557f9')
    })

    it('select(null) 清除', () => {
        useSelectMorStore.getState().select('42a3671557f9')
        useSelectMorStore.getState().select(null)
        expect(useSelectMorStore.getState().selectedHash).toBeNull()
    })
})

describe('独立性', () => {
    it('选 obj 不影响 mor', () => {
        useSelectMorStore.getState().select('mor123')
        useSelectObjStore.getState().select('obj456')
        expect(useSelectMorStore.getState().selectedHash).toBe('mor123')
    })

    it('选 mor 不影响 obj', () => {
        useSelectObjStore.getState().select('obj456')
        useSelectMorStore.getState().select('mor123')
        expect(useSelectObjStore.getState().selectedHash).toBe('obj456')
    })

    it('可以同时选中 obj 和 mor', () => {
        useSelectObjStore.getState().select('obj456')
        useSelectMorStore.getState().select('mor123')
        expect(useSelectObjStore.getState().selectedHash).toBe('obj456')
        expect(useSelectMorStore.getState().selectedHash).toBe('mor123')
    })
})
