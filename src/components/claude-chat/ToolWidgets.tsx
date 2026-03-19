'use client'

/**
 * ToolWidgets — Claude 回复中的可操作按钮
 *
 * 检测 JSON 代码块，如果是 obj/mor 数据，渲染创建按钮。
 * 点击按钮调用后端 API 创建节点/边。
 */
import { memo, useState, useCallback } from 'react'
import { parseClaudeActions, type ClaudeAction } from '@/lib/parseClaudeActions'
import { useDataStore } from '@/stores/dataStore'
import { useSelectObjStore } from '@/stores/selectObjStore'
import { API_BASE } from '@/lib/apiBase'

export const ToolWidgets = memo(function ToolWidgets({ content }: { content: string }) {
    const actions = parseClaudeActions(content)
    if (actions.length === 0) return null

    return (
        <div className="mt-2 space-y-1">
            {actions.map((action, i) => (
                <ActionButton key={i} action={action} />
            ))}
        </div>
    )
})

function ActionButton({ action }: { action: ClaudeAction }) {
    const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
    const [createdId, setCreatedId] = useState<string | null>(null)
    const setObjects = useDataStore(s => s.setObjects)
    const setMorphisms = useDataStore(s => s.setMorphisms)
    const selectObj = useSelectObjStore(s => s.select)

    const projectPath = typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('path') || ''
        : ''

    const refreshData = useCallback(async () => {
        const [nodesRes, edgesRes] = await Promise.all([
            fetch(`${API_BASE}/api/knowledge/nodes?path=${encodeURIComponent(projectPath)}`),
            fetch(`${API_BASE}/api/knowledge/edges?path=${encodeURIComponent(projectPath)}`),
        ])
        setObjects(await nodesRes.json())
        setMorphisms(await edgesRes.json())
    }, [projectPath, setObjects, setMorphisms])

    const handleClick = useCallback(async () => {
        if (status !== 'idle') return
        setStatus('loading')

        try {
            const headers = { 'Content-Type': 'application/json' }
            const p = `path=${encodeURIComponent(projectPath)}`

            if (action.type === 'add-node') {
                const res = await fetch(`${API_BASE}/api/knowledge/nodes?${p}`, { method: 'POST', headers, body: JSON.stringify(action.data) })
                const node = await res.json()
                setCreatedId(node.id)
                await refreshData()
                selectObj(node.id)
            } else if (action.type === 'add-edge') {
                await fetch(`${API_BASE}/api/knowledge/edges?${p}`, { method: 'POST', headers, body: JSON.stringify(action.data) })
                await refreshData()
            } else if (action.type === 'edit-node') {
                await fetch(`${API_BASE}/api/knowledge/nodes/${action.data.id}?${p}`, { method: 'PUT', headers, body: JSON.stringify(action.data) })
                await refreshData()
                selectObj(action.data.id)
                setCreatedId(action.data.id)
            } else if (action.type === 'edit-edge') {
                await fetch(`${API_BASE}/api/knowledge/edges/${action.data.id}?${p}`, { method: 'PUT', headers, body: JSON.stringify(action.data) })
                await refreshData()
            } else if (action.type === 'delete-node') {
                await fetch(`${API_BASE}/api/knowledge/nodes/${action.data.id}?${p}`, { method: 'DELETE' })
                await refreshData()
                selectObj(null)
            } else if (action.type === 'delete-edge') {
                await fetch(`${API_BASE}/api/knowledge/edges/${action.data.id}?${p}`, { method: 'DELETE' })
                await refreshData()
            }

            setStatus('done')
        } catch (e) {
            setStatus('error')
        }
    }, [action, status, projectPath, refreshData, selectObj])

    const handleJump = useCallback(() => {
        if (createdId) selectObj(createdId)
    }, [createdId, selectObj])

    const LABELS: Record<string, { idle: string; done: string; color: string }> = {
        'add-node': { idle: `✦ Create Node: ${action.data.name || 'Node'}`, done: `✓ Created: ${action.data.name}`, color: 'blue' },
        'add-edge': { idle: `✦ Create Edge`, done: `✓ Edge created`, color: 'amber' },
        'edit-node': { idle: `✎ Edit Node: ${action.data.name || 'Node'}`, done: `✓ Updated: ${action.data.name}`, color: 'cyan' },
        'edit-edge': { idle: `✎ Edit Edge`, done: `✓ Edge updated`, color: 'cyan' },
        'delete-node': { idle: `✕ Delete Node: ${action.data.id?.slice(0, 8)}`, done: `✓ Deleted`, color: 'red' },
        'delete-edge': { idle: `✕ Delete Edge: ${action.data.id?.slice(0, 8)}`, done: `✓ Edge deleted`, color: 'red' },
        'save-sorts': { idle: `✦ Save Sort Config (${Object.keys(action.data.sorts || {}).length} sorts)`, done: `✓ Sorts saved`, color: 'blue' },
    }

    const label = LABELS[action.type]
    if (!label) return null

    const colorMap: Record<string, string> = {
        blue: 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30',
        amber: 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30',
        cyan: 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30',
        red: 'bg-red-500/20 text-red-400 hover:bg-red-500/30',
    }

    return (
        <div className="flex items-center gap-2">
            {status === 'idle' && (
                <button onClick={handleClick}
                    className={`px-2 py-1 rounded text-xs transition-colors ${colorMap[label.color]}`}>
                    {label.idle}
                </button>
            )}
            {status === 'loading' && (
                <span className="text-xs text-white/30 animate-pulse">Processing...</span>
            )}
            {status === 'done' && (
                <button onClick={handleJump}
                    className="px-2 py-1 rounded bg-green-500/20 text-green-400 text-xs hover:bg-green-500/30 transition-colors">
                    {label.done}
                </button>
            )}
            {status === 'error' && (
                <span className="text-xs text-red-400/70">Failed</span>
            )}
        </div>
    )
}
