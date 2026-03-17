// @ts-nocheck
import { useMemo } from 'react'
import { getNamespaceDepthPreview, groupNodesByNamespace, extractNamespace } from '@/lib/graphProcessing'

export function useEditorGraphData({
    graphNodes,
    graphEdges,
    visibleNodes,
    customNodes,
    customEdges,
    knowledgeNodeIds,
    activeLensId,
    sizeMappingMode,
    sizeCurveControl,
    colorMappingMode,
    layoutClusterMode,
    analysisData,
    clusteringDepth,
    showBridges,
    highlightedPath,
}: any) {
    const COMMUNITY_COLORS = useMemo(() => [
        '#ef4444',
        '#f97316',
        '#eab308',
        '#22c55e',
        '#14b8a6',
        '#3b82f6',
        '#8b5cf6',
        '#ec4899',
        '#6366f1',
        '#06b6d4',
    ], [])

    const typeColors = useMemo(() => {
        const colors: Record<string, string> = {}
        for (const node of graphNodes) {
            if (!colors[node.sort]) {
                colors[node.sort] = node.defaultColor
            }
        }
        return colors
    }, [graphNodes])

    const namespaceData = useMemo(() => {
        if (!graphNodes || graphNodes.length === 0) return null
        const namespaceMap: Record<string, number> = {}
        const namespaceToId = new Map<string, number>()
        let nextId = 0
        const depth = 2
        for (const node of graphNodes) {
            const namespace = extractNamespace(node.name, depth) || '_root'
            if (!namespaceToId.has(namespace)) {
                namespaceToId.set(namespace, nextId++)
            }
            namespaceMap[node.id] = namespaceToId.get(namespace)!
        }
        return { map: namespaceMap, count: namespaceToId.size, names: Array.from(namespaceToId.keys()) }
    }, [graphNodes])

    const nodeCommunities = useMemo(() => {
        if (layoutClusterMode === 'namespace') {
            return namespaceData?.map
                ? new Map(Object.entries(namespaceData.map))
                : null
        }
        if (layoutClusterMode === 'spectral') {
            return analysisData.spectralClusters
                ? new Map(Object.entries(analysisData.spectralClusters))
                : null
        }
        if (layoutClusterMode === 'layer') {
            return analysisData.layers
                ? new Map(Object.entries(analysisData.layers).map(([k, v]) => [k, v]))
                : null
        }
        if (layoutClusterMode === 'community') {
            return analysisData.communities
                ? new Map(Object.entries(analysisData.communities))
                : null
        }
        if (layoutClusterMode === 'embedding') {
            return analysisData.embeddingClusters
                ? new Map(Object.entries(analysisData.embeddingClusters))
                : null
        }
        if (layoutClusterMode === 'curvature' && analysisData.curvature) {
            const curvClusters = new Map<string, number>()
            for (const [nodeId, curv] of Object.entries(analysisData.curvature)) {
                if (curv < -0.5) curvClusters.set(nodeId, 0)
                else if (curv > 0.5) curvClusters.set(nodeId, 2)
                else curvClusters.set(nodeId, 1)
            }
            return curvClusters.size > 0 ? curvClusters : null
        }
        if (layoutClusterMode === 'anomaly' && analysisData.anomalies) {
            const anomalyClusters = new Map<string, number>()
            for (const [nodeId, isAnomaly] of Object.entries(analysisData.anomalies)) {
                anomalyClusters.set(nodeId, isAnomaly ? 1 : 0)
            }
            return anomalyClusters.size > 0 ? anomalyClusters : null
        }
        if (layoutClusterMode === 'motif' && analysisData.dominantMotif) {
            const motifToId: Record<string, number> = { 'none': 0, 'chain': 1, 'fork': 2, 'join': 3, 'diamond': 4 }
            const motifClusters = new Map<string, number>()
            for (const [nodeId, motif] of Object.entries(analysisData.dominantMotif)) {
                motifClusters.set(nodeId, motifToId[motif] ?? 0)
            }
            return motifClusters.size > 0 ? motifClusters : null
        }
        return null
    }, [layoutClusterMode, namespaceData, analysisData.communities, analysisData.spectralClusters, analysisData.layers, analysisData.embeddingClusters, analysisData.curvature, analysisData.anomalies, analysisData.dominantMotif])

    const namespaceDepthPreview = useMemo(() => {
        return getNamespaceDepthPreview(graphNodes, 5)
    }, [graphNodes])

    const mapStatusToNodeStatus = (status: string): 'proven' | 'sorry' | 'error' | 'unknown' => {
        if (status === 'proven') return 'proven'
        if (status === 'sorry') return 'sorry'
        if (status === 'error') return 'error'
        return 'unknown'
    }

    // ── Base nodes: filtered by canvas/lens mode ──
    const baseNodes = useMemo(() => {
        const isCanvasMode = !activeLensId || activeLensId === 'canvas'
        const knIds = knowledgeNodeIds instanceof Set ? knowledgeNodeIds : new Set(knowledgeNodeIds || [])
        return graphNodes
            .filter(node => !isCanvasMode || visibleNodes.includes(node.id) || knIds.has(node.id))
    }, [graphNodes, visibleNodes, activeLensId, knowledgeNodeIds])

    // ── Size mapping: depends only on sizeMappingMode + size-related analysis metrics ──
    const sizeMap = useMemo(() => {
        const evalSizeCurve = (x: number): number => {
            let t = x
            for (let i = 0; i < 5; i++) {
                const bx = 2 * (1 - t) * t * sizeCurveControl.x + t * t
                const dbx = 2 * (1 - 2 * t) * sizeCurveControl.x + 2 * t
                if (Math.abs(dbx) < 0.001) break
                t = t - (bx - x) / dbx
                t = Math.max(0, Math.min(1, t))
            }
            return 2 * (1 - t) * t * sizeCurveControl.y + t * t
        }

        const normalizeAndScale = (value: number, min: number, max: number): number => {
            const normalized = max > min ? (value - min) / (max - min) : 0.5
            return 0.3 + evalSizeCurve(normalized) * 4.7
        }

        const result = new Map<string, number | undefined>()

        for (const node of baseNodes) {
            let size: number | undefined = undefined

            if (sizeMappingMode === 'pagerank' && analysisData.pagerank) {
                const pr = analysisData.pagerank[node.id]
                if (pr !== undefined) {
                    const values = Object.values(analysisData.pagerank)
                    size = normalizeAndScale(pr, Math.min(...values), Math.max(...values))
                }
            }
            if (size === undefined && sizeMappingMode === 'indegree' && analysisData.indegree) {
                const deg = analysisData.indegree[node.id]
                if (deg !== undefined) {
                    const maxDeg = Math.max(...Object.values(analysisData.indegree))
                    size = normalizeAndScale(deg, 0, maxDeg)
                }
            }
            if (size === undefined && sizeMappingMode === 'depth' && analysisData.depths) {
                const depth = analysisData.depths[node.id]
                if (depth !== undefined) {
                    const maxDepth = analysisData.graphDepth || Math.max(...Object.values(analysisData.depths))
                    size = normalizeAndScale(depth, 0, maxDepth)
                }
            }
            if (size === undefined && sizeMappingMode === 'bottleneck' && analysisData.bottleneckScores) {
                const score = analysisData.bottleneckScores[node.id]
                if (score !== undefined) {
                    const values = Object.values(analysisData.bottleneckScores)
                    size = normalizeAndScale(score, Math.min(...values), Math.max(...values))
                }
            }
            if (size === undefined && sizeMappingMode === 'reachability' && analysisData.reachability) {
                const reach = analysisData.reachability[node.id]
                if (reach !== undefined) {
                    const maxReach = Math.max(...Object.values(analysisData.reachability))
                    size = normalizeAndScale(reach, 0, maxReach)
                }
            }
            if (size === undefined && sizeMappingMode === 'betweenness' && analysisData.betweenness) {
                const btw = analysisData.betweenness[node.id]
                if (btw !== undefined) {
                    const values = Object.values(analysisData.betweenness)
                    size = normalizeAndScale(btw, Math.min(...values), Math.max(...values))
                }
            }
            if (size === undefined && sizeMappingMode === 'clustering' && analysisData.clustering) {
                const clust = analysisData.clustering[node.id]
                if (clust !== undefined) {
                    size = normalizeAndScale(clust, 0, 1)
                }
            }
            if (size === undefined && sizeMappingMode === 'katz' && analysisData.katz) {
                const katz = analysisData.katz[node.id]
                if (katz !== undefined) {
                    const values = Object.values(analysisData.katz)
                    size = normalizeAndScale(katz, Math.min(...values), Math.max(...values))
                }
            }
            if (size === undefined && sizeMappingMode === 'hub' && analysisData.hub) {
                const hub = analysisData.hub[node.id]
                if (hub !== undefined) {
                    const values = Object.values(analysisData.hub)
                    size = normalizeAndScale(hub, Math.min(...values), Math.max(...values))
                }
            }
            if (size === undefined && sizeMappingMode === 'authority' && analysisData.authority) {
                const auth = analysisData.authority[node.id]
                if (auth !== undefined) {
                    const values = Object.values(analysisData.authority)
                    size = normalizeAndScale(auth, Math.min(...values), Math.max(...values))
                }
            }

            result.set(node.id, size !== undefined ? size : node.size)
        }

        return result
    }, [baseNodes, sizeMappingMode, sizeCurveControl, analysisData.pagerank, analysisData.indegree, analysisData.betweenness, analysisData.clustering, analysisData.depths, analysisData.bottleneckScores, analysisData.reachability, analysisData.graphDepth, analysisData.katz, analysisData.hub, analysisData.authority])

    // ── Color mapping: depends only on colorMappingMode + color-related analysis metrics ──
    const colorMap = useMemo(() => {
        const LAYER_COLORS = [
            '#93c5fd', '#60a5fa', '#3b82f6', '#2563eb',
            '#1d4ed8', '#1e40af', '#1e3a8a', '#172554',
        ]

        const result = new Map<string, string>()

        for (const node of baseNodes) {
            let color: string | undefined = undefined

            if (colorMappingMode === 'namespace' && namespaceData?.map) {
                const nsId = namespaceData.map[node.id]
                if (nsId !== undefined) {
                    color = COMMUNITY_COLORS[nsId % COMMUNITY_COLORS.length]
                }
            }
            if (color === undefined && colorMappingMode === 'community' && analysisData.communities) {
                const communityId = analysisData.communities[node.id]
                if (communityId !== undefined) {
                    color = COMMUNITY_COLORS[communityId % COMMUNITY_COLORS.length]
                }
            }
            if (color === undefined && colorMappingMode === 'layer' && analysisData.layers) {
                const layer = analysisData.layers[node.id]
                if (layer !== undefined) {
                    const numLayers = analysisData.numLayers || Math.max(...Object.values(analysisData.layers)) + 1
                    const colorIndex = Math.floor((layer / numLayers) * (LAYER_COLORS.length - 1))
                    color = LAYER_COLORS[Math.min(colorIndex, LAYER_COLORS.length - 1)]
                }
            }
            if (color === undefined && colorMappingMode === 'spectral' && analysisData.spectralClusters) {
                const clusterId = analysisData.spectralClusters[node.id]
                if (clusterId !== undefined) {
                    color = COMMUNITY_COLORS[clusterId % COMMUNITY_COLORS.length]
                }
            }
            if (color === undefined && colorMappingMode === 'curvature' && analysisData.curvature) {
                const curv = analysisData.curvature[node.id]
                if (curv !== undefined) {
                    const normalized = Math.max(-1, Math.min(1, curv / 4))
                    if (normalized < 0) {
                        const intensity = Math.abs(normalized)
                        color = `rgb(${Math.round(239 * intensity + 100 * (1 - intensity))}, ${Math.round(68 * (1 - intensity) + 100 * (1 - intensity))}, ${Math.round(68 * (1 - intensity) + 100 * (1 - intensity))})`
                    } else {
                        const intensity = normalized
                        color = `rgb(${Math.round(34 * (1 - intensity) + 100 * (1 - intensity))}, ${Math.round(197 * intensity + 100 * (1 - intensity))}, ${Math.round(94 * intensity + 100 * (1 - intensity))})`
                    }
                }
                if (color === undefined) color = '#888888'
            }
            if (color === undefined && colorMappingMode === 'anomaly' && analysisData.anomalies) {
                const isAnomaly = analysisData.anomalies[node.id]
                color = isAnomaly ? '#ff6b6b' : '#4a5568'
            }
            if (color === undefined && colorMappingMode === 'embedding' && analysisData.embeddingClusters) {
                const clusterId = analysisData.embeddingClusters[node.id]
                if (clusterId !== undefined) {
                    color = COMMUNITY_COLORS[clusterId % COMMUNITY_COLORS.length]
                }
            }
            if (color === undefined && colorMappingMode === 'motif' && analysisData.dominantMotif) {
                const motif = analysisData.dominantMotif[node.id]
                const MOTIF_COLORS: Record<string, string> = {
                    'chain': '#3b82f6', 'fork': '#22c55e', 'join': '#f97316',
                    'diamond': '#a855f7', 'none': '#6b7280',
                }
                color = MOTIF_COLORS[motif] || MOTIF_COLORS.none
            }

            result.set(node.id, color !== undefined ? color : node.defaultColor)
        }

        return result
    }, [baseNodes, colorMappingMode, analysisData.communities, analysisData.layers, analysisData.numLayers, analysisData.spectralClusters, analysisData.curvature, analysisData.anomalies, analysisData.embeddingClusters, analysisData.dominantMotif, COMMUNITY_COLORS, namespaceData])

    // ── Final canvasNodes: combine base nodes with size and color maps ──
    const canvasNodes = useMemo(() => {
        return baseNodes.map(node => ({
            id: node.id,
            name: node.name,
            kind: node.sort,
            filePath: '',
            lineNumber: 0,
            status: mapStatusToNodeStatus(node.status),
            references: [],
            dependsOnCount: 0,
            usedByCount: 0,
            depth: 0,
            defaultColor: colorMap.get(node.id) || node.defaultColor,
            defaultSize: node.defaultSize,
            defaultShape: node.defaultShape,
            meta: {
                size: sizeMap.get(node.id),
                shape: node.shape,
                effect: node.effect,
                position: node.position ? [node.position.x, node.position.y, node.position.z] as [number, number, number] : undefined,
            },
        }))
    }, [baseNodes, sizeMap, colorMap])

    const canvasEdges = useMemo(() => {
        const nodeIds = new Set(canvasNodes.map(n => n.id))

        const bridgeSet = new Set<string>()
        if (showBridges && analysisData.bridges) {
            for (const [u, v] of analysisData.bridges) {
                bridgeSet.add(`${u}->${v}`)
                bridgeSet.add(`${v}->${u}`)
            }
        }

        const pathEdgeSet = new Set<string>()
        if (highlightedPath.length > 1) {
            for (let i = 0; i < highlightedPath.length - 1; i++) {
                pathEdgeSet.add(`${highlightedPath[i]}->${highlightedPath[i + 1]}`)
                pathEdgeSet.add(`${highlightedPath[i + 1]}->${highlightedPath[i]}`)
            }
        }

        return graphEdges
            .filter(edge => nodeIds.has(edge.source) && nodeIds.has(edge.target))
            .map(edge => {
                const edgeKey = `${edge.source}->${edge.target}`
                const isBridge = bridgeSet.has(edgeKey)
                const isOnPath = pathEdgeSet.has(edgeKey)

                let color = edge.defaultColor
                let width = edge.defaultWidth
                if (isOnPath) {
                    color = '#fbbf24'
                    width = 3
                } else if (isBridge) {
                    color = '#f97316'
                    width = 2.5
                }

                return {
                    id: edge.id,
                    source: edge.source,
                    target: edge.target,
                    fromLean: edge.fromLean,
                    visible: edge.visible,
                    defaultColor: color,
                    defaultWidth: width,
                    defaultStyle: edge.defaultStyle,
                    meta: {
                        style: edge.style,
                        effect: edge.effect,
                    },
                }
            })
    }, [graphEdges, canvasNodes, showBridges, analysisData.bridges, highlightedPath])

    const namespacesOnCanvas = useMemo(() => {
        if (canvasNodes.length === 0) return new Set()
        const groups = groupNodesByNamespace(canvasNodes as any, clusteringDepth)
        return new Set(groups.keys())
    }, [canvasNodes, clusteringDepth])

    const nodesWithHiddenNeighbors = useMemo(() => {
        const visibleNodeIds = new Set(visibleNodes)
        // Knowledge nodes are also on canvas, include them so their
        // neighbors aren't incorrectly flagged as having hidden connections
        const knIds = knowledgeNodeIds instanceof Set ? knowledgeNodeIds : new Set(knowledgeNodeIds || [])
        for (const id of knIds) visibleNodeIds.add(id)

        const result = new Set<string>()

        for (const nodeId of visibleNodeIds) {
            for (const edge of graphEdges) {
                if (edge.source === nodeId && !visibleNodeIds.has(edge.target)) {
                    result.add(nodeId)
                    break
                }
                if (edge.target === nodeId && !visibleNodeIds.has(edge.source)) {
                    result.add(nodeId)
                    break
                }
            }
        }

        return result
    }, [visibleNodes, graphEdges, knowledgeNodeIds])

    const visibleCustomNodes = useMemo(() => {
        const visibleNodeIds = new Set(visibleNodes)
        return customNodes.filter(node => visibleNodeIds.has(node.id))
    }, [customNodes, visibleNodes])

    const visibleCustomEdges = useMemo(() => {
        const visibleNodeIds = new Set(visibleNodes)
        return customEdges.filter(edge => {
            const sourceVisible = visibleNodeIds.has(edge.source)
            const targetVisible = visibleNodeIds.has(edge.target)
            return sourceVisible && targetVisible
        })
    }, [customEdges, visibleNodes])

    return {
        typeColors,
        namespaceData,
        nodeCommunities,
        namespaceDepthPreview,
        canvasNodes,
        canvasEdges,
        namespacesOnCanvas,
        nodesWithHiddenNeighbors,
        visibleCustomNodes,
        visibleCustomEdges,
    }
}
