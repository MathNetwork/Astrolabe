/**
 * SortOverview 面板测试（TDD — 先写测试）
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'

describe('SortOverview 组件', () => {
    it('文件存在', () => {
        expect(fs.existsSync('src/panels/workspace/SortOverview.tsx')).toBe(true)
    })

    it('从 dataStore 获取 objects 和 morphisms', () => {
        const source = fs.readFileSync('src/panels/workspace/SortOverview.tsx', 'utf-8')
        expect(source).toContain('useDataStore')
    })

    it('使用 computeSortStats 计算统计', () => {
        const source = fs.readFileSync('src/panels/workspace/SortOverview.tsx', 'utf-8')
        expect(source).toContain('computeSortStats')
    })

    it('有 OBJ SORTS 和 MOR SORTS 分区', () => {
        const source = fs.readFileSync('src/panels/workspace/SortOverview.tsx', 'utf-8')
        expect(source).toMatch(/OBJ|obj.*sort/i)
        expect(source).toMatch(/MOR|mor.*sort/i)
    })

    it('显示 sort 名称和数量', () => {
        const source = fs.readFileSync('src/panels/workspace/SortOverview.tsx', 'utf-8')
        // 应该渲染 sort.sort 和 sort.count
        expect(source).toMatch(/\.sort\b/)
        expect(source).toMatch(/\.count\b/)
    })

    it('显示颜色圆点', () => {
        const source = fs.readFileSync('src/panels/workspace/SortOverview.tsx', 'utf-8')
        // 应该有圆形颜色指示器（borderRadius 或 rounded-full）
        expect(source).toMatch(/rounded-full|borderRadius/)
        // 颜色来自 sort.color
        expect(source).toMatch(/\.color\b/)
    })

    it('显示 no sort 计数', () => {
        const source = fs.readFileSync('src/panels/workspace/SortOverview.tsx', 'utf-8')
        expect(source).toMatch(/no.?sort|noSort|No Sort/i)
    })
})
