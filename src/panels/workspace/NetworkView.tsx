'use client'

/**
 * NetworkView — 2D Canvas simplicial graph (ref-only)
 *
 * Every entry is a node. Every ref relationship is a directed link.
 * Data: fetch /api/astrolabe/ref-graph → buildRefViewNodes/Links → d3-force → canvas
 */
import { memo, useState, useEffect, useRef } from 'react'
import * as d3 from 'd3'
import { useSelectObjStore } from '@/stores/selectObjStore'
import { useSelectMorStore } from '@/stores/selectMorStore'
import { usePhysicsStore } from '@/stores/physicsStore'
import { useViewStore } from '@/stores/viewStore'
import {
    buildRefViewNodes,
    buildRefViewLinks,
    hitTestNode,
    hitTestEdge,
    mapPhysicsToD3,
    type ForceNode,
    type ForceLink,
} from '@/lib/refView'
import { API_BASE } from '@/lib/apiBase'
import { getSortFill, parseSortFromRecord } from '@/lib/sortColors'
import { NetworkSettings } from './NetworkSettings'
import { usePluginStore } from '@/plugins/registry'

// ── ref 模式箭头绘制 ──
function drawArrow(ctx: CanvasRenderingContext2D, sx: number, sy: number, tx: number, ty: number, headLen: number) {
    const dx = tx - sx
    const dy = ty - sy
    const len = Math.sqrt(dx * dx + dy * dy)
    if (len === 0) return
    const ux = dx / len
    const uy = dy / len
    ctx.beginPath()
    ctx.moveTo(tx, ty)
    ctx.lineTo(tx - headLen * ux + headLen * 0.4 * uy, ty - headLen * uy - headLen * 0.4 * ux)
    ctx.lineTo(tx - headLen * ux - headLen * 0.4 * uy, ty - headLen * uy + headLen * 0.4 * ux)
    ctx.closePath()
    ctx.fill()
}

