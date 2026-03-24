/**
 * Astrolabe CRUD 前端契约测试
 *
 * 1. parseClaudeActions 解析新格式 JSON
 * 2. ToolWidgets 对每种 action 发出正确请求
 * 3. ToolWidgets 正确处理后端响应
 */
import { describe, it, expect } from 'vitest'
import { parseClaudeActions } from '../parseClaudeActions'

// ── 1. parseClaudeActions 解析测试 ──

describe('parseClaudeActions — 新格式检测', () => {
    const wrap = (json: object) => '```json\n' + JSON.stringify(json) + '\n```'

    it('create-entry: ref=["__self__"] + record → create-entry', () => {
        const actions = parseClaudeActions(wrap({
            ref: ['__self__'],
            record: { name: 'Theorem X', sort: 'theorem', statement: 'For all x...' },
        }))
        expect(actions).toHaveLength(1)
        expect(actions[0].type).toBe('create-entry')
    })

    it('create-entry: 高维 ref=[a, b] + record → create-entry', () => {
        const actions = parseClaudeActions(wrap({
            ref: ['abc123', 'def456'],
            record: { sort: 'depends_on' },
        }))
        expect(actions).toHaveLength(1)
        expect(actions[0].type).toBe('create-entry')
    })

    it('update-entry: action + id + updates → update-entry', () => {
        const actions = parseClaudeActions(wrap({
            action: 'update-entry',
            id: 'abc123',
            updates: { status: 'proven' },
        }))
        expect(actions).toHaveLength(1)
        expect(actions[0].type).toBe('update-entry')
    })

    it('delete-entry: action + id → delete-entry', () => {
        const actions = parseClaudeActions(wrap({
            action: 'delete-entry',
            id: 'abc123',
        }))
        expect(actions).toHaveLength(1)
        expect(actions[0].type).toBe('delete-entry')
    })

    // ── 不应匹配的 case ──

    it('unknown: 缺必要字段 { name: "something" } → 无 action', () => {
        const actions = parseClaudeActions(wrap({ name: 'something' }))
        expect(actions).toHaveLength(0)
    })

    it('unknown: ref 但缺 record → 无 action', () => {
        const actions = parseClaudeActions(wrap({ ref: ['__self__'] }))
        expect(actions).toHaveLength(0)
    })

    it('unknown: action=update-entry 但缺 id → 无 action', () => {
        const actions = parseClaudeActions(wrap({ action: 'update-entry' }))
        expect(actions).toHaveLength(0)
    })

    // ── 向后兼容旧格式 ──

    it('legacy: delete-obj action 仍被识别为 delete-entry', () => {
        const actions = parseClaudeActions(wrap({
            action: 'delete-obj',
            id: 'abc123',
        }))
        expect(actions).toHaveLength(1)
        expect(actions[0].type).toBe('delete-entry')
    })

    it('legacy: name+sort+statement 无 id 仍被识别为 create-entry', () => {
        const actions = parseClaudeActions(wrap({
            name: 'Theorem Y',
            sort: 'theorem',
            statement: 'Statement here',
        }))
        expect(actions).toHaveLength(1)
        expect(actions[0].type).toBe('create-entry')
    })

    it('legacy: source+target 无 id 仍被识别为 create-entry', () => {
        const actions = parseClaudeActions(wrap({
            source: 'abc',
            target: 'def',
            sort: 'uses',
        }))
        expect(actions).toHaveLength(1)
        expect(actions[0].type).toBe('create-entry')
    })
})
