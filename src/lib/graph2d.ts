/**
 * graph2d — 2D 力导向图纯函数层
 *
 * 零副作用，零 DOM 依赖。
 * 输入：store 数据（objects/morphisms/physics/analysis）
 * 输出：Canvas 渲染需要的 ForceNode/ForceLink
 */
import type { SimulationNodeDatum, SimulationLinkDatum } from 'd3'
import { getObjectSort } from '../../assets/objectSortConfig'

// ── Types ──

export interface ForceNode extends SimulationNodeDatum {
    id: string
    name: string
    sort: string
    color: string
    radius: number
}

export interface ForceLink extends SimulationLinkDatum<ForceNode> {
    id: string
    source: ForceNode | string
    target: ForceNode | string
}

// ── Constants ──

const DEFAULT_RADIUS = 5
const MIN_RADIUS = 3
const MAX_RADIUS = 20

// ── Pure Functions ──

/**
 * obj[] → ForceNode[]
 * 颜色来自 objectSortConfig 或 colorData，大小来自 sizeData
 */
export function buildForceNodes(
    objects: { id: string; name: string; sort: string }[],
    sizeData?: Record<string, number>,
    colorData?: Record<string, string>,
): ForceNode[] {
    return objects.map(obj => ({
        id: obj.id,
        name: obj.name,
        sort: obj.sort,
        color: colorData?.[obj.id] || getObjectSort(obj.sort).color,
        radius: computeNodeRadius(sizeData?.[obj.id]),
    }))
}

/**
 * 从 analysisData 提取指定 metric 的数值映射
 * 返回 Record<nodeId, normalizedValue(0-1)>
 */
export function extractMetric(
    analysisData: Record<string, unknown>,
    metric: string,
): Record<string, number> | undefined {
    const raw = analysisData[metric]
    if (!raw || typeof raw !== 'object') return undefined

    const values = raw as Record<string, number>
    const nums = Object.values(values).filter(v => typeof v === 'number')
    if (nums.length === 0) return undefined

    const max = Math.max(...nums)
    if (max === 0) return values

    // Normalize to 0-1
    const result: Record<string, number> = {}
    for (const [id, v] of Object.entries(values)) {
        if (typeof v === 'number') result[id] = v / max
    }
    return result
}

/**
 * 从 analysisData 提取颜色映射（community/layer 等分组数据）
 * 返回 Record<nodeId, color>
 */
export function extractColorMapping(
    analysisData: Record<string, unknown>,
    mode: string,
): Record<string, string> | undefined {
    const raw = analysisData[mode]
    if (!raw || typeof raw !== 'object') return undefined

    // community/layer 等返回 { nodeId: groupIndex }
    const groups = raw as Record<string, number>
    const palette = [
        '#D4A843', '#5B8FB9', '#3AAFA9', '#9B72CF', '#2ECC71',
        '#E74C6F', '#E8D44D', '#4A90D9', '#7B68AE', '#2EC4B6',
        '#E06C5F', '#5EBA7D', '#B8963E', '#9B59B6', '#1abc9c',
    ]

    const result: Record<string, string> = {}
    for (const [id, group] of Object.entries(groups)) {
        if (typeof group === 'number') {
            result[id] = palette[group % palette.length]
        }
    }
    return Object.keys(result).length > 0 ? result : undefined
}

/**
 * mor[] → ForceLink[]
 * 过滤掉端点不存在的边
 */
export function buildForceLinks(
    morphisms: { id: string; source: string; target: string }[],
    nodeIds: Set<string>,
): ForceLink[] {
    return morphisms
        .filter(m => nodeIds.has(m.source) && nodeIds.has(m.target))
        .map(m => ({
            id: m.id,
            source: m.source,
            target: m.target,
        }))
}

/**
 * pagerank → 可视半径
 * undefined → 默认半径，0-1 → MIN_RADIUS 到 MAX_RADIUS 线性映射
 */
