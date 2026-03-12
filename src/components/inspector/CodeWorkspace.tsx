import { LeanCodePanel } from '@/components/LeanCodePanel'
import type { GraphNode } from '@/types/graph'
import type { FileContent } from '@/lib/api'
import type { CodeLocation } from '@/hooks/useCodeViewer'
import type { NodeStatusLine } from '@/lib/successLines'

export interface CodeWorkspaceProps {
    codeViewerOpen: boolean
    setCodeViewerOpen: (v: boolean) => void
    codeLoading: boolean
    codeFile: FileContent | null
    codeLocation: CodeLocation | null
    selectedNode: GraphNode | null
    nodeClickCount: number
    nodeStatusLines: NodeStatusLine[]
}

export function CodeWorkspace({
    codeViewerOpen, setCodeViewerOpen, codeLoading, codeFile, codeLocation,
    selectedNode, nodeClickCount, nodeStatusLines,
}: CodeWorkspaceProps) {
    if (!codeViewerOpen) return null

    return (
        <div className="h-full flex flex-col bg-black">
            {/* Header */}
            <div className="flex items-center border-b border-white/10 shrink-0">
                <div className="px-3 py-2 text-xs font-semibold" style={{ color: '#FCAF45', borderBottom: '2px solid #FCAF45' }}>
                    L∃∀N
                </div>
                <div className="flex-1" />
                <button
                    onClick={() => setCodeViewerOpen(false)}
                    className="px-3 py-2 text-white/40 hover:text-white/80 text-xs"
                    title="Close"
                >
                    ✕
                </button>
            </div>

            {/* Code content */}
            <div className="flex-1 min-h-0 overflow-auto relative">
                {codeLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
                        <div className="text-white/40 text-sm">Loading...</div>
                    </div>
                )}
                {codeFile ? (
                    <LeanCodePanel
                        key={`${codeLocation?.filePath || selectedNode?.leanFilePath || 'editor'}-${codeLocation?.lineNumber || 0}-${nodeClickCount}`}
                        content={codeFile.content}
                        filePath={codeLocation?.filePath || selectedNode?.leanFilePath}
                        lineNumber={codeLocation?.lineNumber || selectedNode?.leanLineNumber}
                        startLine={codeFile.startLine}
                        endLine={codeFile.endLine}
                        totalLines={codeFile.totalLines}
                        nodeName={selectedNode?.name}
                        nodeKind={selectedNode?.id.startsWith('group:') ? 'namespace' : selectedNode?.type}
                        onClose={() => setCodeViewerOpen(false)}
                        hideHeader
                        readOnly
                        nodeStatusLines={nodeStatusLines}
                    />
                ) : !codeLoading && (
                    <div className="h-full flex items-center justify-center">
                        <div className="text-white/40 text-sm">No content</div>
                    </div>
                )}
            </div>
        </div>
    )
}
