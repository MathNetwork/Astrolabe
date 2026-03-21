'use client'

/**
 * AI Chat — 可拖动浮窗
 *
 * 独立模块，放在页面顶层，可在屏幕上自由拖动。
 */
import { memo, useState, useRef, useCallback } from 'react'
import { useClaudeChatStore } from '@/stores/claudeChatStore'
import { useClaudeEvents } from '@/hooks/useClaudeEvents'
import { ChatMessages } from './ChatMessages'
import { ChatComposer } from './ChatComposer'

export const ChatPanel = memo(function ChatPanel() {
    const [pos, setPos] = useState({ x: -1, y: 60 })
    const dragging = useRef(false)
    const offset = useRef({ x: 0, y: 0 })

    useClaudeEvents()

    // Init position on first render
    if (pos.x < 0 && typeof window !== 'undefined') {
        setPos({ x: window.innerWidth - 380, y: 60 })
    }

    const onMouseDown = useCallback((e: React.MouseEvent) => {
        dragging.current = true
        offset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y }
        const onMove = (ev: MouseEvent) => {
            if (!dragging.current) return
            setPos({
                x: ev.clientX - offset.current.x,
                y: ev.clientY - offset.current.y,
            })
        }
        const onUp = () => {
            dragging.current = false
            window.removeEventListener('mousemove', onMove)
            window.removeEventListener('mouseup', onUp)
        }
        window.addEventListener('mousemove', onMove)
        window.addEventListener('mouseup', onUp)
    }, [pos])

    return (
        <div
            className="fixed z-50 w-[340px] h-[480px] bg-[#0a0a0f] border border-white/10 rounded-lg flex flex-col shadow-2xl"
            style={{ left: pos.x, top: pos.y }}
        >
            {/* Drag handle */}
            <div
                onMouseDown={onMouseDown}
                className="flex items-center justify-between px-3 py-2 border-b border-white/10 shrink-0 cursor-move select-none"
            >
                <span className="text-xs text-white/50">AI Chat</span>
                <button
                    onClick={() => useClaudeChatStore.getState().clearMessages()}
                    className="text-[10px] text-white/20 hover:text-white/50 transition-colors"
                >
                    Clear
                </button>
            </div>

            <ChatMessages />
            <ChatComposer />
        </div>
    )
})
