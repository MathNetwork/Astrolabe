/**
 * claudeStreamUtils — 流式消息处理纯函数
 *
 * 从 ClaudeStreamMessage[] 中提取显示用消息、构建工具结果映射。
 */
import type { ClaudeStreamMessage, ContentBlock } from '@/stores/claudeChatStore'

/** 过滤出需要显示的消息 */
export function filterDisplayMessages(messages: ClaudeStreamMessage[]): ClaudeStreamMessage[] {
    // 收集所有 assistant text，用于去重 result
    const assistantTexts = new Set<string>()
    for (const msg of messages) {
        if (msg.type === 'assistant' && Array.isArray(msg.message?.content)) {
            for (const block of msg.message.content) {
                if (block.type === 'text' && block.text) {
                    assistantTexts.add(block.text.trim())
                }
            }
        }
    }

    return messages.filter((msg) => {
        // 过滤 system init
        if (msg.type === 'system' && msg.subtype === 'init') return false
        // 只显示 user / assistant / result
        if (msg.type !== 'user' && msg.type !== 'assistant' && msg.type !== 'result') return false
        // 过滤纯 tool_result 的 user 消息
        if (msg.type === 'user' && Array.isArray(msg.message?.content)) {
            const hasOnlyToolResults = msg.message.content.every(
                (b) => b.type === 'tool_result'
            )
            if (hasOnlyToolResults) return false
        }
        // result 文本与 assistant 重复时过滤
        if (msg.type === 'result' && msg.result) {
            if (assistantTexts.has(msg.result.trim())) return false
        }
        return true
    })
}

/** 构建 tool_use_id → tool_result 映射 */
export function buildToolResultMap(messages: ClaudeStreamMessage[]): Map<string, ContentBlock> {
    const map = new Map<string, ContentBlock>()
    for (const msg of messages) {
        if (msg.type === 'user' && Array.isArray(msg.message?.content)) {
            for (const block of msg.message.content) {
                if (block.type === 'tool_result' && block.tool_use_id) {
                    map.set(block.tool_use_id, block)
                }
            }
        }
    }
    return map
}

// ── 事件处理 ──

export type ClaudeOutputAction =
    | { action: 'setSessionId'; sessionId: string }
    | { action: 'appendStreamMessage'; message: ClaudeStreamMessage }
    | { action: 'result'; message: ClaudeStreamMessage }

/** 解析 Claude CLI 的 JSON 流输出，返回要执行的 store 操作 */
export function handleClaudeOutput(data: string): ClaudeOutputAction | null {
    let msg: any
    try { msg = JSON.parse(data) } catch { return null }

    // system init → 提取 session_id
    if (msg.type === 'system' && msg.subtype === 'init' && msg.session_id) {
        return { action: 'setSessionId', sessionId: msg.session_id }
    }

    // system 非 init → 忽略
    if (msg.type === 'system') return null

    // assistant → 需要有 content 且非空
    if (msg.type === 'assistant') {
        const content = msg.message?.content
        if (!Array.isArray(content) || content.length === 0) return null
        return { action: 'appendStreamMessage', message: msg as ClaudeStreamMessage }
    }

    // user (tool_result) → 存储
    if (msg.type === 'user') {
        return { action: 'appendStreamMessage', message: msg as ClaudeStreamMessage }
    }

    // result → 存储 + 标记流结束
    if (msg.type === 'result') {
        return { action: 'result', message: msg as ClaudeStreamMessage }
    }

    return null
}
