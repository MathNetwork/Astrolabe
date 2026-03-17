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
        expect(source).toContain('viewMode')
        expect(source).toContain('setViewMode')
    })

    it('渲染三个 View', () => {
        expect(source).toContain('ReadView')
        expect(source).toContain('NetworkView')
        expect(source).toContain('DetailView')
    })

    it('支持 single 和 multiple 两种布局', () => {
        expect(source).toContain("'single'")
        expect(source).toContain("'multiple'")
    })

    it('有布局切换按钮（heroicons）', () => {
        expect(source).toContain('heroicons')
        expect(source).toContain('StopIcon')
        expect(source).toContain('Squares2X2Icon')
    })

    it('multiple 模式用 PanelGroup（左大 + 右上下）', () => {
        expect(source).toContain('PanelGroup')
        expect(source).toContain('PanelResizeHandle')
    })

    it('multiple 模式下 view 位置可交换（slots 状态）', () => {
        expect(source).toContain('slots')
        expect(source).toContain('setSlots')
    })

    it('single 模式有三个内容 tab', () => {
        expect(source).toContain('singleTab')
        expect(source).toContain('setSingleTab')
    })
})
