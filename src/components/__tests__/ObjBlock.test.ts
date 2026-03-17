/**
 * ObjBlock data-show 属性测试
 *
 * ObjBlock 根据 data-show 属性决定显示哪些字段。
 * 默认显示 statement，可通过 data-show="statement,proof" 控制。
 */
import { describe, it, expect } from 'vitest'

// 纯逻辑函数：解析 data-show 属性，返回要显示的字段列表
// 这个函数将从 NetworkRead.tsx 导出
import { parseShowFields } from '../NetworkRead'

describe('parseShowFields', () => {
    it('默认只显示 statement', () => {
        expect(parseShowFields(undefined)).toEqual(['statement'])
    })

    it('空字符串默认只显示 statement', () => {
        expect(parseShowFields('')).toEqual(['statement'])
    })

    it('单个字段', () => {
        expect(parseShowFields('proof')).toEqual(['proof'])
    })

    it('多个字段用逗号分隔', () => {
        expect(parseShowFields('statement,proof')).toEqual(['statement', 'proof'])
    })

    it('忽略空格', () => {
        expect(parseShowFields('statement , proof , intuition')).toEqual(['statement', 'proof', 'intuition'])
    })

    it('所有合法字段', () => {
        expect(parseShowFields('statement,proof,intuition,notes')).toEqual(['statement', 'proof', 'intuition', 'notes'])
    })

    it('过滤非法字段', () => {
        expect(parseShowFields('statement,foo,proof')).toEqual(['statement', 'proof'])
    })
})
