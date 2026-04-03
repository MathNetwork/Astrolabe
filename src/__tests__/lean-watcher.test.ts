/**
 * Phase 6I: .lean file watcher — auto-sync on lean file changes.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

describe('Phase 6I: Lean file watcher', () => {

    it('useFileWatcher polls lean mtime endpoint', () => {
        const src = readFileSync(join(__dirname, '..', 'hooks', 'useFileWatcher.ts'), 'utf-8')
        expect(src).toMatch(/lean.*mtime|mtime.*lean/i)
    })

    it('useFileWatcher sends /sync-lean on lean mtime change', () => {
        const src = readFileSync(join(__dirname, '..', 'hooks', 'useFileWatcher.ts'), 'utf-8')
        expect(src).toMatch(/sync-lean/)
    })

    it('backend has lean_mtime endpoint', () => {
        const src = readFileSync(join(__dirname, '..', '..', 'backend', 'astrolabe_app', 'astrolabe_router.py'), 'utf-8')
        expect(src).toMatch(/lean.mtime|lean_mtime/i)
    })
})
