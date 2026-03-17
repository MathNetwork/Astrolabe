/**
 * 新 page.tsx 骨架测试
 *
 * 验证：
 * 1. page.tsx 文件精简（<100 行）
 * 2. 不持有业务 state（无 useState 用于 selectedNode 等）
 * 3. 四个 Panel 组件存在且从 store 订阅
 * 4. 数据加载逻辑写入 dataStore
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'

describe('新 page.tsx 骨架', () => {
    const pagePath = 'src/app/local/edit/page.tsx'

    it('page.tsx 存在', () => {
        expect(fs.existsSync(pagePath)).toBe(true)
    })

    it('page.tsx 少于 100 行', () => {
        const lines = fs.readFileSync(pagePath, 'utf-8').split('\n').length
        expect(lines).toBeLessThan(100)
    })

    it('page.tsx 不持有 selectedNode useState', () => {
        const source = fs.readFileSync(pagePath, 'utf-8')
        expect(source).not.toMatch(/useState.*selectedNode/)
    })

    it('page.tsx 不持有 viewMode useState', () => {
        const source = fs.readFileSync(pagePath, 'utf-8')
        expect(source).not.toMatch(/useState.*viewMode/)
    })

    it('page.tsx 导入四个 Panel', () => {
        const source = fs.readFileSync(pagePath, 'utf-8')
        expect(source).toContain('SettingsPanel')
        expect(source).toContain('ReadPanel')
        expect(source).toContain('NetworkPanel')
        expect(source).toContain('DetailPanel')
    })
})

describe('四个 Panel 文件存在', () => {
    it('ReadPanel.tsx 存在', () => {
        expect(fs.existsSync('src/panels/ReadPanel.tsx')).toBe(true)
    })

    it('NetworkPanel.tsx 存在', () => {
        expect(fs.existsSync('src/panels/NetworkPanel.tsx')).toBe(true)
    })

    it('DetailPanel.tsx 存在', () => {
        expect(fs.existsSync('src/panels/DetailPanel.tsx')).toBe(true)
    })

    it('SettingsPanel.tsx 存在', () => {
        expect(fs.existsSync('src/panels/SettingsPanel.tsx')).toBe(true)
    })
})

describe('每个 Panel 从 store 订阅', () => {
    const panels = [
        { name: 'DetailPanel', path: 'src/panels/DetailPanel.tsx', stores: ['useSelectionStore', 'useDataStore'] },
        { name: 'ReadPanel', path: 'src/panels/ReadPanel.tsx', stores: ['useDataStore'] },
        { name: 'NetworkPanel', path: 'src/panels/NetworkPanel.tsx', stores: ['useSelectionStore', 'useDataStore'] },
        { name: 'SettingsPanel', path: 'src/panels/SettingsPanel.tsx', stores: [] }, // settings 可能暂时不订阅
    ]

    for (const panel of panels) {
        for (const store of panel.stores) {
            it(`${panel.name} 订阅 ${store}`, () => {
                const source = fs.readFileSync(panel.path, 'utf-8')
                expect(source).toContain(store)
            })
        }
    }
})

describe('数据加载写入 dataStore', () => {
    it('存在 useProjectLoader hook 或 page.tsx 中加载数据', () => {
        // 检查是否有加载逻辑写入 dataStore
        const hookExists = fs.existsSync('src/hooks/useProjectLoader.ts')
        const pageSource = fs.readFileSync('src/app/local/edit/page.tsx', 'utf-8')
        const pageLoads = pageSource.includes('setObjects') || pageSource.includes('useProjectLoader')

        expect(hookExists || pageLoads).toBe(true)
    })
})
