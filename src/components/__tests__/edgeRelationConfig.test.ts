/**
 * Morphism sort config 测试
 *
 * 集中管理 morphism sort (edge relation) → color/label 映射，
 * 类似 objectSortConfig 对 object sort (node kind) 的管理。
 */
import { describe, it, expect } from 'vitest'

import {
    MORPHISM_SORT_CONFIG,
    MORPHISM_SORT_DEFAULT,
    getMorphismSort,
    type MorphismSortVisual,
} from '../../../assets/morphismSortConfig'

describe('MORPHISM_SORT_CONFIG', () => {
    it('包含所有 5 种 morphism sort', () => {
        const expected = ['proves', 'uses', 'motivates', 'contradicts', 'related']
        for (const rel of expected) {
            expect(MORPHISM_SORT_CONFIG[rel]).toBeDefined()
        }
    })

    it('不包含已移除的 generalizes 和 specializes', () => {
        expect(MORPHISM_SORT_CONFIG['generalizes']).toBeUndefined()
        expect(MORPHISM_SORT_CONFIG['specializes']).toBeUndefined()
    })

    it('每个 sort 都有 color 和 label', () => {
        for (const [, visual] of Object.entries(MORPHISM_SORT_CONFIG)) {
            expect(visual.color).toMatch(/^#[0-9a-fA-F]{6}$/)
            expect(visual.label).toBeTruthy()
        }
    })
})

describe('getMorphismSort', () => {
    it('已知 relation 返回对应配置', () => {
        const proves = getMorphismSort('proves')
        expect(proves.color).toBe('#22c55e')
        expect(proves.label).toBe('Proves')
    })

    it('未知 relation 返回 default', () => {
        const unknown = getMorphismSort('unknown_rel')
        expect(unknown).toEqual(MORPHISM_SORT_DEFAULT)
    })

    it('undefined 返回 default', () => {
        expect(getMorphismSort(undefined)).toEqual(MORPHISM_SORT_DEFAULT)
    })
})
