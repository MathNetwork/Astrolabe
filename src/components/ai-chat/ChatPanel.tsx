'use client'

/**
 * AI Chat — collapsible side panel
 */
import { memo } from 'react'
import { useClaudeChatStore } from '@/stores/claudeChatStore'
import { useClaudeEvents } from '@/hooks/useClaudeEvents'
import { ChatMessages } from './ChatMessages'
import { ChatComposer } from './ChatComposer'

export const ChatPanel = memo(function ChatPanel() {
    useClaudeEvents()

    return (
        <div className="h-full flex flex-col bg-[#0a0a0f]">
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 shrink-0">
                <span className="text-xs text-white/50">AI Chat</span>
                <button onClick={() => useClaudeChatStore.getState().clearMessages()}
                    className="text-[10px] text-white/20 hover:text-white/50 transition-colors">Clear</button>
            </div>
            <ChatMessages />
            <ChatComposer />
        </div>
    )
})
