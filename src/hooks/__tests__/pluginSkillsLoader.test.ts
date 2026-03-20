/**
 * 插件 Skills 加载集成测试（TDD — 先写测试）
 *
 * useProjectLoader 项目加载时从 /api/plugins/list 获取插件 skills。
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'

describe('useProjectLoader 插件 skills 加载', () => {
    const source = fs.readFileSync('src/hooks/useProjectLoader.ts', 'utf-8')

    it('fetch /api/plugins/list', () => {
        expect(source).toContain('/api/plugins/list')
    })

    it('调用 registerPluginSkills', () => {
        expect(source).toContain('registerPluginSkills')
    })

    it('项目切换时调用 clearPluginSkills', () => {
        expect(source).toContain('clearPluginSkills')
    })
})
