/**
 * useProjectLoader — 加载项目数据到 dataStore
 *
 * 从后端 API 加载 objects (obj) 和 morphisms (mor)，
 * 写入 dataStore。只在项目路径变化时触发。
 */
import { useEffect, useState } from 'react'
import { useDataStore } from '@/stores/dataStore'

const API_BASE = 'http://127.0.0.1:8765'

export function useProjectLoader(projectPath: string | null) {
    const [loading, setLoading] = useState(false)
    const setObjects = useDataStore(s => s.setObjects)
    const setMorphisms = useDataStore(s => s.setMorphisms)

    useEffect(() => {
        if (!projectPath) return
        let cancelled = false

        setLoading(true)

        // Parallel load objects and morphisms
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

    return { loading }
}
