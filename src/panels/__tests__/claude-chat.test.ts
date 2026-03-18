/**
 * Claude AI 聊天集成测试
 *
 * Phase 1: 基础聊天
 * - 聊天 store（messages, streaming, sessionId）
 * - 浮动聊天面板组件
 * - 事件监听 hook
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'

// ── 聊天 Store ──

describe('Claude 聊天 Store', () => {
    const source = fs.readFileSync('src/stores/claudeChatStore.ts', 'utf-8')

    it('store 文件存在', () => {
        expect(fs.existsSync('src/stores/claudeChatStore.ts')).toBe(true)
    })

    it('有 messages 状态', () => {
        expect(source).toContain('messages')
    })

    it('有 isStreaming 状态', () => {
        expect(source).toContain('isStreaming')
    })

    it('有 sessionId 状态', () => {
        expect(source).toContain('sessionId')
    })

    it('有 sendPrompt action', () => {
        expect(source).toContain('sendPrompt')
    })

    it('有 appendMessage action', () => {
        expect(source).toContain('appendMessage')
    })

    it('使用 zustand', () => {
        expect(source).toContain('create')
    })
})

// ── 聊天组件 ──

describe('Claude 聊天组件', () => {
    it('ChatMessages 组件存在', () => {
        expect(fs.existsSync('src/components/claude-chat/ChatMessages.tsx')).toBe(true)
    })

    it('ChatComposer 组件存在', () => {
        expect(fs.existsSync('src/components/claude-chat/ChatComposer.tsx')).toBe(true)
    })
})

// ── InspectorPanel 集成聊天 ──

describe('InspectorPanel 集成 Claude 聊天', () => {
    const source = fs.readFileSync('src/panels/inspector/InspectorPanel.tsx', 'utf-8')

    it('包含 ChatMessages', () => {
        expect(source).toContain('ChatMessages')
    })

    it('包含 ChatComposer', () => {
        expect(source).toContain('ChatComposer')
    })

    it('订阅 claudeChatStore', () => {
        expect(source).toContain('claudeChatStore')
    })

    it('可展开/折叠', () => {
        expect(source).toMatch(/expanded|collapse/)
    })
})

// ── 事件监听 ──

describe('Claude 事件监听', () => {
    it('useClaudeEvents hook 存在', () => {
        expect(fs.existsSync('src/hooks/useClaudeEvents.ts')).toBe(true)
    })

    it('监听 tauri 事件', () => {
        const source = fs.readFileSync('src/hooks/useClaudeEvents.ts', 'utf-8')
        expect(source).toMatch(/claude-output|claude-complete|claude-error/)
    })

    it('调用 appendStreamMessage', () => {
        const source = fs.readFileSync('src/hooks/useClaudeEvents.ts', 'utf-8')
        expect(source).toContain('appendStreamMessage')
    })
})

// ── Rust 端 ──

describe('Rust Claude 集成', () => {
    it('claude.rs 存在', () => {
        expect(fs.existsSync('src-tauri/src/claude.rs')).toBe(true)
    })

    it('claude.rs 有 execute 命令', () => {
        const source = fs.readFileSync('src-tauri/src/claude.rs', 'utf-8')
        expect(source).toContain('execute_claude')
    })

    it('claude.rs 有 find_claude_binary', () => {
        const source = fs.readFileSync('src-tauri/src/claude.rs', 'utf-8')
        expect(source).toContain('find_claude_binary')
    })

    it('lib.rs 注册了 claude 命令', () => {
        const source = fs.readFileSync('src-tauri/src/lib.rs', 'utf-8')
        expect(source).toContain('execute_claude')
    })
})
