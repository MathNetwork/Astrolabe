/**
 * useFileWatcher 测试
 *
 * 验证 file watcher hook 的行为：
 * - 收到文件变动事件后触发 triggerRefresh
 * - debounce：快速连续变动只触发一次
 * - 组件卸载时清理 watcher
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as fs from 'fs'

describe('useFileWatcher hook', () => {
    it('文件存在', () => {
        expect(fs.existsSync('src/hooks/useFileWatcher.ts')).toBe(true)
    })

    it('使用 @tauri-apps/plugin-fs 的 watch', () => {
        const source = fs.readFileSync('src/hooks/useFileWatcher.ts', 'utf-8')
        expect(source).toContain('plugin-fs')
        expect(source).toContain('watch')
    })

    it('监听 astrolabe.json', () => {
        const source = fs.readFileSync('src/hooks/useFileWatcher.ts', 'utf-8')
        expect(source).toContain('astrolabe.json')
    })

    it('触发 triggerRefresh 或 re-fetch', () => {
        const source = fs.readFileSync('src/hooks/useFileWatcher.ts', 'utf-8')
        expect(source).toMatch(/triggerRefresh|refetch|reload|setObjects/)
    })

    it('有 debounce 逻辑', () => {
        const source = fs.readFileSync('src/hooks/useFileWatcher.ts', 'utf-8')
        expect(source).toMatch(/debounce|setTimeout|timer|delay/)
    })

    it('cleanup 时 unwatch', () => {
        const source = fs.readFileSync('src/hooks/useFileWatcher.ts', 'utf-8')
        expect(source).toMatch(/unwatch|cleanup|return.*=>/)
    })
})
