/**
 * Phase 9 清理验证测试
 *
 * 确保：
 * 1. 新架构文件全部存在
 * 2. 旧代码已被删除（无残留）
 * 3. 新代码不 import 任何旧模块
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

// ── 新架构文件必须存在 ──

describe('新架构文件完整性', () => {
    const requiredFiles = [
        // Stores
        'src/stores/selectObjStore.ts',
        'src/stores/selectMorStore.ts',
        'src/stores/dataStore.ts',
        'src/stores/viewStore.ts',
        'src/stores/physicsStore.ts',
        'src/stores/analysisStore.ts',
        // Panels
        'src/panels/workspace/WorkspacePanel.tsx',
        'src/panels/workspace/ReadView.tsx',
        'src/panels/workspace/NetworkView.tsx',
        'src/panels/workspace/NetworkSettings.tsx',
        'src/panels/workspace/DetailView.tsx',
        // inspector deleted
        // Shared components
        'src/components/shared/ObjBlock.tsx',
        // Detail
        'src/components/detail/EntryDetail.tsx',
        'src/components/shared/ObjRef.tsx',
        // Lib
        'src/lib/graph2d.ts',
        'src/lib/apiBase.ts',
        'src/components/objNumbering.ts',
        'src/components/MarkdownRenderer.tsx',
        // Hooks
        'src/hooks/useProjectLoader.ts',
        'src/hooks/useKeyboardShortcuts.ts',
        'src/hooks/useAnalysisData.ts',
        // Sort config (moved from assets/ to src/lib/)
        'src/lib/sortConfig.ts',
        // Page
        'src/app/local/edit/page.tsx',
        'src/app/page.tsx',
    ]

    for (const file of requiredFiles) {
        it(`${file} 存在`, () => {
            expect(fs.existsSync(file)).toBe(true)
        })
    }
})

// ── 旧代码必须已删除 ──

describe('旧代码无残留', () => {
    const deletedPaths = [
        'src/components/graph',
        'src/components/graph3d',
        'src/components/inspector',
        'src/components/canvas',
        'src/components/panels/SettingsPanel.tsx',
        'src/lib/canvasStore.ts',
        'src/lib/store.ts',
        'src/lib/lensStore.ts',
        'src/lib/selectionStore.ts',
        'src/lib/history',
        'src/lib/layout',
        'src/lib/lenses',
        'src/workers',
        'src/panels/controls/ControlsPanel.tsx',
        'src/hooks/useUndoShortcuts.ts',
        'src/hooks/useLspIndex.ts',
        'src/hooks/useFileWatch.ts',
        'src/components/LensPicker.tsx',
        'src/components/LensIndicator.tsx',
        'src/components/SearchPanel.tsx',
        'src/components/NetworkRead.tsx',
    ]

    for (const p of deletedPaths) {
        it(`${p} 已删除`, () => {
            expect(fs.existsSync(p)).toBe(false)
        })
    }
})

// ── 新代码不引用旧模块 ──

describe('新代码无旧依赖', () => {
    const newFiles = [
        'src/panels/workspace/NetworkView.tsx',
        'src/panels/workspace/ReadView.tsx',
        'src/panels/workspace/DetailView.tsx',
        'src/panels/workspace/NetworkSettings.tsx',
        'src/panels/inspector/CardStack.tsx',
        'src/components/shared/ObjBlock.tsx',
        'src/components/detail/EntryDetail.tsx',
        'src/components/shared/ObjRef.tsx',
        'src/components/MarkdownRenderer.tsx',
        'src/hooks/useProjectLoader.ts',
        'src/hooks/useKeyboardShortcuts.ts',
        'src/app/local/edit/page.tsx',
    ]

    const bannedImports = [
        'canvasStore',
        'lib/store',
        'lensStore',
        'selectionStore',
        'graph3d',
        'components/graph/',
        'components/inspector/',
        'components/panels/',
        'components/canvas/',
        'lib/history/',
        'lib/layout/',
        'lib/lenses/',
        'selectNodeUndoable',
        'useLspIndex',
    ]

    for (const file of newFiles) {
        it(`${file} 不 import 旧模块`, () => {
            const content = fs.readFileSync(file, 'utf-8')
            for (const banned of bannedImports) {
                expect(content).not.toContain(banned)
            }
        })
    }
})
