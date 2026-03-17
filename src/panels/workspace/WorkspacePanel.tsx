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
import { BookOpenIcon, CubeTransparentIcon, DocumentMagnifyingGlassIcon, StopIcon, Squares2X2Icon } from '@heroicons/react/24/outline'
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
    // multiple 模式下三个 slot 分别显示什么 view
    // slots[0]=左大, slots[1]=右上, slots[2]=右下
    const [slots, setSlots] = useState<[ViewTab, ViewTab, ViewTab]>(['read', 'network', 'detail'])

    // 把某个 view 分配到指定 slot，其他 view 自动填充剩余 slot
    const assignViewToSlot = (view: ViewTab, targetSlot: number) => {
        const currentSlot = slots.indexOf(view)
        if (currentSlot === targetSlot) return
        const newSlots = [...slots] as [ViewTab, ViewTab, ViewTab]
        // 交换
        newSlots[targetSlot] = view
        newSlots[currentSlot] = slots[targetSlot]
        setSlots(newSlots)
    }

    // 布局切换按钮（右上角）
    const layoutSwitcher = (
        <div className="flex items-center gap-1">
            <button
                onClick={() => setViewMode('single')}
                className={`p-1 rounded transition-colors ${viewMode === 'single' ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/60'}`}
                title="Single view"
            >
                <StopIcon className="w-4 h-4" />
            </button>
            <button
                onClick={() => setViewMode('multiple')}
                className={`p-1 rounded transition-colors ${viewMode === 'multiple' ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/60'}`}
                title="Multiple views"
            >
                <Squares2X2Icon className="w-4 h-4" />
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

    // Multiple: 左大 + 右上下，每个 slot 头部有 view 选择器
    const slotHeader = (slotIndex: number) => (
        <div className="h-6 flex items-center gap-0.5 px-2 bg-black/60 border-b border-white/5 shrink-0">
            {VIEW_TABS.map(({ id, Icon }) => (
                <button
                    key={id}
                    onClick={() => assignViewToSlot(id, slotIndex)}
                    className={`p-0.5 rounded transition-colors ${
                        slots[slotIndex] === id ? 'text-white/70' : 'text-white/20 hover:text-white/40'
                    }`}
                    title={`Show ${id} here`}
                >
                    <Icon className="w-3 h-3" />
                </button>
            ))}
        </div>
    )

    return (
        <div className="h-full w-full flex flex-col bg-[#0a0a0f]">
            <div className="h-8 flex items-center justify-end px-3 border-b border-white/10 shrink-0 bg-black/40">
                {layoutSwitcher}
            </div>
            <PanelGroup direction="horizontal" className="flex-1" autoSaveId="ws-multi-h">
                <Panel id="ws-left" defaultSize={65} minSize={20}>
                    <div className="h-full flex flex-col">
                        {slotHeader(0)}
                        <div className="flex-1 min-h-0"><ViewByTab tab={slots[0]} /></div>
                    </div>
                </Panel>
                <HHandle />
                <Panel id="ws-right" defaultSize={35} minSize={15}>
                    <PanelGroup direction="vertical" className="h-full" autoSaveId="ws-multi-v">
                        <Panel id="ws-right-top" defaultSize={50} minSize={10}>
                            <div className="h-full flex flex-col">
                                {slotHeader(1)}
                                <div className="flex-1 min-h-0"><ViewByTab tab={slots[1]} /></div>
                            </div>
                        </Panel>
                        <VHandle />
                        <Panel id="ws-right-bottom" defaultSize={50} minSize={10}>
                            <div className="h-full flex flex-col">
                                {slotHeader(2)}
                                <div className="flex-1 min-h-0"><ViewByTab tab={slots[2]} /></div>
                            </div>
                        </Panel>
                    </PanelGroup>
                </Panel>
            </PanelGroup>
        </div>
    )
})
