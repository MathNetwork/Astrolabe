'use client'

/**
 * NetworkView — 2D Canvas 力导向图
 *
 * 唯一直接订阅全部 5 个 store 的组件（Canvas 不走 React 组件模型）。
 * 纯函数逻辑在 graph2d.ts 中。
 *
 * 订阅:
 *   dataStore      → objects/morphisms（画什么）
 *   physicsStore   → gravity/repulsion/linkDistance/damping（d3-force 参数）
 *   analysisStore  → pagerank 等（节点大小）
 *   selectObjStore → 选中节点高亮 + 点击写入
 *   selectMorStore → 选中边高亮 + 点击写入
 */
import { memo, useEffect, useRef, useMemo, useCallback } from 'react'
import * as d3 from 'd3'
import { useDataStore } from '@/stores/dataStore'
import { useSelectObjStore } from '@/stores/selectObjStore'
import { useSelectMorStore } from '@/stores/selectMorStore'
import { usePhysicsStore } from '@/stores/physicsStore'
import { useAnalysisStore } from '@/stores/analysisStore'
import {
    buildForceNodes,
    buildForceLinks,
    hitTestNode,
    hitTestEdge,
    mapPhysicsToD3,
    type ForceNode,
    type ForceLink,
} from '@/lib/graph2d'
import { MORPHISM_DEFAULT } from '../../../assets/morphismSortConfig'

