/**
 * useClaudeEvents — 监听 Claude CLI 的流式输出事件
 *
 * Tauri 事件：
 *   claude-output   → 流式消息（逐行 JSON）
 *   claude-complete  → 执行完成
 *   claude-error     → 执行出错
 */
import { useEffect } from 'react'
import { useClaudeChatStore } from '@/stores/claudeChatStore'

export function useClaudeEvents() {
    const appendMessage = useClaudeChatStore(s => s.appendMessage)
    const setStreaming = useClaudeChatStore(s => s.setStreaming)
    const setSessionId = useClaudeChatStore(s => s.setSessionId)

    useEffect(() => {
        let unlisten: (() => void)[] = []

        async function setup() {
            try {
                const { listen } = await import('@tauri-apps/api/event')

                const u1 = await listen<any>('claude-output', (event) => {
                    const data = event.payload
                    if (!data) return

                    // 解析流式 JSON 消息
                    if (data.type === 'assistant' && data.message?.content) {
                        const textBlocks = data.message.content
                            .filter((b: any) => b.type === 'text')
                            .map((b: any) => b.text)
                            .join('')

                        if (textBlocks) {
                            appendMessage({
                                role: 'assistant',
                                content: textBlocks,
                                timestamp: Date.now(),
                            })
                        }
                    }

                    // 捕获 session ID
                    if (data.session_id) {
                        setSessionId(data.session_id)
                    }
                })

                const u2 = await listen<any>('claude-complete', () => {
                    setStreaming(false)
                })

                const u3 = await listen<any>('claude-error', (event) => {
                    appendMessage({
                        role: 'system',
                        content: `Error: ${event.payload}`,
                        timestamp: Date.now(),
                    })
                    setStreaming(false)
                })

                unlisten = [u1, u2, u3]
            } catch {
                // Not in Tauri environment (browser mode)
            }
        }

        setup()
        return () => { unlisten.forEach(fn => fn()) }
    }, [appendMessage, setStreaming, setSessionId])
}
