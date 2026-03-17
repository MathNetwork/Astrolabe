'use client'
import { memo } from 'react'
import { useSelectionStore } from '@/stores/selectionStore'

export const InspectorPanel = memo(function InspectorPanel() {
    const selectedNodeId = useSelectionStore(s => s.selectedNodeId)
    return <div className="h-full bg-black" />
})
