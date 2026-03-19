/**
 * sortStats 纯函数测试（TDD — 先写测试）
 *
 * computeSortStats 从 objects/morphisms 统计 sort 分布和颜色。
 */
import { describe, it, expect } from 'vitest'

describe('computeSortStats', () => {
    let computeSortStats: any

    beforeAll(async () => {
        const mod = await import('../sortStats')
        computeSortStats = mod.computeSortStats
    })

    it('空数据返回空数组和零计数', () => {
        const result = computeSortStats([], [])
        expect(result.objSorts).toEqual([])
        expect(result.morSorts).toEqual([])
        expect(result.objNoSort).toBe(0)
        expect(result.morNoSort).toBe(0)
    })

    it('正确统计 obj sort 数量', () => {
        const objects = [
            { id: '1', name: 'A', sort: 'theorem' },
            { id: '2', name: 'B', sort: 'theorem' },
            { id: '3', name: 'C', sort: 'definition' },
        ]
        const result = computeSortStats(objects, [])
        expect(result.objSorts).toHaveLength(2)
        const theorem = result.objSorts.find((s: any) => s.sort === 'theorem')
        expect(theorem.count).toBe(2)
        const def = result.objSorts.find((s: any) => s.sort === 'definition')
        expect(def.count).toBe(1)
    })

    it('正确统计 mor sort 数量', () => {
        const morphisms = [
            { id: 'e1', source: 'a', target: 'b', sort: 'implies' },
            { id: 'e2', source: 'b', target: 'c', sort: 'implies' },
            { id: 'e3', source: 'a', target: 'c', sort: 'uses' },
        ]
        const result = computeSortStats([], morphisms)
        expect(result.morSorts).toHaveLength(2)
        const implies = result.morSorts.find((s: any) => s.sort === 'implies')
        expect(implies.count).toBe(2)
    })

    it('无 sort 的 obj 计入 objNoSort', () => {
        const objects = [
            { id: '1', name: 'A', sort: 'theorem' },
            { id: '2', name: 'B', sort: '' },
            { id: '3', name: 'C' },  // no sort field
        ]
        const result = computeSortStats(objects, [])
        expect(result.objNoSort).toBe(2)
        expect(result.objSorts).toHaveLength(1)
    })

    it('无 sort 的 mor 计入 morNoSort', () => {
        const morphisms = [
            { id: 'e1', source: 'a', target: 'b', sort: 'implies' },
            { id: 'e2', source: 'b', target: 'c' },  // no sort
        ]
        const result = computeSortStats([], morphisms)
        expect(result.morNoSort).toBe(1)
        expect(result.morSorts).toHaveLength(1)
    })

    it('颜色与 getObjectSort 一致', async () => {
        const { getObjectSort } = await import('../sortConfig')
        const objects = [
            { id: '1', name: 'A', sort: 'theorem' },
        ]
        const result = computeSortStats(objects, [])
        expect(result.objSorts[0].color).toBe(getObjectSort('theorem').color)
    })

    it('按数量降序排列', () => {
        const objects = [
            { id: '1', name: 'A', sort: 'lemma' },
            { id: '2', name: 'B', sort: 'theorem' },
            { id: '3', name: 'C', sort: 'theorem' },
            { id: '4', name: 'D', sort: 'theorem' },
            { id: '5', name: 'E', sort: 'lemma' },
        ]
        const result = computeSortStats(objects, [])
        expect(result.objSorts[0].sort).toBe('theorem')
        expect(result.objSorts[0].count).toBe(3)
        expect(result.objSorts[1].sort).toBe('lemma')
        expect(result.objSorts[1].count).toBe(2)
    })
})
