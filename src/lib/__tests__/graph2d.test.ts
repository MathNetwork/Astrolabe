/**
 * graph2d 纯函数测试
 *
 * 这些函数是 NetworkView 的数据层，必须严格约束：
 * - 输入：store 中的 objects/morphisms/physics/analysis 数据
 * - 输出：Canvas 渲染需要的 ForceNode/ForceLink
 * - 零副作用，零 DOM 依赖
 */
import { describe, it, expect } from 'vitest'
import {
    buildForceNodes,
    buildForceLinks,
    computeNodeRadius,
    hitTestNode,
    hitTestEdge,
    mapPhysicsToD3,
    extractMetric,
    extractColorMapping,
    buildClusterCenters,
    assignNodeClusters,
    type ForceNode,
    type ForceLink,
} from '../graph2d'

// ── 测试数据 ──

const mockObjects = [
    { id: 'a', name: 'Theorem A', sort: 'theorem', statement: 'x' },
    { id: 'b', name: 'Definition B', sort: 'definition', statement: 'y' },
    { id: 'c', name: 'Unknown Sort', sort: 'xyzzy', statement: 'z' },
    { id: 'd', name: 'No Sort', sort: '', statement: '' },
]

const mockMorphisms = [
    { id: 'e1', source: 'a', target: 'b', notes: '' },
    { id: 'e2', source: 'b', target: 'c', notes: '' },
    { id: 'e3', source: 'a', target: 'missing', notes: '' },  // target 不存在
    { id: 'e4', source: 'missing2', target: 'b', notes: '' }, // source 不存在
]

// ── buildForceNodes ──

describe('buildForceNodes', () => {
    it('为每个 obj 创建一个 ForceNode', () => {
        const nodes = buildForceNodes(mockObjects)
        expect(nodes).toHaveLength(4)
    })

    it('保留 id 和 name', () => {
        const nodes = buildForceNodes(mockObjects)
        expect(nodes[0].id).toBe('a')
        expect(nodes[0].name).toBe('Theorem A')
    })

    it('从 objectSortConfig 获取颜色（theorem = gold）', () => {
        const nodes = buildForceNodes(mockObjects)
        const theorem = nodes.find(n => n.id === 'a')!
        expect(theorem.color).toBe('#D4A843')  // gold from config
    })

    it('从 objectSortConfig 获取颜色（definition = steel blue）', () => {
        const nodes = buildForceNodes(mockObjects)
        const def = nodes.find(n => n.id === 'b')!
        expect(def.color).toBe('#5B8FB9')  // steel blue from config
    })

    it('未知 sort 使用 autoColor（非灰色）', () => {
        const nodes = buildForceNodes(mockObjects)
        const unknown = nodes.find(n => n.id === 'c')!
        expect(unknown.color).not.toBe('#A1A1AA')  // not fallback gray
        expect(unknown.color).toMatch(/^hsl\(\d+, 55%, 55%\)$/)  // auto-generated HSL
    })

    it('空 sort 使用 fallback 灰色', () => {
        const nodes = buildForceNodes(mockObjects)
        const empty = nodes.find(n => n.id === 'd')!
        expect(empty.color).toBe('#A1A1AA')
    })

    it('默认 radius 相同', () => {
        const nodes = buildForceNodes(mockObjects)
        const radii = new Set(nodes.map(n => n.radius))
        expect(radii.size).toBe(1)  // 全部相同
    })

    it('传入 sizeData 时 radius 不同', () => {
        const sizeData = { 'a': 0.8, 'b': 0.2 }
        const nodes = buildForceNodes(mockObjects, sizeData)
        const rA = nodes.find(n => n.id === 'a')!.radius
        const rB = nodes.find(n => n.id === 'b')!.radius
        expect(rA).toBeGreaterThan(rB)
    })

    it('传入 colorData 时覆盖 sort 颜色', () => {
        const colorData = { 'a': '#ff0000' }
        const nodes = buildForceNodes(mockObjects, undefined, colorData)
        expect(nodes.find(n => n.id === 'a')!.color).toBe('#ff0000')
        // 没有 colorData 的节点用 sort 颜色
        expect(nodes.find(n => n.id === 'b')!.color).toBe('#5B8FB9')
    })

    it('空数组返回空数组', () => {
        expect(buildForceNodes([])).toEqual([])
    })

    it('返回的节点有 sort 字段', () => {
        const nodes = buildForceNodes(mockObjects)
        expect(nodes[0].sort).toBe('theorem')
    })
})

