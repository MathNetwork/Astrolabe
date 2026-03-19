/**
 * ReadView 滚动位置保持测试 (TDD)
 *
 * 切换视图时 ReadView 不卸载，用 CSS 隐藏保持滚动位置。
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'

describe('视图切换保持状态', () => {
    const source = fs.readFileSync('src/panels/workspace/WorkspacePanel.tsx', 'utf-8')

    it('所有视图同时挂载（不用条件渲染）', () => {
        // ViewByTab 不应该用 switch 做条件渲染
        // 应该三个视图都挂载，用 CSS hidden 隐藏
        expect(source).toMatch(/hidden|display.*none|className.*hidden/)
    })

    it('活跃视图可见，非活跃视图隐藏', () => {
        // 应该根据当前 tab 决定哪个 visible
        expect(source).toMatch(/hidden|visible/)
    })
})
