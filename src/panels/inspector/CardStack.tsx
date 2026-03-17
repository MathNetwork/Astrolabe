'use client'
import { memo } from 'react'
import { useSelectionStore } from '@/stores/selectionStore'
import { useDataStore } from '@/stores/dataStore'

export const CardStack = memo(function CardStack() {
    const selectedNodeId = useSelectionStore(s => s.selectedNodeId)
    const objects = useDataStore(s => s.objects)
    return <div className="h-full" />
})
