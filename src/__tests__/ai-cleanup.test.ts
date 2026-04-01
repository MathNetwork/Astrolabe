/**
 * AI cleanup tests — verify all AI chat code is removed.
 *
 * Astrolabe is a pure visualization tool. AI interaction happens
 * in the terminal via Claude Code, not in the app.
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

function allTsFiles(dir: string): string[] {
    const results: string[] = []
    if (!fs.existsSync(dir)) return results
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules' && entry.name !== '__tests__') {
            results.push(...allTsFiles(full))
        } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
            results.push(full)
        }
    }
    return results
}

const srcFiles = allTsFiles('src')

describe('AI chat UI removed', () => {
    it('ai-chat directory does not exist', () => {
        expect(fs.existsSync('src/components/ai-chat')).toBe(false)
    })

    it('claudeChatStore does not exist', () => {
        expect(fs.existsSync('src/stores/claudeChatStore.ts')).toBe(false)
    })

    it('useClaudeEvents does not exist', () => {
        expect(fs.existsSync('src/hooks/useClaudeEvents.ts')).toBe(false)
    })

    it('claudeStreamUtils does not exist', () => {
        expect(fs.existsSync('src/lib/claudeStreamUtils.ts')).toBe(false)
    })
})

describe('No imports of deleted AI files in src/', () => {
    it('no ChatPanel import', () => {
        for (const f of srcFiles) {
            expect(fs.readFileSync(f, 'utf-8'), f).not.toContain('ChatPanel')
        }
    })

    it('no claudeChatStore import', () => {
        for (const f of srcFiles) {
            expect(fs.readFileSync(f, 'utf-8'), f).not.toContain('claudeChatStore')
        }
    })

    it('no useClaudeEvents import', () => {
        for (const f of srcFiles) {
            expect(fs.readFileSync(f, 'utf-8'), f).not.toContain('useClaudeEvents')
        }
    })
})
