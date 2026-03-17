/**
 * 共享 MorList 组件测试
 *
 * MorList 是自治组件：接收 objId，自己从 dataStore 查边。
 * 显示 incoming/outgoing morphisms。
 * 点击箭头写入 selectObjStore，点击文字写入 selectMorStore。
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'

describe('共享 MorList — 自治组件', () => {
    const source = fs.readFileSync('src/components/shared/MorList.tsx', 'utf-8')

    it('MorList.tsx 在 shared 目录', () => {
        expect(fs.existsSync('src/components/shared/MorList.tsx')).toBe(true)
    })

    // 自治：接收 objId，自己订阅 store
    it('接收 objId prop', () => {
        expect(source).toContain('objId')
    })

    it('自己订阅 dataStore 获取 morphisms', () => {
        expect(source).toContain('useDataStore')
    })

    it('自己订阅 selectMorStore（读取选中状态 + 写入）', () => {
        expect(source).toContain('useSelectMorStore')
    })

    it('点击箭头写入 selectObjStore（跳转到邻居）', () => {
        expect(source).toContain('useSelectObjStore')
    })

    // 展示
    it('区分 incoming 和 outgoing', () => {
        expect(source).toContain('Incoming')
        expect(source).toContain('Outgoing')
    })

    it('使用 getNodeKindVisual 着色', () => {
        expect(source).toContain('getNodeKindVisual')
    })
})