export function computeNodeRadius(pagerank: number | undefined): number {
    if (pagerank == null) return DEFAULT_RADIUS
    const clamped = Math.max(0, Math.min(1, pagerank))
    return MIN_RADIUS + clamped * (MAX_RADIUS - MIN_RADIUS)
}

/**
 * 点击命中检测：找到距离 (x, y) 最近且在 radius 内的节点
 */
export function hitTestNode(nodes: ForceNode[], x: number, y: number): ForceNode | null {
    let best: ForceNode | null = null
    let bestDist = Infinity

    for (const node of nodes) {
        if (node.x == null || node.y == null) continue
        const dx = node.x - x
        const dy = node.y - y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist <= node.radius && dist < bestDist) {
            best = node
            bestDist = dist
        }
    }

    return best
}

/**
 * 边命中检测：找到距离 (x, y) 最近且在阈值内的边
 * 使用点到线段距离算法
 */
export function hitTestEdge(links: ForceLink[], x: number, y: number, threshold: number): ForceLink | null {
    let best: ForceLink | null = null
    let bestDist = Infinity

    for (const link of links) {
        const s = link.source as ForceNode
        const t = link.target as ForceNode
        if (s.x == null || s.y == null || t.x == null || t.y == null) continue

        const dist = pointToSegmentDist(x, y, s.x, s.y, t.x, t.y)
        if (dist <= threshold && dist < bestDist) {
            best = link
            bestDist = dist
        }
    }

    return best
}

/** 点到线段的距离 */
function pointToSegmentDist(
    px: number, py: number,
    x1: number, y1: number,
    x2: number, y2: number,
): number {
    const dx = x2 - x1
    const dy = y2 - y1
    const lenSq = dx * dx + dy * dy
    if (lenSq === 0) return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2)

    let t = ((px - x1) * dx + (py - y1) * dy) / lenSq
    t = Math.max(0, Math.min(1, t))

    const projX = x1 + t * dx
    const projY = y1 + t * dy
    return Math.sqrt((px - projX) ** 2 + (py - projY) ** 2)
}

/**
 * 为每个组分配一个中心坐标（圆形排列）
 */
export function buildClusterCenters(
    groups: Record<string, number>,
    width: number,
    height: number,
): Record<number, { x: number; y: number }> {
    const uniqueGroups = new Set(Object.values(groups))
    const centers: Record<number, { x: number; y: number }> = {}
    const count = uniqueGroups.size
    if (count === 0) return centers

    const cx = width / 2
    const cy = height / 2
    const radius = Math.min(width, height) * 0.3
    let i = 0
    for (const group of uniqueGroups) {
        const angle = (2 * Math.PI * i) / count - Math.PI / 2
        centers[group] = {
            x: cx + radius * Math.cos(angle),
            y: cy + radius * Math.sin(angle),
        }
        i++
    }
    return centers
}

/**
 * 给每个节点分配聚类目标坐标
 */
export function assignNodeClusters(
    nodes: ForceNode[],
    groups: Record<string, number>,
    width: number,
    height: number,
): Array<{ id: string; targetX: number; targetY: number }> {
    const centers = buildClusterCenters(groups, width, height)
    const cx = width / 2
    const cy = height / 2

    return nodes.map(node => {
        const group = groups[node.id]
        if (group != null && centers[group]) {
            return { id: node.id, targetX: centers[group].x, targetY: centers[group].y }
        }
        return { id: node.id, targetX: cx, targetY: cy }
    })
}

/**
 * physicsStore 参数 → d3-force 参数
 */
export function mapPhysicsToD3(physics: {
    gravity: number
    repulsion: number
    linkDistance: number
    damping: number
}): {
    centerStrength: number
    manyBodyStrength: number
    linkDistance: number
    velocityDecay: number
} {
    return {
        centerStrength: Math.max(0, Math.min(1, Math.abs(physics.gravity) / 100)),
        manyBodyStrength: -Math.abs(physics.repulsion) * 2,
        linkDistance: Math.max(10, physics.linkDistance * 2.5),
        velocityDecay: Math.max(0.01, Math.min(0.99, 1 - physics.damping)),
    }
}
