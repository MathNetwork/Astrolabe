/**
 * 自动刷新测试 (TDD)
 *
 * 约束：
 * 1. dataStore 有 refreshTrigger 计数器，递增时触发各组件刷新
 * 2. AI 完成（claude-complete）时自动递增 refreshTrigger
 * 3. ReadView 的刷新只重新加载当前活跃文件，不重新 fetch 所有文件
 * 4. useProjectLoader 监听 refreshTrigger 重新加载知识数据
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'

describe('dataStore 刷新机制', () => {
    const source = fs.readFileSync('src/stores/dataStore.ts', 'utf-8')

    it('有 refreshTrigger 状态', () => {
        expect(source).toContain('refreshTrigger')
    })

    it('有 triggerRefresh 方法', () => {
        expect(source).toContain('triggerRefresh')
    })
})

describe('AI 完成后自动刷新', () => {
    const source = fs.readFileSync('src/hooks/useClaudeEvents.ts', 'utf-8')

    it('claude-complete 事件触发 triggerRefresh', () => {
        expect(source).toContain('triggerRefresh')
    })
})

describe('ReadView 增量刷新', () => {
    const source = fs.readFileSync('src/panels/workspace/ReadView.tsx', 'utf-8')

    it('监听 refreshTrigger 变化', () => {
        expect(source).toContain('refreshTrigger')
    })

    it('刷新只加载当前活跃文件（不是所有文件）', () => {
        // handleRefresh 中应该只 fetch activeFile，不是 files.map 全部
        // 提取 handleRefresh 到下一个 useCallback/useEffect 之间的内容
        const handleRefreshMatch = source.match(/handleRefresh[\s\S]*?\}, \[/)
        expect(handleRefreshMatch).not.toBeNull()
        expect(handleRefreshMatch![0]).not.toContain('files.map')
        expect(handleRefreshMatch![0]).toContain('activeFile')
    })
})

describe('useProjectLoader 监听刷新', () => {
    const source = fs.readFileSync('src/hooks/useProjectLoader.ts', 'utf-8')

    it('订阅 refreshTrigger', () => {
        expect(source).toContain('refreshTrigger')
    })
})