// ── buildForceLinks ──

const mockMorphismsWithSort = [
    { id: 'e1', source: 'a', target: 'b', sort: 'implies', notes: '' },
    { id: 'e2', source: 'b', target: 'c', notes: '' },  // 无 sort
]

describe('buildForceLinks', () => {
    it('过滤掉 source 不存在的边', () => {
        const nodeIds = new Set(['a', 'b', 'c', 'd'])
        const links = buildForceLinks(mockMorphisms, nodeIds)
        const hasInvalid = links.some(l => l.id === 'e4')
        expect(hasInvalid).toBe(false)
    })

    it('过滤掉 target 不存在的边', () => {
        const nodeIds = new Set(['a', 'b', 'c', 'd'])
        const links = buildForceLinks(mockMorphisms, nodeIds)
        const hasInvalid = links.some(l => l.id === 'e3')
        expect(hasInvalid).toBe(false)
    })

    it('保留合法的边', () => {
        const nodeIds = new Set(['a', 'b', 'c', 'd'])
        const links = buildForceLinks(mockMorphisms, nodeIds)
        expect(links).toHaveLength(2)
        expect(links[0].id).toBe('e1')
        expect(links[1].id).toBe('e2')
    })

    it('source/target 引用的是 id 字符串', () => {
        const nodeIds = new Set(['a', 'b', 'c', 'd'])
        const links = buildForceLinks(mockMorphisms, nodeIds)
        expect(links[0].source).toBe('a')
        expect(links[0].target).toBe('b')
    })

    it('空 morphisms 返回空数组', () => {
        expect(buildForceLinks([], new Set())).toEqual([])
    })

    it('全部端点缺失则返回空数组', () => {
        const links = buildForceLinks(mockMorphisms, new Set())
        expect(links).toEqual([])
    })

    it('有 sort 的边使用 getObjectSort 颜色', () => {
        const nodeIds = new Set(['a', 'b', 'c'])
        const links = buildForceLinks(mockMorphismsWithSort, nodeIds)
        const withSort = links.find(l => l.id === 'e1')!
        // 'implies' 不在 DEFAULT_SORTS，应该得到 autoColor
        expect(withSort.color).toMatch(/^hsl\(\d+, 55%, 55%\)$/)
    })

    it('无 sort 的边使用 MORPHISM_DEFAULT 灰色', () => {
        const nodeIds = new Set(['a', 'b', 'c'])
        const links = buildForceLinks(mockMorphismsWithSort, nodeIds)
        const noSort = links.find(l => l.id === 'e2')!
        expect(noSort.color).toBe('#6b7280')
    })
})

// ── computeNodeRadius ──

describe('computeNodeRadius', () => {
    it('无 pagerank 返回默认半径', () => {
        const r = computeNodeRadius(undefined)
        expect(r).toBeGreaterThan(0)
    })

    it('pagerank=0 返回最小半径', () => {
        const r = computeNodeRadius(0)
        expect(r).toBeGreaterThan(0)
    })

    it('pagerank=1 返回最大半径', () => {
        const rMin = computeNodeRadius(0)
        const rMax = computeNodeRadius(1)
        expect(rMax).toBeGreaterThan(rMin)
    })

    it('pagerank 越大，半径越大（单调递增）', () => {
        const r1 = computeNodeRadius(0.2)
        const r2 = computeNodeRadius(0.5)
        const r3 = computeNodeRadius(0.8)
        expect(r3).toBeGreaterThan(r2)
        expect(r2).toBeGreaterThan(r1)
    })

    it('半径在合理范围内（3-20px）', () => {
        for (let p = 0; p <= 1; p += 0.1) {
            const r = computeNodeRadius(p)
            expect(r).toBeGreaterThanOrEqual(3)
            expect(r).toBeLessThanOrEqual(20)
        }
    })
})

// ── hitTestNode ──

