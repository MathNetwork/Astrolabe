import { useState, useCallback, useEffect, useRef } from 'react'
import { API_BASE } from '@/lib/apiBase'

export type AnalysisData = {
    pagerank?: Record<string, number>
    indegree?: Record<string, number>
    betweenness?: Record<string, number>
    clustering?: Record<string, number>
    communities?: Record<string, number>
    communityCount?: number
    modularity?: number
    nodeCount?: number
    edgeCount?: number
    density?: number
    depths?: Record<string, number>
    layers?: Record<string, number>
    bottleneckScores?: Record<string, number>
    reachability?: Record<string, number>
    graphDepth?: number
    numLayers?: number
    sources?: string[]
    sinks?: string[]
    criticalPath?: string[]
    spectralClusters?: Record<string, number>
    numSpectralClusters?: number
    vonNeumannEntropy?: number
    degreeShannon?: number
    structureEntropy?: number
    kindDistribution?: Record<string, number>
    curvature?: Record<string, number>
    anomalies?: Record<string, boolean>
    bridges?: Array<[string, string]>
    katz?: Record<string, number>
    hub?: Record<string, number>
    authority?: Record<string, number>
    embeddingClusters?: Record<string, number>
    numEmbeddingClusters?: number
    dominantMotif?: Record<string, string>
    persistenceDiagrams?: Record<string, Array<{ birth: number, death: number | null, persistence: number }>>
    persistenceStatus?: string
    mapperGraph?: { nodes: Array<{ id: number, size: number, filter_mean: number }>, edges: Array<{ source: number, target: number }> }
    correlationMatrix?: { metrics: string[], matrix: number[][] }
}

/**
 * Fetch a single endpoint, return parsed JSON or null.
 */
async function safeFetch(url: string): Promise<Record<string, unknown> | null> {
    try {
        const res = await fetch(url)
        if (!res.ok) return null
        return await res.json()
    } catch {
        return null
    }
}

/**
 * Parse raw endpoint response into AnalysisData fields based on endpoint key.
 */
function parseEndpointData(key: string, raw: Record<string, unknown>): Partial<AnalysisData> {
    const data = raw.data as Record<string, unknown> | undefined
    if (!data && key !== 'metricsAll') return {}

    switch (key) {
        case 'pagerank': {
            const map: Record<string, number> = {}
            const topNodes = (data as any)?.topNodes as Array<{ nodeId: string, value: number }> | undefined
            if (topNodes) for (const item of topNodes) map[item.nodeId] = item.value
            return {
                pagerank: map,
                nodeCount: (raw as any).numNodes,
                edgeCount: (raw as any).numEdges,
                density: (raw as any).numNodes ? (raw as any).numEdges / ((raw as any).numNodes * ((raw as any).numNodes - 1) || 1) : undefined,
            }
        }
        case 'indegree': {
            const map: Record<string, number> = {}
            const topInDegree = (data as any)?.topInDegree as Array<{ nodeId: string, degree: number }> | undefined
            if (topInDegree) for (const item of topInDegree) map[item.nodeId] = item.degree
            return { indegree: map }
        }
        case 'betweenness': {
            const values = (data as any)?.values as Record<string, number> | undefined
            const map = values || {}
            // Compute anomalies from betweenness
            const anomalies: Record<string, boolean> = {}
            const vals = Object.values(map)
            if (vals.length > 0) {
                const mean = vals.reduce((a, b) => a + b, 0) / vals.length
                const std = Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length)
                if (std > 0) {
                    for (const [nodeId, value] of Object.entries(map)) {
                        anomalies[nodeId] = Math.abs((value - mean) / std) > 2
                    }
                }
            }
            return { betweenness: map, anomalies }
        }
        case 'communities': {
            const map: Record<string, number> = {}
            const topCommunities = (data as any)?.topCommunities as Array<{ id: number, members: string[] }> | undefined
            if (topCommunities) {
                for (const c of topCommunities) {
                    for (const nodeId of c.members) map[nodeId] = c.id
                }
            }
            return {
                communities: map,
                communityCount: (data as any)?.numCommunities,
                modularity: (data as any)?.modularity,
            }
        }
        case 'clustering':
            return { clustering: (data as any)?.local || {} }
        case 'curvature':
            return { curvature: (data as any)?.nodeCurvatures || {} }
        case 'depths':
            return {
                depths: (data as any)?.allDepths,
                layers: (data as any)?.allDepths,
                bottleneckScores: (data as any)?.allBottleneckScores,
                reachability: (data as any)?.allReachability,
                graphDepth: (data as any)?.graphDepth,
                numLayers: (data as any)?.numLayers,
                sources: (data as any)?.sources,
                sinks: (data as any)?.sinks,
                criticalPath: (data as any)?.criticalPath,
            }
        case 'spectralClusters':
            return {
                spectralClusters: (data as any)?.clusters,
                numSpectralClusters: (data as any)?.numClusters,
            }
        case 'entropy':
            return {
                vonNeumannEntropy: (data as any)?.vonNeumannEntropy,
                degreeShannon: (data as any)?.degreeShannon,
                structureEntropy: (data as any)?.structureEntropy,
            }
        case 'structural': {
            const bridgesRaw = (data as any)?.bridges || []
            return {
                bridges: bridgesRaw.map((b: { source: string, target: string }) => [b.source, b.target] as [string, string]),
            }
        }
        case 'metricsAll': {
            const katz: Record<string, number> = {}
            const hub: Record<string, number> = {}
            const authority: Record<string, number> = {}
            const nodeMetrics = (data as any)?.nodeMetrics as Record<string, Record<string, number>> | undefined
            if (nodeMetrics) {
                for (const [nodeId, metrics] of Object.entries(nodeMetrics)) {
                    if (metrics.katz !== undefined) katz[nodeId] = metrics.katz
                    if (metrics.hub !== undefined) hub[nodeId] = metrics.hub
                    if (metrics.authority !== undefined) authority[nodeId] = metrics.authority
                }
            }
            return {
                katz: Object.keys(katz).length > 0 ? katz : undefined,
                hub: Object.keys(hub).length > 0 ? hub : undefined,
                authority: Object.keys(authority).length > 0 ? authority : undefined,
                kindDistribution: (data as any)?.kindDistribution,
            }
        }
        case 'embeddingClusters':
            return {
                embeddingClusters: (data as any)?.clusters,
                numEmbeddingClusters: (data as any)?.numClusters,
            }
        case 'motifParticipation':
            return { dominantMotif: (data as any)?.dominantMotif }
        case 'topology': {
            const ph = (data as any)?.persistentHomology
            return {
                persistenceDiagrams: ph?.diagrams,
                persistenceStatus: ph?.error || ph?.warning || ph?.note,
            }
        }
        case 'mapper': {
            if (!data) return {}
            return {
                mapperGraph: {
                    nodes: ((data as any).mapperNodes || []).map((n: any) => ({
                        id: n.id, size: n.size, filter_mean: n.filter_mean,
                    })),
                    edges: (data as any).mapperEdges || [],
                },
            }
        }
        case 'correlations':
            return data ? {
                correlationMatrix: {
                    metrics: (data as any).metrics || [],
                    matrix: (data as any).matrix || [],
                },
            } : {}
        case 'hierarchical':
            return { spectralClusters: (data as any)?.clusters }
        case 'linkPrediction':
        case 'transitiveReduction':
        case 'criticalPath':
            return {} // No direct UI mapping yet
        default:
            return {}
    }
}

