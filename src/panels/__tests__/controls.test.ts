/**
 * NetworkSettings 功能测试
 *
 * NetworkSettings 是 NetworkView 内的设置 overlay：
 *   - Physics 滑块 → physicsStore
 *   - By Size 选择器 → viewStore.sizeMappingMode
 *   - By Color 选择器 → viewStore.colorMappingMode
 *   - Clustering → viewStore.clusterMode + clusterStrength
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'

const source = fs.readFileSync('src/panels/workspace/NetworkSettings.tsx', 'utf-8')

describe('NetworkSettings store 订阅', () => {
    it('订阅 physicsStore', () => {
        expect(source).toContain('usePhysicsStore')
    })

    it('订阅 viewStore', () => {
        expect(source).toContain('useViewStore')
    })

    it('订阅 analysisStore', () => {
        expect(source).toContain('useAnalysisStore')
    })

    it('不订阅 selectObjStore', () => {
        expect(source).not.toContain('useSelectObjStore')
    })

    it('不订阅 selectMorStore', () => {
        expect(source).not.toContain('useSelectMorStore')
    })
})

describe('Physics 滑块', () => {
    it('有 repulsion 控制', () => { expect(source).toMatch(/repulsion/i) })
    it('有 linkDistance 控制', () => { expect(source).toMatch(/linkDistance|link.*distance/i) })
    it('有 friction 控制', () => { expect(source).toMatch(/friction/i) })
    it('有 gravity 控制', () => { expect(source).toMatch(/gravity/i) })
    it('使用 range input', () => { expect(source).toContain('type="range"') })
})

describe('节点映射控制', () => {
    it('有 size mapping 选择', () => { expect(source).toMatch(/sizeMappingMode/i) })
    it('有 color mapping 选择', () => { expect(source).toMatch(/colorMappingMode/i) })
})

describe('聚类布局控制', () => {
    it('有 cluster mode 选择', () => { expect(source).toMatch(/clusterMode/i) })
    it('有 cluster strength 滑块', () => { expect(source).toMatch(/clusterStrength/i) })
})

describe('网络分析状态', () => {
    it('显示分析状态', () => { expect(source).toMatch(/analysis|loading|metrics/i) })
})

describe('viewStore 包含映射模式', () => {
    const viewSource = fs.readFileSync('src/stores/viewStore.ts', 'utf-8')
    it('viewStore 有 sizeMappingMode', () => { expect(viewSource).toContain('sizeMappingMode') })
    it('viewStore 有 colorMappingMode', () => { expect(viewSource).toContain('colorMappingMode') })
    it('viewStore 有 clusterMode', () => { expect(viewSource).toContain('clusterMode') })
    it('viewStore 有 clusterStrength', () => { expect(viewSource).toContain('clusterStrength') })
})

describe('NetworkView 内嵌 settings', () => {
    const nvSource = fs.readFileSync('src/panels/workspace/NetworkView.tsx', 'utf-8')
    it('NetworkView 导入 NetworkSettings', () => {
        expect(nvSource).toContain('NetworkSettings')
    })
    it('有 settings 切换按钮', () => {
        expect(nvSource).toMatch(/settingsOpen|settings.*toggle/i)
    })
})
