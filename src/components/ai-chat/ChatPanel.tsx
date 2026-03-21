'use client'

/**
 * AI Chat — 可拖动浮窗，磁吸边缘，可最小化为边缘小条
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
    return {
        x: distLeft < distRight ? 0 : vw - W,
        y: cy,
        side: (distLeft < distRight ? 'left' : 'right') as 'left' | 'right',
    }
}

export const ChatPanel = memo(function ChatPanel() {
    const [pos, setPos] = useState(() => ({
        x: typeof window !== 'undefined' ? window.innerWidth - W : 0,
        y: 60,
    }))
    const [side, setSide] = useState<'left' | 'right'>('right')
    const [minimized, setMinimized] = useState(false)
    const [isDragging, setIsDragging] = useState(false)
    const offset = useRef({ x: 0, y: 0 })
    const messageCount = useClaudeChatStore(s => s.messages.length)

    useClaudeEvents()

    const onMouseDown = useCallback((e: React.MouseEvent) => {
        if (minimized) return
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
            const snapped = snapToEdge(
                ev.clientX - offset.current.x,
                ev.clientY - offset.current.y,
            )
            setPos({ x: snapped.x, y: snapped.y })
            setSide(snapped.side)
            window.removeEventListener('mousemove', onMove)
            window.removeEventListener('mouseup', onUp)
        }

        window.addEventListener('mousemove', onMove)
        window.addEventListener('mouseup', onUp)
    }, [pos, minimized])

    // Minimized: show a small tab on the snapped edge
    if (minimized) {
        return (
            <button
                onClick={() => setMinimized(false)}
                className="fixed z-50 bg-[#0a0a0f] border border-white/10 hover:bg-white/5 transition-colors cursor-pointer"
                style={{
                    top: pos.y + 40,
                    ...(side === 'right'
                        ? { right: 0, borderTopLeftRadius: 8, borderBottomLeftRadius: 8, borderRight: 'none' }
                        : { left: 0, borderTopRightRadius: 8, borderBottomRightRadius: 8, borderLeft: 'none' }),
                    width: 24,
                    height: 80,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <span className="text-[10px] text-white/40" style={{ writingMode: 'vertical-rl' }}>
                    AI {messageCount > 0 ? `(${messageCount})` : ''}
                </span>
            </button>
        )
    }

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
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => useClaudeChatStore.getState().clearMessages()}
                        className="text-[10px] text-white/20 hover:text-white/50 transition-colors"
                    >
                        Clear
                    </button>
                    <button
                        onClick={() => setMinimized(true)}
                        className="text-white/20 hover:text-white/50 transition-colors text-sm leading-none"
                        title="Minimize"
                    >
                        −
                    </button>
                </div>
            </div>
            <ChatMessages />
            <ChatComposer />
        </div>
    )
})
