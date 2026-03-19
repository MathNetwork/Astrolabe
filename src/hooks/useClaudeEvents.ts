/**
 * useClaudeEvents — 监听 Claude CLI 的流式输出事件
 *
 * 使用 handleClaudeOutput 纯函数解析 JSON 流，
 * 将原始 ClaudeStreamMessage 存入 store。
 */
import { useEffect, useRef } from 'react'
import { useClaudeChatStore } from '@/stores/claudeChatStore'
import { useDataStore } from '@/stores/dataStore'
import { handleClaudeOutput } from '@/lib/claudeStreamUtils'

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

                    const action = handleClaudeOutput(data)
                    if (!action) return

                    if (action.action === 'setSessionId') {
                        store.getState().setSessionId(action.sessionId)
                    } else if (action.action === 'appendStreamMessage') {
                        store.getState().appendStreamMessage(action.message)
                    } else if (action.action === 'result') {
                        store.getState().appendStreamMessage(action.message)
                        store.getState().setStreaming(false)
                    }
                })
                if (cancelled) { u1(); return }
                listenersRef.current.push(u1)

                // claude-complete: 执行完成 → 停止流 + 触发刷新
                const u2 = await listen<ClaudeCompletePayload>('claude-complete', (event) => {
                    if (cancelled) return
                    store.getState().setStreaming(false)
                    useDataStore.getState().triggerRefresh()
                })
                if (cancelled) { u2(); return }
                listenersRef.current.push(u2)

                // claude-error: 错误
                const u3 = await listen<ClaudeErrorPayload>('claude-error', (event) => {
                    if (cancelled) return
                    const { data } = event.payload
                    if (data.includes('Error') || data.includes('error')) {
                        store.getState().appendStreamMessage({
                            type: 'result',
                            is_error: true,
                            result: data,
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
            for (const unlisten of listenersRef.current) {
                try { unlisten() } catch { /* Tauri listener cleanup race during HMR */ }
            }
            listenersRef.current = []
        }
    }, [])
}
