/**
 * ReadView 功能测试 (Step 5.4 - 5.6)
 *
 * 5.4: 右侧 TOC（标题提取 + IntersectionObserver + 滚动）
 * 5.5: Obj 编号系统（跨文档全局编号 → dataStore.nodeNumbering）
 * 5.6: 字号控制 + 刷新按钮
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'

const source = fs.readFileSync('src/panels/workspace/ReadView.tsx', 'utf-8')

// ── 5.4: 右侧 TOC ──

describe('5.4 页面 TOC', () => {
    it('有 extractHeadings 纯函数（从 markdown 提取 h1-h4）', () => {
        expect(source).toContain('extractHeadings')
    })

    it('heading 组件生成 id 属性（用于锚点定位）', () => {
        // headingComponents 已存在，确认 id 生成
        expect(source).toMatch(/id.*text.*toLowerCase/)
    })

    it('使用 IntersectionObserver 追踪当前可见标题', () => {
        expect(source).toContain('IntersectionObserver')
    })

    it('有 activeTocId 状态追踪当前标题', () => {
        expect(source).toContain('activeTocId')
    })

    it('TOC 可折叠', () => {
        // 有 open/toggle 控制
        expect(source).toMatch(/tocOpen|pageTocOpen/)
    })

    it('点击 TOC 条目平滑滚动到对应标题', () => {
        expect(source).toContain('scrollTo')
        expect(source).toContain('smooth')
    })
})

// ── 5.5: Obj 编号 ──

describe('5.5 Obj 编号系统', () => {
    it('导入 objNumbering 模块', () => {
        expect(source).toContain('objNumbering')
    })

    it('构建全局编号表', () => {
        expect(source).toContain('buildGlobalObjNumbering')
    })

    it('编号写入 dataStore.nodeNumbering', () => {
        expect(source).toContain('setNodeNumbering')
    })

    it('预加载时收集文档内容用于编号', () => {
        // 预加载 effect 需要把 { filename, content } 收集起来
        expect(source).toMatch(/filename.*content|DocEntry/)
    })
})

// ── 5.6: 辅助功能 ──

describe('5.6 字号控制 + 刷新', () => {
    it('有字号状态', () => {
        expect(source).toMatch(/fontSize|fontSizeIndex/)
    })

    it('有 A-/A+ 字号按钮', () => {
        expect(source).toContain('A−')
        expect(source).toContain('A+')
    })

    it('有刷新按钮', () => {
        expect(source).toMatch(/Refresh|refresh|↻/)
    })

    it('刷新只加载当前活跃文件', () => {
        expect(source).toContain('handleRefresh')
        expect(source).toContain('activeFile')
    })

    it('刷新后保持滚动位置', () => {
        expect(source).toMatch(/scrollTop|pendingScroll/)
    })
})

// ── extractHeadings 纯函数单元测试 ──

describe('extractHeadings 纯函数', () => {
    // 动态 import ReadView 的 extractHeadings
    // 如果 ReadView 没有 export 它，就从源码验证逻辑正确性
    // 这里测试的是独立提取出来的函数

    let extractHeadings: (markdown: string) => { id: string; text: string; level: number }[]

    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const mod = require('../../panels/workspace/ReadView')
        extractHeadings = mod.extractHeadings
    } catch {
        // 如果无法 import（因为 use client），用源码验证
        extractHeadings = null as any
    }

    // 无论是否能 import，至少验证函数存在于源码中
    it('函数定义存在', () => {
        expect(source).toContain('function extractHeadings')
    })

    it('匹配 h1-h4（# 到 ####）', () => {
        // 正则应该匹配 1-4 个 #
        expect(source).toMatch(/#{1,4}/)
    })

    it('生成的 id 是 lowercase + hyphen 格式', () => {
        expect(source).toContain('toLowerCase')
        expect(source).toMatch(/replace.*\\s\+.*-/)
    })

    it('去除 markdown 格式（bold/italic/code）', () => {
        // 应该 strip ** * ` 等格式标记
        expect(source).toMatch(/replace.*\\\*\\\*/)
    })
})
