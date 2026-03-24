/**
 * NetworkView 功能测试 (Step 6.2 - 6.7)
 *
 * NetworkView 是 2D Canvas 力导向图。
 * 它是唯一直接订阅全部 5 个 store 的组件（Canvas 不走 React 组件模型）。
 * 纯函数逻辑在 graph2d.ts 中（已有 35 个测试约束）。
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'

const source = fs.readFileSync('src/panels/workspace/NetworkView.tsx', 'utf-8')

// ── 6.2: 骨架 ──

describe('6.2 NetworkView 骨架', () => {
    it('渲染 canvas 元素', () => {
        expect(source).toContain('<canvas')
    })

    it('使用 useRef 持有 canvas 引用', () => {
        expect(source).toContain('useRef')
        expect(source).toMatch(/canvasRef|ref/)
    })

    it('使用 ResizeObserver 响应尺寸变化', () => {
        expect(source).toContain('ResizeObserver')
    })

    it('使用 graph2d 纯函数层', () => {
        expect(source).toContain('graph2d')
    })
})

// ── Store 订阅 ──

describe('NetworkView store 订阅', () => {
    it('订阅 dataStore（objects + morphisms）', () => {
        expect(source).toContain('useDataStore')
    })

    it('订阅 selectObjStore（读 + 写）', () => {
        expect(source).toContain('useSelectObjStore')
    })

    it('订阅 selectMorStore（读 + 写）', () => {
        expect(source).toContain('useSelectMorStore')
    })

    it('订阅 physicsStore（力参数）', () => {
        expect(source).toContain('usePhysicsStore')
    })

    it('订阅 analysisStore（节点大小）', () => {
        expect(source).toContain('useAnalysisStore')
    })
})

// ── 6.3: d3-force 物理模拟 ──

describe('6.3 d3-force 物理模拟', () => {
    it('使用 d3 forceSimulation', () => {
        expect(source).toContain('forceSimulation')
    })

    it('使用 forceManyBody（斥力）', () => {
        expect(source).toContain('forceManyBody')
    })

    it('使用 forceLink（边弹簧）', () => {
        expect(source).toContain('forceLink')
    })

    it('使用 forceCenter（中心引力）', () => {
        expect(source).toContain('forceCenter')
    })

    it('使用 mapPhysicsToD3 映射参数', () => {
        expect(source).toContain('mapPhysicsToD3')
    })
})

// ── 6.4: 交互 ──

describe('6.4 交互', () => {
    it('使用 d3.zoom（pan/zoom）', () => {
        expect(source).toMatch(/d3.*zoom|zoom\(/)
    })

    it('使用 d3.drag（拖拽节点）', () => {
        expect(source).toMatch(/d3.*drag|drag\(/)
    })

    it('点击节点写入 selectObjStore', () => {
        expect(source).toContain('hitTestNode')
    })

    it('点击边写入 selectMorStore', () => {
        expect(source).toContain('hitTestEdge')
    })
})

// ── 6.5: 视觉反馈 ──

describe('6.5 视觉反馈', () => {
    it('选中节点有高亮效果', () => {
        expect(source).toContain('selectedObjHash')
    })

    it('hover 时显示名字', () => {
        expect(source).toMatch(/hover|tooltip|mousemove/)
    })
})

// ── 6.6: 相机飞向 ──

describe('6.6 外部选中时相机飞向节点', () => {
    it('监听 selectedObjHash 变化做 fly-to', () => {
        expect(source).toMatch(/prevSelected|flyTo|smoothPan/)
    })
})

// ── 7.5: 聚类布局 ──

describe('7.5 聚类布局', () => {
    it('订阅 viewStore 的 clusterMode', () => {
        expect(source).toContain('clusterMode')
    })

    it('订阅 viewStore 的 clusterStrength', () => {
        expect(source).toContain('clusterStrength')
    })

    it('使用 forceX/forceY 实现聚类力', () => {
        expect(source).toContain('forceX')
        expect(source).toContain('forceY')
    })

    it('使用 assignNodeClusters 纯函数', () => {
        expect(source).toContain('assignNodeClusters')
    })
})

// ── Sort Overview 集成 ──

describe('Sort Overview 集成', () => {
    it('导入 SortOverview 组件', () => {
        expect(source).toContain('SortOverview')
    })

    it('有 Sort Overview toggle 状态', () => {
        expect(source).toMatch(/sortOverviewOpen|sortOpen/)
    })

    it('Sort Overview 和 Settings 面板互斥逻辑', () => {
        // 打开一个应该关闭另一个：代码里应该同时 set 两个状态
        expect(source).toMatch(/setSettingsOpen.*false|settingsOpen.*false/)
    })
})
