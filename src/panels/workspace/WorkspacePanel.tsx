'use client'

/**
 * WorkspacePanel — 中栏：主工作区
 *
 * 三个 View（Read/Network/Detail）只挂载一次，永不卸载。
 * 布局切换和 tab 切换都用 CSS hidden 控制可见性。
 */
import { memo, useState, useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
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

// ── Layout Icons ──

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

// ── Portal Slot：View 通过 portal 渲染到 slot 容器 ──

function PortalSlot({ target, children }: { target: HTMLElement | null; children: ReactNode }) {
    if (!target) return null
    return createPortal(children, target)
}

// ── Resize Handles ──

function HHandle() {
    return <PanelResizeHandle className="w-px bg-white/10 hover:bg-white/30 transition-colors" />
}

function VHandle() {
    return <PanelResizeHandle className="h-px bg-white/10 hover:bg-white/30 transition-colors" />
}

// ── Slot Header（多面板模式的 tab 选择器） ──

function SlotHeader({ index, slots, assignView }: {
    index: number
    slots: [ViewTab, ViewTab, ViewTab]
    assignView: (view: ViewTab, slot: number) => void
}) {
    return (
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
    )
}

// ── Main Component ──

export const WorkspacePanel = memo(function WorkspacePanel() {
    const layoutMode = useViewStore(s => s.layoutMode)
    const setLayoutMode = useViewStore(s => s.setLayoutMode)
    const activeTab = useViewStore(s => s.activeTab)

    const [singleTab, setSingleTab] = useState<ViewTab>('read')
    const [slots, setSlots] = useState<[ViewTab, ViewTab, ViewTab]>(['read', 'network', 'detail'])

    // 快捷键 Cmd+1/2/3
    useEffect(() => {
        if (activeTab) setSingleTab(activeTab)
    }, [activeTab])

    // 三个 slot 容器的 DOM ref
    const slot0Ref = useRef<HTMLDivElement>(null)
    const slot1Ref = useRef<HTMLDivElement>(null)
    const slot2Ref = useRef<HTMLDivElement>(null)
    const [mounted, setMounted] = useState(false)
    useEffect(() => { setMounted(true) }, [])

    const slotRefs = [slot0Ref, slot1Ref, slot2Ref]

    const assignViewToSlot = (view: ViewTab, targetSlot: number) => {
        const currentSlot = slots.indexOf(view)
        if (currentSlot === targetSlot) return
        const newSlots = [...slots] as [ViewTab, ViewTab, ViewTab]
        newSlots[targetSlot] = view
        newSlots[currentSlot] = slots[targetSlot]
        setSlots(newSlots)
    }

    // 根据布局模式，确定每个 View 应该显示在哪个 slot
    const getViewSlot = (view: ViewTab): HTMLElement | null => {
        if (layoutMode === 'single') {
            // single 模式：活跃 tab 显示在 slot0，其他不显示
            if (view === singleTab) return slot0Ref.current
            return null
        }
        // multi 模式：根据 slots 配置
        const idx = slots.indexOf(view)
        return slotRefs[idx]?.current ?? null
    }

    const isSingle = layoutMode === 'single'

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

    // slot 容器（空 div，View 通过 portal 渲染到这里）
    const slotContainer = (index: number) => (
        <div ref={slotRefs[index]} className="h-full w-full" />
    )

    // multi 布局的 slot（带 header）
    const slotWithHeader = (index: number) => (
        <div className="h-full flex flex-col">
            <SlotHeader index={index} slots={slots} assignView={assignViewToSlot} />
            <div className="flex-1 min-h-0">
                {slotContainer(index)}
            </div>
        </div>
    )

    const p = `ws-${layoutMode}`

    return (
        <div className="h-full w-full flex flex-col bg-[#0a0a0f]">
            {/* Header */}
            <div className="h-8 flex items-center justify-between px-3 border-b border-white/10 shrink-0 bg-black/40">
                {isSingle ? (
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
                ) : <div />}
                {layoutSwitcher}
            </div>

            {/* Layout area with slot containers */}
            <div className="flex-1 min-h-0">
                {isSingle ? (
                    slotContainer(0)
                ) : layoutMode === 'split-right' ? (
                    <PanelGroup direction="horizontal" className="h-full" autoSaveId={`${p}-h`}>
                        <Panel id={`${p}-big`} defaultSize={65} minSize={20}>{slotWithHeader(0)}</Panel>
                        <HHandle />
                        <Panel id={`${p}-sm`} defaultSize={35} minSize={15}>
                            <PanelGroup direction="vertical" className="h-full" autoSaveId={`${p}-v`}>
                                <Panel id={`${p}-2`} defaultSize={50} minSize={10}>{slotWithHeader(1)}</Panel>
                                <VHandle />
                                <Panel id={`${p}-3`} defaultSize={50} minSize={10}>{slotWithHeader(2)}</Panel>
                            </PanelGroup>
                        </Panel>
                    </PanelGroup>
                ) : layoutMode === 'split-left' ? (
                    <PanelGroup direction="horizontal" className="h-full" autoSaveId={`${p}-h`}>
                        <Panel id={`${p}-sm`} defaultSize={35} minSize={15}>
                            <PanelGroup direction="vertical" className="h-full" autoSaveId={`${p}-v`}>
                                <Panel id={`${p}-2`} defaultSize={50} minSize={10}>{slotWithHeader(1)}</Panel>
                                <VHandle />
                                <Panel id={`${p}-3`} defaultSize={50} minSize={10}>{slotWithHeader(2)}</Panel>
                            </PanelGroup>
                        </Panel>
                        <HHandle />
                        <Panel id={`${p}-big`} defaultSize={65} minSize={20}>{slotWithHeader(0)}</Panel>
                    </PanelGroup>
                ) : layoutMode === 'split-bottom' ? (
                    <PanelGroup direction="vertical" className="h-full" autoSaveId={`${p}-v`}>
                        <Panel id={`${p}-big`} defaultSize={60} minSize={20}>{slotWithHeader(0)}</Panel>
                        <VHandle />
                        <Panel id={`${p}-sm`} defaultSize={40} minSize={15}>
                            <PanelGroup direction="horizontal" className="h-full" autoSaveId={`${p}-h`}>
                                <Panel id={`${p}-2`} defaultSize={50} minSize={10}>{slotWithHeader(1)}</Panel>
                                <HHandle />
                                <Panel id={`${p}-3`} defaultSize={50} minSize={10}>{slotWithHeader(2)}</Panel>
                            </PanelGroup>
                        </Panel>
                    </PanelGroup>
                ) : layoutMode === 'split-top' ? (
                    <PanelGroup direction="vertical" className="h-full" autoSaveId={`${p}-v`}>
                        <Panel id={`${p}-sm`} defaultSize={40} minSize={15}>
                            <PanelGroup direction="horizontal" className="h-full" autoSaveId={`${p}-h`}>
                                <Panel id={`${p}-2`} defaultSize={50} minSize={10}>{slotWithHeader(1)}</Panel>
                                <HHandle />
                                <Panel id={`${p}-3`} defaultSize={50} minSize={10}>{slotWithHeader(2)}</Panel>
                            </PanelGroup>
                        </Panel>
                        <VHandle />
                        <Panel id={`${p}-big`} defaultSize={60} minSize={20}>{slotWithHeader(0)}</Panel>
                    </PanelGroup>
                ) : (
                    /* three-equal */
                    <PanelGroup direction="horizontal" className="h-full" autoSaveId={`${p}-h`}>
                        <Panel id={`${p}-1`} defaultSize={34} minSize={15}>{slotWithHeader(0)}</Panel>
                        <HHandle />
                        <Panel id={`${p}-2`} defaultSize={33} minSize={15}>{slotWithHeader(1)}</Panel>
                        <HHandle />
                        <Panel id={`${p}-3`} defaultSize={33} minSize={15}>{slotWithHeader(2)}</Panel>
                    </PanelGroup>
                )}
            </div>

            {/* 三个 View 只挂载一次，通过 portal 渲染到对应 slot */}
            {mounted && (
                <>
                    <PortalSlot target={getViewSlot('read')}><ReadView /></PortalSlot>
                    <PortalSlot target={getViewSlot('network')}><NetworkView /></PortalSlot>
                    <PortalSlot target={getViewSlot('detail')}><DetailView /></PortalSlot>
                </>
            )}
        </div>
    )
})
