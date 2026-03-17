'use client'

/**
 * WorkspacePanel — 中栏：主工作区
 *
 * 两种布局模式：
 *   - single: 一个框，三个 tab 切换（Read/Network/Detail）
 *   - split:  左大（65%）+ 右上下两个（各 50%），用户选择哪个 View 放哪
 */
import { memo, useState } from 'react'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { useViewStore } from '@/stores/viewStore'
import { BookOpenIcon, CubeTransparentIcon, DocumentMagnifyingGlassIcon, Squares2X2Icon, ViewColumnsIcon } from '@heroicons/react/24/outline'
import { ReadView } from './ReadView'
import { NetworkView } from './NetworkView'
import { DetailView } from './DetailView'

type ViewTab = 'read' | 'network' | 'detail'

const VIEW_TABS: { id: ViewTab; Icon: typeof BookOpenIcon; label: string }[] = [
    { id: 'read', Icon: BookOpenIcon, label: 'Read' },
    { id: 'network', Icon: CubeTransparentIcon, label: 'Network' },
    { id: 'detail', Icon: DocumentMagnifyingGlassIcon, label: 'Detail' },
]

function ViewByTab({ tab }: { tab: ViewTab }) {
    switch (tab) {
        case 'read': return <ReadView />
        case 'network': return <NetworkView />
        case 'detail': return <DetailView />
    }
}

function HHandle() {
    return <PanelResizeHandle className="w-px bg-white/10 hover:bg-white/30 transition-colors" />
}

function VHandle() {
    return <PanelResizeHandle className="h-px bg-white/10 hover:bg-white/30 transition-colors" />
}

export const WorkspacePanel = memo(function WorkspacePanel() {
    const viewMode = useViewStore(s => s.viewMode)
    const setViewMode = useViewStore(s => s.setViewMode)

    // single 模式下的当前 tab
    const [singleTab, setSingleTab] = useState<ViewTab>('read')
    // split 模式下三个位置各显示什么
    const [leftView, setLeftView] = useState<ViewTab>('read')
    const [rightTopView, setRightTopView] = useState<ViewTab>('network')
    const [rightBottomView, setRightBottomView] = useState<ViewTab>('detail')

    // 布局切换按钮（右上角）
    const layoutSwitcher = (
        <div className="flex items-center gap-1">
            <button
                onClick={() => setViewMode('single')}
                className={`p-1 rounded transition-colors ${viewMode === 'single' ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/60'}`}
                title="Single view"
            >
                <Squares2X2Icon className="w-4 h-4" />
            </button>
            <button
                onClick={() => setViewMode('read')}
                className={`p-1 rounded transition-colors ${viewMode === 'read' ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/60'}`}
                title="Split view"
            >
                <ViewColumnsIcon className="w-4 h-4" />
            </button>
        </div>
    )

    // Single: 一个框 + tab 切换
    if (viewMode === 'single') {
        return (
            <div className="h-full w-full flex flex-col bg-[#0a0a0f]">
                <div className="h-8 flex items-center justify-between px-3 border-b border-white/10 shrink-0 bg-black/40">
                    <div className="flex items-center gap-1">
                        {VIEW_TABS.map(({ id, Icon, label }) => (
                            <button
                                key={id}
                                onClick={() => setSingleTab(id)}
                                className={`flex items-center gap-1 px-2 py-1 text-[10px] uppercase tracking-wider font-medium rounded transition-colors ${
                                    singleTab === id ? 'text-white bg-white/10' : 'text-white/30 hover:text-white/60'
                                }`}
                            >
                                <Icon className="w-3.5 h-3.5" />
                                {label}
                            </button>
                        ))}
                    </div>
                    {layoutSwitcher}
                </div>
                <div className="flex-1 min-h-0">
                    <ViewByTab tab={singleTab} />
                </div>
            </div>
        )
    }

    // Split: 左大 + 右上下
    return (
        <div className="h-full w-full flex flex-col bg-[#0a0a0f]">
            <div className="h-8 flex items-center justify-end px-3 border-b border-white/10 shrink-0 bg-black/40">
                {layoutSwitcher}
            </div>
            <PanelGroup direction="horizontal" className="flex-1" autoSaveId="ws-split-h">
                <Panel id="ws-left" defaultSize={65} minSize={20}>
                    <ViewByTab tab={leftView} />
                </Panel>
                <HHandle />
                <Panel id="ws-right" defaultSize={35} minSize={15}>
                    <PanelGroup direction="vertical" className="h-full" autoSaveId="ws-split-v">
                        <Panel id="ws-right-top" defaultSize={50} minSize={10}>
                            <ViewByTab tab={rightTopView} />
                        </Panel>
                        <VHandle />
                        <Panel id="ws-right-bottom" defaultSize={50} minSize={10}>
                            <ViewByTab tab={rightBottomView} />
                        </Panel>
                    </PanelGroup>
                </Panel>
            </PanelGroup>
        </div>
    )
})
