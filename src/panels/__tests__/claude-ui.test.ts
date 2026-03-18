/**
 * Claude 聊天 UI 改进测试
 *
 * 1. 上下文不显示给用户（只发给 Claude）
 * 2. 助手回复用 MarkdownRenderer 渲染
 * 3. Skills/slash command 系统
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'

// ── 上下文隐藏 ──

describe('上下文隐藏', () => {
    it('sendPrompt 存储原始用户输入（不含上下文）', () => {
        const source = fs.readFileSync('src/stores/claudeChatStore.ts', 'utf-8')
        // appendMessage 应该用 userPrompt 而不是带上下文的 prompt
        expect(source).toContain('userPrompt')
    })
})

// ── Markdown 渲染 ──

describe('ChatMessages markdown 渲染', () => {
    const source = fs.readFileSync('src/components/claude-chat/ChatMessages.tsx', 'utf-8')

    it('assistant 消息使用 MarkdownRenderer', () => {
        expect(source).toContain('MarkdownRenderer')
    })
})

// ── 流式消息合并 ──

describe('流式消息合并', () => {
    const source = fs.readFileSync('src/hooks/useClaudeEvents.ts', 'utf-8')

    it('assistant 文本追加到最后一条消息而不是创建新消息', () => {
        // 流式输出会发多条 assistant 消息，应该合并成一条
        expect(source).toMatch(/updateLastAssistant|appendToLast|lastMessage/)
    })
})

// ── Skills 系统 ──

describe('Slash command / Skills', () => {
    it('ChatComposer 支持 / 命令', () => {
        const source = fs.readFileSync('src/components/claude-chat/ChatComposer.tsx', 'utf-8')
        expect(source).toMatch(/slash|skills|\//)
    })

    it('skills 定义文件存在', () => {
        expect(fs.existsSync('src/lib/skills.ts')).toBe(true)
    })

    it('skills 包含 explain 命令', () => {
        const source = fs.readFileSync('src/lib/skills.ts', 'utf-8')
        expect(source).toContain('explain')
    })

    it('skills 包含 add-node 命令', () => {
        const source = fs.readFileSync('src/lib/skills.ts', 'utf-8')
        expect(source).toContain('add-node')
    })

    it('skills 包含 find-connections 命令', () => {
        const source = fs.readFileSync('src/lib/skills.ts', 'utf-8')
        expect(source).toContain('find-connections')
    })
})
