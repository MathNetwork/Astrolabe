/**
 * DetailView 功能测试
 *
 * DetailView 是纯布局容器：
 *   - 只订阅 selectObjStore.selectedHash 决定是否渲染
 *   - ObjCard/MorCard/MorList 都是自治组件，自己订阅 store
 *   - DetailView 不直接订阅 dataStore
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'

describe('DetailView — 纯布局容器', () => {
    const source = fs.readFileSync('src/panels/workspace/DetailView.tsx', 'utf-8')

    // 最小订阅：只需要 selectedHash 决定布局
    it('订阅 selectObjStore（获取 selectedHash）', () => {
        expect(source).toContain('useSelectObjStore')
        expect(source).toContain('selectedHash')
    })

    // 不直接订阅 dataStore（组件自治）
    it('不直接订阅 dataStore', () => {
        expect(source).not.toContain('useDataStore')
    })

    // selectMorStore 只用于决定右侧是否显示 MorCard
    it('订阅 selectMorStore（仅 selectedMorHash 用于布局）', () => {
        expect(source).toContain('useSelectMorStore')
    })

    // 不直接 import getNodeKindVisual（组件自治）
    it('不直接 import getNodeKindVisual', () => {
        expect(source).not.toContain('getNodeKindVisual')
    })

    // 使用自治组件
    it('使用共享 ObjCard（传 id）', () => {
        expect(source).toContain('ObjCard')
        expect(source).toContain('shared/ObjCard')
    })

    it('使用共享 MorCard', () => {
        expect(source).toContain('MorCard')
        expect(source).toContain('shared/MorCard')
    })

    it('使用共享 MorList', () => {
        expect(source).toContain('MorList')
        expect(source).toContain('shared/MorList')
    })

    // 空状态
    it('未选中时显示空状态', () => {
        expect(source).toMatch(/select.*object|select.*node|no.*selected|empty/i)
    })
})
