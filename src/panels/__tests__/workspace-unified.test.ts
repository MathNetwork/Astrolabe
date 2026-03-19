/**
 * WorkspacePanel 统一布局测试 (TDD)
 *
 * 核心原则：三个 view 只渲染一次，布局切换不卸载 view
 *
 * 约束：
 * 1. ReadView/NetworkView/DetailView 各只出现一次（不是每个 slot 都渲染一套）
 * 2. 布局切换只改容器排列，不改 view 树
 * 3. single 模式用 CSS hidden 切换可见 view
 * 4. 不应有 single/multi 两个分支返回不同 JSX
 * 5. ReadView 不需要模块级缓存来应对 remount（因为不会 remount）
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'

const wsSource = fs.readFileSync('src/panels/workspace/WorkspacePanel.tsx', 'utf-8')
const rvSource = fs.readFileSync('src/panels/workspace/ReadView.tsx', 'utf-8')

describe('view 只渲染一次', () => {
    it('ReadView 在源码中只被引用一次（JSX 中）', () => {
        // 排除 import 行，只看 JSX 使用
        const uses = wsSource.match(/<ReadView\s*\/>/g)
        expect(uses).toHaveLength(1)
    })

    it('NetworkView 在源码中只被引用一次（JSX 中）', () => {
        const uses = wsSource.match(/<NetworkView\s*\/>/g)
        expect(uses).toHaveLength(1)
    })

    it('DetailView 在源码中只被引用一次（JSX 中）', () => {
        const uses = wsSource.match(/<DetailView\s*\/>/g)
        expect(uses).toHaveLength(1)
    })
})

describe('没有条件分支返回不同 JSX 树', () => {
    it('组件只有一个 return 语句', () => {
        // 提取 WorkspacePanel 函数体
        const fnStart = wsSource.indexOf('function WorkspacePanel()')
        const fnBody = wsSource.slice(fnStart)
        // 计算 return 语句数量（排除子函数中的 return）
        // 用简单方式：主函数中不应有 if (layoutMode === 'single') 的条件分支
        expect(fnBody).not.toMatch(/if\s*\(\s*layoutMode\s*===\s*'single'\s*\)/)
    })
})

describe('布局切换只改容器，不动 view', () => {
    it('用 CSS hidden 控制 view 可见性', () => {
        expect(wsSource).toContain('hidden')
    })

    it('有 6 种布局模式', () => {
        expect(wsSource).toContain('single')
        expect(wsSource).toContain('split-right')
        expect(wsSource).toContain('split-left')
        expect(wsSource).toContain('split-bottom')
        expect(wsSource).toContain('split-top')
        expect(wsSource).toContain('three-equal')
    })
})

describe('ReadView 不需要 remount 保护', () => {
    it('不需要模块级文件缓存（因为不会被卸载）', () => {
        expect(rvSource).not.toContain('_cachedFiles')
    })

    it('不需要模块级内容缓存', () => {
        expect(rvSource).not.toContain('_contentCache')
    })

    it('不需要模块级 savedScrollTop（不会 unmount）', () => {
        expect(rvSource).not.toContain('_savedScrollTop')
    })

    it('不需要模块级 savedActiveFile（不会 unmount）', () => {
        expect(rvSource).not.toContain('_savedActiveFile')
    })
})
