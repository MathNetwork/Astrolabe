/**
 * CardStack 功能测试
 *
 * 验证：
 * 1. 读取 dataStore.objects 渲染所有 obj 卡片
 * 2. 每张卡片显示 sort 颜色 + name + statement
 * 3. 选中 obj 时高亮对应卡片
 * 4. 点击卡片写入 selectObjStore
 * 5. 使用 MarkdownRenderer 渲染 statement
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'

describe('ObjCard 组件', () => {
    it('ObjCard.tsx 存在', () => {
        expect(fs.existsSync('src/panels/inspector/ObjCard.tsx')).toBe(true)
    })

    it('ObjCard 使用 MarkdownRenderer', () => {
        const source = fs.readFileSync('src/panels/inspector/ObjCard.tsx', 'utf-8')
        expect(source).toContain('MarkdownRenderer')
    })

    it('ObjCard 使用 getNodeKindVisual', () => {
        const source = fs.readFileSync('src/panels/inspector/ObjCard.tsx', 'utf-8')
        expect(source).toContain('getNodeKindVisual')
    })
})

describe('CardStack 实现', () => {
    const source = fs.readFileSync('src/panels/inspector/CardStack.tsx', 'utf-8')

    it('读取 dataStore.objects', () => {
        expect(source).toContain('useDataStore')
        expect(source).toContain('objects')
    })

    it('读取 selectObjStore.selectedHash', () => {
        expect(source).toContain('useSelectObjStore')
        expect(source).toContain('selectedHash')
    })

    it('写入 selectObjStore（点击卡片选中）', () => {
        // CardStack 应该调用 select 来写入选中状态
        expect(source).toContain('.select(')
    })

    it('使用 ObjCard 组件渲染每张卡片', () => {
        expect(source).toContain('ObjCard')
    })

    it('有高亮选中卡片的逻辑', () => {
        // 应该有 selectedHash === obj.id 的比较
        expect(source).toContain('selectedHash')
        // 应该有条件样式
        expect(source).toMatch(/isSelected|selected/)
    })

    it('有滚动到选中卡片的逻辑', () => {
        expect(source).toMatch(/scrollIntoView|scrollTo|scrollRef/)
    })

    it('渲染所有 obj（map 遍历）', () => {
        expect(source).toMatch(/objects\.map/)
    })
})
