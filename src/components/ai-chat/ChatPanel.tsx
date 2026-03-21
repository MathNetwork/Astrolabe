'use client'

/**
 * AI Chat — 可拖动浮窗，松手后磁吸到最近的窗口边缘，有阻尼感
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
    const cy = Math.max(0, Math.min(vh - H, y))
    const distLeft = x
    const distRight = vw - (x + W)
    return { x: distLeft < distRight ? 0 : vw - W, y: cy }
}

export const ChatPanel = memo(function ChatPanel() {
    const [pos, setPos] = useState(() => ({
        x: typeof window !== 'undefined' ? window.innerWidth - W : 0,
        y: 60,
    }))
    const [isDragging, setIsDragging] = useState(false)
    const offset = useRef({ x: 0, y: 0 })

    useClaudeEvents()

    const onMouseDown = useCallback((e: React.MouseEvent) => {
        setIsDragging(true)
        offset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y }

        const onMove = (ev: MouseEvent) => {
            setPos({
                x: ev.clientX - offset.current.x,
                y: ev.clientY - offset.current.y,
            })
        }

        const onUp = (ev: MouseEvent) => {
            setIsDragging(false)
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
            className="fixed z-50 bg-[#0a0a0f] border border-white/10 rounded-lg flex flex-col shadow-2xl"
            style={{
                left: pos.x, top: pos.y, width: W, height: H,
                transition: isDragging
                    ? 'none'
                    : 'left 0.6s cubic-bezier(0.16, 1, 0.3, 1), top 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
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
