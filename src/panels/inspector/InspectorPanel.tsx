'use client'
import { memo } from 'react'
import { CardStack } from './CardStack'

export const InspectorPanel = memo(function InspectorPanel() {
    return (
        <div className="h-full bg-black">
            <CardStack />
        </div>
    )
})
