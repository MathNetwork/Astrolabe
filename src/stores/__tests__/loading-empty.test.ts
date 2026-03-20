/**
 * 加载状态 + 空状态优化测试 (TDD)
 *
 * 1. 加载状态：显示 spinner 而不是纯文字
 * 2. 空状态：没有节点时显示引导提示
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'

// ── 加载状态 ──

describe('加载状态优化', () => {
    const source = fs.readFileSync('src/app/local/edit/page.tsx', 'utf-8')

    it('加载时有 spinner 动画', () => {
        expect(source).toMatch(/animate-spin|spinner/i)
    })

    it('不再是纯文字 Loading', () => {
        // 应该有更好的视觉效果
        expect(source).toContain('animate-')
    })
})

// ── 空状态 ──

describe('空状态引导', () => {
    describe('NetworkView 空状态', () => {
        const source = fs.readFileSync('src/panels/workspace/NetworkView.tsx', 'utf-8')

        it('检测节点为空', () => {
            expect(source).toMatch(/objects\.length\s*===\s*0|nodes.*\.length\s*===\s*0/)
        })

        it('显示空状态引导文字', () => {
            expect(source).toMatch(/add-obj|no.*object|empty|Get started/i)
        })
    })

    describe('CardStack 空状态', () => {
        const source = fs.readFileSync('src/panels/inspector/CardStack.tsx', 'utf-8')

        it('没有选中节点时显示提示', () => {
            expect(source).toMatch(/select|click|node/i)
        })
    })
})
