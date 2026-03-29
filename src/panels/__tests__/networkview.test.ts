/**
 * NetworkView 测试 — ref-only simplicial graph
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'

const source = fs.readFileSync('src/panels/workspace/NetworkView.tsx', 'utf-8')

describe('NetworkView 骨架', () => {
    it('渲染 canvas 元素', () => {
        expect(source).toContain('<canvas')
    })

    it('使用 ResizeObserver 响应尺寸变化', () => {
        expect(source).toContain('ResizeObserver')
    })

    it('使用 refView 纯函数层', () => {
        expect(source).toContain('refView')
    })

    it('fetch ref-graph 数据', () => {
        expect(source).toContain('/api/astrolabe/ref-graph')
    })
})

describe('Store 订阅', () => {
    it('订阅 selectObjStore', () => {
        expect(source).toContain('useSelectObjStore')
    })

    it('订阅 physicsStore', () => {
        expect(source).toContain('usePhysicsStore')
    })
})

describe('d3-force 物理模拟', () => {
    it('使用 forceSimulation', () => {
        expect(source).toContain('forceSimulation')
    })

    it('使用 mapPhysicsToD3 映射参数', () => {
        expect(source).toContain('mapPhysicsToD3')
    })
})

describe('交互', () => {
    it('zoom', () => {
        expect(source).toMatch(/d3.*zoom|zoom\(/)
    })

    it('drag', () => {
        expect(source).toMatch(/d3.*drag|drag\(/)
    })

    it('点击节点', () => {
        expect(source).toContain('hitTestNode')
    })

    it('hover tooltip', () => {
        expect(source).toMatch(/tooltip|mousemove/)
    })
})
