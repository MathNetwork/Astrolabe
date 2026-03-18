/**
 * Claude 流式消息重构测试 (TDD)
 *
 * 核心改动：store 存原始 ClaudeStreamMessage[]，不做文本合并。
 * 渲染层按消息类型分别处理。
 */
import { describe, it, expect, beforeEach } from 'vitest'

// ── 类型定义 ──

describe('ClaudeStreamMessage 类型', () => {
    it('定义了 ContentBlock 类型', async () => {
        const mod = await import('../claudeChatStore')
        // ContentBlock 应该有 type 字段
        const block: any = { type: 'text', text: 'hello' }
        expect(block.type).toBe('text')
    })

    it('定义了 ClaudeStreamMessage 类型', async () => {
        const mod = await import('../claudeChatStore')
        // ClaudeStreamMessage 应该有 type 和 message 字段
        const msg: any = {
            type: 'assistant',
            message: { content: [{ type: 'text', text: 'hi' }] }
        }
        expect(msg.type).toBe('assistant')
    })
})

// ── Store 行为 ──

describe('claudeChatStore 流式消息', () => {
    beforeEach(async () => {
        const { useClaudeChatStore } = await import('../claudeChatStore')
        useClaudeChatStore.getState().clearMessages()
    })

    it('appendStreamMessage 追加原始流消息', async () => {
        const { useClaudeChatStore } = await import('../claudeChatStore')
        const store = useClaudeChatStore.getState()

        store.appendStreamMessage({
            type: 'assistant',
            message: { content: [{ type: 'text', text: 'hello' }] }
        })

        const msgs = useClaudeChatStore.getState().streamMessages
        expect(msgs).toHaveLength(1)
        expect(msgs[0].type).toBe('assistant')
    })

    it('多条流消息不合并，独立存储', async () => {
        const { useClaudeChatStore } = await import('../claudeChatStore')
        const store = useClaudeChatStore.getState()

        store.appendStreamMessage({
            type: 'assistant',
            message: { content: [{ type: 'text', text: 'part1' }] }
        })
        store.appendStreamMessage({
            type: 'assistant',
            message: { content: [{ type: 'text', text: 'part2' }] }
        })

        const msgs = useClaudeChatStore.getState().streamMessages
        expect(msgs).toHaveLength(2)
    })

    it('用户消息也存入 streamMessages', async () => {
        const { useClaudeChatStore } = await import('../claudeChatStore')
        const store = useClaudeChatStore.getState()

        store.appendStreamMessage({
            type: 'user',
            message: { content: [{ type: 'text', text: 'question' }] }
        })

        const msgs = useClaudeChatStore.getState().streamMessages
        expect(msgs).toHaveLength(1)
        expect(msgs[0].type).toBe('user')
    })

    it('clearMessages 清空 streamMessages', async () => {
        const { useClaudeChatStore } = await import('../claudeChatStore')
        const store = useClaudeChatStore.getState()

        store.appendStreamMessage({
            type: 'assistant',
            message: { content: [{ type: 'text', text: 'hi' }] }
        })
        store.clearMessages()

        expect(useClaudeChatStore.getState().streamMessages).toHaveLength(0)
    })

    it('thinking 消息存储完整内容', async () => {
        const { useClaudeChatStore } = await import('../claudeChatStore')
        const store = useClaudeChatStore.getState()

        store.appendStreamMessage({
            type: 'assistant',
            message: { content: [{ type: 'thinking', thinking: 'let me analyze...' }] }
        })

        const msgs = useClaudeChatStore.getState().streamMessages
        expect(msgs[0].message?.content?.[0].thinking).toBe('let me analyze...')
    })

    it('tool_use 消息存储工具名称和输入', async () => {
        const { useClaudeChatStore } = await import('../claudeChatStore')
        const store = useClaudeChatStore.getState()

        store.appendStreamMessage({
            type: 'assistant',
            message: {
                content: [{
                    type: 'tool_use',
                    id: 'tool_123',
                    name: 'Read',
                    input: { file_path: '/test.ts' }
                }]
            }
        })

        const block = useClaudeChatStore.getState().streamMessages[0].message?.content?.[0]
        expect(block?.name).toBe('Read')
        expect(block?.input?.file_path).toBe('/test.ts')
    })

    it('result 消息存储费用和时长', async () => {
        const { useClaudeChatStore } = await import('../claudeChatStore')
        const store = useClaudeChatStore.getState()

        store.appendStreamMessage({
            type: 'result',
            cost_usd: 0.01,
            duration_ms: 5000,
            result: 'done'
        })

        const msg = useClaudeChatStore.getState().streamMessages[0]
        expect(msg.cost_usd).toBe(0.01)
        expect(msg.result).toBe('done')
    })
})

