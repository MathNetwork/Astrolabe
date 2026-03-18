/**
 * Claude 事件处理逻辑测试 (TDD)
 *
 * 测试 handleClaudeOutput 纯函数：
 * 解析 Claude CLI 的 JSON 流输出，返回要执行的 store 操作。
 */
import { describe, it, expect } from 'vitest'

describe('handleClaudeOutput 纯函数', () => {
    let handleClaudeOutput: (data: string) => any

    beforeAll(async () => {
        const mod = await import('../../lib/claudeStreamUtils')
        handleClaudeOutput = mod.handleClaudeOutput
    })

    it('无效 JSON 返回 null', () => {
        expect(handleClaudeOutput('not json')).toBeNull()
    })

    it('system init 返回 setSessionId 动作', () => {
        const result = handleClaudeOutput(JSON.stringify({
            type: 'system',
            subtype: 'init',
            session_id: 'sess_123'
        }))
        expect(result).toEqual({
            action: 'setSessionId',
            sessionId: 'sess_123'
        })
    })

    it('assistant text 消息返回 appendStreamMessage 动作', () => {
        const result = handleClaudeOutput(JSON.stringify({
            type: 'assistant',
            message: { content: [{ type: 'text', text: 'hello' }] }
        }))
        expect(result?.action).toBe('appendStreamMessage')
        expect(result?.message.type).toBe('assistant')
    })

    it('assistant thinking 消息返回 appendStreamMessage 动作', () => {
        const result = handleClaudeOutput(JSON.stringify({
            type: 'assistant',
            message: { content: [{ type: 'thinking', thinking: 'let me think...' }] }
        }))
        expect(result?.action).toBe('appendStreamMessage')
        expect(result?.message.message.content[0].type).toBe('thinking')
    })

    it('assistant tool_use 消息返回 appendStreamMessage 动作', () => {
        const result = handleClaudeOutput(JSON.stringify({
            type: 'assistant',
            message: {
                content: [{
                    type: 'tool_use',
                    id: 'tool_1',
                    name: 'Read',
                    input: { file_path: '/test.ts' }
                }]
            }
        }))
        expect(result?.action).toBe('appendStreamMessage')
        expect(result?.message.message.content[0].name).toBe('Read')
    })

    it('user tool_result 消息返回 appendStreamMessage 动作', () => {
        const result = handleClaudeOutput(JSON.stringify({
            type: 'user',
            message: {
                content: [{
                    type: 'tool_result',
                    tool_use_id: 'tool_1',
                    content: 'file content...'
                }]
            }
        }))
        expect(result?.action).toBe('appendStreamMessage')
        expect(result?.message.type).toBe('user')
    })

    it('result 消息返回 appendStreamMessage + setStreaming false', () => {
        const result = handleClaudeOutput(JSON.stringify({
            type: 'result',
            cost_usd: 0.01,
            duration_ms: 5000,
            result: 'completed'
        }))
        expect(result?.action).toBe('result')
        expect(result?.message.cost_usd).toBe(0.01)
    })

    it('空 content 的 assistant 消息返回 null', () => {
        const result = handleClaudeOutput(JSON.stringify({
            type: 'assistant',
            message: { content: [] }
        }))
        expect(result).toBeNull()
    })

    it('system 非 init 消息返回 null', () => {
        const result = handleClaudeOutput(JSON.stringify({
            type: 'system',
            subtype: 'other'
        }))
        expect(result).toBeNull()
    })
})
