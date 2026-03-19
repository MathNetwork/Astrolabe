'use client'

/**
 * WorkspacePanel — 中栏：主工作区
 *
 * 核心原则：三个 view 只渲染一次，永远挂载在同一位置
 * 布局切换只改 CSS Grid 排列，不改组件树
 *
 * 两层解耦：
 *   1. layoutMode（viewStore）：CSS Grid 排列方式
 *   2. slots（本地 state）：哪个 view 绑定到哪个 slot
 */
import { memo, useState, useEffect } from 'react'
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

// ── CSS Grid 布局配置 ──

type SlotPosition = { gridColumn: string; gridRow: string }

const GRID_CONFIGS: Record<Exclude<LayoutMode, 'single'>, {
    style: React.CSSProperties
    slots: [SlotPosition, SlotPosition, SlotPosition]
}> = {
    'split-right': {
        style: { display: 'grid', gridTemplateColumns: '65fr 35fr', gridTemplateRows: '1fr 1fr', gap: '1px' },
        slots: [
            { gridColumn: '1', gridRow: '1 / 3' },
            { gridColumn: '2', gridRow: '1' },
            { gridColumn: '2', gridRow: '2' },
        ],
    },
    'split-left': {
        style: { display: 'grid', gridTemplateColumns: '35fr 65fr', gridTemplateRows: '1fr 1fr', gap: '1px' },
        slots: [
            { gridColumn: '2', gridRow: '1 / 3' },
            { gridColumn: '1', gridRow: '1' },
            { gridColumn: '1', gridRow: '2' },
        ],
    },
    'split-bottom': {
        style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '60fr 40fr', gap: '1px' },
        slots: [
            { gridColumn: '1 / 3', gridRow: '1' },
            { gridColumn: '1', gridRow: '2' },
            { gridColumn: '2', gridRow: '2' },
        ],
    },
    'split-top': {
        style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '40fr 60fr', gap: '1px' },
        slots: [
            { gridColumn: '1 / 3', gridRow: '2' },
            { gridColumn: '1', gridRow: '1' },
            { gridColumn: '2', gridRow: '1' },
        ],
    },
    'three-equal': {
        style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gridTemplateRows: '1fr', gap: '1px' },
        slots: [
            { gridColumn: '1', gridRow: '1' },
            { gridColumn: '2', gridRow: '1' },
            { gridColumn: '3', gridRow: '1' },
        ],
    },
}

// ── View 组件映射 ──

const VIEW_COMPONENTS: Record<ViewTab, React.FC> = {
    read: ReadView,
    network: NetworkView,
    detail: DetailView,
}

// ── Main Component ──

export const WorkspacePanel = memo(function WorkspacePanel() {
    const layoutMode = useViewStore(s => s.layoutMode)
    const setLayoutMode = useViewStore(s => s.setLayoutMode)
    const activeTab = useViewStore(s => s.activeTab)
    const isSingle = layoutMode === 'single'

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

    const gridStyle = isSingle ? {} : GRID_CONFIGS[layoutMode as Exclude<LayoutMode, 'single'>].style

    const getViewStyle = (view: ViewTab): React.CSSProperties => {
        if (isSingle) return {}
        const config = GRID_CONFIGS[layoutMode as Exclude<LayoutMode, 'single'>]
        return config.slots[slots.indexOf(view)]
    }

    const isVisible = (view: ViewTab) => isSingle ? view === singleTab : true

    return (
        <div className="h-full w-full flex flex-col bg-[#0a0a0f]">
            {/* 顶栏 */}
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

            {/* 内容区域 — CSS Grid 布局，view 始终挂载 */}
            <div
                className="flex-1 min-h-0"
                style={{ ...gridStyle, backgroundColor: isSingle ? undefined : 'rgba(255,255,255,0.07)' }}
            >
                {(['read', 'network', 'detail'] as const).map(view => (
                    <div
                        key={view}
                        className={`${isVisible(view) ? 'flex flex-col h-full' : 'hidden'} overflow-hidden bg-[#0a0a0f]`}
                        style={getViewStyle(view)}
                    >
                        {/* 多布局模式：slot 头部（view 选择器） */}
                        {!isSingle && (
                            <div className="h-6 flex items-center gap-0.5 px-2 bg-black/60 border-b border-white/5 shrink-0">
                                {VIEW_TABS.map(({ id, Icon }) => (
                                    <button
                                        key={id}
                                        onClick={() => assignViewToSlot(id, slots.indexOf(view))}
                                        className={`p-0.5 rounded transition-colors ${
                                            view === id ? 'text-white/70' : 'text-white/20 hover:text-white/40'
                                        }`}
                                        title={`Show ${id} here`}
                                    >
                                        <Icon className="w-3 h-3" />
                                    </button>
                                ))}
                            </div>
                        )}
                        <div className="flex-1 min-h-0">
                            {view === 'read' && <ReadView />}
                            {view === 'network' && <NetworkView />}
                            {view === 'detail' && <DetailView />}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
})
