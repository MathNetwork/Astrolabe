'use client'
import { memo } from 'react'
import { useSelectObjStore } from '@/stores/selectObjStore'
import { useDataStore } from '@/stores/dataStore'

export const CardStack = memo(function CardStack() {
    const selectedHash = useSelectObjStore(s => s.selectedHash)
    const objects = useDataStore(s => s.objects)
    return <div className="h-full" />
})
