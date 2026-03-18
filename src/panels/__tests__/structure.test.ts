/**
 * 框架结构测试
 *
 * 验证两区域文件结构和 page.tsx 骨架。
 * workspace / inspector（settings 嵌在 NetworkView 内）
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'

describe('目录结构', () => {
    it('workspace/ 目录存在', () => {
        expect(fs.existsSync('src/panels/workspace')).toBe(true)
    })

    it('inspector/ 目录存在', () => {
        expect(fs.existsSync('src/panels/inspector')).toBe(true)
    })
})

describe('workspace 区域', () => {
    it('WorkspacePanel.tsx 存在', () => {
        expect(fs.existsSync('src/panels/workspace/WorkspacePanel.tsx')).toBe(true)
    })

    it('ReadView.tsx 存在', () => {
        expect(fs.existsSync('src/panels/workspace/ReadView.tsx')).toBe(true)
    })

    it('NetworkView.tsx 存在', () => {
        expect(fs.existsSync('src/panels/workspace/NetworkView.tsx')).toBe(true)
    })

    it('NetworkSettings.tsx 存在（嵌在 NetworkView 内）', () => {
        expect(fs.existsSync('src/panels/workspace/NetworkSettings.tsx')).toBe(true)
    })

    it('DetailView.tsx 存在', () => {
        expect(fs.existsSync('src/panels/workspace/DetailView.tsx')).toBe(true)
    })

    it('WorkspacePanel 从 viewStore 订阅 viewMode', () => {
        const source = fs.readFileSync('src/panels/workspace/WorkspacePanel.tsx', 'utf-8')
        expect(source).toContain('useViewStore')
    })
})

describe('inspector 区域', () => {
    it('InspectorPanel.tsx 存在', () => {
        expect(fs.existsSync('src/panels/inspector/InspectorPanel.tsx')).toBe(true)
    })

    it('CardStack.tsx 存在', () => {
        expect(fs.existsSync('src/panels/inspector/CardStack.tsx')).toBe(true)
    })

    it('InspectorPanel 是容器，包含 CardStack', () => {
        const source = fs.readFileSync('src/panels/inspector/InspectorPanel.tsx', 'utf-8')
        expect(source).toContain('CardStack')
    })
})

describe('两栏布局', () => {
    const pageSource = fs.readFileSync('src/app/local/edit/page.tsx', 'utf-8')

    it('有 inspector 面板折叠按钮', () => {
        expect(pageSource).toMatch(/inspector|Inspector/)
        expect(pageSource).toContain('collapsible')
    })

    it('两个 Panel defaultSize 总和 = ~100%', () => {
        const sizes = [...pageSource.matchAll(/defaultSize=\{(\d+)\}/g)].map(m => Number(m[1]))
        expect(sizes.length).toBeGreaterThanOrEqual(2)
        const total = sizes.reduce((a, b) => a + b, 0)
        expect(total).toBeGreaterThanOrEqual(95)
        expect(total).toBeLessThanOrEqual(100)
    })

    it('workspace 和 inspector 两个 Panel', () => {
        const ids = [...pageSource.matchAll(/id="(\w+)"/g)].map(m => m[1])
        expect(ids).toContain('workspace')
        expect(ids).toContain('inspector')
    })

    it('不包含 ControlsPanel（settings 在 NetworkView 内）', () => {
        expect(pageSource).not.toContain('ControlsPanel')
    })
})

describe('page.tsx 骨架', () => {
    const source = fs.readFileSync('src/app/local/edit/page.tsx', 'utf-8')

    it('少于 120 行', () => {
        const lines = source.split('\n').length
        expect(lines).toBeLessThan(120)
    })

    it('导入 WorkspacePanel 和 InspectorPanel', () => {
        expect(source).toContain('WorkspacePanel')
        expect(source).toContain('InspectorPanel')
    })

    it('不持有 selectedNode state', () => {
        expect(source).not.toMatch(/useState.*selectedNode/)
    })

    it('使用 useProjectLoader 加载数据', () => {
        expect(source).toContain('useProjectLoader')
    })
})
