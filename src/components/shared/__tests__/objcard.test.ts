/**
 * 共享 ObjCard 组件测试
 *
 * ObjCard 是自治组件：接收 id，自己从 dataStore 取数据。
 * compact=true: CardStack 预览模式
 * compact=false: DetailView 完整模式
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'

describe('共享 ObjCard — 自治组件', () => {
    const source = fs.readFileSync('src/components/shared/ObjCard.tsx', 'utf-8')

    it('ObjCard.tsx 在 shared 目录', () => {
        expect(fs.existsSync('src/components/shared/ObjCard.tsx')).toBe(true)
    })

    // 自治：接收 id，自己订阅 dataStore
    it('接收 id prop（不是完整 obj）', () => {
        expect(source).toMatch(/\bid\b.*?:\s*string/)
    })

    it('自己订阅 dataStore 获取 obj 数据', () => {
        expect(source).toContain('useDataStore')
    })

    it('自己获取 nodeLabel（编号）', () => {
        expect(source).toContain('getNodeLabel')
    })

    // 展示
    it('支持 compact prop', () => {
        expect(source).toContain('compact')
    })

    it('使用 MarkdownRenderer', () => {
        expect(source).toContain('MarkdownRenderer')
    })

    it('使用 getNodeKindVisual', () => {
        expect(source).toContain('getNodeKindVisual')
    })

    // 消费者只传 id
    it('CardStack 引用共享 ObjCard', () => {
        const cs = fs.readFileSync('src/panels/inspector/CardStack.tsx', 'utf-8')
        expect(cs).toContain('shared/ObjCard')
    })

    it('DetailView 引用共享 ObjCard', () => {
        const dv = fs.readFileSync('src/panels/workspace/DetailView.tsx', 'utf-8')
        expect(dv).toContain('shared/ObjCard')
    })
})
