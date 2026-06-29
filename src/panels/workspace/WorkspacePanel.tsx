'use client'

/**
 * WorkspacePanel — main workspace with resizable panels
 *
 * 3 views: Read, Network, Detail
 * Single mode: one view fills the space, tab bar to switch.
 * Split/three-equal modes: 3 slots with slot headers to swap views.
 *
 * Keep-alive: each view is mounted exactly once (via a portal into its own
 * stable DOM container) and is never unmounted. Switching layout/tab only
 * relocates those containers between slot targets — moving a DOM node does not
 * remount React, so a view's internal state (scroll, selection, graph zoom)
 * is fully decoupled from container position.
 */
import { memo, useState, useEffect, useRef, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { useViewStore, type LayoutMode, type ViewTab } from '@/stores/viewStore'
import { BookOpenIcon, CubeTransparentIcon, DocumentMagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { ReadView } from './ReadView'
import { NetworkView } from './NetworkView'
import { DetailView } from './DetailView'

const ALL_VIEWS: ViewTab[] = ['read', 'network', 'detail']

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

// ── View slot ──
// A slot renders an (optional) header plus an EMPTY target div. The actual view
// container is moved into that target by the keep-alive layout effect.

function ViewSlot({ view, showHeader, onSwitch, registerTarget }: {
    view: ViewTab; showHeader: boolean; onSwitch: (v: ViewTab) => void
    registerTarget: (el: HTMLDivElement | null) => void
}) {
    return (
        <div className="h-full flex flex-col overflow-hidden bg-[#0a0a0f]">
            {showHeader && <SlotHeader view={view} onSwitch={onSwitch} />}
            <div ref={registerTarget} className="flex-1 min-h-0" />
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

    // Keep-alive: each view lives in its own DOM node, mounted once via a portal
    // (below). The layout only relocates these nodes between slot targets.
    //
    // Containers are created AFTER mount (in an effect), not during render, so
    // SSR and the FIRST client render both omit the portals. Creating them
    // during render would make the hydrating client tree contain the views
    // while the server tree did not → hydration mismatch.
    const [containers, setContainers] = useState<Record<ViewTab, HTMLDivElement> | null>(null)
    useEffect(() => {
        const mk = () => { const d = document.createElement('div'); d.className = 'h-full w-full min-h-0'; return d }
        setContainers({ read: mk(), network: mk(), detail: mk() })
    }, [])
    const targets = useRef<(HTMLDivElement | null)[]>([])
    const parkRef = useRef<HTMLDivElement>(null)
    const slotViews: ViewTab[] = isSingle ? [singleTab] : slots

    // After every commit, move each view container into its slot target and park
    // the rest (kept mounted, hidden). Moving a node never remounts the view.
    useLayoutEffect(() => {
        if (!containers) return
        const shown = new Set<ViewTab>()
        slotViews.forEach((view, i) => {
            const target = targets.current[i]
            if (!target) return
            const el = containers[view]
            if (el.parentElement !== target) target.appendChild(el)
            shown.add(view)
        })
        ALL_VIEWS.forEach(view => {
            if (shown.has(view) || !parkRef.current) return
            const el = containers[view]
            if (el.parentElement !== parkRef.current) parkRef.current.appendChild(el)
        })
    })

    const slot = (i: number) => (
        <ViewSlot view={slots[i]} showHeader onSwitch={switchSlot(i)} registerTarget={el => { targets.current[i] = el }} />
    )

    const renderContent = () => {
        if (isSingle) {
            return <ViewSlot view={singleTab} showHeader={false} onSwitch={() => {}} registerTarget={el => { targets.current[0] = el }} />
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

            {/* Views are mounted once here, into stable containers, and portaled
                in. The layout effect relocates the containers; the components
                themselves never unmount. */}
            {containers && (
                <>
                    {createPortal(<ReadView />, containers.read)}
                    {createPortal(<NetworkView />, containers.network)}
                    {createPortal(<DetailView />, containers.detail)}
                </>
            )}
            {/* Parking spot for views not currently shown (kept mounted). */}
            <div ref={parkRef} className="hidden" />
        </div>
    )
})