export const NetworkView = memo(function NetworkView() {
    // ── Store 订阅 ──
    const selectedObjHash = useSelectObjStore(s => s.selectedHash)
    const selectObj = useSelectObjStore(s => s.select)
    const selectMor = useSelectMorStore(s => s.select)
    const physics = usePhysicsStore()
    const showLabels = useViewStore(s => s.showLabels)
    const [loadKey, setLoadKey] = useState(0)

    // Listen for skeleton settings changes — update style only, no simulation reset
    const [styleKey, setStyleKey] = useState(0)
    useEffect(() => {
        const handler = () => setStyleKey(k => k + 1)
        window.addEventListener('skeleton-settings-changed', handler)
        return () => window.removeEventListener('skeleton-settings-changed', handler)
    }, [])

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

    // ── Tooltip & hover state ──
    const tooltipRef = useRef<HTMLDivElement>(null)
    const hoveredNodeRef = useRef<string | null>(null)

    // Stable refs for callbacks
    const selectedObjHashRef = useRef(selectedObjHash)
    selectedObjHashRef.current = selectedObjHash

    // ── Render function ──
    renderRef.current = () => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const transform = transformRef.current
        const currentSelectedObj = selectedObjHashRef.current

        // Clear
        ctx.save()
        ctx.setTransform(1, 0, 0, 1, 0, 0)
        ctx.fillStyle = '#0a0a0f'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.restore()

        ctx.save()
        ctx.translate(transform.x, transform.y)
        ctx.scale(transform.k, transform.k)

        const hoveredNode = hoveredNodeRef.current

        // ── Draw links (directed arrows) ──
        for (const link of linksRef.current) {
            const s = link.source as ForceNode
            const t = link.target as ForceNode
            if (s.x == null || s.y == null || t.x == null || t.y == null) continue

            const dx = t.x - s.x
            const dy = t.y - s.y
            const len = Math.sqrt(dx * dx + dy * dy)
            const tr = (t as any).radius || 5
            const sr = (s as any).radius || 5
            if (len < sr + tr) continue
            const ux = dx / len
            const uy = dy / len
            const ax = s.x + ux * sr
            const ay = s.y + uy * sr
            const bx = t.x - ux * tr
            const by = t.y - uy * tr

            const isSelected = currentSelectedObj === s.id || currentSelectedObj === t.id

            ctx.beginPath()
            ctx.moveTo(ax, ay)
            ctx.lineTo(bx, by)
            const edgeColor = link.color || 'rgba(255,255,255,0.15)'
            ctx.strokeStyle = isSelected ? 'rgba(255,255,255,0.5)' : edgeColor
            ctx.lineWidth = (isSelected ? 1.5 : 0.8) / transform.k
            ctx.stroke()

            const headLen = Math.min(6 / transform.k, len * 0.3)
            ctx.fillStyle = isSelected ? 'rgba(255,255,255,0.5)' : edgeColor
            drawArrow(ctx, ax, ay, bx, by, headLen)
        }

        // ── Draw nodes ──
        for (const node of nodesRef.current) {
            if (node.x == null || node.y == null) continue

            const isSelected = node.id === currentSelectedObj
            const isHovered = node.id === hoveredNode && !isSelected
            const r = isSelected ? node.radius + 2 : isHovered ? node.radius + 1 : node.radius

            // Selected glow
            if (isSelected) {
                ctx.beginPath()
                ctx.arc(node.x, node.y, r + 4, 0, 2 * Math.PI)
                ctx.fillStyle = 'rgba(255, 255, 255, 0.12)'
                ctx.fill()
            }

            // Hover glow
            if (isHovered) {
                ctx.beginPath()
                ctx.arc(node.x, node.y, r + 3, 0, 2 * Math.PI)
                ctx.fillStyle = `${node.color}33`
                ctx.fill()
            }

            // Node circle
            ctx.beginPath()
            ctx.arc(node.x, node.y, r, 0, 2 * Math.PI)
            ctx.fillStyle = isSelected ? '#ffffff' : node.color
            ctx.globalAlpha = currentSelectedObj && !isSelected && !isHovered ? 0.6 : 1
            ctx.fill()
            ctx.globalAlpha = 1

            // Dashed outline for non-atoms (degree >= 1)
            const degree = (node as any).degree as number | undefined
            if (degree != null && degree >= 1) {
                ctx.beginPath()
                ctx.arc(node.x, node.y, r, 0, 2 * Math.PI)
                ctx.strokeStyle = 'rgba(255,255,255,0.3)'
                ctx.lineWidth = 1 / transform.k
                ctx.setLineDash([3 / transform.k, 2 / transform.k])
                ctx.stroke()
                ctx.setLineDash([])
            }
        }

        // ── Draw labels ──
        if (showLabels) {
            const fontSize = Math.max(10 / transform.k, 3)
            ctx.font = `${fontSize}px sans-serif`
            ctx.textAlign = 'center'
            ctx.textBaseline = 'top'

            for (const node of nodesRef.current) {
                if (node.x == null || node.y == null) continue
                const isSelected = node.id === currentSelectedObj
                ctx.fillStyle = isSelected ? '#ffffff' : 'rgba(255,255,255,0.5)'
                ctx.fillText(node.id, node.x, node.y + node.radius + 2)
            }
        }

        ctx.restore()
    }

    // ── Main effect: create simulation + interactions ──
    useEffect(() => {
        const canvas = canvasRef.current
        const container = containerRef.current
        if (!canvas || !container) return

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

        const rect = container.getBoundingClientRect()
        const d3p = mapPhysicsToD3(physics)

        const simulation = d3.forceSimulation<ForceNode>([])
            .force('link', d3.forceLink<ForceNode, ForceLink>([])
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
                    if (hitTestNode(nodesRef.current, w.x, w.y)) return false
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
                const node = hitTestNode(nodesRef.current, w.x, w.y)
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

            const node = hitTestNode(nodesRef.current, w.x, w.y)
            if (node) {
                selfClickRef.current = true
                selectObj(node.id)
                selectMor(null)
                return
            }

            const edge = hitTestEdge(linksRef.current, w.x, w.y, 8 / transformRef.current.k)
            if (edge) {
                selfClickRef.current = true
                selectMor(edge.id)
                return
            }

            selfClickRef.current = true
            selectObj(null)
            selectMor(null)
        }

        // ── Hover tooltip ──
        const handleMouseMove = (e: MouseEvent) => {
            const r = canvas.getBoundingClientRect()
            const w = screenToWorld(e.clientX - r.left, e.clientY - r.top)
            const node = hitTestNode(nodesRef.current, w.x, w.y)
            const tooltip = tooltipRef.current

            const prevHovered = hoveredNodeRef.current
            hoveredNodeRef.current = node?.id || null

            if (node && tooltip) {
                tooltip.style.display = 'block'
                tooltip.style.left = `${e.clientX - r.left + 12}px`
                tooltip.style.top = `${e.clientY - r.top - 8}px`
                tooltip.textContent = node.id
                canvas.style.cursor = 'pointer'
            } else if (tooltip) {
                tooltip.style.display = 'none'
                canvas.style.cursor = 'default'
            }

            if (hoveredNodeRef.current !== prevHovered) renderRef.current()
        }

        const handleMouseLeave = () => {
            hoveredNodeRef.current = null
            const tooltip = tooltipRef.current
            if (tooltip) tooltip.style.display = 'none'
            renderRef.current()
        }

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
    }, [])

    // ── Load data: fetch ref-graph ──
    useEffect(() => {
        const sim = simulationRef.current
        if (!sim) return

        const path = new URLSearchParams(window.location.search).get('path')
        if (!path) return

        // Read skeleton settings from plugin store (if available)
        let sizeBy = 'uniform', colorBy = 'sort'
        try {
            const store = (window as any).__pluginStore
            if (store) { sizeBy = store.skeletonSizeBy || 'uniform'; colorBy = store.skeletonColorBy || 'sort' }
        } catch {}

        const url = skeletonMode
            ? `${API_BASE}/api/plugins/skeleton/graph?path=${encodeURIComponent(path)}&size=${sizeBy}&color=${colorBy}`
            : `${API_BASE}/api/astrolabe/ref-graph?path=${encodeURIComponent(path)}`

        fetch(url)
            .then(r => r.json())
            .then(data => {
                let forceNodes: ForceNode[]
                let forceLinks: ForceLink[]

                if (skeletonMode) {
                    // Backend already computed nodes with radius/color
                    forceNodes = (data.nodes || []).map((n: any) => ({
                        id: n.id, name: n.title || n.id, sort: n.sort || '', color: n.color, radius: n.radius,
                    }))
                    forceLinks = (data.edges || []).map((e: any) => ({
                        id: e.hash || `${e.source}-${e.target}`,
                        source: e.source, target: e.target, color: e.color || 'rgba(255,255,255,0.15)',
                    }))
                } else {
                    const refNodes = buildRefViewNodes(data.nodes || [])
                    const refLinks = buildRefViewLinks(data.links || [])
                    forceNodes = refNodes.map(n => ({
                        id: n.id, name: n.name || n.id, sort: n.sort || `degree-${n.degree}`, color: n.color, radius: n.radius,
                    }))
                    forceLinks = refLinks.map(l => ({
                        id: `ref-${l.source}-${l.target}-${l.position}`,
                        source: l.source, target: l.target, color: 'rgba(255,255,255,0.15)',
                    }))
                }

                nodesRef.current = forceNodes
                linksRef.current = forceLinks
                sim.nodes(forceNodes)
                const linkForce = sim.force('link') as d3.ForceLink<ForceNode, ForceLink>
                if (linkForce) linkForce.links(forceLinks)
                sim.force('collision', d3.forceCollide<ForceNode>(d => d.radius + 2))
                sim.alpha(1).restart()
            })
            .catch(err => console.warn('[NetworkView] fetch failed:', err))
    }, [loadKey])

    // ── Style-only update: re-fetch skeleton graph and update radius/color in place ──
    useEffect(() => {
        if (styleKey === 0 || !skeletonMode) return
        const path = new URLSearchParams(window.location.search).get('path')
        if (!path) return

        let sizeBy = 'uniform', colorBy = 'sort'
        try {
            const store = (window as any).__pluginStore
            if (store) { sizeBy = store.skeletonSizeBy || 'uniform'; colorBy = store.skeletonColorBy || 'sort' }
        } catch {}

        fetch(`${API_BASE}/api/plugins/skeleton/graph?path=${encodeURIComponent(path)}&size=${sizeBy}&color=${colorBy}`)
            .then(r => r.json())
            .then(data => {
                const newNodes = data.nodes || []
                const newEdges = data.edges || []
                const nodeMap: Record<string, any> = {}
                for (const n of newNodes) nodeMap[n.id] = n

                // Update existing nodes in place (preserve x, y positions)
                for (const node of nodesRef.current) {
                    const updated = nodeMap[node.id]
                    if (updated) {
                        node.radius = updated.radius
                        node.color = updated.color
                    }
                }

                // Update edge colors
                const edgeMap: Record<string, any> = {}
                for (const e of newEdges) edgeMap[`${e.source}-${e.target}`] = e
                for (const link of linksRef.current) {
                    const s = typeof link.source === 'string' ? link.source : (link.source as any).id
                    const t = typeof link.target === 'string' ? link.target : (link.target as any).id
                    const updated = edgeMap[`${s}-${t}`]
                    if (updated) link.color = updated.color
                }

                // Just re-render, no simulation restart
                renderRef.current()
            })
            .catch(() => {})
    }, [styleKey])

    // ── flyTo on external selection ──
    useEffect(() => {
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
        const currentTransform = transformRef.current
        const newTransform = d3.zoomIdentity
            .translate(rect.width / 2 - targetNode.x * currentTransform.k, rect.height / 2 - targetNode.y * currentTransform.k)
            .scale(currentTransform.k)

        d3.select(canvasRef.current)
            .transition()
            .duration(500)
            .ease(d3.easeCubicOut)
            .call(zoomRef.current.transform, newTransform)
    }, [selectedObjHash])

    // ── Physics hot-update ──
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

    // ── showLabels 变化时触发重绘 ──
    useEffect(() => {
        renderRef.current()
    }, [showLabels])

    const [settingsOpen, setSettingsOpen] = useState(false)
    const skeletonEnabled = usePluginStore(s => s.enabled.has('skeleton'))
    const skeletonMode = usePluginStore(s => s.isModeActive('skeleton'))
    const setMode = usePluginStore(s => s.setMode)

    return (
        <div ref={containerRef} className="w-full h-full relative bg-[#0a0a0f]">
            <canvas ref={canvasRef} className="w-full h-full block" />
            {/* Toolbar */}
            <div className="absolute top-3 left-3 flex gap-1">
                <button
                    onClick={() => setLoadKey(k => k + 1)}
                    className="w-7 h-7 rounded flex items-center justify-center transition-colors bg-black/50 text-white/40 hover:text-white/70"
                    title="Reload graph"
                >
                    ↻
                </button>
                <button
                    onClick={() => setSettingsOpen(o => !o)}
                    className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${
                        settingsOpen ? 'bg-white/15 text-white/80' : 'bg-black/50 text-white/40 hover:text-white/70'
                    }`}
                    title="Graph Settings"
                >
                    ⚙
                </button>
                {skeletonEnabled && (
                    <button
                        onClick={() => { setMode('skeleton', !skeletonMode); setLoadKey(k => k + 1) }}
                        className={`h-7 px-2 rounded flex items-center justify-center transition-colors text-[10px] font-medium tracking-wide ${
                            skeletonMode ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-black/50 text-white/40 hover:text-white/70'
                        }`}
                        title={skeletonMode ? 'Switch to Entry view' : 'Switch to 1-Skeleton view'}
                    >
                        {skeletonMode ? 'SKELETON' : 'ENTRY'}
                    </button>
                )}
            </div>
            {settingsOpen && (
                <div className="absolute top-12 left-3 w-56 max-h-[80%] overflow-y-auto bg-black/80 backdrop-blur-sm rounded-lg border border-white/10">
                    <NetworkSettings />
                </div>
            )}
            {/* Hover tooltip */}
            <div
                ref={tooltipRef}
                className="absolute pointer-events-none bg-black/80 text-white/90 text-xs px-2 py-1 rounded font-mono"
                style={{ display: 'none' }}
            />
        </div>
    )
})
