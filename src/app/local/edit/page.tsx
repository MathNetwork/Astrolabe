'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { useProjectLoader } from '@/hooks/useProjectLoader'
import { useUndoShortcuts } from '@/hooks/useUndoShortcuts'
import { ControlsPanel } from '@/panels/controls/ControlsPanel'
import { WorkspacePanel } from '@/panels/workspace/WorkspacePanel'
import { InspectorPanel } from '@/panels/inspector/InspectorPanel'

/**
 * Editor Page — 纯布局，不持有业务状态
 *
 * 三栏：Controls | Workspace | Inspector
 * 所有业务状态在 stores/ 中，各 Panel 自己订阅。
 */
function EditorPage() {
    const searchParams = useSearchParams()
    const projectPath = searchParams.get('path')

    // 加载项目数据 → 写入 dataStore
    const { loading } = useProjectLoader(projectPath)

    // 全局快捷键：Cmd+Z undo, Cmd+Shift+Z redo
    useUndoShortcuts()

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

            {/* Controls | Workspace | Inspector */}
            <PanelGroup direction="horizontal" className="flex-1">
                <Panel id="controls" defaultSize={15} minSize={10} maxSize={25} collapsible>
                    <ControlsPanel />
                </Panel>

                <PanelResizeHandle className="w-px bg-white/10 hover:bg-white/30 transition-colors" />

                <Panel id="workspace" defaultSize={55} minSize={20}>
                    <WorkspacePanel />
                </Panel>

                <PanelResizeHandle className="w-px bg-white/10 hover:bg-white/30 transition-colors" />

                <Panel id="inspector" defaultSize={30} minSize={15}>
                    <InspectorPanel />
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
