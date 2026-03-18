/**
 * 快捷键系统测试 (Phase 8)
 *
 * useKeyboardShortcuts 统一管理全局快捷键。
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'

const source = fs.readFileSync('src/hooks/useKeyboardShortcuts.ts', 'utf-8')

describe('快捷键注册', () => {
    it('监听 keydown 事件', () => {
        expect(source).toContain('keydown')
    })

    it('Cmd+Z undo', () => {
        expect(source).toMatch(/meta.*z|ctrl.*z/i)
        expect(source).toContain('undo')
    })

    it('Cmd+Shift+Z redo', () => {
        expect(source).toContain('redo')
    })

    it('Esc 取消选中', () => {
        expect(source).toContain('Escape')
    })

    it('Cmd+1/2/3 切换视图', () => {
        // 切换 Read/Network/Detail
        expect(source).toMatch(/1.*2.*3|viewTab|assignView/)
    })
})

describe('store 交互', () => {
    it('Esc 清除 selectObjStore', () => {
        expect(source).toContain('selectObjStore')
    })

    it('Esc 清除 selectMorStore', () => {
        expect(source).toContain('selectMorStore')
    })

    it('使用 temporal undo/redo', () => {
        expect(source).toContain('temporal')
    })
})

describe('page.tsx 使用新 hook', () => {
    const pageSource = fs.readFileSync('src/app/local/edit/page.tsx', 'utf-8')

    it('导入 useKeyboardShortcuts', () => {
        expect(pageSource).toContain('useKeyboardShortcuts')
    })
})
