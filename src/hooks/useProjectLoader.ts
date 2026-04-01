/**
 * useProjectLoader — 加载项目数据到 dataStore
 *
 * 从后端 API 加载 graph (nodes/links) 和文件树。
 */
import { useEffect, useRef, useState } from 'react'
import { useDataStore } from '@/stores/dataStore'
import { useFileWatcher } from './useFileWatcher'
import { initPlugins } from '@/plugins/init'

import { API_BASE } from '@/lib/apiBase'

// Register plugins once
initPlugins()

export function useProjectLoader(projectPath: string | null) {
    useFileWatcher(projectPath)
    const [loading, setLoading] = useState(false)
    const hasLoadedRef = useRef(false)
    const setObjects = useDataStore(s => s.setObjects)
    const setMorphisms = useDataStore(s => s.setMorphisms)
    const setProjectFiles = useDataStore(s => s.setProjectFiles)
    const refreshTrigger = useDataStore(s => s.refreshTrigger)

    useEffect(() => {
        if (!projectPath) return
        let cancelled = false

        if (!hasLoadedRef.current) setLoading(true)

        const safeFetch = <T,>(url: string, fallback: T): Promise<T> =>
            fetch(url)
                .then(r => { if (!r.ok) throw new Error(r.statusText); return r.json() })
                .catch(() => fallback)

        const p = encodeURIComponent(projectPath)
        Promise.all([
            safeFetch(`${API_BASE}/api/astrolabe/ref-graph?path=${p}`, { nodes: [], links: [] }),
            safeFetch(`${API_BASE}/api/project/files?path=${p}`, []),
        ]).then(([graph, projectFiles]) => {
            if (cancelled) return
            setObjects((graph as any).nodes || [])
            setMorphisms((graph as any).links || [])
            if (Array.isArray(projectFiles)) {
                setProjectFiles(projectFiles)
            }
            setLoading(false)
            hasLoadedRef.current = true
        })

        return () => { cancelled = true }
    }, [projectPath, setObjects, setMorphisms, refreshTrigger])

    return { loading }
}
