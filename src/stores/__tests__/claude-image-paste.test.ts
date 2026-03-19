/**
 * 图片粘贴/拖拽测试 (TDD)
 *
 * ChatComposer 支持：
 * 1. 粘贴截图（Cmd+V）
 * 2. 拖拽图片文件
 * 3. 显示缩略图预览
 * 4. 发送时包含图片路径
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'

// ── ChatComposer 图片支持 ──

describe('ChatComposer 图片粘贴/拖拽', () => {
    const source = fs.readFileSync('src/components/claude-chat/ChatComposer.tsx', 'utf-8')

    it('处理 onPaste 事件', () => {
        expect(source).toContain('onPaste')
    })

    it('处理 onDrop 事件', () => {
        expect(source).toContain('onDrop')
    })

    it('处理 onDragOver 事件（阻止默认行为）', () => {
        expect(source).toContain('onDragOver')
    })

    it('有附件状态（attachments）', () => {
        expect(source).toContain('attachments')
    })

    it('显示图片预览', () => {
        // 应该有 img 标签显示 data URL 缩略图
        expect(source).toMatch(/<img/)
    })

    it('可以移除附件', () => {
        // 应该有移除按钮
        expect(source).toMatch(/removeAttachment|remove.*attachment/i)
    })
})

// ── 图片处理纯函数 ──

describe('processImageFile 纯函数', () => {
    it('文件存在', () => {
        expect(fs.existsSync('src/lib/imageUtils.ts')).toBe(true)
    })

    it('导出 fileToDataUrl 函数', () => {
        const source = fs.readFileSync('src/lib/imageUtils.ts', 'utf-8')
        expect(source).toContain('fileToDataUrl')
    })

    it('导出 generateImageFilename 函数', () => {
        const source = fs.readFileSync('src/lib/imageUtils.ts', 'utf-8')
        expect(source).toContain('generateImageFilename')
    })
})

describe('generateImageFilename 逻辑', () => {
    let generateImageFilename: (originalName: string, mimeType: string) => string

    beforeAll(async () => {
        const mod = await import('../../lib/imageUtils')
        generateImageFilename = mod.generateImageFilename
    })

    it('有原名时使用原名', () => {
        const name = generateImageFilename('screenshot.png', 'image/png')
        expect(name).toContain('screenshot')
        expect(name).toContain('.png')
    })

    it('无原名时生成时间戳名', () => {
        const name = generateImageFilename('', 'image/png')
        expect(name).toMatch(/paste-\d+\.png/)
    })

    it('根据 mime 类型确定扩展名', () => {
        expect(generateImageFilename('', 'image/jpeg')).toMatch(/\.jpg$/)
        expect(generateImageFilename('', 'image/png')).toMatch(/\.png$/)
        expect(generateImageFilename('', 'image/webp')).toMatch(/\.webp$/)
    })
})

// ── Store 附件支持 ──

describe('claudeChatStore 附件', () => {
    const source = fs.readFileSync('src/stores/claudeChatStore.ts', 'utf-8')

    it('定义了 Attachment 接口', () => {
        expect(source).toContain('Attachment')
    })
})
