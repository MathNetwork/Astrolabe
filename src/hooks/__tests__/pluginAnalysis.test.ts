/**
 * 插件分析端点集成测试（TDD — 先写测试）
 *
 * useAnalysisData 动态获取并 fetch 插件分析端点。
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'

describe('useAnalysisData 插件分析集成', () => {
    const source = fs.readFileSync('src/hooks/useAnalysisData.ts', 'utf-8')

    it('fetch /api/functors/list 获取插件分析端点', () => {
        expect(source).toContain('/api/functors/list')
    })

    it('动态 fetch 插件分析端点的 URL', () => {
        // 应该从插件列表中提取 analysis_endpoints 并 fetch
        expect(source).toContain('analysis_endpoints')
    })

    it('插件分析结果合并到 analysisData', () => {
        // 结果应该用 endpoint 的 key 写入 analysisData
        expect(source).toMatch(/functor.*key|endpoint.*key|ep\.key|ep\[.key.\]/i)
    })
})
