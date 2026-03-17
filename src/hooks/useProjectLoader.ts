/**
 * useProjectLoader — 加载项目数据到 dataStore + 自动跑分析
 *
 * 从后端 API 加载 objects (obj) 和 morphisms (mor)，
 * 写入 dataStore。加载完成后自动触发网络分析。
 */
import { useEffect, useState } from 'react'
import { useDataStore } from '@/stores/dataStore'
import { useAnalysisStore } from '@/stores/analysisStore'

const API_BASE = 'http://127.0.0.1:8765'

/** 并行调用分析端点，合并结果 */
export function fetchAnalysis(projectPath: string): Promise<Record<string, unknown>> {
    const base = `${API_BASE}/api/project/analysis`
    const p = `path=${encodeURIComponent(projectPath)}`

    const endpoints: Record<string, string> = {
        pagerank: `${base}/pagerank?${p}`,
        degree: `${base}/degree?${p}`,
        betweenness: `${base}/betweenness?${p}`,
        communities: `${base}/communities?${p}`,
        dag: `${base}/dag?${p}`,
        clustering: `${base}/clustering?${p}`,
        katz: `${base}/katz?${p}`,
        spectral: `${base}/spectral?${p}`,
        curvature: `${base}/curvature?${p}`,
        structural: `${base}/structural?${p}`,
    }

    return Promise.allSettled(
        Object.entries(endpoints).map(([key, url]) =>
            fetch(url).then(r => r.json()).then(resp => {
                const data = resp?.data
                if (!data) return { key, result: null }

                if (data.topNodes && Array.isArray(data.topNodes)) {
                    const dict: Record<string, number> = {}
                    for (const item of data.topNodes) dict[item.nodeId] = item.value
                    return { key, result: dict }
                }
                if (data.scores && typeof data.scores === 'object') {
                    return { key, result: data.scores }
                }
                if (data.communities && Array.isArray(data.communities)) {
                    const dict: Record<string, number> = {}
                    data.communities.forEach((g: { nodeIds: string[] }, i: number) => {
                        for (const id of g.nodeIds || []) dict[id] = i
                    })
                    return { key, result: dict }
                }
                if (data.layers && Array.isArray(data.layers)) {
                    const dict: Record<string, number> = {}
                    data.layers.forEach((l: { nodeIds: string[] }, i: number) => {
                        for (const id of l.nodeIds || []) dict[id] = i
                    })
                    return { key, result: dict }
                }
                return { key, result: data }
            }).catch(() => ({ key, result: null }))
        )
    ).then(results => {
        const merged: Record<string, unknown> = {}
        for (const r of results) {
            if (r.status === 'fulfilled' && r.value.result) {
                merged[r.value.key] = r.value.result
            }
        }
        return merged
    })
}

export function useProjectLoader(projectPath: string | null) {
    const [loading, setLoading] = useState(false)
    const setObjects = useDataStore(s => s.setObjects)
    const setMorphisms = useDataStore(s => s.setMorphisms)
    const setAnalysisData = useAnalysisStore(s => s.setData)

    useEffect(() => {
        if (!projectPath) return
        let cancelled = false

        setLoading(true)

        Promise.all([
            fetch(`${API_BASE}/api/knowledge/nodes?path=${encodeURIComponent(projectPath)}`)
                .then(r => r.json())
                .catch(() => []),
            fetch(`${API_BASE}/api/knowledge/edges?path=${encodeURIComponent(projectPath)}`)
                .then(r => r.json())
                .catch(() => []),
        ]).then(([objects, morphisms]) => {
            if (cancelled) return
            setObjects(objects)
            setMorphisms(morphisms)
            setLoading(false)

            // 数据加载完后自动跑分析
            fetchAnalysis(projectPath).then(data => {
                if (!cancelled) setAnalysisData(data)
            })
        })

        return () => { cancelled = true }
    }, [projectPath, setObjects, setMorphisms, setAnalysisData])

    return { loading }
}
