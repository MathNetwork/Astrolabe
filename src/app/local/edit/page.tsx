'use client'

import '@/lib/errorSuppression'
import { Suspense, useCallback, useRef } from 'react'
import { Bars3BottomLeftIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline'
import { useSearchParams, useRouter } from 'next/navigation'
import { Panel, PanelGroup, PanelResizeHandle, type ImperativePanelHandle } from 'react-resizable-panels'
import { useProjectLoader } from '@/hooks/useProjectLoader'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { ExplorerPanel } from '@/panels/explorer/ExplorerPanel'
import { WorkspacePanel } from '@/panels/workspace/WorkspacePanel'
import { ChatPanel } from '@/components/ai-chat/ChatPanel'

function EditorPage() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const projectPath = searchParams.get('path')

    const { loading } = useProjectLoader(projectPath)
    useKeyboardShortcuts()

    const explorerRef = useRef<ImperativePanelHandle>(null)
    const chatRef = useRef<ImperativePanelHandle>(null)

    const toggleExplorer = useCallback(() => {
        const panel = explorerRef.current
        if (!panel) return
        panel.isCollapsed() ? panel.expand() : panel.collapse()
    }, [])

    const toggleChat = useCallback(() => {
        const panel = chatRef.current
        if (!panel) return
        panel.isCollapsed() ? panel.expand() : panel.collapse()
    }, [])

    if (!projectPath) {
        return <div className="h-screen flex items-center justify-center bg-black text-white/40">No project selected</div>
    }

    if (loading) {
        return (
            <div className="h-screen flex flex-col items-center justify-center bg-black text-white/40 gap-3">
                <div className="w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                <span className="text-sm">Loading...</span>
            </div>
        )
    }

    return (
        <div className="h-screen flex flex-col bg-black text-white">
            <div className="h-10 flex items-center justify-between px-4 border-b border-white/10 shrink-0">
                <div className="flex items-center gap-2">
                    <button onClick={toggleExplorer} className="p-1.5 text-white/30 hover:text-white/70 transition-colors rounded hover:bg-white/5" title="Toggle Explorer">
                        <Bars3BottomLeftIcon className="w-4 h-4" />
                    </button>
                    <button onClick={() => router.push('/')} className="text-white/30 hover:text-white/70 transition-colors" title="Home">←</button>
                    <span className="text-sm font-medium text-white/70">{projectPath.split('/').pop()}</span>
                </div>
                <button onClick={toggleChat} className="p-1.5 text-white/30 hover:text-white/70 transition-colors rounded hover:bg-white/5" title="Toggle AI Chat">
                    <ChatBubbleLeftRightIcon className="w-4 h-4" />
                </button>
            </div>

            <PanelGroup direction="horizontal" className="flex-1" autoSaveId="astrolabe-layout-v5">
                <Panel ref={explorerRef} id="explorer" defaultSize={15} minSize={10} collapsible>
                    <ExplorerPanel />
                </Panel>
                <PanelResizeHandle className="w-px bg-white/10 hover:bg-white/30 transition-colors" />
                <Panel id="workspace" defaultSize={60} minSize={30}>
                    <WorkspacePanel />
                </Panel>
                <PanelResizeHandle className="w-px bg-white/10 hover:bg-white/30 transition-colors" />
                <Panel ref={chatRef} id="chat" defaultSize={25} minSize={15} collapsible collapsedSize={0}>
                    <ChatPanel />
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
