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

export const WorkspacePanel = memo(function WorkspacePanel() {
    const viewMode = useViewStore(s => s.viewMode)

    // Detail focus: Read+Detail 上并排, Network 下
    if (viewMode === 'detail') {
        return (
            <div className={vc}>
                <PanelGroup direction="vertical" className="h-full" autoSaveId="ws-detail-v">
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
            <div className={vc}>
                <PanelGroup direction="horizontal" className="h-full" autoSaveId="ws-network-h">
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
        <div className={vc}>
            <PanelGroup direction="horizontal" className="h-full" autoSaveId="ws-read-h">
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
