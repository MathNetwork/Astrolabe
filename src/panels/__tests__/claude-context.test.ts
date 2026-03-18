/**
 * Claude 上下文注入测试 (Phase 2)
 *
 * Claude 能看到用户当前选中的节点/边/文档
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'

// ── 上下文构建纯函数 ──

describe('buildContext 纯函数', () => {
    const source = fs.readFileSync('src/lib/buildContext.ts', 'utf-8')

    it('文件存在', () => {
        expect(fs.existsSync('src/lib/buildContext.ts')).toBe(true)
    })

    it('接收 selectedObj 参数', () => {
        expect(source).toContain('selectedObj')
    })

    it('接收 selectedMor 参数', () => {
        expect(source).toContain('selectedMor')
    })

    it('输出包含节点名和 sort', () => {
        expect(source).toMatch(/name|sort/)
    })

    it('输出包含 statement', () => {
        expect(source).toContain('statement')
    })

    it('导出 buildContext 函数', () => {
        expect(source).toContain('export function buildContext')
    })
})

// ── ChatComposer 注入上下文 ──

describe('ChatComposer 上下文注入', () => {
    const source = fs.readFileSync('src/components/claude-chat/ChatComposer.tsx', 'utf-8')

    it('导入 buildContext', () => {
        expect(source).toContain('buildContext')
    })

    it('订阅 selectObjStore', () => {
        expect(source).toContain('selectObjStore')
    })

    it('订阅 selectMorStore', () => {
        expect(source).toContain('selectMorStore')
    })
})