export const NetworkView = memo(function NetworkView() {
    // ── Store 订阅 ──
    const objects = useDataStore(s => s.objects)
    const morphisms = useDataStore(s => s.morphisms)
    const selectedObjHash = useSelectObjStore(s => s.selectedHash)
    const selectObj = useSelectObjStore(s => s.select)
    const selectedMorHash = useSelectMorStore(s => s.selectedHash)
    const selectMor = useSelectMorStore(s => s.select)
    const physics = usePhysicsStore()
    const analysisData = useAnalysisStore(s => s.data)

    // ── Refs ──
    const containerRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const simulationRef = useRef<d3.Simulation<ForceNode, ForceLink> | null>(null)
    const transformRef = useRef(d3.zoomIdentity)
    const nodesRef = useRef<ForceNode[]>([])
    const linksRef = useRef<ForceLink[]>([])
    const zoomRef = useRef<d3.ZoomBehavior<HTMLCanvasElement, unknown> | null>(null)
    const renderRef = useRef<() => void>(() => {})
    const prevSelectedRef = useRef<string | null>(null)
    const selfClickRef = useRef(false)

    // ── Tooltip state ──
    const tooltipRef = useRef<HTMLDivElement>(null)

    // Stable refs for callbacks
    const selectedObjHashRef = useRef(selectedObjHash)
    const selectedMorHashRef = useRef(selectedMorHash)
    selectedObjHashRef.current = selectedObjHash
    selectedMorHashRef.current = selectedMorHash

    // ── Stable data keys (avoid re-init on same data) ──
    const nodesKey = useMemo(() => objects.map(o => o.id).sort().join(','), [objects])
    const edgesKey = useMemo(() => morphisms.map(m => `${m.source}-${m.target}`).sort().join(','), [morphisms])

    // ── Pagerank data for node sizing ──
    const pagerank = useMemo(() => {
        if (!analysisData) return undefined
        // Extract pagerank if present in analysis data
        const pr = (analysisData as any)?.pagerank
        return pr as Record<string, number> | undefined
    }, [analysisData])

    // ── Render function ──
    renderRef.current = () => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const rect = canvas.getBoundingClientRect()
        const transform = transformRef.current
        const currentSelectedObj = selectedObjHashRef.current
        const currentSelectedMor = selectedMorHashRef.current

        // Clear
        ctx.save()
        ctx.setTransform(1, 0, 0, 1, 0, 0)
        ctx.fillStyle = '#0a0a0f'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.restore()

        ctx.save()
        ctx.translate(transform.x, transform.y)
        ctx.scale(transform.k, transform.k)

        // ── 画边 ──
        for (const link of linksRef.current) {
            const s = link.source as ForceNode
            const t = link.target as ForceNode
            if (s.x == null || s.y == null || t.x == null || t.y == null) continue

            const isSelected = currentSelectedMor === link.id
            ctx.beginPath()
            ctx.moveTo(s.x, s.y)
            ctx.lineTo(t.x, t.y)

            if (isSelected) {
                ctx.strokeStyle = '#ffffff'
                ctx.lineWidth = 2 / transform.k
            } else {
                ctx.strokeStyle = MORPHISM_DEFAULT.color
                ctx.lineWidth = 0.5 / transform.k
                ctx.globalAlpha = currentSelectedObj ? 0.3 : 0.4
            }
            ctx.stroke()
            ctx.globalAlpha = 1
        }

        // ── 画节点 ──
        for (const node of nodesRef.current) {
            if (node.x == null || node.y == null) continue

            const isSelected = node.id === currentSelectedObj
            const r = isSelected ? node.radius + 2 : node.radius

            // 选中光晕
            if (isSelected) {
                ctx.beginPath()
                ctx.arc(node.x, node.y, r + 4, 0, 2 * Math.PI)
                ctx.fillStyle = 'rgba(255, 255, 255, 0.1)'
                ctx.fill()
            }

            // 节点圆
            ctx.beginPath()
            ctx.arc(node.x, node.y, r, 0, 2 * Math.PI)
            ctx.fillStyle = isSelected ? '#ffffff' : node.color
            ctx.globalAlpha = currentSelectedObj && !isSelected ? 0.6 : 1
            ctx.fill()
            ctx.globalAlpha = 1
        }

        ctx.restore()
    }

    // ── 主 Effect: 创建 simulation + 交互 ──
    useEffect(() => {
        const canvas = canvasRef.current
        const container = containerRef.current
        if (!canvas || !container) return

        // ── Canvas 尺寸 ──
        const resize = () => {
            const rect = container.getBoundingClientRect()
            canvas.width = rect.width * window.devicePixelRatio
            canvas.height = rect.height * window.devicePixelRatio
            const ctx = canvas.getContext('2d')
            if (ctx) ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
            renderRef.current()
        }

        const resizeObserver = new ResizeObserver(resize)
        resizeObserver.observe(container)
        resize()

        // ── 构建数据 ──
        const nodeIds = new Set(objects.map(o => o.id))
        const forceNodes = buildForceNodes(objects, pagerank)
        const forceLinks = buildForceLinks(morphisms, nodeIds)
        nodesRef.current = forceNodes
        linksRef.current = forceLinks

        // ── d3-force simulation ──
        const rect = container.getBoundingClientRect()
        const d3p = mapPhysicsToD3(physics)

        const simulation = d3.forceSimulation<ForceNode>(forceNodes)
            .force('link', d3.forceLink<ForceNode, ForceLink>(forceLinks)
                .id(d => d.id)
                .distance(d3p.linkDistance)
                .strength(0.3))
            .force('charge', d3.forceManyBody()
                .strength(d3p.manyBodyStrength)
                .distanceMax(500))
            .force('center', d3.forceCenter(rect.width / 2, rect.height / 2)
                .strength(d3p.centerStrength))
            .force('collision', d3.forceCollide<ForceNode>(d => d.radius + 2))
            .alphaDecay(0.01)
            .velocityDecay(d3p.velocityDecay)

        simulation.on('tick', () => renderRef.current())
        simulationRef.current = simulation

        // ── 坐标转换 ──
        const screenToWorld = (sx: number, sy: number) => {
            const t = transformRef.current
            return { x: (sx - t.x) / t.k, y: (sy - t.y) / t.k }
        }

        // ── Zoom ──
        const zoom = d3.zoom<HTMLCanvasElement, unknown>()
            .scaleExtent([0.1, 10])
            .filter((event) => {
                if (event.type === 'mousedown') {
                    const r = canvas.getBoundingClientRect()
                    const w = screenToWorld(event.clientX - r.left, event.clientY - r.top)
                    if (hitTestNode(forceNodes, w.x, w.y)) return false
                }
                return true
            })
            .on('zoom', (event) => {
                transformRef.current = event.transform
                renderRef.current()
            })

        zoomRef.current = zoom

        // ── Drag ──
        let dragNode: ForceNode | null = null

        const drag = d3.drag<HTMLCanvasElement, unknown>()
            .subject((event) => {
                const w = screenToWorld(event.x, event.y)
                const node = hitTestNode(forceNodes, w.x, w.y)
                if (node) return { x: node.x, y: node.y, node }
                return null
            })
            .on('start', (event) => {
                if (!event.subject) return
                dragNode = event.subject.node as ForceNode
                simulation.alphaTarget(0.3).restart()
                dragNode.fx = dragNode.x
                dragNode.fy = dragNode.y
            })
            .on('drag', (event) => {
                if (!dragNode) return
                const w = screenToWorld(event.x, event.y)
                dragNode.fx = w.x
                dragNode.fy = w.y
            })
            .on('end', () => {
                if (dragNode) {
                    simulation.alphaTarget(0)
                    dragNode.fx = null
                    dragNode.fy = null
                    dragNode = null
                }
            })

        // ── Click ──
        let mouseDownPos: { x: number; y: number } | null = null
        const DRAG_THRESHOLD = 5

        const handleMouseDown = (e: MouseEvent) => {
            mouseDownPos = { x: e.clientX, y: e.clientY }
        }

        const handleClick = (e: MouseEvent) => {
            if (mouseDownPos) {
                const dx = e.clientX - mouseDownPos.x
                const dy = e.clientY - mouseDownPos.y
                if (dx * dx + dy * dy > DRAG_THRESHOLD * DRAG_THRESHOLD) return
            }

            const r = canvas.getBoundingClientRect()
            const w = screenToWorld(e.clientX - r.left, e.clientY - r.top)

            // 优先检查节点
            const node = hitTestNode(forceNodes, w.x, w.y)
            if (node) {
                selfClickRef.current = true
                selectObj(node.id)
                selectMor(null)
                return
            }

            // 检查边
            const edge = hitTestEdge(linksRef.current, w.x, w.y, 8 / transformRef.current.k)
            if (edge) {
                selfClickRef.current = true
                selectMor(edge.id)
                return
            }

            // 空白点击
            selfClickRef.current = true
            selectObj(null)
            selectMor(null)
        }

        // ── Hover tooltip ──
        const handleMouseMove = (e: MouseEvent) => {
            const r = canvas.getBoundingClientRect()
            const w = screenToWorld(e.clientX - r.left, e.clientY - r.top)
            const node = hitTestNode(forceNodes, w.x, w.y)
            const tooltip = tooltipRef.current

            if (node && tooltip) {
                tooltip.style.display = 'block'
                tooltip.style.left = `${e.clientX - r.left + 12}px`
                tooltip.style.top = `${e.clientY - r.top - 8}px`
                tooltip.textContent = node.name
                canvas.style.cursor = 'pointer'
            } else if (tooltip) {
                tooltip.style.display = 'none'
                canvas.style.cursor = 'default'
            }
        }

        const handleMouseLeave = () => {
            const tooltip = tooltipRef.current
            if (tooltip) tooltip.style.display = 'none'
        }

        // ── Apply ──
        const selection = d3.select(canvas)
        selection.call(zoom)
        selection.call(drag)
        canvas.addEventListener('mousedown', handleMouseDown)
        canvas.addEventListener('click', handleClick)
        canvas.addEventListener('mousemove', handleMouseMove)
        canvas.addEventListener('mouseleave', handleMouseLeave)

        return () => {
            simulation.stop()
            resizeObserver.disconnect()
            canvas.removeEventListener('mousedown', handleMouseDown)
            canvas.removeEventListener('click', handleClick)
            canvas.removeEventListener('mousemove', handleMouseMove)
            canvas.removeEventListener('mouseleave', handleMouseLeave)
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [nodesKey, edgesKey, pagerank])

    // ── 选中变化时重绘 ──
    useEffect(() => {
        renderRef.current()
    }, [selectedObjHash, selectedMorHash])

    // ── 6.6: 外部选中时 flyTo ──
    useEffect(() => {
        // 自己点击的不 flyTo
        if (selfClickRef.current) {
            selfClickRef.current = false
            prevSelectedRef.current = selectedObjHash
            return
        }

        if (selectedObjHash === prevSelectedRef.current) return
        prevSelectedRef.current = selectedObjHash

        if (!selectedObjHash || !canvasRef.current || !zoomRef.current) return

        const targetNode = nodesRef.current.find(n => n.id === selectedObjHash)
        if (!targetNode || targetNode.x == null || targetNode.y == null) return

        const container = containerRef.current
        if (!container) return
        const rect = container.getBoundingClientRect()
        const centerX = rect.width / 2
        const centerY = rect.height / 2

        const currentTransform = transformRef.current
        const newTransform = d3.zoomIdentity
            .translate(centerX - targetNode.x * currentTransform.k, centerY - targetNode.y * currentTransform.k)
            .scale(currentTransform.k)

        d3.select(canvasRef.current)
            .transition()
            .duration(500)
            .ease(d3.easeCubicOut)
            .call(zoomRef.current.transform, newTransform)
    }, [selectedObjHash])

    // ── 6.7: physicsStore 变化时更新力 ──
    useEffect(() => {
        const sim = simulationRef.current
        if (!sim) return

        const d3p = mapPhysicsToD3(physics)
        const charge = sim.force('charge') as d3.ForceManyBody<ForceNode> | undefined
        const link = sim.force('link') as d3.ForceLink<ForceNode, ForceLink> | undefined
        const center = sim.force('center') as d3.ForceCenter<ForceNode> | undefined

        if (charge) charge.strength(d3p.manyBodyStrength)
        if (link) link.distance(d3p.linkDistance)
        if (center) center.strength(d3p.centerStrength)
        sim.velocityDecay(d3p.velocityDecay)
        sim.alpha(0.3).restart()
    }, [physics])

    return (
        <div ref={containerRef} className="w-full h-full relative bg-[#0a0a0f]">
            <canvas
                ref={canvasRef}
                className="w-full h-full block"
            />
            {/* Hover tooltip */}
            <div
                ref={tooltipRef}
                className="absolute pointer-events-none bg-black/80 text-white/90 text-xs px-2 py-1 rounded font-mono"
                style={{ display: 'none' }}
            />
        </div>
    )
})
