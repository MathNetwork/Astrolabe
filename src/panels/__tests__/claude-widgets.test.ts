/**
 * Claude Tool Widgets 测试 (Phase 4)
 *
 * 1. parseClaudeActions: 从 Claude 回复中提取可操作内容
 * 2. ToolWidgets: 渲染操作按钮
 * 3. ChatMessages: 集成 ToolWidgets
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'

// ── 解析纯函数 ──

describe('parseClaudeActions 纯函数', () => {
    const source = fs.readFileSync('src/lib/parseClaudeActions.ts', 'utf-8')

    it('文件存在', () => {
        expect(fs.existsSync('src/lib/parseClaudeActions.ts')).toBe(true)
    })

    it('导出 parseClaudeActions 函数', () => {
        expect(source).toContain('export function parseClaudeActions')
    })

    it('能识别节点 JSON（有 name + sort + statement）', () => {
        expect(source).toContain('add-obj')
    })

    it('能识别边 JSON（有 source + target）', () => {
        expect(source).toContain('add-mor')
    })

    it('返回 actions 数组', () => {
        expect(source).toMatch(/Action\[\]|actions/)
    })
})

// ── 纯函数单元测试 ──

describe('parseClaudeActions 逻辑', () => {
    let parseClaudeActions: (content: string) => any[]

    beforeAll(async () => {
        const mod = await import('../../lib/parseClaudeActions')
        parseClaudeActions = mod.parseClaudeActions
    })

    it('普通文本无 action', () => {
        expect(parseClaudeActions('hello world')).toEqual([])
    })

    it('检测节点 JSON', () => {
        const content = 'text\n```json\n{"name":"Test","sort":"definition","statement":"x"}\n```\nmore'
        const actions = parseClaudeActions(content)
        expect(actions.length).toBe(1)
        expect(actions[0].type).toBe('add-obj')
        expect(actions[0].data.name).toBe('Test')
    })

    it('检测边 JSON', () => {
        const content = '```json\n{"source":"abc","target":"def","notes":"uses"}\n```'
        const actions = parseClaudeActions(content)
        expect(actions.length).toBe(1)
        expect(actions[0].type).toBe('add-mor')
    })

    it('检测带 sort 的边 JSON', () => {
        const content = '```json\n{"source":"abc","target":"def","sort":"implies","notes":"A implies B"}\n```'
        const actions = parseClaudeActions(content)
        expect(actions.length).toBe(1)
        expect(actions[0].type).toBe('add-mor')
        expect(actions[0].data.sort).toBe('implies')
    })

    it('非 obj/mor JSON 不产生 action', () => {
        const content = '```json\n{"foo":"bar"}\n```'
        expect(parseClaudeActions(content)).toEqual([])
    })

    it('多个 JSON 块产生多个 actions', () => {
        const content = '```json\n{"name":"A","sort":"theorem","statement":"x"}\n```\n```json\n{"source":"a","target":"b","notes":"y"}\n```'
        expect(parseClaudeActions(content).length).toBe(2)
    })
})

// ── Skills prompt 适配 ──

describe('Skills 包含 mor sort 说明', () => {
    it('/add-mor skill prompt 不再说 "no sort"', () => {
        const skillsSource = fs.readFileSync('src/lib/skills.ts', 'utf-8')
        const addEdgeIdx = skillsSource.indexOf("'add-mor'")
        const addEdgeSection = skillsSource.slice(addEdgeIdx, addEdgeIdx + 600)
        // 不应包含"no sort"或"have no sort"
        expect(addEdgeSection).not.toMatch(/no sort|have no sort/i)
        // 应包含 sort 字段说明
        expect(addEdgeSection).toMatch(/sort/)
    })

    it('SYSTEM_CONTEXT 的 Morphisms 字段列表包含 sort', () => {
        const skillsSource = fs.readFileSync('src/lib/skills.ts', 'utf-8')
        // 找到 Morphisms (mor): 开头的那行
        const morLine = skillsSource.match(/Morphisms \(mor\):.*/)
        expect(morLine).not.toBeNull()
        expect(morLine![0]).toContain('sort')
    })
})

// ── ToolWidgets 组件 ──

describe('ToolWidgets 组件', () => {
    it('文件存在', () => {
        expect(fs.existsSync('src/components/claude-chat/ToolWidgets.tsx')).toBe(true)
    })

    it('使用 parseClaudeActions', () => {
        const source = fs.readFileSync('src/components/claude-chat/ToolWidgets.tsx', 'utf-8')
        expect(source).toContain('parseClaudeActions')
    })

    it('有创建节点的按钮', () => {
        const source = fs.readFileSync('src/components/claude-chat/ToolWidgets.tsx', 'utf-8')
        expect(source).toMatch(/Create.*Obj|创建.*对象|add-obj/)
    })
})

// ── ChatMessages 集成 ──

describe('ChatMessages 集成 ToolWidgets', () => {
    const source = fs.readFileSync('src/components/claude-chat/ChatMessages.tsx', 'utf-8')

    it('导入 ToolWidgets', () => {
        expect(source).toContain('ToolWidgets')
    })
})
