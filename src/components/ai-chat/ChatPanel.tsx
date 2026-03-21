'use client'

/**
 * AI Chat — 可拖动浮窗，磁吸边缘，可调节大小，可最小化
 */
import { memo, useState, useRef, useCallback } from 'react'
import { useClaudeChatStore } from '@/stores/claudeChatStore'
import { useClaudeEvents } from '@/hooks/useClaudeEvents'
import { ChatMessages } from './ChatMessages'
import { ChatComposer } from './ChatComposer'

const MIN_W = 280
const MIN_H = 300

type Side = 'left' | 'right' | 'bottom'

function snapToEdge(x: number, y: number, w: number, h: number): { x: number; y: number; side: Side } {
    const vw = window.innerWidth
    const vh = window.innerHeight
    const distLeft = x
    const distRight = vw - (x + w)
    const distBottom = vh - (y + h)
    const min = Math.min(distLeft, distRight, distBottom)

    if (min === distBottom) {
        return { x: Math.max(0, Math.min(vw - w, x)), y: vh - h, side: 'bottom' }
    }
    if (min === distLeft) {
        return { x: 0, y: Math.max(0, Math.min(vh - h, y)), side: 'left' }
    }
    return { x: vw - w, y: Math.max(0, Math.min(vh - h, y)), side: 'right' }
}

