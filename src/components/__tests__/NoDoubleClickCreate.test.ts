/**
 * 画布不应支持双击创建节点
 *
 * 双击太容易误触，节点创建应通过明确的 UI 操作完成。
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

describe('画布禁止双击创建节点', () => {
    const srcRoot = path.resolve(__dirname, '../../..')

    it('edit page 不传递 onBackgroundDoubleClick', () => {
        const content = fs.readFileSync(path.join(srcRoot, 'src/app/local/edit/page.tsx'), 'utf-8')
        expect(content).not.toContain('onBackgroundDoubleClick')
    })

    it('GraphViewport 不接受 onBackgroundDoubleClick prop', () => {
        const content = fs.readFileSync(path.join(srcRoot, 'src/components/canvas/GraphViewport.tsx'), 'utf-8')
        expect(content).not.toContain('onBackgroundDoubleClick')
    })

    it('ForceGraph3D 不接受 onBackgroundDoubleClick prop', () => {
        const content = fs.readFileSync(path.join(srcRoot, 'src/components/graph3d/ForceGraph3D.tsx'), 'utf-8')
        expect(content).not.toContain('onBackgroundDoubleClick')
    })

    it('画布空状态不显示 "Double-click to create" 提示', () => {
        const content = fs.readFileSync(path.join(srcRoot, 'src/components/canvas/GraphViewport.tsx'), 'utf-8')
        expect(content).not.toContain('Double-click')
    })
})
