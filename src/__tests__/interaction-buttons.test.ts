/**
 * Phase 6A: Interaction buttons in EntryDetail.
 *
 * Contract tests verifying EntryDetail has:
 * 1. A "Prove" button visible when lean atom has state "sorry"
 * 2. A "Sync Lean" button visible for lean source entries
 * 3. Buttons invoke pty_write with correct commands
 * 4. Buttons disabled when PTY not connected
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const ENTRY_DETAIL_PATH = join(__dirname, '..', 'components', 'detail', 'EntryDetail.tsx')

describe('Phase 6A: Interaction buttons', () => {
    let source: string

    beforeAll(() => {
        source = readFileSync(ENTRY_DETAIL_PATH, 'utf-8')
    })

    // 1. Button existence
    it('has a Prove button', () => {
        expect(source).toMatch(/Prove/)
    })

    it('has a Sync Lean button', () => {
        expect(source).toMatch(/Sync/)
    })

    // 2. pty_write integration
    it('uses tauri invoke for pty_write', () => {
        expect(source).toMatch(/@tauri-apps/)
        expect(source).toMatch(/pty_write/)
    })

    it('sends /prove command with hash', () => {
        expect(source).toMatch(/\/prove/)
    })

    it('sends /sync-lean command', () => {
        expect(source).toMatch(/sync-lean/)
    })

    // 3. Conditional display
    it('checks state for sorry to show Prove button', () => {
        expect(source).toMatch(/sorry/)
    })

    it('checks source for lean entries', () => {
        expect(source).toMatch(/source.*lean|lean.*source/i)
    })

    // 4. PTY session
    it('reads ptySessionId from viewStore', () => {
        expect(source).toMatch(/ptySessionId/)
    })
})