describe('hitTestNode', () => {
    const nodes: ForceNode[] = [
        { id: 'a', name: 'A', sort: 'theorem', color: '#fff', radius: 10, x: 100, y: 100 },
        { id: 'b', name: 'B', sort: 'definition', color: '#fff', radius: 5, x: 200, y: 200 },
    ]

    it('点击节点中心命中', () => {
        const hit = hitTestNode(nodes, 100, 100)
        expect(hit?.id).toBe('a')
    })

    it('点击节点边缘内命中', () => {
        const hit = hitTestNode(nodes, 108, 100)  // 距离 8 < radius 10
        expect(hit?.id).toBe('a')
    })

    it('点击节点外未命中', () => {
        const hit = hitTestNode(nodes, 150, 150)
        expect(hit).toBeNull()
    })

    it('多个节点重叠时返回最近的', () => {
        const overlapping: ForceNode[] = [
            { id: 'x', name: 'X', sort: '', color: '#fff', radius: 20, x: 100, y: 100 },
            { id: 'y', name: 'Y', sort: '', color: '#fff', radius: 20, x: 105, y: 100 },
        ]
        const hit = hitTestNode(overlapping, 104, 100)  // 更接近 y
        expect(hit?.id).toBe('y')
    })

    it('空节点数组返回 null', () => {
        expect(hitTestNode([], 0, 0)).toBeNull()
    })
})

// ── hitTestEdge ──

describe('hitTestEdge', () => {
    const links: ForceLink[] = [
        {
            id: 'e1',
            source: { id: 'a', name: 'A', sort: '', color: '', radius: 5, x: 0, y: 0 } as ForceNode,
            target: { id: 'b', name: 'B', sort: '', color: '', radius: 5, x: 100, y: 0 } as ForceNode,
        },
    ]

    it('点击线段中点命中', () => {
        const hit = hitTestEdge(links, 50, 0, 5)
        expect(hit?.id).toBe('e1')
    })

    it('点击线段附近（阈值内）命中', () => {
        const hit = hitTestEdge(links, 50, 3, 5)  // y=3, 阈值 5
        expect(hit?.id).toBe('e1')
    })

    it('点击远离线段未命中', () => {
        const hit = hitTestEdge(links, 50, 20, 5)
        expect(hit).toBeNull()
    })

    it('空边数组返回 null', () => {
        expect(hitTestEdge([], 0, 0, 5)).toBeNull()
    })
})

// ── mapPhysicsToD3 ──

describe('mapPhysicsToD3', () => {
    const physics = { gravity: 50, repulsion: 100, linkDistance: 30, friction: 40 }

    it('返回 d3 力参数对象', () => {
        const d3p = mapPhysicsToD3(physics)
        expect(d3p).toHaveProperty('centerStrength')
        expect(d3p).toHaveProperty('manyBodyStrength')
        expect(d3p).toHaveProperty('linkDistance')
        expect(d3p).toHaveProperty('velocityDecay')
    })

    it('manyBodyStrength 为负数（斥力）', () => {
        const d3p = mapPhysicsToD3(physics)
        expect(d3p.manyBodyStrength).toBeLessThan(0)
    })

    it('linkDistance 为正数', () => {
        const d3p = mapPhysicsToD3(physics)
        expect(d3p.linkDistance).toBeGreaterThan(0)
    })

    it('velocityDecay 在 0-1 之间', () => {
        const d3p = mapPhysicsToD3(physics)
        expect(d3p.velocityDecay).toBeGreaterThan(0)
        expect(d3p.velocityDecay).toBeLessThan(1)
    })

    it('centerStrength 在 0-1 之间', () => {
        const d3p = mapPhysicsToD3(physics)
        expect(d3p.centerStrength).toBeGreaterThan(0)
        expect(d3p.centerStrength).toBeLessThanOrEqual(1)
    })
})

// ── extractMetric ──

