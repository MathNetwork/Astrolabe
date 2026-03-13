import { type Ref, useState } from 'react'
import {
    XMarkIcon,
    EyeIcon,
    EyeSlashIcon,
} from '@heroicons/react/24/outline'
import { graphActions } from '@/lib/history/graphActions'
import type { GraphNode } from '@/types/graph'
import { useCanvasStore, type CustomNode } from '@/lib/canvasStore'

export type ToolPanelView = 'edges' | 'notes' | 'style' | 'neighbors' | null

export interface NodeHeaderProps {
    selectedNode: GraphNode
    visibleNodes: string[]
    customNodes: CustomNode[]
    setSelectedNode: (node: GraphNode | null) => void
    handleToggleToolView: (tool: 'edges' | 'notes' | 'style' | 'neighbors') => void
    toolPanelView: ToolPanelView
    typeColors: Record<string, string>
    isEditingCustomNodeName: boolean
    customNodeNameInputRef: Ref<HTMLInputElement>
    editingCustomNodeNameValue: string
    setEditingCustomNodeNameValue: (v: string) => void
    saveCustomNodeName: () => void
    setIsEditingCustomNodeName: (v: boolean) => void
}

function NodeIdCopy({ nodeId }: { nodeId: string }) {
    const [copied, setCopied] = useState(false)
    const short = nodeId.length > 12 ? nodeId.slice(0, 12) : nodeId
    return (
        <button
            onClick={() => {
                navigator.clipboard.writeText(nodeId)
                setCopied(true)
                setTimeout(() => setCopied(false), 1500)
            }}
            className="flex items-center gap-1.5 mt-0.5 ml-6 px-1.5 py-0.5 rounded hover:bg-white/10 transition-colors group"
            title={`Click to copy: ${nodeId}`}
        >
            <span className="text-[11px] text-white/30 font-mono group-hover:text-white/50">{short}</span>
            {copied ? (
                <svg className="w-3.5 h-3.5 text-green-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
            ) : (
                <svg className="w-3.5 h-3.5 text-white/30 group-hover:text-white/50" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" /></svg>
            )}
        </button>
    )
}

export function NodeHeader({
    selectedNode, visibleNodes, customNodes, setSelectedNode,
    typeColors,
    isEditingCustomNodeName, customNodeNameInputRef, editingCustomNodeNameValue,
    setEditingCustomNodeNameValue, saveCustomNodeName, setIsEditingCustomNodeName,
}: NodeHeaderProps) {
    // Knowledge nodes and custom nodes are always "on canvas"
    const knowledgeNodes = useCanvasStore(s => s.knowledgeNodes)
    const isKnowledgeNode = knowledgeNodes.some(kn => kn.id === selectedNode.id)
    const isVisible = isKnowledgeNode || selectedNode.type === 'custom' || visibleNodes.includes(selectedNode.id)

    return (
        <>
            <div className="flex items-center gap-2">
                <button
                    onClick={async () => {
                        if (isKnowledgeNode) return // Knowledge nodes can't be toggled off canvas
                        if (isVisible) {
                            await graphActions.removeNodeFromCanvas(selectedNode.id)
                        } else {
                            await graphActions.addNodeToCanvas(selectedNode.id)
                        }
                    }}
                    className={`p-0.5 rounded transition-all flex-shrink-0 ${
                        isVisible
                            ? 'text-green-400 hover:text-green-300 drop-shadow-[0_0_6px_rgba(74,222,128,0.8)]'
                            : 'text-gray-500 hover:text-gray-400 animate-pulse-glow'
                    }`}
                    title={isKnowledgeNode ? 'Knowledge node (always visible)' : isVisible ? 'Remove from canvas' : 'Add to canvas'}
                >
                    {isVisible ? (
                        <EyeIcon className="w-4 h-4" />
                    ) : (
                        <EyeSlashIcon className="w-4 h-4" />
                    )}
                </button>
                {(() => {
                    const isCustomNode = selectedNode.type === 'custom'
                    const knNode = isKnowledgeNode ? knowledgeNodes.find(kn => kn.id === selectedNode.id) : null
                    const color = knNode?.style?.color || (isCustomNode ? '#666666' : (typeColors[selectedNode.type] || '#888'))
                    return (
                        <span
                            className={`font-semibold transition-opacity flex-1 truncate ${isVisible ? '' : 'opacity-40'}`}
                            style={{ color }}
                            title={selectedNode.name}
                        >
                            {selectedNode.name}
                        </span>
                    )
                })()}
            </div>

            {/* Node ID (hash) */}
            <NodeIdCopy nodeId={selectedNode.id} />

            {selectedNode.type === 'custom' && (
                <div className="mt-2">
                    {isEditingCustomNodeName ? (
                        <input
                            ref={customNodeNameInputRef}
                            type="text"
                            value={editingCustomNodeNameValue}
                            onChange={(e) => setEditingCustomNodeNameValue(e.target.value)}
                            onBlur={saveCustomNodeName}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') saveCustomNodeName()
                                if (e.key === 'Escape') setIsEditingCustomNodeName(false)
                            }}
                            className="w-full bg-black/30 border border-white/20 rounded px-2 py-1 text-sm text-white font-mono focus:border-cyan-500/50 focus:outline-none"
                            autoFocus
                        />
                    ) : (
                        <div
                            onClick={() => {
                                setEditingCustomNodeNameValue(selectedNode.name)
                                setIsEditingCustomNodeName(true)
                            }}
                            className="text-sm text-white/80 font-mono cursor-pointer hover:text-cyan-400 transition-colors px-2 py-1 rounded hover:bg-white/5"
                            title="Click to edit name"
                        >
                            {selectedNode.name}
                        </div>
                    )}
                </div>
            )}
        </>
    )
}
