/**
 * 插件 Skills 动态加载测试（TDD — 先写测试）
 *
 * skills.ts 支持注册插件 skills，合并到内置 skills 中。
 */
import { describe, it, expect, beforeEach } from 'vitest'

describe('插件 Skills 动态加载', () => {
    let registerPluginSkills: any
    let clearPluginSkills: any
    let getAllSkills: any
    let matchSkills: any
    let BUILT_IN_SKILLS: any

    beforeEach(async () => {
        const mod = await import('../skills')
        registerPluginSkills = mod.registerPluginSkills
        clearPluginSkills = mod.clearPluginSkills
        getAllSkills = mod.getAllSkills
        matchSkills = mod.matchSkills
        BUILT_IN_SKILLS = mod.BUILT_IN_SKILLS
        // 每个测试前清空插件 skills
        clearPluginSkills()
    })

    it('getAllSkills 默认返回内置 skills', () => {
        const all = getAllSkills()
        expect(all.length).toBe(BUILT_IN_SKILLS.length)
    })

    it('registerPluginSkills 注册后 getAllSkills 包含插件 skills', () => {
        registerPluginSkills([
            { id: 'plugin-a', name: 'Plugin A', command: '/plugin-a', description: 'test', prompt: 'do A' }
        ])
        const all = getAllSkills()
        expect(all.length).toBe(BUILT_IN_SKILLS.length + 1)
        expect(all.find((s: any) => s.id === 'plugin-a')).toBeTruthy()
    })

    it('matchSkills 匹配插件 skills', () => {
        registerPluginSkills([
            { id: 'import-lean', name: 'Import Lean', command: '/import-lean', description: 'import', prompt: 'import lean' }
        ])
        const matches = matchSkills('/import')
        expect(matches.some((s: any) => s.id === 'import-lean')).toBe(true)
    })

    it('clearPluginSkills 清空后恢复为仅内置', () => {
        registerPluginSkills([
            { id: 'temp', name: 'Temp', command: '/temp', description: 'temp', prompt: 'temp' }
        ])
        expect(getAllSkills().length).toBe(BUILT_IN_SKILLS.length + 1)
        clearPluginSkills()
        expect(getAllSkills().length).toBe(BUILT_IN_SKILLS.length)
    })

    it('多次注册累加', () => {
        registerPluginSkills([
            { id: 'p1', name: 'P1', command: '/p1', description: '', prompt: '' }
        ])
        registerPluginSkills([
            { id: 'p2', name: 'P2', command: '/p2', description: '', prompt: '' }
        ])
        expect(getAllSkills().length).toBe(BUILT_IN_SKILLS.length + 2)
    })

    it('插件 skill 不会重复注册同 id', () => {
        registerPluginSkills([
            { id: 'dup', name: 'Dup', command: '/dup', description: '', prompt: '' }
        ])
        registerPluginSkills([
            { id: 'dup', name: 'Dup v2', command: '/dup', description: '', prompt: '' }
        ])
        const dups = getAllSkills().filter((s: any) => s.id === 'dup')
        expect(dups.length).toBe(1)
    })
})
