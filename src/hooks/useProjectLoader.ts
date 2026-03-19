/**
 * useProjectLoader — 加载项目数据到 dataStore + 自动跑分析
 *
 * 从后端 API 加载 objects (obj) 和 morphisms (mor)，
 * 写入 dataStore。加载完成后自动触发网络分析。
 */
import { useEffect, useRef, useState } from 'react'
import { useDataStore } from '@/stores/dataStore'
import { useAnalysisStore } from '@/stores/analysisStore'
import { useClaudeChatStore } from '@/stores/claudeChatStore'
import { useAnalysisData } from './useAnalysisData'
import { registerPluginSkills, clearPluginSkills } from '@/lib/skills'

import { API_BASE } from '@/lib/apiBase'

export function useProjectLoader(projectPath: string | null) {
    const [loading, setLoading] = useState(false)
    const setObjects = useDataStore(s => s.setObjects)
    const setMorphisms = useDataStore(s => s.setMorphisms)
    const setPlugins = useDataStore(s => s.setPlugins)
    const objects = useDataStore(s => s.objects)
    const setAnalysisStoreData = useAnalysisStore(s => s.setData)
    const clearMessages = useClaudeChatStore(s => s.clearMessages)
    const refreshTrigger = useDataStore(s => s.refreshTrigger)
    const prevPathRef = useRef<string | null>(null)

    // 复用已有的分析 hook
    const { analysisData, analysisLoading } = useAnalysisData(projectPath, objects.length)

    // 分析数据同步到 analysisStore
    useEffect(() => {
        if (Object.keys(analysisData).length > 0) {
            setAnalysisStoreData(analysisData as Record<string, unknown>)
        }
    }, [analysisData, setAnalysisStoreData])

    // 切换项目时清空聊天记录和插件 skills
    useEffect(() => {
        if (projectPath && prevPathRef.current && prevPathRef.current !== projectPath) {
            clearMessages()
            clearPluginSkills()
        }
        prevPathRef.current = projectPath
    }, [projectPath, clearMessages])

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
            fetch(`${API_BASE}/api/plugins/list?path=${encodeURIComponent(projectPath)}`)
                .then(r => r.json())
                .catch(() => []),
        ]).then(([objects, morphisms, plugins]) => {
            if (cancelled) return
            setObjects(objects)
            setMorphisms(morphisms)
            // 注册插件 skills + 存储插件列表
            if (Array.isArray(plugins)) {
                setPlugins(plugins)
                clearPluginSkills()
                for (const plugin of plugins) {
                    if (Array.isArray(plugin.skills)) {
                        registerPluginSkills(plugin.skills)
                    }
                }
            }
            setLoading(false)
        })

        return () => { cancelled = true }
    }, [projectPath, setObjects, setMorphisms, refreshTrigger])

    return { loading, analysisLoading }
}