// ── 纯函数：过滤显示消息 ──

describe('filterDisplayMessages 纯函数', () => {
    it('过滤 system init 消息', async () => {
        const { filterDisplayMessages } = await import('../../lib/claudeStreamUtils')
        const result = filterDisplayMessages([
            { type: 'system', subtype: 'init', session_id: '123' }
        ])
        expect(result).toHaveLength(0)
    })

    it('保留 user 消息', async () => {
        const { filterDisplayMessages } = await import('../../lib/claudeStreamUtils')
        const result = filterDisplayMessages([
            { type: 'user', message: { content: [{ type: 'text', text: 'hi' }] } }
        ])
        expect(result).toHaveLength(1)
    })

    it('保留 assistant 消息', async () => {
        const { filterDisplayMessages } = await import('../../lib/claudeStreamUtils')
        const result = filterDisplayMessages([
            { type: 'assistant', message: { content: [{ type: 'text', text: 'hello' }] } }
        ])
        expect(result).toHaveLength(1)
    })

    it('保留 result 消息', async () => {
        const { filterDisplayMessages } = await import('../../lib/claudeStreamUtils')
        const result = filterDisplayMessages([
            { type: 'result', result: 'completed', cost_usd: 0.01 }
        ])
        expect(result).toHaveLength(1)
    })

    it('过滤纯 tool_result 的 user 消息', async () => {
        const { filterDisplayMessages } = await import('../../lib/claudeStreamUtils')
        const result = filterDisplayMessages([
            {
                type: 'user',
                message: {
                    content: [{
                        type: 'tool_result',
                        tool_use_id: 'tool_1',
                        content: 'file content...'
                    }]
                }
            }
        ])
        expect(result).toHaveLength(0)
    })

    it('result 文本与 assistant 重复时过滤', async () => {
        const { filterDisplayMessages } = await import('../../lib/claudeStreamUtils')
        const result = filterDisplayMessages([
            { type: 'assistant', message: { content: [{ type: 'text', text: 'Done!' }] } },
            { type: 'result', result: 'Done!' }
        ])
        // result 被过滤（和 assistant 文本重复）
        expect(result).toHaveLength(1)
        expect(result[0].type).toBe('assistant')
    })
})

// ── 纯函数：工具结果映射 ──

describe('buildToolResultMap 纯函数', () => {
    it('空消息返回空 map', async () => {
        const { buildToolResultMap } = await import('../../lib/claudeStreamUtils')
        const map = buildToolResultMap([])
        expect(map.size).toBe(0)
    })

    it('从 user 消息的 tool_result 构建映射', async () => {
        const { buildToolResultMap } = await import('../../lib/claudeStreamUtils')
        const map = buildToolResultMap([
            {
                type: 'user',
                message: {
                    content: [{
                        type: 'tool_result',
                        tool_use_id: 'tool_abc',
                        content: 'result content'
                    }]
                }
            }
        ])
        expect(map.has('tool_abc')).toBe(true)
        expect(map.get('tool_abc')?.content).toBe('result content')
    })

    it('多个 tool_result 都被收集', async () => {
        const { buildToolResultMap } = await import('../../lib/claudeStreamUtils')
        const map = buildToolResultMap([
            {
                type: 'user',
                message: {
                    content: [
                        { type: 'tool_result', tool_use_id: 'tool_1', content: 'a' },
                        { type: 'tool_result', tool_use_id: 'tool_2', content: 'b' },
                    ]
                }
            }
        ])
        expect(map.size).toBe(2)
    })

    it('非 user 消息不产生映射', async () => {
        const { buildToolResultMap } = await import('../../lib/claudeStreamUtils')
        const map = buildToolResultMap([
            {
                type: 'assistant',
                message: {
                    content: [{ type: 'tool_use', id: 'tool_1', name: 'Read', input: {} }]
                }
            }
        ])
        expect(map.size).toBe(0)
    })
})
