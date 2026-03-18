/**
 * claudeChatStore — Claude AI 聊天状态
 *
 * 存原始 ClaudeStreamMessage[]，不做文本合并。
 * 渲染层通过纯函数 filterDisplayMessages / buildToolResultMap 处理。
 */
import { create } from 'zustand'

// ── 流式消息类型（来自 Claude CLI stream-json 格式）──

export interface ContentBlock {
    type: 'text' | 'tool_use' | 'tool_result' | 'thinking'
    // text block
    text?: string
    // tool_use block
    id?: string
    name?: string
    input?: any
    // tool_result block
    tool_use_id?: string
    content?: any
    is_error?: boolean
    // thinking block
    thinking?: string
    signature?: string
}

export interface ClaudeStreamMessage {
    type: 'system' | 'assistant' | 'user' | 'result'
    subtype?: string
    session_id?: string
    message?: {
        content?: ContentBlock[]
        usage?: { input_tokens: number; output_tokens: number }
    }
    usage?: { input_tokens: number; output_tokens: number }
    cost_usd?: number
    duration_ms?: number
    result?: string
    is_error?: boolean
}

// ── 旧的 ChatMessage 类型（保留兼容，sendPrompt 用来存用户输入）──

export interface ChatMessage {
    role: 'user' | 'assistant' | 'system'
    content: string
    timestamp: number
}

interface ClaudeChatState {
    // 新：原始流消息
    streamMessages: ClaudeStreamMessage[]
    // 旧：保留给已有测试兼容
    messages: ChatMessage[]
    isStreaming: boolean
    sessionId: string | null
    isOpen: boolean

    appendStreamMessage: (msg: ClaudeStreamMessage) => void
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
    streamMessages: [],
    messages: [],
    isStreaming: false,
    sessionId: null,
    isOpen: false,

    appendStreamMessage: (msg) => set((s) => ({
        streamMessages: [...s.streamMessages, msg]
    })),
    appendMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
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
    clearMessages: () => set({ messages: [], streamMessages: [], sessionId: null }),

    sendPrompt: async (prompt, projectPath, userPrompt?: string) => {
        const { appendStreamMessage, setStreaming, sessionId } = get()

        // 用户消息存入 streamMessages
        appendStreamMessage({
            type: 'user',
            message: { content: [{ type: 'text', text: userPrompt || prompt }] }
        })

        setStreaming(true)

        try {
            const { invoke } = await import('@tauri-apps/api/core')

            if (sessionId) {
                await invoke('resume_claude_code', {
                    projectPath,
                    sessionId,
                    prompt,
                    tabId: 'main',
                })
            } else {
                await invoke('execute_claude_code', {
                    projectPath,
                    prompt,
                    tabId: 'main',
                })
            }
        } catch (e) {
            appendStreamMessage({
                type: 'result',
                is_error: true,
                result: `Error: ${e}`,
            })
            setStreaming(false)
        }
    },
}))
