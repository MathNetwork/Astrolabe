'use client'

import { Suspense, useState, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { Panel, PanelGroup, PanelResizeHandle, type ImperativePanelHandle } from 'react-resizable-panels'
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
 * page.tsx 只管布局 + 面板折叠。
 */
function EditorPage() {
    const searchParams = useSearchParams()
    const projectPath = searchParams.get('path')

    const { loading } = useProjectLoader(projectPath)
    useUndoShortcuts()

    // 面板折叠（纯 UI 状态，不需要 store）
    const controlsRef = useRef<ImperativePanelHandle>(null)
    const inspectorRef = useRef<ImperativePanelHandle>(null)

    const toggleControls = useCallback(() => {
        const panel = controlsRef.current
        if (!panel) return
        panel.isCollapsed() ? panel.expand() : panel.collapse()
    }, [])

    const toggleInspector = useCallback(() => {
        const panel = inspectorRef.current
        if (!panel) return
        panel.isCollapsed() ? panel.expand() : panel.collapse()
    }, [])

    const setControlsOpen = toggleControls
    const setInspectorOpen = toggleInspector

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
            <div className="h-10 flex items-center justify-between px-4 border-b border-white/10 shrink-0">
                <span className="text-sm font-medium text-white/70">
                    {projectPath.split('/').pop()}
                </span>
                <div className="flex items-center gap-2">
                    <button
                        onClick={toggleControls}
                        className="px-2 py-1 text-[10px] text-white/40 hover:text-white/80 transition-colors"
                        title="Toggle Controls"
                    >
                        ⚙
                    </button>
                    <button
                        onClick={toggleInspector}
                        className="px-2 py-1 text-[10px] text-white/40 hover:text-white/80 transition-colors"
                        title="Toggle Inspector"
                    >
                        ◇
                    </button>
                </div>
            </div>

            {/* Controls | Workspace | Inspector */}
            <PanelGroup direction="horizontal" className="flex-1">
                <Panel ref={controlsRef} id="controls" defaultSize={15} minSize={10} maxSize={25} collapsible>
                    <ControlsPanel />
                </Panel>

                <PanelResizeHandle className="w-px bg-white/10 hover:bg-white/30 transition-colors" />

                <Panel id="workspace" defaultSize={55} minSize={20}>
                    <WorkspacePanel />
                </Panel>

                <PanelResizeHandle className="w-px bg-white/10 hover:bg-white/30 transition-colors" />

                <Panel ref={inspectorRef} id="inspector" defaultSize={30} minSize={15} collapsible>
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
