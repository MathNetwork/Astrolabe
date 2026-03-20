/**
 * CardStack 功能测试
 *
 * CardStack 是布局容器：
 *   - 订阅 dataStore.objects 获取 id 列表
 *   - 订阅 selectObjStore.selectedHash 做滚动定位
 *   - ObjCard 是自治组件，自己查数据
 *   - CardStack 只传 id 和 compact 给 ObjCard
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'

describe('CardStack — 布局容器', () => {
    const source = fs.readFileSync('src/panels/inspector/CardStack.tsx', 'utf-8')

    it('订阅 dataStore 获取 objects id 列表', () => {
        expect(source).toContain('useDataStore')
        expect(source).toContain('objects')
    })

    it('订阅 selectObjStore（selectedHash + select）', () => {
        expect(source).toContain('useSelectObjStore')
        expect(source).toContain('selectedHash')
    })

    it('不订阅 getObjLabel（ObjCard 自治）', () => {
        expect(source).not.toContain('getObjLabel')
    })

    it('使用共享 ObjCard', () => {
        expect(source).toContain('ObjCard')
        expect(source).toContain('shared/ObjCard')
    })

    it('有滚动到选中卡片的逻辑', () => {
        expect(source).toMatch(/scrollIntoView|scrollTo|scrollRef/)
    })

    it('渲染所有 obj（map 遍历）', () => {
        expect(source).toMatch(/objects\.map/)
    })
})
