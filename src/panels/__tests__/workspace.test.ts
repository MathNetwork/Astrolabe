/**
 * WorkspacePanel 布局模式测试
 *
 * 三种布局，每种有一个主视图和两个次视图：
 * - read focus: Read 大 + Network/Detail 小
 * - network focus: Network 大 + Read/Detail 小
 * - detail focus: Read+Detail 上并排 + Network 下
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'

describe('WorkspacePanel 布局', () => {
    const source = fs.readFileSync('src/panels/workspace/WorkspacePanel.tsx', 'utf-8')

    it('订阅 viewStore.viewMode', () => {
        expect(source).toContain('useViewStore')
        expect(source).toContain('viewMode')
    })

    it('渲染三个 View 组件', () => {
        expect(source).toContain('ReadView')
        expect(source).toContain('NetworkView')
        expect(source).toContain('DetailView')
    })

    it('支持 read 布局模式', () => {
        expect(source).toMatch(/read/)
    })

    it('支持 network 布局模式', () => {
        expect(source).toMatch(/network/)
    })

    it('支持 detail 布局模式', () => {
        expect(source).toMatch(/detail/)
    })

    it('顶部有布局切换栏', () => {
        // 应该有三个切换按钮
        expect(source).toMatch(/Read|READ/)
        expect(source).toMatch(/Network|NETWORK/)
        expect(source).toMatch(/Detail|DETAIL/)
        // 切换时写入 viewStore
        expect(source).toContain('setViewMode')
    })

    it('使用 PanelGroup 做可调整的子布局', () => {
        expect(source).toContain('PanelGroup')
        expect(source).toContain('PanelResizeHandle')
    })

    it('每种布局都显示全部三个 View（不隐藏任何一个）', () => {
        // 不应该有条件渲染隐藏某个 View
        // 三个 View 都应该在所有布局中出现
        const readCount = (source.match(/ReadView/g) || []).length
        const networkCount = (source.match(/NetworkView/g) || []).length
        const detailCount = (source.match(/DetailView/g) || []).length
        // 至少 import 1 次 + 渲染 3 次（每种布局一次）
        expect(readCount).toBeGreaterThanOrEqual(4)
        expect(networkCount).toBeGreaterThanOrEqual(4)
        expect(detailCount).toBeGreaterThanOrEqual(4)
    })
})
