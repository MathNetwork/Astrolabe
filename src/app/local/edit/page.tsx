'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { useProjectLoader } from '@/hooks/useProjectLoader'
import { SettingsPanel } from '@/panels/SettingsPanel'
import { ReadPanel } from '@/panels/ReadPanel'
import { NetworkPanel } from '@/panels/NetworkPanel'
import { DetailPanel } from '@/panels/DetailPanel'

/**
 * Editor Page — 纯布局，不持有业务状态
 *
 * 三栏布局：Settings | Read | Network + Detail
 * 所有业务状态在 stores/ 中，各 Panel 自己订阅。
 */
function EditorPage() {
    const searchParams = useSearchParams()
    const projectPath = searchParams.get('path')

    // 加载项目数据 → 写入 dataStore
    const { loading } = useProjectLoader(projectPath)

    if (!projectPath) {
        return (
            <div className="h-screen flex items-center justify-center bg-black text-white/40">
                No project selected
            </div>
        )
    }

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center bg-black text-white/40">
                Loading...
            </div>
        )
    }

    return (
        <div className="h-screen flex flex-col bg-black text-white">
            {/* Top bar */}
            <div className="h-10 flex items-center px-4 border-b border-white/10 shrink-0">
                <span className="text-sm font-medium text-white/70">
                    {projectPath.split('/').pop()}
                </span>
            </div>

            {/* Three-column layout */}
            <PanelGroup direction="horizontal" className="flex-1">
                {/* Left: Settings */}
                <Panel id="settings" defaultSize={15} minSize={10} maxSize={25} collapsible>
                    <SettingsPanel />
                </Panel>

                <PanelResizeHandle className="w-px bg-white/10 hover:bg-white/30 transition-colors" />

                {/* Center: Read */}
                <Panel id="read" defaultSize={50} minSize={20}>
                    <ReadPanel />
                </Panel>

                <PanelResizeHandle className="w-px bg-white/10 hover:bg-white/30 transition-colors" />

                {/* Right: Network + Detail */}
                <Panel id="right" defaultSize={35} minSize={15}>
                    <PanelGroup direction="vertical">
                        <Panel id="network" defaultSize={55} minSize={15}>
                            <NetworkPanel />
                        </Panel>
                        <PanelResizeHandle className="h-px bg-white/10 hover:bg-white/30 transition-colors" />
                        <Panel id="detail" defaultSize={45} minSize={15}>
                            <DetailPanel />
                        </Panel>
                    </PanelGroup>
                </Panel>
            </PanelGroup>
        </div>
    )
}

export default function Page() {
    return (
        <Suspense fallback={<div className="h-screen bg-black" />}>
            <EditorPage />
        </Suspense>
    )
}
