/**
 * 视图切换/布局切换保持状态测试 (TDD)
 *
 * 核心：ReadView/NetworkView/DetailView 只挂载一次，
 * 布局切换和 tab 切换都用 CSS 隐藏，不卸载组件。
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'

describe('视图永不卸载', () => {
    const source = fs.readFileSync('src/panels/workspace/WorkspacePanel.tsx', 'utf-8')

    it('三个 View 在顶层只挂载一次', () => {
        // ReadView/NetworkView/DetailView 应该只出现一次（不在 Slot 或 ViewByTab 里重复创建）
        const readCount = (source.match(/<ReadView/g) || []).length
        const networkCount = (source.match(/<NetworkView/g) || []).length
        const detailCount = (source.match(/<DetailView/g) || []).length
        expect(readCount).toBe(1)
        expect(networkCount).toBe(1)
        expect(detailCount).toBe(1)
    })

    it('用 CSS hidden 控制可见性', () => {
        expect(source).toContain('hidden')
    })

    it('single 和 multi 布局共用同一组件树', () => {
        // 不应该有两段独立的条件分支各自渲染 ReadView
        // 应该用 portal 或固定位置，只渲染一次
        expect(source).toContain('PortalSlot')
    })
})
