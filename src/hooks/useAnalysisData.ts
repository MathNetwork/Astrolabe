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
 * Fetch functor analysis endpoints dynamically.
 * Gets endpoint list from /api/functors/list, fetches each, merges by key.
 */
async function fetchFunctorAnalysis(
    projectPath: string,
    pathParam: string,
): Promise<Record<string, unknown>> {
    try {
        const listRes = await fetch(`${API_BASE}/api/functors/list?path=${encodeURIComponent(projectPath)}`)
        if (!listRes.ok) return {}
        const functors = await listRes.json()
        if (!Array.isArray(functors)) return {}

        const allEndpoints: { key: string; url: string }[] = []
        for (const functor of functors) {
            if (Array.isArray(functor.analysis_endpoints)) {
                for (const ep of functor.analysis_endpoints) {
                    if (ep.key && ep.url) {
                        allEndpoints.push({ key: ep.key, url: ep.url })
                    }
                }
            }
        }

        if (allEndpoints.length === 0) return {}

        const results = await Promise.all(
            allEndpoints.map(async (ep) => {
                try {
                    const res = await fetch(`${API_BASE}${ep.url}?${pathParam}`)
                    if (!res.ok) return null
                    const data = await res.json()
                    return { key: ep.key, data }
                } catch {
                    return null
                }
            })
        )

        const merged: Record<string, unknown> = {}
        for (const r of results) {
            if (r) merged[r.key] = r.data
        }
        return merged
    } catch {
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
            const baseUrl = `${API_BASE}/api/project/analysis`
            const pathParam = `path=${encodeURIComponent(projectPath)}`

            const safeFetch = async (url: string) => {
                try {
                    const res = await fetch(url)
                    if (!res.ok) return null
                    return res
                } catch {
                    return null
                }
            }
            const safeJson = async (res: Response | null) => {
                if (!res) return null
                try { return await res.json() } catch { return null }
            }
            const [
                pagerankRes,
                degreeRes,
                betweennessRes,
                clusteringRes,
                communitiesRes,
                dagRes,
                spectralRes,
                entropyRes,
                leanTypesRes,
                curvatureRes,
                structuralRes,
                metricsAllRes,
                embeddingClustersRes,
                motifParticipationRes,
                topologyRes,
                mapperRes,
                correlationsRes,
            ] = await Promise.all([
                safeFetch(`${baseUrl}/pagerank?${pathParam}&top_k=10000`),
                safeFetch(`${baseUrl}/degree?${pathParam}`),
                safeFetch(`${baseUrl}/betweenness?${pathParam}&include_all=true`),
                safeFetch(`${baseUrl}/clustering?${pathParam}&include_local=true`),
                safeFetch(`${baseUrl}/communities?${pathParam}`),
                safeFetch(`${baseUrl}/dag?${pathParam}&include_all_depths=true&include_all_scores=true`),
                safeFetch(`${baseUrl}/spectral?${pathParam}&n_clusters=8`),
                safeFetch(`${baseUrl}/entropy?${pathParam}`),
                safeFetch(`${baseUrl}/lean/types?${pathParam}`),
                safeFetch(`${baseUrl}/curvature?${pathParam}&include_node_curvatures=true`),
                safeFetch(`${baseUrl}/structural?${pathParam}`),
                safeFetch(`${baseUrl}/metrics/all?${pathParam}`),
                safeFetch(`${baseUrl}/embedding-clusters?${pathParam}&n_clusters=8`),
                safeFetch(`${baseUrl}/motif-participation?${pathParam}`),
                safeFetch(`${baseUrl}/topology?${pathParam}&include_persistent_homology=true`),
                safeFetch(`${baseUrl}/mapper?${pathParam}`),
                safeFetch(`${baseUrl}/correlations?${pathParam}`),
            ])

            const pagerankData = await safeJson(pagerankRes)
            const degreeData = await safeJson(degreeRes)
            const betweennessData = await safeJson(betweennessRes)
            const clusteringData = await safeJson(clusteringRes)
            const communitiesData = await safeJson(communitiesRes)
            const dagData = await safeJson(dagRes)
            const spectralData = await safeJson(spectralRes)
            const entropyData = await safeJson(entropyRes)
            const leanTypesData = await safeJson(leanTypesRes)
            const curvatureData = await safeJson(curvatureRes)
            const structuralData = await safeJson(structuralRes)
            const metricsAllData = await safeJson(metricsAllRes)
            const embeddingClustersData = await safeJson(embeddingClustersRes)
            const motifParticipationData = await safeJson(motifParticipationRes)
            const topologyData = await safeJson(topologyRes)
            const mapperData = await safeJson(mapperRes)
            const correlationsData = await safeJson(correlationsRes)

            const pagerankMap: Record<string, number> = {}
            if (pagerankData?.data?.topNodes) {
                for (const item of pagerankData.data.topNodes) {
                    pagerankMap[item.nodeId] = item.value
                }
            }

            const indegreeMap: Record<string, number> = {}
            if (degreeData?.data?.topInDegree) {
                for (const item of degreeData.data.topInDegree) {
                    indegreeMap[item.nodeId] = item.degree
                }
            }

            const betweennessMap: Record<string, number> = betweennessData?.data?.values || {}

            const communitiesMap: Record<string, number> = {}
            if (communitiesData?.data?.topCommunities) {
                for (const community of communitiesData.data.topCommunities) {
                    for (const nodeId of community.members) {
                        communitiesMap[nodeId] = community.id
                    }
                }
            }

            const clusteringMap: Record<string, number> = clusteringData?.data?.local || {}
            const curvatureMap: Record<string, number> = curvatureData?.data?.nodeCurvatures || {}

            const anomalyMap: Record<string, boolean> = {}
            if (Object.keys(betweennessMap).length > 0) {
                const values = Object.values(betweennessMap)
                const mean = values.reduce((a, b) => a + b, 0) / values.length
                const std = Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length)
                if (std > 0) {
                    for (const [nodeId, value] of Object.entries(betweennessMap)) {
                        anomalyMap[nodeId] = Math.abs((value - mean) / std) > 2
                    }
                }
            }

            const bridgesRaw = structuralData?.data?.bridges || []
            const bridges: Array<[string, string]> = bridgesRaw.map((b: { source: string, target: string }) => [b.source, b.target] as [string, string])

            const katzMap: Record<string, number> = {}
            const hubMap: Record<string, number> = {}
            const authorityMap: Record<string, number> = {}
            if (metricsAllData?.data?.nodeMetrics) {
                for (const [nodeId, metrics] of Object.entries(metricsAllData.data.nodeMetrics as Record<string, Record<string, number>>)) {
                    if (metrics.katz !== undefined) katzMap[nodeId] = metrics.katz
                    if (metrics.hub !== undefined) hubMap[nodeId] = metrics.hub
                    if (metrics.authority !== undefined) authorityMap[nodeId] = metrics.authority
                }
            }

            const mapperGraph = mapperData?.data ? {
                nodes: (mapperData.data.mapperNodes || []).map((n: { id: number, size: number, filter_mean: number }) => ({
                    id: n.id,
                    size: n.size,
                    filter_mean: n.filter_mean,
                })),
                edges: mapperData.data.mapperEdges || [],
            } : undefined

            const persistentHomology = topologyData?.data?.persistentHomology
            const persistenceDiagrams = persistentHomology?.diagrams
            const persistenceStatus = persistentHomology?.error || persistentHomology?.warning || persistentHomology?.note

            const correlationMatrix = correlationsData?.data ? {
                metrics: correlationsData.data.metrics || [],
                matrix: correlationsData.data.matrix || [],
            } : undefined

            const builtInData: AnalysisData = {
                pagerank: pagerankMap,
                indegree: indegreeMap,
                betweenness: betweennessMap,
                clustering: clusteringMap,
                communities: communitiesMap,
                communityCount: communitiesData?.data?.numCommunities,
                modularity: communitiesData?.data?.modularity,
                nodeCount: pagerankData?.numNodes ?? degreeData?.numNodes,
                edgeCount: pagerankData?.numEdges ?? degreeData?.numEdges,
                density: pagerankData ? pagerankData.numEdges / (pagerankData.numNodes * (pagerankData.numNodes - 1) || 1) : undefined,
                depths: dagData?.data?.allDepths,
                layers: dagData?.data?.allDepths,
                bottleneckScores: dagData?.data?.allBottleneckScores,
                reachability: dagData?.data?.allReachability,
                graphDepth: dagData?.data?.graphDepth,
                numLayers: dagData?.data?.numLayers,
                sources: dagData?.data?.sources,
                sinks: dagData?.data?.sinks,
                criticalPath: dagData?.data?.criticalPath,
                spectralClusters: spectralData?.data?.clusters,
                numSpectralClusters: spectralData?.data?.numClusters,
                vonNeumannEntropy: entropyData?.data?.vonNeumannEntropy,
                degreeShannon: entropyData?.data?.degreeShannon,
                structureEntropy: entropyData?.data?.structureEntropy,
                kindDistribution: leanTypesData?.data?.kind_distribution?.counts,
                curvature: curvatureMap,
                anomalies: anomalyMap,
                bridges: bridges,
                katz: Object.keys(katzMap).length > 0 ? katzMap : undefined,
                hub: Object.keys(hubMap).length > 0 ? hubMap : undefined,
                authority: Object.keys(authorityMap).length > 0 ? authorityMap : undefined,
                embeddingClusters: embeddingClustersData?.data?.clusters,
                numEmbeddingClusters: embeddingClustersData?.data?.numClusters,
                dominantMotif: motifParticipationData?.data?.dominantMotif,
                persistenceDiagrams: persistenceDiagrams,
                persistenceStatus: persistenceStatus,
                mapperGraph: mapperGraph,
                correlationMatrix: correlationMatrix,
            }

            // Fetch functor analysis endpoints
            const functorData = await fetchFunctorAnalysis(projectPath, pathParam)

            setAnalysisData({ ...builtInData, ...functorData })
        } catch (error) {
            console.error('Analysis failed:', error)
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
