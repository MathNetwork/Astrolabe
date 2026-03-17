'use client'

/**
 * WorkspacePanel — 中栏：主工作区
 *
 * 两层解耦：
 *   1. layoutMode（viewStore）：slot 的空间排列方式
 *      - single: 一个 slot，tab 切换 Read/Network/Detail
 *      - split-right: 左大(slot1) + 右上(slot2) + 右下(slot3)
 *
 *   2. slots（本地 state）：哪个 view 绑定到哪个 slot
 *      - 每个 slot 头部有 3 个 icon，点击交换 view 位置
 *      - 布局变化不影响绑定，绑定变化不影响布局
 */
import { memo, useState } from 'react'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { useViewStore, type LayoutMode } from '@/stores/viewStore'
import { BookOpenIcon, CubeTransparentIcon, DocumentMagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { ReadView } from './ReadView'
import { NetworkView } from './NetworkView'
import { DetailView } from './DetailView'

type ViewTab = 'read' | 'network' | 'detail'

const VIEW_TABS: { id: ViewTab; Icon: typeof BookOpenIcon; label: string }[] = [
    { id: 'read', Icon: BookOpenIcon, label: 'Read' },
    { id: 'network', Icon: CubeTransparentIcon, label: 'Network' },
    { id: 'detail', Icon: DocumentMagnifyingGlassIcon, label: 'Detail' },
]

function LayoutIcon({ mode, active }: { mode: LayoutMode; active: boolean }) {
    const s = active ? '#fff' : '#666'
    const f = active ? '#fff2' : 'none'
    return (
        <svg width="14" height="10" viewBox="0 0 14 10">
            {mode === 'single' && (
                <rect x="0.5" y="0.5" width="13" height="9" rx="1" stroke={s} fill={f} strokeWidth="0.8" />
            )}
            {mode === 'split-right' && <>
                <rect x="0.5" y="0.5" width="8" height="9" rx="1" stroke={s} fill={f} strokeWidth="0.8" />
                <rect x="9.5" y="0.5" width="4" height="4" rx="0.5" stroke={s} fill="none" strokeWidth="0.8" />
                <rect x="9.5" y="5.5" width="4" height="4" rx="0.5" stroke={s} fill="none" strokeWidth="0.8" />
            </>}
            {mode === 'split-bottom' && <>
                <rect x="0.5" y="0.5" width="13" height="5" rx="1" stroke={s} fill={f} strokeWidth="0.8" />
                <rect x="0.5" y="6.5" width="6" height="3" rx="0.5" stroke={s} fill="none" strokeWidth="0.8" />
                <rect x="7.5" y="6.5" width="6" height="3" rx="0.5" stroke={s} fill="none" strokeWidth="0.8" />
            </>}
            {mode === 'split-left' && <>
                <rect x="0.5" y="0.5" width="4" height="4" rx="0.5" stroke={s} fill="none" strokeWidth="0.8" />
                <rect x="0.5" y="5.5" width="4" height="4" rx="0.5" stroke={s} fill="none" strokeWidth="0.8" />
                <rect x="5.5" y="0.5" width="8" height="9" rx="1" stroke={s} fill={f} strokeWidth="0.8" />
            </>}
            {mode === 'split-top' && <>
                <rect x="0.5" y="0.5" width="6" height="3" rx="0.5" stroke={s} fill="none" strokeWidth="0.8" />
                <rect x="7.5" y="0.5" width="6" height="3" rx="0.5" stroke={s} fill="none" strokeWidth="0.8" />
                <rect x="0.5" y="4.5" width="13" height="5" rx="1" stroke={s} fill={f} strokeWidth="0.8" />
            </>}
            {mode === 'three-equal' && <>
                <rect x="0.5" y="0.5" width="3.5" height="9" rx="0.5" stroke={s} fill={f} strokeWidth="0.8" />
                <rect x="5.25" y="0.5" width="3.5" height="9" rx="0.5" stroke={s} fill="none" strokeWidth="0.8" />
                <rect x="10" y="0.5" width="3.5" height="9" rx="0.5" stroke={s} fill="none" strokeWidth="0.8" />
            </>}
        </svg>
    )
}

const LAYOUT_IDS: LayoutMode[] = ['single', 'split-right', 'split-left', 'split-bottom', 'split-top', 'three-equal']

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
    const layoutMode = useViewStore(s => s.layoutMode)
    const setLayoutMode = useViewStore(s => s.setLayoutMode)

    // single 模式下的当前 tab
    const [singleTab, setSingleTab] = useState<ViewTab>('read')

    // view → slot 绑定（独立于 layoutMode）
    // slots[0]=slot1(左大), slots[1]=slot2(右上), slots[2]=slot3(右下)
    const [slots, setSlots] = useState<[ViewTab, ViewTab, ViewTab]>(['read', 'network', 'detail'])

    const assignViewToSlot = (view: ViewTab, targetSlot: number) => {
        const currentSlot = slots.indexOf(view)
        if (currentSlot === targetSlot) return
        const newSlots = [...slots] as [ViewTab, ViewTab, ViewTab]
        newSlots[targetSlot] = view
        newSlots[currentSlot] = slots[targetSlot]
        setSlots(newSlots)
    }

    // 布局切换按钮（右上角）
    const layoutSwitcher = (
        <div className="flex items-center gap-0.5">
            {LAYOUT_IDS.map(id => (
                <button
                    key={id}
                    onClick={() => setLayoutMode(id)}
                    className={`p-1 rounded transition-colors ${
                        layoutMode === id ? 'bg-white/10' : 'hover:bg-white/5'
                    }`}
                    title={id}
                >
                    <LayoutIcon mode={id} active={layoutMode === id} />
                </button>
            ))}
        </div>
    )

    // Single: 一个框 + tab 切换
    if (layoutMode === 'single') {
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

    // split-right: 左大(slot1) + 右上(slot2) + 右下(slot3)
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

    const slot = (i: number) => (
        <div className="h-full flex flex-col">
            {slotHeader(i)}
            <div className="flex-1 min-h-0"><ViewByTab tab={slots[i]} /></div>
        </div>
    )

    const topBar = (
        <div className="h-8 flex items-center justify-end px-3 border-b border-white/10 shrink-0 bg-black/40">
            {layoutSwitcher}
        </div>
    )

    // split-right: 左大(1) + 右上(2) + 右下(3)
    if (layoutMode === 'split-right') {
        return (
            <div className="h-full w-full flex flex-col bg-[#0a0a0f]">
                {topBar}
                <PanelGroup direction="horizontal" className="flex-1" autoSaveId="ws-sr-h">
                    <Panel id="ws-sr-1" defaultSize={65} minSize={20}>{slot(0)}</Panel>
                    <HHandle />
                    <Panel id="ws-sr-23" defaultSize={35} minSize={15}>
                        <PanelGroup direction="vertical" className="h-full" autoSaveId="ws-sr-v">
                            <Panel id="ws-sr-2" defaultSize={50} minSize={10}>{slot(1)}</Panel>
                            <VHandle />
                            <Panel id="ws-sr-3" defaultSize={50} minSize={10}>{slot(2)}</Panel>
                        </PanelGroup>
                    </Panel>
                </PanelGroup>
            </div>
        )
    }

    // split-bottom: 上大(1) + 下左(2) + 下右(3)
    if (layoutMode === 'split-bottom') {
        return (
            <div className="h-full w-full flex flex-col bg-[#0a0a0f]">
                {topBar}
                <PanelGroup direction="vertical" className="flex-1" autoSaveId="ws-sb-v">
                    <Panel id="ws-sb-1" defaultSize={60} minSize={20}>{slot(0)}</Panel>
                    <VHandle />
                    <Panel id="ws-sb-23" defaultSize={40} minSize={15}>
                        <PanelGroup direction="horizontal" className="h-full" autoSaveId="ws-sb-h">
                            <Panel id="ws-sb-2" defaultSize={50} minSize={10}>{slot(1)}</Panel>
                            <HHandle />
                            <Panel id="ws-sb-3" defaultSize={50} minSize={10}>{slot(2)}</Panel>
                        </PanelGroup>
                    </Panel>
                </PanelGroup>
            </div>
        )
    }

    // split-left: 左上(2) + 左下(3) + 右大(1)
    if (layoutMode === 'split-left') {
        return (
            <div className="h-full w-full flex flex-col bg-[#0a0a0f]">
                {topBar}
                <PanelGroup direction="horizontal" className="flex-1" autoSaveId="ws-sl-h">
                    <Panel id="ws-sl-23" defaultSize={35} minSize={15}>
                        <PanelGroup direction="vertical" className="h-full" autoSaveId="ws-sl-v">
                            <Panel id="ws-sl-2" defaultSize={50} minSize={10}>{slot(1)}</Panel>
                            <VHandle />
                            <Panel id="ws-sl-3" defaultSize={50} minSize={10}>{slot(2)}</Panel>
                        </PanelGroup>
                    </Panel>
                    <HHandle />
                    <Panel id="ws-sl-1" defaultSize={65} minSize={20}>{slot(0)}</Panel>
                </PanelGroup>
            </div>
        )
    }

    // split-top: 上左(2) + 上右(3) + 下大(1)
    if (layoutMode === 'split-top') {
        return (
            <div className="h-full w-full flex flex-col bg-[#0a0a0f]">
                {topBar}
                <PanelGroup direction="vertical" className="flex-1" autoSaveId="ws-st-v">
                    <Panel id="ws-st-23" defaultSize={40} minSize={15}>
                        <PanelGroup direction="horizontal" className="h-full" autoSaveId="ws-st-h">
                            <Panel id="ws-st-2" defaultSize={50} minSize={10}>{slot(1)}</Panel>
                            <HHandle />
                            <Panel id="ws-st-3" defaultSize={50} minSize={10}>{slot(2)}</Panel>
                        </PanelGroup>
                    </Panel>
                    <VHandle />
                    <Panel id="ws-st-1" defaultSize={60} minSize={20}>{slot(0)}</Panel>
                </PanelGroup>
            </div>
        )
    }

    // three-equal: 三列均分(1 | 2 | 3)
    return (
        <div className="h-full w-full flex flex-col bg-[#0a0a0f]">
            {topBar}
            <PanelGroup direction="horizontal" className="flex-1" autoSaveId="ws-3e-h">
                <Panel id="ws-3e-1" defaultSize={34} minSize={15}>{slot(0)}</Panel>
                <HHandle />
                <Panel id="ws-3e-2" defaultSize={33} minSize={15}>{slot(1)}</Panel>
                <HHandle />
                <Panel id="ws-3e-3" defaultSize={33} minSize={15}>{slot(2)}</Panel>
            </PanelGroup>
        </div>
    )
})
