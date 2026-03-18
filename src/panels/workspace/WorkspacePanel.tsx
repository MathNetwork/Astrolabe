'use client'

/**
 * WorkspacePanel — 中栏：主工作区
 *
 * 两层解耦：
 *   1. layoutMode（viewStore）：slot 的空间排列方式
 *   2. slots（本地 state）：哪个 view 绑定到哪个 slot
 */
import { memo, useState, useEffect } from 'react'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { useViewStore, type LayoutMode } from '@/stores/viewStore'
import { BookOpenIcon, CubeTransparentIcon, DocumentMagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { ReadView } from './ReadView'
import { NetworkView } from './NetworkView'
import { DetailView } from './DetailView'

// ── Types ──

type ViewTab = 'read' | 'network' | 'detail'

const VIEW_TABS: { id: ViewTab; Icon: typeof BookOpenIcon; label: string }[] = [
    { id: 'read', Icon: BookOpenIcon, label: 'Read' },
    { id: 'network', Icon: CubeTransparentIcon, label: 'Network' },
    { id: 'detail', Icon: DocumentMagnifyingGlassIcon, label: 'Detail' },
]

// ── Layout Icons (custom SVG) ──

function LayoutIcon({ mode, active }: { mode: LayoutMode; active: boolean }) {
    const s = active ? '#fff' : '#666'
    const f = active ? '#fff2' : 'none'
    const icons: Record<LayoutMode, JSX.Element> = {
        'single': <rect x="0.5" y="0.5" width="13" height="9" rx="1" stroke={s} fill={f} strokeWidth="0.8" />,
        'split-right': <>
            <rect x="0.5" y="0.5" width="8" height="9" rx="1" stroke={s} fill={f} strokeWidth="0.8" />
            <rect x="9.5" y="0.5" width="4" height="4" rx="0.5" stroke={s} fill="none" strokeWidth="0.8" />
            <rect x="9.5" y="5.5" width="4" height="4" rx="0.5" stroke={s} fill="none" strokeWidth="0.8" />
        </>,
        'split-left': <>
            <rect x="0.5" y="0.5" width="4" height="4" rx="0.5" stroke={s} fill="none" strokeWidth="0.8" />
            <rect x="0.5" y="5.5" width="4" height="4" rx="0.5" stroke={s} fill="none" strokeWidth="0.8" />
            <rect x="5.5" y="0.5" width="8" height="9" rx="1" stroke={s} fill={f} strokeWidth="0.8" />
        </>,
        'split-bottom': <>
            <rect x="0.5" y="0.5" width="13" height="5" rx="1" stroke={s} fill={f} strokeWidth="0.8" />
            <rect x="0.5" y="6.5" width="6" height="3" rx="0.5" stroke={s} fill="none" strokeWidth="0.8" />
            <rect x="7.5" y="6.5" width="6" height="3" rx="0.5" stroke={s} fill="none" strokeWidth="0.8" />
        </>,
        'split-top': <>
            <rect x="0.5" y="0.5" width="6" height="3" rx="0.5" stroke={s} fill="none" strokeWidth="0.8" />
            <rect x="7.5" y="0.5" width="6" height="3" rx="0.5" stroke={s} fill="none" strokeWidth="0.8" />
            <rect x="0.5" y="4.5" width="13" height="5" rx="1" stroke={s} fill={f} strokeWidth="0.8" />
        </>,
        'three-equal': <>
            <rect x="0.5" y="0.5" width="3.5" height="9" rx="0.5" stroke={s} fill={f} strokeWidth="0.8" />
            <rect x="5.25" y="0.5" width="3.5" height="9" rx="0.5" stroke={s} fill="none" strokeWidth="0.8" />
            <rect x="10" y="0.5" width="3.5" height="9" rx="0.5" stroke={s} fill="none" strokeWidth="0.8" />
        </>,
    }
    return <svg width="14" height="10" viewBox="0 0 14 10">{icons[mode]}</svg>
}

const LAYOUT_IDS: LayoutMode[] = ['single', 'split-right', 'split-left', 'split-bottom', 'split-top', 'three-equal']

// ── Sub-components ──

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

/**
 * Slot: 一个带 view-selector 头部的面板区域
 * slotIndex: 0/1/2 对应 slot1/2/3
 */
function Slot({ index, slots, assignView }: {
    index: number
    slots: [ViewTab, ViewTab, ViewTab]
    assignView: (view: ViewTab, slot: number) => void
}) {
    return (
        <div className="h-full flex flex-col">
            <div className="h-6 flex items-center gap-0.5 px-2 bg-black/60 border-b border-white/5 shrink-0">
                {VIEW_TABS.map(({ id, Icon }) => (
                    <button
                        key={id}
                        onClick={() => assignView(id, index)}
                        className={`p-0.5 rounded transition-colors ${
                            slots[index] === id ? 'text-white/70' : 'text-white/20 hover:text-white/40'
                        }`}
                        title={`Show ${id} here`}
                    >
                        <Icon className="w-3 h-3" />
                    </button>
                ))}
            </div>
            <div className="flex-1 min-h-0">
                <ViewByTab tab={slots[index]} />
            </div>
        </div>
    )
}

/**
 * 多 slot 布局渲染器
 * 根据 layoutMode 排列 3 个 Slot
 */
function MultiLayout({ layoutMode, slots, assignView, autoSavePrefix }: {
    layoutMode: LayoutMode
    slots: [ViewTab, ViewTab, ViewTab]
    assignView: (view: ViewTab, slot: number) => void
    autoSavePrefix: string
}) {
    const s = (i: number) => <Slot index={i} slots={slots} assignView={assignView} />
    const p = autoSavePrefix

    // 大 slot + 两小 slot 竖排（split-right / split-left）
    if (layoutMode === 'split-right' || layoutMode === 'split-left') {
        const bigFirst = layoutMode === 'split-right'
        return (
            <PanelGroup direction="horizontal" className="flex-1" autoSaveId={`${p}-h`}>
                {bigFirst ? (
                    <>
                        <Panel id={`${p}-big`} defaultSize={65} minSize={20}>{s(0)}</Panel>
                        <HHandle />
                        <Panel id={`${p}-sm`} defaultSize={35} minSize={15}>
                            <PanelGroup direction="vertical" className="h-full" autoSaveId={`${p}-v`}>
                                <Panel id={`${p}-2`} defaultSize={50} minSize={10}>{s(1)}</Panel>
                                <VHandle />
                                <Panel id={`${p}-3`} defaultSize={50} minSize={10}>{s(2)}</Panel>
                            </PanelGroup>
                        </Panel>
                    </>
                ) : (
                    <>
                        <Panel id={`${p}-sm`} defaultSize={35} minSize={15}>
                            <PanelGroup direction="vertical" className="h-full" autoSaveId={`${p}-v`}>
                                <Panel id={`${p}-2`} defaultSize={50} minSize={10}>{s(1)}</Panel>
                                <VHandle />
                                <Panel id={`${p}-3`} defaultSize={50} minSize={10}>{s(2)}</Panel>
                            </PanelGroup>
                        </Panel>
                        <HHandle />
                        <Panel id={`${p}-big`} defaultSize={65} minSize={20}>{s(0)}</Panel>
                    </>
                )}
            </PanelGroup>
        )
    }

    // 大 slot + 两小 slot 横排（split-bottom / split-top）
    if (layoutMode === 'split-bottom' || layoutMode === 'split-top') {
        const bigFirst = layoutMode === 'split-bottom'
        return (
            <PanelGroup direction="vertical" className="flex-1" autoSaveId={`${p}-v`}>
                {bigFirst ? (
                    <>
                        <Panel id={`${p}-big`} defaultSize={60} minSize={20}>{s(0)}</Panel>
                        <VHandle />
                        <Panel id={`${p}-sm`} defaultSize={40} minSize={15}>
                            <PanelGroup direction="horizontal" className="h-full" autoSaveId={`${p}-h`}>
                                <Panel id={`${p}-2`} defaultSize={50} minSize={10}>{s(1)}</Panel>
                                <HHandle />
                                <Panel id={`${p}-3`} defaultSize={50} minSize={10}>{s(2)}</Panel>
                            </PanelGroup>
                        </Panel>
                    </>
                ) : (
                    <>
                        <Panel id={`${p}-sm`} defaultSize={40} minSize={15}>
                            <PanelGroup direction="horizontal" className="h-full" autoSaveId={`${p}-h`}>
                                <Panel id={`${p}-2`} defaultSize={50} minSize={10}>{s(1)}</Panel>
                                <HHandle />
                                <Panel id={`${p}-3`} defaultSize={50} minSize={10}>{s(2)}</Panel>
                            </PanelGroup>
                        </Panel>
                        <VHandle />
                        <Panel id={`${p}-big`} defaultSize={60} minSize={20}>{s(0)}</Panel>
                    </>
                )}
            </PanelGroup>
        )
    }

    // three-equal: 三列均分
    return (
        <PanelGroup direction="horizontal" className="flex-1" autoSaveId={`${p}-h`}>
            <Panel id={`${p}-1`} defaultSize={34} minSize={15}>{s(0)}</Panel>
            <HHandle />
            <Panel id={`${p}-2`} defaultSize={33} minSize={15}>{s(1)}</Panel>
            <HHandle />
            <Panel id={`${p}-3`} defaultSize={33} minSize={15}>{s(2)}</Panel>
        </PanelGroup>
    )
}

// ── Main Component ──

export const WorkspacePanel = memo(function WorkspacePanel() {
    const layoutMode = useViewStore(s => s.layoutMode)
    const setLayoutMode = useViewStore(s => s.setLayoutMode)
    const activeTab = useViewStore(s => s.activeTab)

    const [singleTab, setSingleTab] = useState<ViewTab>('read')

    // 快捷键 Cmd+1/2/3 通过 viewStore.activeTab 触发
    useEffect(() => {
        if (activeTab) setSingleTab(activeTab)
    }, [activeTab])
    const [slots, setSlots] = useState<[ViewTab, ViewTab, ViewTab]>(['read', 'network', 'detail'])

    const assignViewToSlot = (view: ViewTab, targetSlot: number) => {
        const currentSlot = slots.indexOf(view)
        if (currentSlot === targetSlot) return
        const newSlots = [...slots] as [ViewTab, ViewTab, ViewTab]
        newSlots[targetSlot] = view
        newSlots[currentSlot] = slots[targetSlot]
        setSlots(newSlots)
    }

    const layoutSwitcher = (
        <div className="flex items-center gap-0.5">
            {LAYOUT_IDS.map(id => (
                <button
                    key={id}
                    onClick={() => setLayoutMode(id)}
                    className={`p-1 rounded transition-colors ${layoutMode === id ? 'bg-white/10' : 'hover:bg-white/5'}`}
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

    // Multiple: 根据 layoutMode 排列 3 个 slot
    return (
        <div className="h-full w-full flex flex-col bg-[#0a0a0f]">
            <div className="h-8 flex items-center justify-end px-3 border-b border-white/10 shrink-0 bg-black/40">
                {layoutSwitcher}
            </div>
            <MultiLayout
                layoutMode={layoutMode}
                slots={slots}
                assignView={assignViewToSlot}
                autoSavePrefix={`ws-${layoutMode}`}
            />
        </div>
    )
})
