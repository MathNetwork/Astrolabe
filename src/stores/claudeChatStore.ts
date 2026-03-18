/**
 * claudeChatStore — Claude AI 聊天状态
 *
 * 直接复用 claude-prism 的 Tauri command 调用方式。
 */
import { create } from 'zustand'

export interface ChatMessage {
    role: 'user' | 'assistant' | 'system'
    content: string
    timestamp: number
}

interface ClaudeChatState {
    messages: ChatMessage[]
    isStreaming: boolean
    sessionId: string | null
    isOpen: boolean

    appendMessage: (msg: ChatMessage) => void
    setStreaming: (v: boolean) => void
    setSessionId: (id: string | null) => void
    setOpen: (v: boolean) => void
    toggleOpen: () => void
    clearMessages: () => void

    sendPrompt: (prompt: string, projectPath: string) => Promise<void>
}

export const useClaudeChatStore = create<ClaudeChatState>((set, get) => ({
    messages: [],
    isStreaming: false,
    sessionId: null,
    isOpen: false,

    appendMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
    setStreaming: (v) => set({ isStreaming: v }),
    setSessionId: (id) => set({ sessionId: id }),
    setOpen: (v) => set({ isOpen: v }),
    toggleOpen: () => set((s) => ({ isOpen: !s.isOpen })),
    clearMessages: () => set({ messages: [], sessionId: null }),

    sendPrompt: async (prompt, projectPath) => {
        const { appendMessage, setStreaming, sessionId } = get()

        appendMessage({
            role: 'user',
            content: prompt,
            timestamp: Date.now(),
        })

        setStreaming(true)

        try {
            const { invoke } = await import('@tauri-apps/api/core')

            if (sessionId) {
                // 继续已有会话
                await invoke('resume_claude_code', {
                    projectPath,
                    sessionId,
                    prompt,
                    tabId: 'main',
                })
            } else {
                // 新会话
                await invoke('execute_claude_code', {
                    projectPath,
                    prompt,
                    tabId: 'main',
                })
            }
        } catch (e) {
            appendMessage({
                role: 'system',
                content: `Error: ${e}`,
                timestamp: Date.now(),
            })
            setStreaming(false)
        }
    },
}))
