'use client'
import { memo } from 'react'
import { useDataStore } from '@/stores/dataStore'

export const CardStack = memo(function CardStack() {
    const objects = useDataStore(s => s.objects)
    return <div className="h-full" />
})
