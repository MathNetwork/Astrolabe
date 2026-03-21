'use client'

/**
 * AI Chat — 可拖动浮窗，松手后磁吸到最近的窗口边缘
 */
import { memo, useState, useRef, useCallback } from 'react'
import { useClaudeChatStore } from '@/stores/claudeChatStore'
import { useClaudeEvents } from '@/hooks/useClaudeEvents'
import { ChatMessages } from './ChatMessages'
import { ChatComposer } from './ChatComposer'

const W = 340
const H = 480

function snapToEdge(x: number, y: number) {
    const vw = window.innerWidth
    const vh = window.innerHeight
    // Clamp y
    const cy = Math.max(0, Math.min(vh - H, y))
    // Snap x to nearest horizontal edge
    const distLeft = x
    const distRight = vw - (x + W)
    return {
        x: distLeft < distRight ? 0 : vw - W,
        y: cy,
    }
}

export const ChatPanel = memo(function ChatPanel() {
    const [pos, setPos] = useState(() => ({
        x: typeof window !== 'undefined' ? window.innerWidth - W : 0,
        y: 60,
    }))
    const dragging = useRef(false)
    const offset = useRef({ x: 0, y: 0 })

    useClaudeEvents()

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

        const onUp = (ev: MouseEvent) => {
            dragging.current = false
            // Snap to nearest edge
            setPos(snapToEdge(
                ev.clientX - offset.current.x,
                ev.clientY - offset.current.y,
            ))
            window.removeEventListener('mousemove', onMove)
            window.removeEventListener('mouseup', onUp)
        }

        window.addEventListener('mousemove', onMove)
        window.addEventListener('mouseup', onUp)
    }, [pos])

    return (
        <div
            className="fixed z-50 bg-[#0a0a0f] border border-white/10 rounded-lg flex flex-col shadow-2xl transition-[left] duration-200"
            style={{ left: pos.x, top: pos.y, width: W, height: H }}
        >
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