export const ChatPanel = memo(function ChatPanel() {
    const [pos, setPos] = useState(() => ({
        x: typeof window !== 'undefined' ? window.innerWidth - 340 : 0,
        y: 60,
    }))
    const [size, setSize] = useState({ w: 340, h: 480 })
    const [side, setSide] = useState<Side>('right')
    const [minimized, setMinimized] = useState(false)
    const [isDragging, setIsDragging] = useState(false)
    const [isResizing, setIsResizing] = useState(false)
    const offset = useRef({ x: 0, y: 0 })
    const messageCount = useClaudeChatStore(s => s.messages.length)

    useClaudeEvents()

    // Drag
    const onDragStart = useCallback((e: React.MouseEvent) => {
        if (minimized) return
        setIsDragging(true)
        offset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y }
        const onMove = (ev: MouseEvent) => {
            setPos({ x: ev.clientX - offset.current.x, y: ev.clientY - offset.current.y })
        }
        const onUp = (ev: MouseEvent) => {
            setIsDragging(false)
            const snapped = snapToEdge(ev.clientX - offset.current.x, ev.clientY - offset.current.y, size.w, size.h)
            setPos({ x: snapped.x, y: snapped.y })
            setSide(snapped.side)
            window.removeEventListener('mousemove', onMove)
            window.removeEventListener('mouseup', onUp)
        }
        window.addEventListener('mousemove', onMove)
        window.addEventListener('mouseup', onUp)
    }, [pos, size, minimized])

    // Resize from any edge/corner
    const onResizeStart = useCallback((e: React.MouseEvent, edge: string) => {
        e.preventDefault()
        e.stopPropagation()
        setIsResizing(true)
        const startX = e.clientX
        const startY = e.clientY
        const startW = size.w
        const startH = size.h
        const startPosX = pos.x
        const startPosY = pos.y

        const onMove = (ev: MouseEvent) => {
            const vw = window.innerWidth
            const vh = window.innerHeight
            const dx = ev.clientX - startX
            const dy = ev.clientY - startY
            let newW = startW, newH = startH, newX = startPosX, newY = startPosY

            if (edge.includes('e')) newW = Math.min(vw - startPosX, Math.max(MIN_W, startW + dx))
            if (edge.includes('w')) { newW = Math.min(startPosX + startW, Math.max(MIN_W, startW - dx)); newX = startPosX + startW - newW }
            if (edge.includes('s')) newH = Math.min(vh - startPosY, Math.max(MIN_H, startH + dy))
            if (edge.includes('n')) { newH = Math.min(startPosY + startH, Math.max(MIN_H, startH - dy)); newY = startPosY + startH - newH }

            setSize({ w: newW, h: newH })
            setPos({ x: newX, y: newY })
        }
        const onUp = () => {
            setIsResizing(false)
            window.removeEventListener('mousemove', onMove)
            window.removeEventListener('mouseup', onUp)
        }
        window.addEventListener('mousemove', onMove)
        window.addEventListener('mouseup', onUp)
    }, [size, pos])

    const label = `AI${messageCount > 0 ? ` (${messageCount})` : ''}`

    if (minimized) {
        if (side === 'bottom') {
            return (
                <button onClick={() => setMinimized(false)}
                    className="fixed z-50 bg-[#0a0a0f] border border-white/10 border-b-0 hover:bg-white/5 transition-colors cursor-pointer rounded-t-lg px-4 py-1"
                    style={{ bottom: 0, left: pos.x + size.w / 2 - 40 }}>
                    <span className="text-[10px] text-white/40">{label}</span>
                </button>
            )
        }
        return (
            <button onClick={() => setMinimized(false)}
                className="fixed z-50 bg-[#0a0a0f] border border-white/10 hover:bg-white/5 transition-colors cursor-pointer"
                style={{
                    top: pos.y + 40,
                    ...(side === 'right'
                        ? { right: 0, borderTopLeftRadius: 8, borderBottomLeftRadius: 8, borderRight: 'none' }
                        : { left: 0, borderTopRightRadius: 8, borderBottomRightRadius: 8, borderLeft: 'none' }),
                    width: 24, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                <span className="text-[10px] text-white/40" style={{ writingMode: 'vertical-rl' }}>{label}</span>
            </button>
        )
    }

    const transition = (isDragging || isResizing)
        ? 'none'
        : 'left 0.6s cubic-bezier(0.16, 1, 0.3, 1), top 0.6s cubic-bezier(0.16, 1, 0.3, 1)'

    return (
        <div className="fixed z-50 bg-[#0a0a0f] border border-white/10 rounded-lg flex flex-col shadow-2xl"
            style={{ left: pos.x, top: pos.y, width: size.w, height: size.h, transition }}>

            {/* Resize handles */}
            <div onMouseDown={e => onResizeStart(e, 'n')} className="absolute top-0 left-2 right-2 h-1 cursor-n-resize" />
            <div onMouseDown={e => onResizeStart(e, 's')} className="absolute bottom-0 left-2 right-2 h-1 cursor-s-resize" />
            <div onMouseDown={e => onResizeStart(e, 'w')} className="absolute left-0 top-2 bottom-2 w-1 cursor-w-resize" />
            <div onMouseDown={e => onResizeStart(e, 'e')} className="absolute right-0 top-2 bottom-2 w-1 cursor-e-resize" />
            <div onMouseDown={e => onResizeStart(e, 'nw')} className="absolute top-0 left-0 w-3 h-3 cursor-nw-resize" />
            <div onMouseDown={e => onResizeStart(e, 'ne')} className="absolute top-0 right-0 w-3 h-3 cursor-ne-resize" />
            <div onMouseDown={e => onResizeStart(e, 'sw')} className="absolute bottom-0 left-0 w-3 h-3 cursor-sw-resize" />
            <div onMouseDown={e => onResizeStart(e, 'se')} className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize" />

            {/* Header */}
            <div onMouseDown={onDragStart}
                className="flex items-center justify-between px-3 py-2 border-b border-white/10 shrink-0 cursor-move select-none">
                <span className="text-xs text-white/50">AI Chat</span>
                <div className="flex items-center gap-2">
                    <button onClick={() => useClaudeChatStore.getState().clearMessages()}
                        className="text-[10px] text-white/20 hover:text-white/50 transition-colors">Clear</button>
                    <button onClick={() => setMinimized(true)}
                        className="text-white/20 hover:text-white/50 transition-colors text-sm leading-none" title="Minimize">−</button>
                </div>
            </div>

            <ChatMessages />
            <ChatComposer />
        </div>
    )
})
