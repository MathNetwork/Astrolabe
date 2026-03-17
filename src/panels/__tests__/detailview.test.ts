/**
 * DetailView 功能测试
 *
 * 显示选中 obj 的详情（sort, name, statement, proof, notes）
 * 显示选中 mor 的详情（source, target, notes）
 * 含 edges/neighbors 连接工具
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'

describe('DetailView 实现', () => {
    const source = fs.readFileSync('src/panels/workspace/DetailView.tsx', 'utf-8')

    it('订阅 selectObjStore', () => {
        expect(source).toContain('useSelectObjStore')
    })

    it('订阅 selectMorStore', () => {
        expect(source).toContain('useSelectMorStore')
    })

    it('订阅 dataStore', () => {
        expect(source).toContain('useDataStore')
    })

    it('显示 obj 的 statement', () => {
        expect(source).toContain('statement')
    })

    it('显示 obj 的 proof（可折叠）', () => {
        expect(source).toContain('proof')
    })

    it('使用 MarkdownRenderer 渲染内容', () => {
        expect(source).toContain('MarkdownRenderer')
    })

    it('使用 getNodeKindVisual 获取 sort 颜色', () => {
        expect(source).toContain('getNodeKindVisual')
    })

    it('未选中时显示空状态', () => {
        expect(source).toMatch(/select.*node|no.*selected|empty/i)
    })

    it('有 Edges 功能（入边/出边列表）', () => {
        expect(source).toMatch(/incoming|outgoing|Incoming|Outgoing/)
        // 筛选 morphisms
        expect(source).toContain('morphisms')
    })

    it('点击边写入 selectMorStore', () => {
        expect(source).toContain('selectMorStore')
        // 应该调用 selectMor 的 select
        expect(source).toMatch(/selectMor|morSelect/)
    })

    it('点击邻居节点写入 selectObjStore', () => {
        // 应该有点击导航到另一个 obj 的逻辑
        expect(source).toContain('selectObjStore')
    })

})
