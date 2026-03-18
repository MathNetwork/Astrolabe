/**
 * useClaudeEvents — 监听 Claude CLI 的流式输出事件
 *
 * 事件格式（来自 claude.rs）：
 *   claude-output:   { tab_id: string, data: string }  (data 是 JSON 字符串)
 *   claude-complete: { tab_id: string, success: boolean }
 *   claude-error:    { tab_id: string, data: string }
 *
 * data JSON 结构（Claude stream-json 格式）：
 *   { type: "system", subtype: "init", session_id: "..." }
 *   { type: "assistant", message: { content: [{ type: "text", text: "..." }] } }
 *   { type: "result", cost_usd: 0.01, ... }
 */
import { useEffect, useRef } from 'react'
import { useClaudeChatStore } from '@/stores/claudeChatStore'

interface ClaudeOutputPayload {
    tab_id: string
    data: string
}

interface ClaudeCompletePayload {
    tab_id: string
    success: boolean
}

interface ClaudeErrorPayload {
    tab_id: string
    data: string
}

export function useClaudeEvents() {
    const listenersRef = useRef<(() => void)[]>([])

    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                const { listen } = await import('@tauri-apps/api/event')
                const store = useClaudeChatStore

                // claude-output: 流式消息
                const u1 = await listen<ClaudeOutputPayload>('claude-output', (event) => {
                    if (cancelled) return
                    const { data } = event.payload

                    let msg: any
                    try { msg = JSON.parse(data) } catch { return }

                    // 提取 session_id
                    if (msg.type === 'system' && msg.subtype === 'init' && msg.session_id) {
                        store.getState().setSessionId(msg.session_id)
                    }

                    // assistant 消息：提取 text 内容
                    if (msg.type === 'assistant' && msg.message?.content) {
                        const texts = msg.message.content
                            .filter((b: any) => b.type === 'text')
                            .map((b: any) => b.text)
                            .join('')

                        if (texts) {
                            store.getState().appendMessage({
                                role: 'assistant',
                                content: texts,
                                timestamp: Date.now(),
                            })
                        }
                    }

                    // result 消息：流结束
                    if (msg.type === 'result') {
                        store.getState().setStreaming(false)
                    }
                })
                if (cancelled) { u1(); return }
                listenersRef.current.push(u1)

                // claude-complete: 执行完成
                const u2 = await listen<ClaudeCompletePayload>('claude-complete', (event) => {
                    if (cancelled) return
                    store.getState().setStreaming(false)
                })
                if (cancelled) { u2(); return }
                listenersRef.current.push(u2)

                // claude-error: 错误
                const u3 = await listen<ClaudeErrorPayload>('claude-error', (event) => {
                    if (cancelled) return
                    const { data } = event.payload
                    if (data.includes('Error') || data.includes('error')) {
                        store.getState().appendMessage({
                            role: 'system',
                            content: data,
                            timestamp: Date.now(),
                        })
                    }
                })
                if (cancelled) { u3(); return }
                listenersRef.current.push(u3)

            } catch {
                // Not in Tauri environment
            }
        })()

        return () => {
            cancelled = true
            for (const unlisten of listenersRef.current) unlisten()
            listenersRef.current = []
        }
    }, [])
}
