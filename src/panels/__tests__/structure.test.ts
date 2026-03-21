/**
 * 框架结构测试
 *
 * 验证两区域文件结构和 page.tsx 骨架。
 * explorer + workspace（inspector 已删除）
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'

describe('目录结构', () => {
    it('workspace/ 目录存在', () => {
        expect(fs.existsSync('src/panels/workspace')).toBe(true)
    })

    it('inspector/ 目录不存在（已删除）', () => {
        expect(fs.existsSync('src/panels/inspector')).toBe(false)
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
})

describe('两栏布局', () => {
    const pageSource = fs.readFileSync('src/app/local/edit/page.tsx', 'utf-8')

    it('两个 Panel defaultSize 总和 = 100%', () => {
        const sizes = [...pageSource.matchAll(/defaultSize=\{(\d+)\}/g)].map(m => Number(m[1]))
        expect(sizes.length).toBe(2)
        expect(sizes.reduce((a, b) => a + b, 0)).toBe(100)
    })

    it('explorer + workspace 两个 Panel', () => {
        const ids = [...pageSource.matchAll(/id="(\w+)"/g)].map(m => m[1])
        expect(ids).toContain('explorer')
        expect(ids).toContain('workspace')
        expect(ids).not.toContain('inspector')
    })

    it('不包含 InspectorPanel', () => {
        expect(pageSource).not.toContain('InspectorPanel')
    })

    it('不包含 CardStack', () => {
        expect(pageSource).not.toContain('CardStack')
    })
})

describe('explorer 区域', () => {
    it('ExplorerPanel.tsx 存在', () => {
        expect(fs.existsSync('src/panels/explorer/ExplorerPanel.tsx')).toBe(true)
    })
})

describe('page.tsx 骨架', () => {
    const source = fs.readFileSync('src/app/local/edit/page.tsx', 'utf-8')

    it('少于 100 行', () => {
        const lines = source.split('\n').length
        expect(lines).toBeLessThan(100)
    })

    it('导入 WorkspacePanel', () => {
        expect(source).toContain('WorkspacePanel')
    })

    it('不导入 InspectorPanel', () => {
        expect(source).not.toContain('InspectorPanel')
    })

    it('使用 useProjectLoader 加载数据', () => {
        expect(source).toContain('useProjectLoader')
    })
})
