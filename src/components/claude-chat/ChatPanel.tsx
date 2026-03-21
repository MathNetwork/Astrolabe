'use client'

/**
 * AI Chat — 磁吸浮窗
 *
 * 吸附在窗口右边缘，点击边缘条展开/折叠。
 * 展开时显示聊天内容，折叠时只留一个窄条。
 */
import { memo, useState } from 'react'
import { useClaudeChatStore } from '@/stores/claudeChatStore'
import { useClaudeEvents } from '@/hooks/useClaudeEvents'
import { ChatMessages } from './ChatMessages'
import { ChatComposer } from './ChatComposer'

export const ChatPanel = memo(function ChatPanel() {
    const [open, setOpen] = useState(false)
    const messageCount = useClaudeChatStore(s => s.messages.length)

    useClaudeEvents()

    return (
        <div
            className="fixed top-0 right-0 h-full z-50 flex transition-all duration-200"
            style={{ width: open ? 360 : 24 }}
        >
            {/* Edge tab — always visible */}
            <button
                onClick={() => setOpen(o => !o)}
                className="w-6 h-full flex flex-col items-center justify-center
                    bg-black/60 border-l border-white/10 hover:bg-white/5
                    transition-colors shrink-0 cursor-pointer"
                title={open ? 'Collapse AI Chat' : 'Open AI Chat'}
            >
                <span className="text-[10px] text-white/40 writing-vertical">
                    AI
                </span>
                {messageCount > 0 && !open && (
                    <span className="mt-2 w-4 h-4 bg-blue-500 rounded-full text-[9px] flex items-center justify-center text-white">
                        {messageCount}
                    </span>
                )}
            </button>

            {/* Chat content */}
            {open && (
                <div className="flex-1 bg-[#0a0a0f] border-l border-white/10 flex flex-col">
                    <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 shrink-0">
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
            )}
        </div>
    )
})
