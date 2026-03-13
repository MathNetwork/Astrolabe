import { type Ref } from 'react'
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
