/**
 * claudeChatStore — Claude AI 聊天状态
 *
 * 管理消息历史、流式状态、会话 ID。
 * 通过 Tauri command 调用本地 Claude CLI。
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

        // 添加用户消息
        appendMessage({
            role: 'user',
            content: prompt,
            timestamp: Date.now(),
        })

        setStreaming(true)

        try {
            const { invoke } = await import('@tauri-apps/api/core')
            await invoke('execute_claude_code', {
                prompt,
                projectPath,
                sessionId: sessionId || undefined,
                tabId: 'main',
            })
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
