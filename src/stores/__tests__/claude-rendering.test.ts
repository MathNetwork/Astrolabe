/**
 * Claude 流式渲染结构测试 (TDD)
 *
 * 验证 ChatMessages 和 ToolWidgets 组件使用新的流式消息架构。
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'

// ── ChatMessages 渲染架构 ──

describe('ChatMessages 使用流式消息', () => {
    const source = fs.readFileSync('src/components/ai-chat/ChatMessages.tsx', 'utf-8')

    it('订阅 streamMessages 而不是 messages', () => {
        expect(source).toContain('streamMessages')
    })

    it('使用 filterDisplayMessages 过滤消息', () => {
        expect(source).toContain('filterDisplayMessages')
    })

    it('使用 buildToolResultMap 构建工具映射', () => {
        expect(source).toContain('buildToolResultMap')
    })

    it('按消息类型分派渲染（user/assistant/result）', () => {
        expect(source).toContain('UserMessage')
        expect(source).toContain('AssistantMessage')
        expect(source).toContain('ResultMessage')
    })

    it('assistant 消息按 block 类型渲染', () => {
        // 应该有 thinking / text / tool_use 的分支
        expect(source).toMatch(/block\.type\s*===\s*['"]thinking['"]/)
        expect(source).toMatch(/block\.type\s*===\s*['"]text['"]/)
        expect(source).toMatch(/block\.type\s*===\s*['"]tool_use['"]/)
    })
})

// ── 新的 ToolWidgets（ThinkingWidget + ToolWidget） ──

describe('流式 ToolWidgets', () => {
    const source = fs.readFileSync('src/components/ai-chat/StreamWidgets.tsx', 'utf-8')

    it('文件存在', () => {
        expect(fs.existsSync('src/components/ai-chat/StreamWidgets.tsx')).toBe(true)
    })

    it('导出 ThinkingWidget', () => {
        expect(source).toContain('ThinkingWidget')
    })

    it('导出 ToolWidget', () => {
        expect(source).toContain('ToolWidget')
    })

    it('ThinkingWidget 可折叠', () => {
        expect(source).toMatch(/expanded|collapse/)
    })

    it('ToolWidget 根据工具名显示不同 UI', () => {
        expect(source).toContain('Read')
        expect(source).toContain('Edit')
        expect(source).toContain('Bash')
    })
})

// ── useClaudeEvents 使用新的处理逻辑 ──

describe('useClaudeEvents 使用 handleClaudeOutput', () => {
    const source = fs.readFileSync('src/hooks/useClaudeEvents.ts', 'utf-8')

    it('导入 handleClaudeOutput', () => {
        expect(source).toContain('handleClaudeOutput')
    })

    it('调用 appendStreamMessage', () => {
        expect(source).toContain('appendStreamMessage')
    })
})

// ── 旧的 ToolWidgets 保持兼容 ──

describe('旧 ToolWidgets (parseClaudeActions) 保持兼容', () => {
    it('parseClaudeActions 文件仍然存在', () => {
        expect(fs.existsSync('src/lib/parseClaudeActions.ts')).toBe(true)
    })

    it('ToolWidgets 组件仍然存在', () => {
        expect(fs.existsSync('src/components/ai-chat/ToolWidgets.tsx')).toBe(true)
    })
})

// ── StreamingIndicator ──

describe('StreamingIndicator 组件', () => {
    const source = fs.readFileSync('src/components/ai-chat/ChatMessages.tsx', 'utf-8')

    it('有流式指示器（不是简单的 thinking 文字）', () => {
        // 应该有更好的 streaming indicator，不再是纯文字 "Claude is thinking..."
        expect(source).toContain('StreamingIndicator')
    })
})
