/**
 * Morphism visual config 测试
 *
 * 态射无 sort 分类，使用统一的默认视觉配置。
 */
import { describe, it, expect } from 'vitest'

import {
    MORPHISM_SORT_CONFIG,
    MORPHISM_DEFAULT,
    getMorphismVisual,
} from '../../../assets/morphismSortConfig'

describe('MORPHISM_DEFAULT', () => {
    it('有 color 和 label', () => {
        expect(MORPHISM_DEFAULT.color).toMatch(/^#[0-9a-fA-F]{6}$/)
        expect(MORPHISM_DEFAULT.label).toBeTruthy()
    })
})

describe('MORPHISM_SORT_CONFIG (deprecated)', () => {
    it('为空对象（态射无 sort 分类）', () => {
        expect(Object.keys(MORPHISM_SORT_CONFIG)).toHaveLength(0)
    })
})

describe('getMorphismVisual', () => {
    it('返回默认配置', () => {
        expect(getMorphismVisual()).toEqual(MORPHISM_DEFAULT)
    })
})
