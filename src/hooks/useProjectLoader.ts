/**
 * useProjectLoader — 加载项目数据到 dataStore + 自动跑分析
 *
 * 从后端 API 加载 objects (obj) 和 morphisms (mor)，
 * 写入 dataStore。加载完成后自动触发网络分析。
 */
import { useEffect, useState } from 'react'
import { useDataStore } from '@/stores/dataStore'
import { useAnalysisStore } from '@/stores/analysisStore'
import { useAnalysisData } from './useAnalysisData'

const API_BASE = 'http://127.0.0.1:8765'

export function useProjectLoader(projectPath: string | null) {
    const [loading, setLoading] = useState(false)
    const setObjects = useDataStore(s => s.setObjects)
    const setMorphisms = useDataStore(s => s.setMorphisms)
    const objects = useDataStore(s => s.objects)
    const setAnalysisStoreData = useAnalysisStore(s => s.setData)

    // 复用已有的分析 hook
    const { analysisData, analysisLoading } = useAnalysisData(projectPath, objects.length)

    // 分析数据同步到 analysisStore
    useEffect(() => {
        if (Object.keys(analysisData).length > 0) {
            setAnalysisStoreData(analysisData as Record<string, unknown>)
        }
    }, [analysisData, setAnalysisStoreData])

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
        })

        return () => { cancelled = true }
    }, [projectPath, setObjects, setMorphisms])

    return { loading, analysisLoading }
}
