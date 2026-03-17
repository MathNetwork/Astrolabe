'use client'

/**
 * WorkspacePanel — 中栏：主工作区
 *
 * 根据 viewStore.viewMode 切换三种布局：
 *   - read:    Read 大（左 65%）| Network + Detail 小（右堆叠）
 *   - network: Network 大（右 65%）| Read + Detail 小（左堆叠）
 *   - detail:  Read + Detail 上（并排）| Network 下
 *
 * 每种布局都同时显示全部三个 View，只是大小和位置不同。
 */
import { memo } from 'react'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { useViewStore } from '@/stores/viewStore'
import { ReadView } from './ReadView'
import { NetworkView } from './NetworkView'
import { DetailView } from './DetailView'

const vc = 'h-full w-full bg-[#0a0a0f]'

function HHandle() {
    return <PanelResizeHandle className="w-px bg-white/10 hover:bg-white/30 transition-colors" />
}

function VHandle() {
    return <PanelResizeHandle className="h-px bg-white/10 hover:bg-white/30 transition-colors" />
}

import { BookOpenIcon, CubeTransparentIcon, DocumentMagnifyingGlassIcon } from '@heroicons/react/24/outline'

type LayoutMode = 'read' | 'network' | 'detail'

const LAYOUT_MODES: { id: LayoutMode; Icon: typeof BookOpenIcon; title: string }[] = [
    { id: 'read', Icon: BookOpenIcon, title: 'Read focus' },
    { id: 'network', Icon: CubeTransparentIcon, title: 'Network focus' },
    { id: 'detail', Icon: DocumentMagnifyingGlassIcon, title: 'Detail focus' },
]

export const WorkspacePanel = memo(function WorkspacePanel() {
    const viewMode = useViewStore(s => s.viewMode)
    const setViewMode = useViewStore(s => s.setViewMode)

    const tabBar = (
        <div className="h-8 flex items-center justify-end gap-1 px-3 border-b border-white/10 shrink-0 bg-black/40">
            {LAYOUT_MODES.map(({ id, Icon, title }) => (
                <button
                    key={id}
                    onClick={() => setViewMode(id)}
                    className={`p-1 rounded transition-colors ${
                        viewMode === id ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/60'
                    }`}
                    title={title}
                >
                    <Icon className="w-4 h-4" />
                </button>
            ))}
        </div>
    )

    // Detail focus: Read+Detail 上并排, Network 下
    if (viewMode === 'detail') {
        return (
            <div className={vc + ' flex flex-col'}>
                {tabBar}
                <PanelGroup direction="vertical" className="flex-1" autoSaveId="ws-detail-v">
                    <Panel id="ws-detail-top" defaultSize={55} minSize={15}>
                        <PanelGroup direction="horizontal" className="h-full" autoSaveId="ws-detail-h">
                            <Panel id="ws-detail-read" defaultSize={40} minSize={10} collapsible collapsedSize={0}>
                                <ReadView />
                            </Panel>
                            <HHandle />
                            <Panel id="ws-detail-detail" defaultSize={60} minSize={15} collapsible collapsedSize={0}>
                                <DetailView />
                            </Panel>
                        </PanelGroup>
                    </Panel>
                    <VHandle />
                    <Panel id="ws-detail-network" defaultSize={45} minSize={10} collapsible collapsedSize={0}>
                        <NetworkView />
                    </Panel>
                </PanelGroup>
            </div>
        )
    }

    // Network focus: Read+Detail 左堆叠, Network 右大
    if (viewMode === 'network') {
        return (
            <div className={vc + ' flex flex-col'}>
                {tabBar}
                <PanelGroup direction="horizontal" className="flex-1" autoSaveId="ws-network-h">
                    <Panel id="ws-net-secondary" defaultSize={35} minSize={15}>
                        <PanelGroup direction="vertical" className="h-full" autoSaveId="ws-network-v">
                            <Panel id="ws-net-read" defaultSize={50} minSize={10} collapsible collapsedSize={0}>
                                <ReadView />
                            </Panel>
                            <VHandle />
                            <Panel id="ws-net-detail" defaultSize={50} minSize={10} collapsible collapsedSize={0}>
                                <DetailView />
                            </Panel>
                        </PanelGroup>
                    </Panel>
                    <HHandle />
                    <Panel id="ws-net-primary" defaultSize={65} minSize={20} collapsible collapsedSize={0}>
                        <NetworkView />
                    </Panel>
                </PanelGroup>
            </div>
        )
    }

    // Read focus (default): Read 左大, Network+Detail 右堆叠
    return (
        <div className={vc + ' flex flex-col'}>
            {tabBar}
            <PanelGroup direction="horizontal" className="flex-1" autoSaveId="ws-read-h">
                <Panel id="ws-read-primary" defaultSize={65} minSize={20} collapsible collapsedSize={0}>
                    <ReadView />
                </Panel>
                <HHandle />
                <Panel id="ws-read-secondary" defaultSize={35} minSize={15}>
                    <PanelGroup direction="vertical" className="h-full" autoSaveId="ws-read-v">
                        <Panel id="ws-read-network" defaultSize={50} minSize={10} collapsible collapsedSize={0}>
                            <NetworkView />
                        </Panel>
                        <VHandle />
                        <Panel id="ws-read-detail" defaultSize={50} minSize={10} collapsible collapsedSize={0}>
                            <DetailView />
                        </Panel>
                    </PanelGroup>
                </Panel>
            </PanelGroup>
        </div>
    )
})
