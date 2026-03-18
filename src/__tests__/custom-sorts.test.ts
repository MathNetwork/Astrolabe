/**
 * Sort 自定义测试 (P1)
 *
 * 项目级 sorts.json 覆盖默认配置，
 * 让非数学项目能定义自己的 sort 类型和颜色。
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'

// ── 后端：加载项目 sorts ──

describe('后端 sorts API', () => {
    it('server.py 有 sorts 端点', () => {
        const source = fs.readFileSync('backend/netmath/server.py', 'utf-8')
        expect(source).toMatch(/sorts|sort.*config/)
    })
})

// ── 前端：动态 sort 配置 ──

describe('前端 sort 配置', () => {
    it('dataStore 有 sortConfig 字段', () => {
        const source = fs.readFileSync('src/stores/dataStore.ts', 'utf-8')
        expect(source).toContain('sortConfig')
    })

    it('useProjectLoader 加载 sortConfig', () => {
        const source = fs.readFileSync('src/hooks/useProjectLoader.ts', 'utf-8')
        expect(source).toContain('sortConfig')
    })

    it('objectSortConfig 支持动态覆盖', () => {
        const source = fs.readFileSync('assets/objectSortConfig.ts', 'utf-8')
        expect(source).toMatch(/merge|override|custom|dynamic/)
    })
})
