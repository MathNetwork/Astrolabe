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

    it('能识别 create-entry（新格式）', () => {
        expect(source).toContain('create-entry')
    })

    it('能识别 delete-entry（新格式）', () => {
        expect(source).toContain('delete-entry')
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

    it('检测节点 JSON（legacy name+sort+statement → create-entry）', () => {
        const content = 'text\n```json\n{"name":"Test","sort":"definition","statement":"x"}\n```\nmore'
        const actions = parseClaudeActions(content)
        expect(actions.length).toBe(1)
        expect(actions[0].type).toBe('create-entry')
        expect(actions[0].data.record.name).toBe('Test')
    })

    it('检测边 JSON（legacy source+target → create-entry）', () => {
        const content = '```json\n{"source":"abc","target":"def","notes":"uses"}\n```'
        const actions = parseClaudeActions(content)
        expect(actions.length).toBe(1)
        expect(actions[0].type).toBe('create-entry')
    })

    it('检测带 sort 的边 JSON', () => {
        const content = '```json\n{"source":"abc","target":"def","sort":"implies","notes":"A implies B"}\n```'
        const actions = parseClaudeActions(content)
        expect(actions.length).toBe(1)
        expect(actions[0].type).toBe('create-entry')
        expect(actions[0].data.record.sort).toBe('implies')
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

describe('Skills prompt 适配', () => {
    it('/add-mor skill prompt 不再说 "no sort"', () => {
        const skillsSource = fs.readFileSync('src/lib/skills.ts', 'utf-8')
        const addEdgeIdx = skillsSource.indexOf("'add-mor'")
        const addEdgeSection = skillsSource.slice(addEdgeIdx, addEdgeIdx + 600)
        expect(addEdgeSection).not.toMatch(/no sort|have no sort/i)
        expect(addEdgeSection).toMatch(/sort/)
    })

    it('SYSTEM_CONTEXT 描述 entry 格式（ref/record）', () => {
        const skillsSource = fs.readFileSync('src/lib/skills.ts', 'utf-8')
        expect(skillsSource).toContain('astrolabe.json')
        expect(skillsSource).toMatch(/ref.*record/)
    })
})

// ── ToolWidgets 组件 ──

describe('ToolWidgets 组件', () => {
    it('文件存在', () => {
        expect(fs.existsSync('src/components/ai-chat/ToolWidgets.tsx')).toBe(true)
    })

    it('使用 parseClaudeActions', () => {
        const source = fs.readFileSync('src/components/ai-chat/ToolWidgets.tsx', 'utf-8')
        expect(source).toContain('parseClaudeActions')
    })

    it('有创建按钮', () => {
        const source = fs.readFileSync('src/components/ai-chat/ToolWidgets.tsx', 'utf-8')
        expect(source).toMatch(/Create|create-entry/)
    })

    it('调用新的 astrolabe entries 端点', () => {
        const source = fs.readFileSync('src/components/ai-chat/ToolWidgets.tsx', 'utf-8')
        expect(source).toContain('/api/astrolabe/entries')
        expect(source).not.toContain('/api/signature/')
    })
})

// ── ChatMessages 集成 ──

describe('ChatMessages 集成 ToolWidgets', () => {
    const source = fs.readFileSync('src/components/ai-chat/ChatMessages.tsx', 'utf-8')

    it('导入 ToolWidgets', () => {
        expect(source).toContain('ToolWidgets')
    })
})
