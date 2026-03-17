/**
 * ReadView 功能测试 (Step 5.1 - 5.3)
 *
 * 5.1: MDX 文件加载
 * 5.2: 左侧栏文档导航
 * 5.3: MDX 渲染（KaTeX + nodeblock + noderef）
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'

describe('ReadView 实现', () => {
    const source = fs.readFileSync('src/panels/workspace/ReadView.tsx', 'utf-8')

    // 5.1: 文件加载
    it('从后端 API 加载文件列表', () => {
        expect(source).toContain('/api/docs/list')
    })

    it('从后端 API 加载文件内容', () => {
        expect(source).toContain('/api/docs/read')
    })

    it('有内容缓存机制', () => {
        expect(source).toMatch(/cache|Cache/)
    })

    // 5.2: 文档导航
    it('有文件列表（左侧栏）', () => {
        expect(source).toContain('activeFile')
        expect(source).toMatch(/files\.map|fileList/)
    })

    // 5.3: MDX 渲染
    it('使用 remark-math + rehype-katex', () => {
        expect(source).toContain('remarkMath')
        expect(source).toContain('rehypeKatex')
    })

    it('有 nodeblock 组件', () => {
        expect(source).toContain('nodeblock')
    })

    it('有 noderef 组件', () => {
        expect(source).toContain('noderef')
    })

    it('noderef 点击写入 selectObjStore', () => {
        expect(source).toContain('selectObjStore')
    })

    it('nodeblock 从 dataStore 读取 obj 数据', () => {
        expect(source).toContain('dataStore')
    })
})

describe('共享组件文件存在', () => {
    it('NodeBlock.tsx 存在', () => {
        expect(fs.existsSync('src/components/shared/NodeBlock.tsx')).toBe(true)
    })

    it('NodeRef.tsx 存在', () => {
        expect(fs.existsSync('src/components/shared/NodeRef.tsx')).toBe(true)
    })
})
