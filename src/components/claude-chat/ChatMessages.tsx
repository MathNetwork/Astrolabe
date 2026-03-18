'use client'

import { memo, useRef, useEffect } from 'react'
import { useClaudeChatStore, type ChatMessage } from '@/stores/claudeChatStore'
import MarkdownRenderer from '@/components/MarkdownRenderer'
import { ToolWidgets } from './ToolWidgets'

export const ChatMessages = memo(function ChatMessages() {
    const messages = useClaudeChatStore(s => s.messages)
    const isStreaming = useClaudeChatStore(s => s.isStreaming)
    const scrollRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages])

    return (
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.length === 0 && (
                <div className="text-center text-white/20 text-sm py-8">
                    Ask Claude about your knowledge graph
                </div>
            )}
            {messages.map((msg, i) => (
                <MessageBubble key={i} message={msg} />
            ))}
            {isStreaming && (
                <div className="text-white/30 text-sm animate-pulse">Claude is thinking...</div>
            )}
        </div>
    )
})

function MessageBubble({ message }: { message: ChatMessage }) {
    const isUser = message.role === 'user'
    const isSystem = message.role === 'system'

    return (
        <div className={`${isUser ? 'ml-8' : 'mr-4'}`}>
            <div className={`rounded-lg px-3 py-2 text-sm ${
                isUser
                    ? 'bg-white/10 text-white/80'
                    : isSystem
                    ? 'bg-red-500/10 text-red-400/80'
                    : 'text-white/70'
            }`}>
                {isUser ? (
                    <div className="whitespace-pre-wrap">{message.content}</div>
                ) : (
                    <>
                        <MarkdownRenderer content={message.content} className="text-sm" />
                        <ToolWidgets content={message.content} />
                    </>
                )}
            </div>
        </div>
    )
}
