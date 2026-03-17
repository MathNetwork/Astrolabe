/**
 * ControlsPanel 功能测试 (Phase 7)
 *
 * ControlsPanel 是左栏设置面板：
 *   - Physics 滑块 → physicsStore
 *   - By Size 选择器 → viewStore.sizeMappingMode
 *   - By Color 选择器 → viewStore.colorMappingMode
 *   - 触发后端分析 → analysisStore
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'

const source = fs.readFileSync('src/panels/controls/ControlsPanel.tsx', 'utf-8')

// ── Store 订阅 ──

describe('ControlsPanel store 订阅', () => {
    it('订阅 physicsStore', () => {
        expect(source).toContain('usePhysicsStore')
    })

    it('订阅 viewStore（sizeMappingMode + colorMappingMode）', () => {
        expect(source).toContain('useViewStore')
    })

    it('订阅 analysisStore', () => {
        expect(source).toContain('useAnalysisStore')
    })

    it('不订阅 selectObjStore（无关）', () => {
        expect(source).not.toContain('useSelectObjStore')
    })

    it('不订阅 selectMorStore（无关）', () => {
        expect(source).not.toContain('useSelectMorStore')
    })
})

// ── Physics 控制 ──

describe('Physics 滑块', () => {
    it('有 repulsion 控制', () => {
        expect(source).toMatch(/repulsion/i)
    })

    it('有 linkDistance 控制', () => {
        expect(source).toMatch(/linkDistance|link.*distance/i)
    })

    it('有 damping 控制', () => {
        expect(source).toMatch(/damping/i)
    })

    it('有 gravity 控制', () => {
        expect(source).toMatch(/gravity/i)
    })

    it('使用 range input 或 slider', () => {
        expect(source).toMatch(/type="range"|slider|Slider/i)
    })
})

// ── By Size / By Color ──

describe('节点映射控制', () => {
    it('有 size mapping 选择（by size）', () => {
        expect(source).toMatch(/sizeMappingMode|sizeMapping|by.*size/i)
    })

    it('有 color mapping 选择（by color）', () => {
        expect(source).toMatch(/colorMappingMode|colorMapping|by.*color/i)
    })
})

// ── 分析状态 ──

describe('网络分析', () => {
    it('显示分析状态', () => {
        expect(source).toMatch(/analysis|loading|metrics/i)
    })
})

// ── viewStore 扩展 ──

describe('viewStore 包含映射模式', () => {
    const viewSource = fs.readFileSync('src/stores/viewStore.ts', 'utf-8')

    it('viewStore 有 sizeMappingMode', () => {
        expect(viewSource).toContain('sizeMappingMode')
    })

    it('viewStore 有 colorMappingMode', () => {
        expect(viewSource).toContain('colorMappingMode')
    })
})
