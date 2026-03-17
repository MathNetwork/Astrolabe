/**
 * 框架结构测试
 *
 * 验证三区域文件结构和 page.tsx 骨架。
 * controls / workspace / inspector
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'

describe('目录结构', () => {
    it('controls/ 目录存在', () => {
        expect(fs.existsSync('src/panels/controls')).toBe(true)
    })

    it('workspace/ 目录存在', () => {
        expect(fs.existsSync('src/panels/workspace')).toBe(true)
    })

    it('inspector/ 目录存在', () => {
        expect(fs.existsSync('src/panels/inspector')).toBe(true)
    })
})

describe('controls 区域', () => {
    it('ControlsPanel.tsx 存在', () => {
        expect(fs.existsSync('src/panels/controls/ControlsPanel.tsx')).toBe(true)
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

    it('NetworkView 订阅 dataStore + selectObjStore + selectMorStore', () => {
        const source = fs.readFileSync('src/panels/workspace/NetworkView.tsx', 'utf-8')
        expect(source).toContain('useDataStore')
        expect(source).toContain('useSelectObjStore')
        expect(source).toContain('useSelectMorStore')
    })

    it('NetworkView 订阅 physicsStore + analysisStore', () => {
        const source = fs.readFileSync('src/panels/workspace/NetworkView.tsx', 'utf-8')
        expect(source).toContain('usePhysicsStore')
        expect(source).toContain('useAnalysisStore')
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

    it('CardStack 从 selectObjStore + dataStore 订阅', () => {
        const source = fs.readFileSync('src/panels/inspector/CardStack.tsx', 'utf-8')
        expect(source).toContain('useSelectObjStore')
        expect(source).toContain('useDataStore')
    })
})

describe('TopBar 面板折叠按钮', () => {
    const pageSource = fs.readFileSync('src/app/local/edit/page.tsx', 'utf-8')

    it('有 controls 面板折叠按钮', () => {
        expect(pageSource).toMatch(/controls|Controls/)
        expect(pageSource).toContain('collapsible')
    })

    it('有 inspector 面板折叠按钮', () => {
        expect(pageSource).toMatch(/inspector|Inspector/)
        expect(pageSource).toContain('collapsible')
    })

    it('top bar 有两个折叠切换按钮', () => {
        expect(pageSource).toMatch(/toggleControls|setControlsOpen/)
        expect(pageSource).toMatch(/toggleInspector|setInspectorOpen/)
    })
})

describe('三栏布局完整性', () => {
    const pageSource = fs.readFileSync('src/app/local/edit/page.tsx', 'utf-8')

    it('三个 Panel defaultSize 总和 = 100%', () => {
        const sizes = [...pageSource.matchAll(/defaultSize=\{(\d+)\}/g)].map(m => Number(m[1]))
        expect(sizes.length).toBeGreaterThanOrEqual(3)
        // 取前三个（controls + workspace + inspector）
        const total = sizes[0] + sizes[1] + sizes[2]
        expect(total).toBe(100)
    })

    it('三个 Panel 有不同的 id', () => {
        const ids = [...pageSource.matchAll(/id="(\w+)"/g)].map(m => m[1])
        expect(ids).toContain('controls')
        expect(ids).toContain('workspace')
        expect(ids).toContain('inspector')
        // 确保不重复
        const unique = new Set(ids)
        expect(unique.size).toBe(ids.length)
    })

    it('每个 Panel 渲染独立组件（不共享子组件）', () => {
        // controls 渲染 ControlsPanel
        expect(pageSource).toMatch(/<ControlsPanel\s*\/?>/)
        // workspace 渲染 WorkspacePanel
        expect(pageSource).toMatch(/<WorkspacePanel\s*\/?>/)
        // inspector 渲染 InspectorPanel
        expect(pageSource).toMatch(/<InspectorPanel\s*\/?>/)
    })
})

describe('page.tsx 骨架', () => {
    it('少于 120 行', () => {
        const lines = fs.readFileSync('src/app/local/edit/page.tsx', 'utf-8').split('\n').length
        expect(lines).toBeLessThan(120)
    })

    it('导入三个区域面板', () => {
        const source = fs.readFileSync('src/app/local/edit/page.tsx', 'utf-8')
        expect(source).toContain('ControlsPanel')
        expect(source).toContain('WorkspacePanel')
        expect(source).toContain('InspectorPanel')
    })

    it('不持有 selectedNode state', () => {
        const source = fs.readFileSync('src/app/local/edit/page.tsx', 'utf-8')
        expect(source).not.toMatch(/useState.*selectedNode/)
    })

    it('使用 useProjectLoader 加载数据', () => {
        const source = fs.readFileSync('src/app/local/edit/page.tsx', 'utf-8')
        expect(source).toContain('useProjectLoader')
    })
})
