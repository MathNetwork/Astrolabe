'use client'

/**
 * ChatPanel — 浮动 Claude 聊天面板
 *
 * 右下角折叠式面板，点击按钮展开。
 * 订阅 claudeChatStore。
 */
import { memo } from 'react'
import { useClaudeChatStore } from '@/stores/claudeChatStore'
import { useClaudeEvents } from '@/hooks/useClaudeEvents'
import { ChatMessages } from './ChatMessages'
import { ChatComposer } from './ChatComposer'

export const ChatPanel = memo(function ChatPanel() {
    const isOpen = useClaudeChatStore(s => s.isOpen)
    const toggleOpen = useClaudeChatStore(s => s.toggleOpen)
    const messageCount = useClaudeChatStore(s => s.messages.length)

    // 监听 Tauri 事件
    useClaudeEvents()

    return (
        <>
            {/* Toggle button */}
            <button
                onClick={toggleOpen}
                className={`fixed bottom-4 right-4 w-10 h-10 rounded-full flex items-center justify-center
                    transition-all z-50 shadow-lg ${
                    isOpen
                        ? 'bg-white/20 text-white'
                        : 'bg-black/80 text-white/50 hover:text-white/80 border border-white/10'
                }`}
                title="Claude AI"
            >
                {messageCount > 0 && !isOpen && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full text-[9px] flex items-center justify-center text-white">
                        {messageCount}
                    </span>
                )}
                ✦
            </button>

            {/* Chat panel */}
            {isOpen && (
                <div className="fixed bottom-16 right-4 w-80 h-[28rem] bg-[#0a0a0f]/95 backdrop-blur-sm
                    border border-white/10 rounded-lg flex flex-col z-50 shadow-2xl">
                    {/* Header */}
                    <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
                        <span className="text-xs text-white/50">Claude</span>
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
        </>
    )
})
