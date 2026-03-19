/**
 * Sort 颜色系统测试
 *
 * 动态颜色：DEFAULT_SORTS 预设 → autoColor 自动生成
 * 无需 sorts.json 或外部配置
 */
import { describe, it, expect } from 'vitest'
import { getObjectSort } from '../lib/sortConfig'

describe('sort 颜色系统', () => {
    it('已知 sort 返回预设颜色', () => {
        expect(getObjectSort('theorem').color).toBe('#D4A843')
        expect(getObjectSort('definition').color).toBe('#5B8FB9')
    })

    it('未知 sort 返回 autoColor（HSL 格式）', () => {
        const result = getObjectSort('statute')
        expect(result.color).toMatch(/^hsl\(\d+, 55%, 55%\)$/)
    })

    it('autoColor 是确定性的（同名同色）', () => {
        const a = getObjectSort('pathway')
        const b = getObjectSort('pathway')
        expect(a.color).toBe(b.color)
    })

    it('不同 sort 得到不同颜色', () => {
        const a = getObjectSort('gene')
        const b = getObjectSort('protein')
        expect(a.color).not.toBe(b.color)
    })

    it('空 sort 返回 fallback 灰色', () => {
        expect(getObjectSort('').color).toBe('#A1A1AA')
        expect(getObjectSort(undefined).color).toBe('#A1A1AA')
    })
})
