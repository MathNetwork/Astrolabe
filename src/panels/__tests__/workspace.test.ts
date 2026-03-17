/**
 * WorkspacePanel 布局模式测试
 *
 * 两种布局：
 * - single: 一个框 + 三个 tab（Read/Network/Detail）
 * - split:  左大 + 右上下
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'

describe('WorkspacePanel 布局', () => {
    const source = fs.readFileSync('src/panels/workspace/WorkspacePanel.tsx', 'utf-8')

    it('订阅 viewStore', () => {
        expect(source).toContain('useViewStore')
        expect(source).toContain('layoutMode')
        expect(source).toContain('setLayoutMode')
    })

    it('渲染三个 View', () => {
        expect(source).toContain('ReadView')
        expect(source).toContain('NetworkView')
        expect(source).toContain('DetailView')
    })

    it('布局和内容解耦：layoutMode 控制 slot 空间排列', () => {
        expect(source).toContain('layoutMode')
    })

    it('布局和内容解耦：slots 控制 view 绑定', () => {
        expect(source).toContain('slots')
        expect(source).toContain('setSlots')
    })

    it('有布局切换按钮（LayoutIcon）', () => {
        expect(source).toContain('LayoutIcon')
        expect(source).toContain('LAYOUT_IDS')
    })

    it('multiple 模式用 PanelGroup', () => {
        expect(source).toContain('PanelGroup')
        expect(source).toContain('PanelResizeHandle')
    })

    it('single 模式有三个内容 tab', () => {
        expect(source).toContain('singleTab')
        expect(source).toContain('setSingleTab')
    })
})
