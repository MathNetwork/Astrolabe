'use client'

/**
 * WorkspacePanel — main workspace with resizable panels
 *
 * 3 views: Read, Network, Detail
 * Single mode: one view fills the space, tab bar to switch.
 * Split/three-equal modes: 3 slots with slot headers to swap views.
 */
import { memo, useState, useEffect } from 'react'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { useViewStore, type LayoutMode, type ViewTab } from '@/stores/viewStore'
import { BookOpenIcon, CubeTransparentIcon, DocumentMagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { ReadView } from './ReadView'
import { NetworkView } from './NetworkView'
import { DetailView } from './DetailView'

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
const HANDLE_CLASS = "bg-white/10 hover:bg-white/30 active:bg-blue-500/50 transition-colors"

// ── Slot header ──

function SlotHeader({ view, onSwitch }: { view: ViewTab; onSwitch: (v: ViewTab) => void }) {
    return (
        <div className="h-6 flex items-center gap-0.5 px-2 bg-black/60 border-b border-white/5 shrink-0">
            {VIEW_TABS.map(({ id, Icon }) => (
                <button
                    key={id}
                    onClick={() => onSwitch(id)}
                    className={`p-0.5 rounded transition-colors ${view === id ? 'text-white/70' : 'text-white/20 hover:text-white/40'}`}
                    title={id}
                >
                    <Icon className="w-3 h-3" />
                </button>
            ))}
        </div>
    )
}

// ── View renderer ──

function RenderView({ view }: { view: ViewTab }) {
    switch (view) {
        case 'read': return <ReadView />
        case 'network': return <NetworkView />
        case 'detail': return <DetailView />
    }
}

function ViewSlot({ view, showHeader, onSwitch }: { view: ViewTab; showHeader: boolean; onSwitch: (v: ViewTab) => void }) {
    return (
        <div className="h-full flex flex-col overflow-hidden bg-[#0a0a0f]">
            {showHeader && <SlotHeader view={view} onSwitch={onSwitch} />}
            <div className="flex-1 min-h-0">
                <RenderView view={view} />
            </div>
        </div>
    )
}

// ── Main ──

export const WorkspacePanel = memo(function WorkspacePanel() {
    const layoutMode = useViewStore(s => s.layoutMode)
    const setLayoutMode = useViewStore(s => s.setLayoutMode)
    const activeTab = useViewStore(s => s.activeTab)
    const isSingle = layoutMode === 'single'

    const [singleTab, setSingleTab] = useState<ViewTab>('read')
    useEffect(() => { if (activeTab) setSingleTab(activeTab as ViewTab) }, [activeTab])

    // 3 slots for split layouts
    const [slots, setSlots] = useState<[ViewTab, ViewTab, ViewTab]>(['read', 'network', 'detail'])

    const switchSlot = (slotIndex: number) => (view: ViewTab) => {
        const currentIndex = slots.indexOf(view)
        if (currentIndex === slotIndex) return
        const newSlots = [...slots] as [ViewTab, ViewTab, ViewTab]
        newSlots[slotIndex] = view
        newSlots[currentIndex] = slots[slotIndex]
        setSlots(newSlots)
    }

    const slot = (i: number) => (
        <ViewSlot view={slots[i]} showHeader onSwitch={switchSlot(i)} />
    )

    const renderContent = () => {
        if (isSingle) {
            return <ViewSlot view={singleTab} showHeader={false} onSwitch={() => {}} />
        }

        const hHandle = <PanelResizeHandle className={`h-px ${HANDLE_CLASS}`} />
        const vHandle = <PanelResizeHandle className={`w-px ${HANDLE_CLASS}`} />

        switch (layoutMode) {
            case 'three-equal':
                return (
                    <PanelGroup direction="horizontal" autoSaveId="ws-three">
                        <Panel defaultSize={33} minSize={15}>{slot(0)}</Panel>
                        {vHandle}
                        <Panel defaultSize={34} minSize={15}>{slot(1)}</Panel>
                        {vHandle}
                        <Panel defaultSize={33} minSize={15}>{slot(2)}</Panel>
                    </PanelGroup>
                )
            case 'split-right':
                return (
                    <PanelGroup direction="horizontal" autoSaveId="ws-split-r">
                        <Panel defaultSize={65} minSize={20}>{slot(0)}</Panel>
                        {vHandle}
                        <Panel defaultSize={35} minSize={15}>
                            <PanelGroup direction="vertical" autoSaveId="ws-split-r-v">
                                <Panel defaultSize={50} minSize={15}>{slot(1)}</Panel>
                                {hHandle}
                                <Panel defaultSize={50} minSize={15}>{slot(2)}</Panel>
                            </PanelGroup>
                        </Panel>
                    </PanelGroup>
                )
            case 'split-left':
                return (
                    <PanelGroup direction="horizontal" autoSaveId="ws-split-l">
                        <Panel defaultSize={35} minSize={15}>
                            <PanelGroup direction="vertical" autoSaveId="ws-split-l-v">
                                <Panel defaultSize={50} minSize={15}>{slot(1)}</Panel>
                                {hHandle}
                                <Panel defaultSize={50} minSize={15}>{slot(2)}</Panel>
                            </PanelGroup>
                        </Panel>
                        {vHandle}
                        <Panel defaultSize={65} minSize={20}>{slot(0)}</Panel>
                    </PanelGroup>
                )
            case 'split-bottom':
                return (
                    <PanelGroup direction="vertical" autoSaveId="ws-split-b">
                        <Panel defaultSize={60} minSize={20}>{slot(0)}</Panel>
                        {hHandle}
                        <Panel defaultSize={40} minSize={15}>
                            <PanelGroup direction="horizontal" autoSaveId="ws-split-b-h">
                                <Panel defaultSize={50} minSize={15}>{slot(1)}</Panel>
                                {vHandle}
                                <Panel defaultSize={50} minSize={15}>{slot(2)}</Panel>
                            </PanelGroup>
                        </Panel>
                    </PanelGroup>
                )
            case 'split-top':
                return (
                    <PanelGroup direction="vertical" autoSaveId="ws-split-t">
                        <Panel defaultSize={40} minSize={15}>
                            <PanelGroup direction="horizontal" autoSaveId="ws-split-t-h">
                                <Panel defaultSize={50} minSize={15}>{slot(1)}</Panel>
                                {vHandle}
                                <Panel defaultSize={50} minSize={15}>{slot(2)}</Panel>
                            </PanelGroup>
                        </Panel>
                        {hHandle}
                        <Panel defaultSize={60} minSize={20}>{slot(0)}</Panel>
                    </PanelGroup>
                )
            default:
                return null
        }
    }

    return (
        <div className="h-full w-full flex flex-col bg-[#0a0a0f]">
            {/* Top bar */}
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
            </div>

            {/* Content */}
            <div className="flex-1 min-h-0">
                {renderContent()}
            </div>
        </div>
    )
})