describe('extractMetric', () => {
    it('提取并归一化 metric 数据', () => {
        const data = { pagerank: { 'a': 0.5, 'b': 1.0 } }
        const result = extractMetric(data, 'pagerank')!
        expect(result['a']).toBe(0.5)
        expect(result['b']).toBe(1.0)
    })

    it('不存在的 metric 返回 undefined', () => {
        expect(extractMetric({}, 'pagerank')).toBeUndefined()
    })

    it('非 object 类型返回 undefined', () => {
        expect(extractMetric({ pagerank: 'bad' }, 'pagerank')).toBeUndefined()
    })

    it('全零值不 crash', () => {
        const result = extractMetric({ x: { 'a': 0, 'b': 0 } }, 'x')
        expect(result).toBeDefined()
    })
})

// ── extractColorMapping ──

describe('extractColorMapping', () => {
    it('从 group 数据生成颜色映射', () => {
        const data = { community: { 'a': 0, 'b': 1, 'c': 0 } }
        const result = extractColorMapping(data, 'community')!
        expect(result['a']).toBe(result['c'])  // 同组同色
        expect(result['a']).not.toBe(result['b'])  // 不同组不同色
    })

    it('不存在的 mode 返回 undefined', () => {
        expect(extractColorMapping({}, 'community')).toBeUndefined()
    })

    it('空对象返回 undefined', () => {
        expect(extractColorMapping({ community: {} }, 'community')).toBeUndefined()
    })
})

// ── buildClusterCenters ──

describe('buildClusterCenters', () => {
    it('为每个组分配一个中心坐标', () => {
        const groups = { 'a': 0, 'b': 1, 'c': 0 }
        const centers = buildClusterCenters(groups, 800, 600)
        expect(Object.keys(centers)).toHaveLength(2)  // 2 个组
        expect(centers[0]).toHaveProperty('x')
        expect(centers[0]).toHaveProperty('y')
    })

    it('不同组中心坐标不同', () => {
        const groups = { 'a': 0, 'b': 1 }
        const centers = buildClusterCenters(groups, 800, 600)
        expect(centers[0].x !== centers[1].x || centers[0].y !== centers[1].y).toBe(true)
    })

    it('中心在画布范围内', () => {
        const groups: Record<string, number> = {}
        for (let i = 0; i < 20; i++) groups[`n${i}`] = i % 5
        const centers = buildClusterCenters(groups, 800, 600)
        for (const c of Object.values(centers)) {
            expect(c.x).toBeGreaterThan(0)
            expect(c.x).toBeLessThan(800)
            expect(c.y).toBeGreaterThan(0)
            expect(c.y).toBeLessThan(600)
        }
    })

    it('空输入返回空对象', () => {
        expect(Object.keys(buildClusterCenters({}, 800, 600))).toHaveLength(0)
    })
})

// ── assignNodeClusters ──

describe('assignNodeClusters', () => {
    const nodes: ForceNode[] = [
        { id: 'a', name: 'A', sort: 'theorem', color: '#fff', radius: 5 },
        { id: 'b', name: 'B', sort: 'definition', color: '#fff', radius: 5 },
        { id: 'c', name: 'C', sort: 'lemma', color: '#fff', radius: 5 },
    ]

    it('返回每个节点的目标 x/y', () => {
        const groups = { 'a': 0, 'b': 1, 'c': 0 }
        const result = assignNodeClusters(nodes, groups, 800, 600)
        expect(result).toHaveLength(3)
        expect(result[0]).toHaveProperty('targetX')
        expect(result[0]).toHaveProperty('targetY')
    })

    it('同组节点有相同的目标坐标', () => {
        const groups = { 'a': 0, 'b': 1, 'c': 0 }
        const result = assignNodeClusters(nodes, groups, 800, 600)
        expect(result[0].targetX).toBe(result[2].targetX)  // a 和 c 同组
        expect(result[0].targetY).toBe(result[2].targetY)
    })

    it('不同组节点目标坐标不同', () => {
        const groups = { 'a': 0, 'b': 1, 'c': 0 }
        const result = assignNodeClusters(nodes, groups, 800, 600)
        expect(result[0].targetX !== result[1].targetX || result[0].targetY !== result[1].targetY).toBe(true)
    })

    it('不在分组里的节点目标是画布中心', () => {
        const groups = { 'a': 0 }  // b 和 c 不在分组里
        const result = assignNodeClusters(nodes, groups, 800, 600)
        expect(result[1].targetX).toBe(400)
        expect(result[1].targetY).toBe(300)
    })
})
