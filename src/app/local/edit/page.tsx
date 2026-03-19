'use client'

import '@/lib/errorSuppression'
import { Suspense, useCallback, useRef } from 'react'
import { Bars3BottomRightIcon } from '@heroicons/react/24/outline'
import { useSearchParams, useRouter } from 'next/navigation'
import { Panel, PanelGroup, PanelResizeHandle, type ImperativePanelHandle } from 'react-resizable-panels'
import { useProjectLoader } from '@/hooks/useProjectLoader'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
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
    const router = useRouter()
    const projectPath = searchParams.get('path')

    const { loading } = useProjectLoader(projectPath)
    useKeyboardShortcuts()

    const inspectorRef = useRef<ImperativePanelHandle>(null)

    const toggleInspector = useCallback(() => {
        const panel = inspectorRef.current
        if (!panel) return
        panel.isCollapsed() ? panel.expand() : panel.collapse()
    }, [])

    if (!projectPath) {
        return (
            <div className="h-screen flex items-center justify-center bg-black text-white/40">
                No project selected
            </div>
        )
    }

    if (loading) {
        return (
            <div className="h-screen flex flex-col items-center justify-center bg-black text-white/40 gap-3">
                <div className="w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                <span className="text-sm">Loading project...</span>
            </div>
        )
    }

    return (
        <div className="h-screen flex flex-col bg-black text-white">
            {/* Top bar */}
            <div className="h-10 flex items-center justify-between px-4 border-b border-white/10 shrink-0">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => router.push('/')}
                        className="text-white/30 hover:text-white/70 transition-colors"
                        title="Home"
                    >
                        ←
                    </button>
                    <span className="text-sm font-medium text-white/70">
                        {projectPath.split('/').pop()}
                    </span>
                </div>
                <button
                    onClick={toggleInspector}
                    className="p-1.5 text-white/30 hover:text-white/70 transition-colors rounded hover:bg-white/5"
                    title="Toggle Inspector"
                >
                    <Bars3BottomRightIcon className="w-4 h-4" />
                </button>
            </div>

            {/* Workspace | Inspector */}
            <PanelGroup direction="horizontal" className="flex-1" autoSaveId="astrolabe-layout-v2">
                <Panel id="workspace" defaultSize={70} minSize={20}>
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
