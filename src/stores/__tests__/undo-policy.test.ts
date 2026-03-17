/**
 * Undo 策略测试
 *
 * 强制保证：所有需要 undo 的 store 都使用 temporal 中间件。
 * 新加 store 时如果忘了 undo，这个测试会失败。
 *
 * 豁免列表：明确不需要 undo 的 store（需要写理由）。
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

// 明确不需要 undo 的 store（必须写理由）
const UNDO_EXEMPT: Record<string, string> = {
    'dataStore.ts': '只读数据，从后端加载，不需要回撤',
    'analysisStore.ts': '分析结果是计算得到的，重新计算即可',
}

describe('undo 策略', () => {
    const storesDir = 'src/stores'
    const storeFiles = fs.readdirSync(storesDir)
        .filter(f => f.endsWith('.ts') && !f.startsWith('__'))

    it('stores 目录存在且有文件', () => {
        expect(storeFiles.length).toBeGreaterThan(0)
    })

    for (const file of storeFiles) {
        if (UNDO_EXEMPT[file]) {
            it(`${file} 豁免 undo（理由：${UNDO_EXEMPT[file]}）`, () => {
                // 豁免的 store 不需要 temporal，但要确认豁免理由存在
                expect(UNDO_EXEMPT[file]).toBeTruthy()
            })
        } else {
            it(`${file} 必须使用 temporal 中间件（undo 支持）`, () => {
                const source = fs.readFileSync(path.join(storesDir, file), 'utf-8')
                expect(source).toContain('temporal')
            })
        }
    }

    it('豁免列表中的文件都真实存在', () => {
        for (const file of Object.keys(UNDO_EXEMPT)) {
            expect(
                fs.existsSync(path.join(storesDir, file)),
                `豁免的 ${file} 不存在，请清理 UNDO_EXEMPT`
            ).toBe(true)
        }
    })
})
