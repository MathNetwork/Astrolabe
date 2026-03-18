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

    const handleClick = useCallback(async () => {
        if (status !== 'idle') return
        setStatus('loading')

        try {
            if (action.type === 'add-node') {
                const res = await fetch(
                    `${API_BASE}/api/knowledge/nodes?path=${encodeURIComponent(projectPath)}`,
                    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(action.data) }
                )
                const node = await res.json()
                setCreatedId(node.id)

                // 刷新 dataStore
                const nodesRes = await fetch(`${API_BASE}/api/knowledge/nodes?path=${encodeURIComponent(projectPath)}`)
                setObjects(await nodesRes.json())

                selectObj(node.id)
                setStatus('done')
            } else if (action.type === 'add-edge') {
                await fetch(
                    `${API_BASE}/api/knowledge/edges?path=${encodeURIComponent(projectPath)}`,
                    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(action.data) }
                )

                // 刷新 dataStore
                const edgesRes = await fetch(`${API_BASE}/api/knowledge/edges?path=${encodeURIComponent(projectPath)}`)
                setMorphisms(await edgesRes.json())

                setStatus('done')
            }
        } catch (e) {
            setStatus('error')
        }
    }, [action, status, projectPath, setObjects, setMorphisms, selectObj])

    const handleJump = useCallback(() => {
        if (createdId) selectObj(createdId)
    }, [createdId, selectObj])

    if (action.type === 'add-node') {
        const label = action.data.name || 'Node'
        const sort = action.data.sort || ''

        return (
            <div className="flex items-center gap-2">
                {status === 'idle' && (
                    <button onClick={handleClick}
                        className="px-2 py-1 rounded bg-blue-500/20 text-blue-400 text-[11px] hover:bg-blue-500/30 transition-colors">
                        ✦ Create Node: {label}
                    </button>
                )}
                {status === 'loading' && (
                    <span className="text-[11px] text-white/30 animate-pulse">Creating...</span>
                )}
                {status === 'done' && (
                    <button onClick={handleJump}
                        className="px-2 py-1 rounded bg-green-500/20 text-green-400 text-[11px] hover:bg-green-500/30 transition-colors">
                        ✓ Created: {label} ({sort}) — click to view
                    </button>
                )}
                {status === 'error' && (
                    <span className="text-[11px] text-red-400/70">Failed to create</span>
                )}
            </div>
        )
    }

    if (action.type === 'add-edge') {
        return (
            <div className="flex items-center gap-2">
                {status === 'idle' && (
                    <button onClick={handleClick}
                        className="px-2 py-1 rounded bg-amber-500/20 text-amber-400 text-[11px] hover:bg-amber-500/30 transition-colors">
                        ✦ Create Edge: {action.data.source?.slice(0, 8)} → {action.data.target?.slice(0, 8)}
                    </button>
                )}
                {status === 'loading' && (
                    <span className="text-[11px] text-white/30 animate-pulse">Creating...</span>
                )}
                {status === 'done' && (
                    <span className="text-[11px] text-green-400/70">✓ Edge created</span>
                )}
                {status === 'error' && (
                    <span className="text-[11px] text-red-400/70">Failed to create</span>
                )}
            </div>
        )
    }

    return null
}
