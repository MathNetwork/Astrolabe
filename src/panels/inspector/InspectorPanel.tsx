'use client'

/**
 * InspectorPanel — 右栏
 *
 * 上：CardStack（obj 卡片列表）
 * 下：Claude Chat（抽屉式，可拖拽高度，可展开占满）
 */
import { memo, useState, useRef, useCallback } from 'react'
import { ArrowsPointingOutIcon, ArrowsPointingInIcon, TrashIcon } from '@heroicons/react/24/outline'
import { CardStack } from './CardStack'
import { useClaudeChatStore } from '@/stores/claudeChatStore'
import { useClaudeEvents } from '@/hooks/useClaudeEvents'
import { ChatMessages } from '@/components/claude-chat/ChatMessages'
import { ChatComposer } from '@/components/claude-chat/ChatComposer'

const MIN_CHAT_HEIGHT = 48  // 只显示标题栏
const DEFAULT_CHAT_HEIGHT = 250

export const InspectorPanel = memo(function InspectorPanel() {
    const [chatHeight, setChatHeight] = useState(DEFAULT_CHAT_HEIGHT)
    const [expanded, setExpanded] = useState(false)
    const isStreaming = useClaudeChatStore(s => s.isStreaming)
    const messageCount = useClaudeChatStore(s => s.messages.length)
    const containerRef = useRef<HTMLDivElement>(null)

    useClaudeEvents()

    // 拖拽调整高度
    const handleDragStart = useCallback((e: React.MouseEvent) => {
        if (expanded) return
        e.preventDefault()
        const startY = e.clientY
        const startHeight = chatHeight

        const onMove = (e: MouseEvent) => {
            const containerH = containerRef.current?.clientHeight || 600
            const delta = startY - e.clientY
            const newHeight = Math.min(Math.max(startHeight + delta, MIN_CHAT_HEIGHT), containerH * 0.85)
            setChatHeight(newHeight)
        }
        const onUp = () => {
            document.removeEventListener('mousemove', onMove)
            document.removeEventListener('mouseup', onUp)
        }
        document.addEventListener('mousemove', onMove)
        document.addEventListener('mouseup', onUp)
    }, [chatHeight, expanded])

    const isCollapsed = chatHeight <= MIN_CHAT_HEIGHT + 10

    return (
        <div ref={containerRef} className="h-full bg-black flex flex-col">
            {/* CardStack — 上方 */}
            {!expanded && (
                <div className="flex-1 min-h-0 overflow-hidden">
                    <CardStack />
                </div>
            )}

            {/* Chat — 下方抽屉 */}
            <div
                className="shrink-0 border-t border-white/10 flex flex-col"
                style={{ height: expanded ? '100%' : chatHeight }}
            >
                {/* 拖拽条 + 标题 */}
                <div
                    className="flex items-center justify-between px-3 py-1.5 cursor-row-resize select-none group"
                    onMouseDown={handleDragStart}
                >
                    <div className="flex items-center gap-2">
                        <div className="h-0.5 w-8 rounded bg-white/20 group-hover:bg-white/40 transition-colors" />
                        <span className="text-xs text-white/50">Claude</span>
                        {isStreaming && <span className="text-xs text-blue-400 animate-pulse">●</span>}
                        {messageCount > 0 && !isStreaming && (
                            <span className="text-[10px] text-white/25">{messageCount}</span>
                        )}
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded) }}
                            className="p-1 text-white/20 hover:text-white/50 transition-colors rounded hover:bg-white/5"
                            title={expanded ? 'Collapse' : 'Expand'}
                        >
                            {expanded
                                ? <ArrowsPointingInIcon className="w-3.5 h-3.5" />
                                : <ArrowsPointingOutIcon className="w-3.5 h-3.5" />
                            }
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); useClaudeChatStore.getState().clearMessages() }}
                            className="p-1 text-white/20 hover:text-white/50 transition-colors rounded hover:bg-white/5"
                            title="Clear chat"
                        >
                            <TrashIcon className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>

                {/* 消息 + 输入 */}
                {!isCollapsed && (
                    <>
                        <ChatMessages />
                        <ChatComposer />
                    </>
                )}
            </div>
        </div>
    )
})
