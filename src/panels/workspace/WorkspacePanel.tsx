'use client'
import { memo } from 'react'
import { useViewStore } from '@/stores/viewStore'

export const WorkspacePanel = memo(function WorkspacePanel() {
    const viewMode = useViewStore(s => s.viewMode)
    return <div className="h-full bg-[#0a0a0f]" />
})
