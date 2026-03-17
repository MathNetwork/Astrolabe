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

    it('CardStack 从 selectionStore + dataStore 订阅', () => {
        const source = fs.readFileSync('src/panels/inspector/CardStack.tsx', 'utf-8')
        expect(source).toContain('useSelectionStore')
        expect(source).toContain('useDataStore')
    })
})

describe('page.tsx 骨架', () => {
    it('少于 100 行', () => {
        const lines = fs.readFileSync('src/app/local/edit/page.tsx', 'utf-8').split('\n').length
        expect(lines).toBeLessThan(100)
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
