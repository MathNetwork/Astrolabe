'use client'

import { memo, useState, useCallback } from 'react'
import { useClaudeChatStore } from '@/stores/claudeChatStore'

export const ChatComposer = memo(function ChatComposer() {
    const [input, setInput] = useState('')
    const isStreaming = useClaudeChatStore(s => s.isStreaming)
    const sendPrompt = useClaudeChatStore(s => s.sendPrompt)

    const handleSend = useCallback(() => {
        const text = input.trim()
        if (!text || isStreaming) return

        // 从 URL 获取项目路径
        const projectPath = new URLSearchParams(window.location.search).get('path') || ''
        sendPrompt(text, projectPath)
        setInput('')
    }, [input, isStreaming, sendPrompt])

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }, [handleSend])

    return (
        <div className="border-t border-white/10 p-2">
            <div className="flex gap-2">
                <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask Claude..."
                    disabled={isStreaming}
                    rows={1}
                    className="flex-1 bg-white/5 text-white/80 text-xs rounded px-3 py-2 resize-none
                        placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-white/20
                        disabled:opacity-50"
                />
                <button
                    onClick={handleSend}
                    disabled={isStreaming || !input.trim()}
                    className="px-3 py-2 bg-white/10 rounded text-xs text-white/60
                        hover:bg-white/15 hover:text-white/80 disabled:opacity-30 transition-colors"
                >
                    ↑
                </button>
            </div>
        </div>
    )
})
