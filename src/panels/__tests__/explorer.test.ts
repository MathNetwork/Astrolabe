/**
 * ExplorerPanel 测试（TDD — 先写测试）
 *
 * Explorer 面板有两个可折叠区块：PLUGINS 和 FILES。
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'

describe('ExplorerPanel 区块', () => {
    const source = fs.readFileSync('src/panels/explorer/ExplorerPanel.tsx', 'utf-8')

    it('有 PLUGINS section header', () => {
        expect(source).toMatch(/PLUGINS|Plugins/i)
    })

    it('有 FILES section header', () => {
        expect(source).toMatch(/FILES|Files/i)
    })

    it('有折叠状态管理（useState）', () => {
        expect(source).toContain('useState')
    })

    it('有点击 toggle 的 onClick handler', () => {
        expect(source).toContain('onClick')
    })

    it('PLUGINS 区块有占位文字', () => {
        expect(source).toMatch(/No plugins|no plugins/i)
    })

    it('FILES 区块有占位文字', () => {
        expect(source).toMatch(/No project|no project/i)
    })

    it('两个区块之间有分隔', () => {
        // 应该有 border 分隔线
        expect(source).toMatch(/border-[bt]|divide/)
    })
})

describe('ExplorerPanel PLUGINS 数据', () => {
    const source = fs.readFileSync('src/panels/explorer/ExplorerPanel.tsx', 'utf-8')

    it('从 dataStore 读取插件列表', () => {
        expect(source).toContain('useDataStore')
        expect(source).toMatch(/plugins|\.plugins/)
    })

    it('渲染插件名称', () => {
        // 应该有 plugin.name 或 p.name 的渲染
        expect(source).toMatch(/\.name\b/)
    })

    it('无插件时显示占位文字', () => {
        expect(source).toMatch(/No plugins|no plugins/i)
    })

    it('插件卡片有 hover 效果', () => {
        expect(source).toMatch(/hover:bg/)
    })

    it('插件类型用彩色 badge 显示', () => {
        // 不同类型不同颜色
        expect(source).toMatch(/ANALYSIS|IMPORT/i)
        expect(source).toMatch(/bg-.*\/|badge|rounded/i)
    })
})

describe('ExplorerPanel 插件详情弹窗', () => {
    const source = fs.readFileSync('src/panels/explorer/ExplorerPanel.tsx', 'utf-8')

    it('有 Modal 弹窗组件', () => {
        expect(source).toMatch(/PluginModal|pluginModal|Modal/)
    })

    it('点击插件卡片设置 selectedPlugin 状态', () => {
        expect(source).toMatch(/selectedPlugin|setSelectedPlugin/)
    })

    it('Modal 显示插件名称和版本', () => {
        expect(source).toMatch(/\.name\b/)
        expect(source).toMatch(/\.version\b/)
    })

    it('Modal 显示 endpoints 列表', () => {
        expect(source).toMatch(/analysis_endpoints|endpoints/i)
    })

    it('Modal 显示 skills 列表', () => {
        expect(source).toMatch(/\.skills|skill/i)
    })

    it('Modal 显示作者', () => {
        expect(source).toMatch(/author|Author/i)
    })

    it('Modal 显示描述', () => {
        expect(source).toMatch(/description|Description/i)
    })

    it('Modal 显示更新日期', () => {
        expect(source).toMatch(/updated_at|Updated/i)
    })

    it('Modal 有关闭按钮', () => {
        expect(source).toMatch(/XMarkIcon|close|onClose/i)
    })

    it('Modal 有遮罩层', () => {
        expect(source).toMatch(/bg-black\/|backdrop|overlay|fixed.*inset/i)
    })
})

describe('dataStore 插件数据', () => {
    const storeSource = fs.readFileSync('src/stores/dataStore.ts', 'utf-8')

    it('dataStore 有 plugins 字段', () => {
        expect(storeSource).toMatch(/plugins\s*:/)
    })

    it('dataStore 有 setPlugins action', () => {
        expect(storeSource).toContain('setPlugins')
    })
})

describe('useProjectLoader 存储插件数据', () => {
    const loaderSource = fs.readFileSync('src/hooks/useProjectLoader.ts', 'utf-8')

    it('把插件数据写入 dataStore', () => {
        expect(loaderSource).toContain('setPlugins')
    })
})

describe('ExplorerPanel FILES 区块', () => {
    const source = fs.readFileSync('src/panels/explorer/ExplorerPanel.tsx', 'utf-8')

    it('从 dataStore 读取文件树', () => {
        expect(source).toMatch(/projectFiles|fileTree|files/)
    })

    it('渲染文件名', () => {
        expect(source).toMatch(/\.name\b/)
    })

    it('区分文件和文件夹图标', () => {
        expect(source).toMatch(/FolderIcon|folder/i)
        expect(source).toMatch(/DocumentIcon|document/i)
    })

    it('文件夹可展开显示子内容', () => {
        expect(source).toMatch(/children/)
    })

    it('无文件数据时显示占位文字', () => {
        expect(source).toMatch(/No project|no project/i)
    })
})

describe('dataStore 文件树数据', () => {
    const storeSource = fs.readFileSync('src/stores/dataStore.ts', 'utf-8')

    it('dataStore 有 projectFiles 字段', () => {
        expect(storeSource).toMatch(/projectFiles/)
    })

    it('dataStore 有 setProjectFiles action', () => {
        expect(storeSource).toContain('setProjectFiles')
    })
})

describe('useProjectLoader 加载文件树', () => {
    const loaderSource = fs.readFileSync('src/hooks/useProjectLoader.ts', 'utf-8')

    it('fetch /api/project/files', () => {
        expect(loaderSource).toContain('/api/project/files')
    })

    it('写入 setProjectFiles', () => {
        expect(loaderSource).toContain('setProjectFiles')
    })
})
