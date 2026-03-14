/**
 * 节点编号系统测试
 *
 * 扫描文档内容，根据 nodeblock 出现顺序为每个节点分配编号。
 * 编号格式：Kind chapter.sequence，如 "Theorem 1.1"
 */
import { describe, it, expect } from 'vitest'

import { buildNodeNumbering, buildGlobalNodeNumbering, type NodeInfo } from '../nodeNumbering'

describe('buildNodeNumbering', () => {
    const nodes: Record<string, NodeInfo> = {
        'aaa': { kind: 'theorem', name: 'Existence Theorem' },
        'bbb': { kind: 'theorem', name: 'Compactness Theorem' },
        'ccc': { kind: 'definition', name: 'Varifold' },
        'ddd': { kind: 'lemma', name: 'Key Lemma' },
    }

    it('单个 nodeblock 编号为 chapter.1', () => {
        const content = '<div class="nodeblock">aaa</div>'
        const result = buildNodeNumbering(content, 1, nodes)
        expect(result.get('aaa')).toBe('Theorem 1.1')
    })

    it('同一 kind 的多个 nodeblock 递增编号', () => {
        const content = '<div class="nodeblock">aaa</div>\n<div class="nodeblock">bbb</div>'
        const result = buildNodeNumbering(content, 1, nodes)
        expect(result.get('aaa')).toBe('Theorem 1.1')
        expect(result.get('bbb')).toBe('Theorem 1.2')
    })

    it('不同 kind 分别计数', () => {
        const content = '<div class="nodeblock">aaa</div>\n<div class="nodeblock">ccc</div>\n<div class="nodeblock">bbb</div>'
        const result = buildNodeNumbering(content, 2, nodes)
        expect(result.get('aaa')).toBe('Theorem 2.1')
        expect(result.get('ccc')).toBe('Definition 2.1')
        expect(result.get('bbb')).toBe('Theorem 2.2')
    })

    it('章节号正确反映在编号中', () => {
        const content = '<div class="nodeblock">ddd</div>'
        const result = buildNodeNumbering(content, 7, nodes)
        expect(result.get('ddd')).toBe('Lemma 7.1')
    })

    it('同一 ID 出现多次只取第一次', () => {
        const content = '<div class="nodeblock">aaa</div>\n<div class="nodeblock">aaa</div>\n<div class="nodeblock">bbb</div>'
        const result = buildNodeNumbering(content, 1, nodes)
        expect(result.get('aaa')).toBe('Theorem 1.1')
        expect(result.get('bbb')).toBe('Theorem 1.2')
    })

    it('noderef 引用的 ID 如果已有编号则复用', () => {
        const content = '<div class="nodeblock">aaa</div>\nSee <noderef id="aaa"></noderef>'
        const result = buildNodeNumbering(content, 1, nodes)
        expect(result.get('aaa')).toBe('Theorem 1.1')
    })

    it('未知 ID 不产生编号', () => {
        const content = '<div class="nodeblock">zzz</div>'
        const result = buildNodeNumbering(content, 1, nodes)
        expect(result.has('zzz')).toBe(false)
    })

    it('空内容返回空 map', () => {
        const result = buildNodeNumbering('', 1, nodes)
        expect(result.size).toBe(0)
    })

    it('kind 首字母大写', () => {
        const content = '<div class="nodeblock">ccc</div>'
        const result = buildNodeNumbering(content, 3, nodes)
        expect(result.get('ccc')).toBe('Definition 3.1')
    })

    it('chapter 0（Introduction）编号为 0.x', () => {
        const content = '<div class="nodeblock">aaa</div>\n<div class="nodeblock">ccc</div>'
        const result = buildNodeNumbering(content, 0, nodes)
        expect(result.get('aaa')).toBe('Theorem 0.1')
        expect(result.get('ccc')).toBe('Definition 0.1')
    })
})

describe('buildGlobalNodeNumbering', () => {
    const nodes: Record<string, NodeInfo> = {
        'aaa': { kind: 'theorem', name: 'Theorem A' },
        'bbb': { kind: 'theorem', name: 'Theorem B' },
        'ccc': { kind: 'definition', name: 'Some Def' },
        'ddd': { kind: 'theorem', name: 'Theorem C' },
    }

    it('跨文档合并编号', () => {
        const docs = [
            { filename: '01-intro.mdx', content: '<div class="nodeblock">aaa</div>' },
            { filename: '02-chapter1.mdx', content: '<div class="nodeblock">bbb</div>\n<div class="nodeblock">ccc</div>' },
        ]
        const result = buildGlobalNodeNumbering(docs, nodes)
        expect(result.get('aaa')).toBe('Theorem 0.1')
        expect(result.get('bbb')).toBe('Theorem 1.1')
        expect(result.get('ccc')).toBe('Definition 1.1')
    })

    it('同一节点在多个文档出现，取第一次的编号', () => {
        const docs = [
            { filename: '01-intro.mdx', content: '<div class="nodeblock">aaa</div>' },
            { filename: '02-ch1.mdx', content: '<div class="nodeblock">aaa</div>\n<div class="nodeblock">bbb</div>' },
        ]
        const result = buildGlobalNodeNumbering(docs, nodes)
        expect(result.get('aaa')).toBe('Theorem 0.1')
        // bbb 在 ch1 中是第一个新 theorem（aaa 已有编号跳过）
        expect(result.get('bbb')).toBe('Theorem 1.1')
    })

    it('00-index 被跳过（chapter -1）', () => {
        const docs = [
            { filename: '00-index.mdx', content: '<div class="nodeblock">aaa</div>' },
            { filename: '01-intro.mdx', content: '<div class="nodeblock">bbb</div>' },
        ]
        const result = buildGlobalNodeNumbering(docs, nodes)
        expect(result.has('aaa')).toBe(false)
        expect(result.get('bbb')).toBe('Theorem 0.1')
    })

    it('空文档列表返回空 map', () => {
        const result = buildGlobalNodeNumbering([], nodes)
        expect(result.size).toBe(0)
    })

    it('文件名按字母排序确保顺序正确', () => {
        const docs = [
            { filename: '03-ch2.mdx', content: '<div class="nodeblock">ddd</div>' },
            { filename: '02-ch1.mdx', content: '<div class="nodeblock">bbb</div>' },
        ]
        const result = buildGlobalNodeNumbering(docs, nodes)
        // 02 先于 03
        expect(result.get('bbb')).toBe('Theorem 1.1')
        expect(result.get('ddd')).toBe('Theorem 2.1')
    })
})
