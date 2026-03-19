/**
 * ExplorerPanel 测试（TDD — 先写测试）
 *
 * Explorer 面板有两个可折叠区块：PLUGINS 和 FILES。
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'

describe('ExplorerPanel 区块', () => {
    const source = fs.readFileSync('src/panels/explorer/ExplorerPanel.tsx', 'utf-8')

    it('有 PLUGINS section header', () => {
        expect(source).toMatch(/PLUGINS|Plugins/i)
    })

    it('有 FILES section header', () => {
        expect(source).toMatch(/FILES|Files/i)
    })

    it('有折叠状态管理（useState）', () => {
        expect(source).toContain('useState')
    })

    it('有点击 toggle 的 onClick handler', () => {
        expect(source).toContain('onClick')
    })

    it('PLUGINS 区块有占位文字', () => {
        expect(source).toMatch(/No plugins|no plugins/i)
    })

    it('FILES 区块有占位文字', () => {
        expect(source).toMatch(/No project|no project/i)
    })

    it('两个区块之间有分隔', () => {
        // 应该有 border 分隔线
        expect(source).toMatch(/border-[bt]|divide/)
    })
})
