'use client'

import { memo } from 'react'
import { useDataStore } from '@/stores/dataStore'

/**
 * ReadPanel — MDX 阅读器
 *
 * 订阅: dataStore.objects (用于 nodeblock/noderef), dataStore.nodeNumbering
 * TODO: 从 NetworkRead.tsx 迁移 MDX 渲染逻辑
 */
export const ReadPanel = memo(function ReadPanel() {
    const objects = useDataStore(s => s.objects)

    return (
        <div className="h-full flex items-center justify-center bg-[#0a0a0f] text-white/30 text-sm">
            ReadPanel — {objects.length} objects loaded
        </div>
    )
})

export default ReadPanel
