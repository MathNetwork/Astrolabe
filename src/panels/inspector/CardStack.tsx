'use client'
import { memo } from 'react'
import { useSelectionStore } from '@/stores/selectionStore'
import { useDataStore } from '@/stores/dataStore'

export const CardStack = memo(function CardStack() {
    const selectedObjHash = useSelectionStore(s => s.selectedObjHash)
    const objects = useDataStore(s => s.objects)
    return <div className="h-full" />
})