export function useAnalysisData(projectPath: string | null, graphNodesLength: number) {
    const [analysisData, setAnalysisData] = useState<AnalysisData>({})
    const [analysisLoading, setAnalysisLoading] = useState(false)

    const computeAnalysis = useCallback(async () => {
        if (!projectPath) return

        setAnalysisLoading(true)
        try {
            const pathParam = `path=${encodeURIComponent(projectPath)}`

            // Get endpoint list from functor registry
            const listRes = await safeFetch(
                `${API_BASE}/api/functors/list?${pathParam}`
            )
            if (!listRes || !Array.isArray(listRes)) {
                setAnalysisData({})
                return
            }

            // Collect all analysis endpoints from all functors
            const endpoints: { key: string; url: string; params?: string }[] = []
            for (const functor of listRes) {
                if (Array.isArray(functor.analysis_endpoints)) {
                    for (const ep of functor.analysis_endpoints) {
                        if (ep.key && (ep.url || ep.path)) {
                            endpoints.push({
                                key: ep.key,
                                url: ep.url || ep.path,
                                params: ep.params,
                            })
                        }
                    }
                }
            }

            if (endpoints.length === 0) {
                setAnalysisData({})
                return
            }

            // Fetch all endpoints in parallel
            const results = await Promise.all(
                endpoints.map(async (ep) => {
                    const extra = ep.params ? `&${ep.params}` : ''
                    const raw = await safeFetch(
                        `${API_BASE}${ep.url}?${pathParam}${extra}`
                    )
                    if (!raw) return null
                    return { key: ep.key, raw }
                })
            )

            // Parse and merge
            const merged: AnalysisData = {}
            for (const r of results) {
                if (r) {
                    Object.assign(merged, parseEndpointData(r.key, r.raw))
                }
            }

            console.log('[Analysis] computed:', Object.keys(merged).filter(k => (merged as Record<string, unknown>)[k] != null).length, 'keys')
            setAnalysisData(merged)
        } catch (error) {
            console.error('[Analysis] failed:', error)
        } finally {
            setAnalysisLoading(false)
        }
    }, [projectPath])

    const analysisComputedRef = useRef<string | null>(null)
    useEffect(() => {
        if (projectPath && graphNodesLength > 0 && analysisComputedRef.current !== projectPath) {
            analysisComputedRef.current = projectPath
            computeAnalysis()
        }
    }, [projectPath, graphNodesLength, computeAnalysis])

    return { analysisData, analysisLoading, computeAnalysis }
}
