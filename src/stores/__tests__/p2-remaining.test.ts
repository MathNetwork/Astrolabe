/**
 * P2 剩余功能测试 (TDD)
 *
 * 1. Stop 按钮：streaming 时显示，点击调用 cancel_claude_execution
 * 2. 节点标签切换：NetworkView 根据 showLabels 绘制/隐藏标签
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'

// ══════════════════════════════════════
// Stop 按钮
// ══════════════════════════════════════

describe('Stop 按钮', () => {
    describe('ChatComposer 有 Stop 按钮', () => {
        const source = fs.readFileSync('src/components/ai-chat/ChatComposer.tsx', 'utf-8')

        it('streaming 时显示 stop 按钮', () => {
            expect(source).toContain('cancel_claude_execution')
        })

        it('有 StopCircleIcon 或类似图标', () => {
            expect(source).toMatch(/StopIcon|StopCircleIcon|stop/i)
        })
    })

    describe('Rust 端有 cancel 命令', () => {
        it('claude.rs 导出 cancel_claude_execution', () => {
            const source = fs.readFileSync('src-tauri/src/claude.rs', 'utf-8')
            expect(source).toContain('cancel_claude_execution')
        })

        it('lib.rs 注册了 cancel_claude_execution', () => {
            const source = fs.readFileSync('src-tauri/src/lib.rs', 'utf-8')
            expect(source).toContain('cancel_claude_execution')
        })
    })
})

// ══════════════════════════════════════
// 节点标签切换
// ══════════════════════════════════════

describe('节点标签切换', () => {
    describe('viewStore 有 showLabels', () => {
        it('showLabels 状态存在', async () => {
            const { useViewStore } = await import('../viewStore')
            const state = useViewStore.getState()
            expect(typeof state.showLabels).toBe('boolean')
        })

        it('toggleLabels 切换状态', async () => {
            const { useViewStore } = await import('../viewStore')
            const before = useViewStore.getState().showLabels
            useViewStore.getState().toggleLabels()
            expect(useViewStore.getState().showLabels).toBe(!before)
            // 还原
            useViewStore.getState().toggleLabels()
        })
    })

    describe('NetworkView 渲染标签', () => {
        const source = fs.readFileSync('src/panels/workspace/NetworkView.tsx', 'utf-8')

        it('读取 showLabels 状态', () => {
            expect(source).toContain('showLabels')
        })

        it('有 fillText 绘制标签', () => {
            expect(source).toContain('fillText')
        })
    })

    describe('NetworkSettings 有标签切换 UI', () => {
        const source = fs.readFileSync('src/panels/workspace/NetworkSettings.tsx', 'utf-8')

        it('有 Labels 或标签相关控件', () => {
            expect(source).toMatch(/showLabels|toggleLabels|Labels/)
        })
    })
})
