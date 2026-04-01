/**
 * Claude Code 状态检测测试 (TDD)
 *
 * 前端调用 Rust check_claude_status，显示版本和认证状态。
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'

// ── 首页环境状态 ──

describe('首页 Claude Code 状态', () => {
    const source = fs.readFileSync('src/app/page.tsx', 'utf-8')

    it('Tauri 模式下显示环境状态区域', () => {
        expect(source).toContain('EnvironmentStatus')
    })

    it('调用 check_claude_status', () => {
        expect(source).toContain('check_claude_status')
    })

    it('显示 Claude Code 标签', () => {
        expect(source).toContain('Claude Code')
    })
})

// ── ClaudeStatus 类型 ──

describe('ClaudeStatus 类型', () => {
    it('定义了 ClaudeStatus 接口', () => {
        const source = fs.readFileSync('src/app/page.tsx', 'utf-8')
        expect(source).toContain('ClaudeStatus')
    })

    it('包含 installed/authenticated/version/account_email 字段', () => {
        const source = fs.readFileSync('src/app/page.tsx', 'utf-8')
        expect(source).toContain('installed')
        expect(source).toContain('authenticated')
        expect(source).toContain('version')
        expect(source).toContain('account_email')
    })
})

// ── 状态展示逻辑 ──

describe('状态展示逻辑', () => {
    const source = fs.readFileSync('src/app/page.tsx', 'utf-8')

    it('未安装时显示 Not installed', () => {
        expect(source).toContain('Not installed')
    })

    it('未认证时显示 Not authenticated', () => {
        expect(source).toContain('Not authenticated')
    })

    it('就绪时显示版本和邮箱', () => {
        // 版本和邮箱应该动态显示
        expect(source).toMatch(/version|account_email/)
    })
})

// ── Rust 端已有 ──

describe('Rust check_claude_status 命令', () => {
    it('claude.rs 导出 check_claude_status', () => {
        const source = fs.readFileSync('src-tauri/src/claude.rs', 'utf-8')
        expect(source).toContain('check_claude_status')
    })

    it('lib.rs 注册了 check_claude_status', () => {
        const source = fs.readFileSync('src-tauri/src/lib.rs', 'utf-8')
        expect(source).toContain('check_claude_status')
    })
})
