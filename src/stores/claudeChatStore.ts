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
    appendToLastAssistant: (text: string) => void
    setStreaming: (v: boolean) => void
    setSessionId: (id: string | null) => void
    setOpen: (v: boolean) => void
    toggleOpen: () => void
    clearMessages: () => void

    sendPrompt: (prompt: string, projectPath: string, userPrompt?: string) => Promise<void>
}

export const useClaudeChatStore = create<ClaudeChatState>((set, get) => ({
    messages: [],
    isStreaming: false,
    sessionId: null,
    isOpen: false,

    appendMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
    // 流式追加：如果最后一条是 assistant，追加内容而不是新建
    appendToLastAssistant: (text: string) => set((s) => {
        const last = s.messages[s.messages.length - 1]
        if (last?.role === 'assistant') {
            const updated = [...s.messages]
            updated[updated.length - 1] = { ...last, content: last.content + text }
            return { messages: updated }
        }
        return { messages: [...s.messages, { role: 'assistant' as const, content: text, timestamp: Date.now() }] }
    }),
    setStreaming: (v) => set({ isStreaming: v }),
    setSessionId: (id) => set({ sessionId: id }),
    setOpen: (v) => set({ isOpen: v }),
    toggleOpen: () => set((s) => ({ isOpen: !s.isOpen })),
    clearMessages: () => set({ messages: [], sessionId: null }),

    sendPrompt: async (prompt, projectPath, userPrompt?: string) => {
        const { appendMessage, setStreaming, sessionId } = get()

        // 显示给用户的是原始输入，不含上下文
        appendMessage({
            role: 'user',
            content: userPrompt || prompt,
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
