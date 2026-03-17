/**
 * 共享 MorCard 组件测试
 *
 * MorCard 是自治组件：接收 id，自己从 dataStore 取 mor + source/target name。
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'

describe('共享 MorCard — 自治组件', () => {
    const source = fs.readFileSync('src/components/shared/MorCard.tsx', 'utf-8')

    it('MorCard.tsx 在 shared 目录', () => {
        expect(fs.existsSync('src/components/shared/MorCard.tsx')).toBe(true)
    })

    // 自治：接收 id，自己订阅 dataStore
    it('接收 id prop（不是完整 mor 对象）', () => {
        expect(source).toMatch(/\bid\b.*?:\s*string/)
    })

    it('自己订阅 dataStore 获取 mor 数据', () => {
        expect(source).toContain('useDataStore')
    })

    it('自己查找 source/target obj 名称', () => {
        expect(source).toContain('source')
        expect(source).toContain('target')
    })

    // 展示
    it('显示 notes', () => {
        expect(source).toContain('notes')
    })

    it('显示 mor id', () => {
        expect(source).toMatch(/\.id\b/)
    })

    it('DetailView 引用共享 MorCard', () => {
        const dv = fs.readFileSync('src/panels/workspace/DetailView.tsx', 'utf-8')
        expect(dv).toContain('shared/MorCard')
    })
})
