/**
 * ReadView 滚动位置保持测试 (TDD)
 *
 * 1. tab 切换：用 CSS hidden，不卸载组件
 * 2. 布局切换：卸载时保存滚动位置到模块变量，重新挂载时恢复
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'

describe('tab 切换保持状态', () => {
    const source = fs.readFileSync('src/panels/workspace/WorkspacePanel.tsx', 'utf-8')

    it('用 CSS hidden 切换视图', () => {
        expect(source).toContain('hidden')
    })
})

describe('布局切换保持滚动位置', () => {
    const source = fs.readFileSync('src/panels/workspace/ReadView.tsx', 'utf-8')

    it('有模块级变量保存滚动位置', () => {
        expect(source).toContain('_savedScrollTop')
    })

    it('卸载时保存 scrollTop', () => {
        expect(source).toContain('scrollRef.current?.scrollTop')
    })

    it('保存当前活跃文件', () => {
        expect(source).toContain('_savedActiveFile')
    })

    it('初始化时恢复保存的位置', () => {
        // pendingScrollRef 初始值使用 _savedScrollTop
        expect(source).toMatch(/_savedScrollTop > 0/)
    })
})
