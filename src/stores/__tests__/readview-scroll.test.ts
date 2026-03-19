/**
 * ReadView 滚动位置保持测试
 *
 * 新架构：view 永远不卸载，不需要模块级保护
 * 1. tab 切换：用 CSS hidden，不卸载组件 → scrollTop 自动保持
 * 2. 布局切换：view 始终挂载在同一位置 → 不需要 save/restore
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'

describe('view 永远不卸载', () => {
    const wsSource = fs.readFileSync('src/panels/workspace/WorkspacePanel.tsx', 'utf-8')

    it('用 CSS hidden 切换视图', () => {
        expect(wsSource).toContain('hidden')
    })

    it('三个 view 各只渲染一次', () => {
        expect(wsSource.match(/<ReadView\s*\/>/g)).toHaveLength(1)
        expect(wsSource.match(/<NetworkView\s*\/>/g)).toHaveLength(1)
        expect(wsSource.match(/<DetailView\s*\/>/g)).toHaveLength(1)
    })
})

describe('ReadView 不需要 remount 保护', () => {
    const rvSource = fs.readFileSync('src/panels/workspace/ReadView.tsx', 'utf-8')

    it('不需要模块级 _savedScrollTop', () => {
        expect(rvSource).not.toContain('_savedScrollTop')
    })

    it('不需要模块级 _savedActiveFile', () => {
        expect(rvSource).not.toContain('_savedActiveFile')
    })
})
