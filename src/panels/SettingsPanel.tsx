'use client'

import { memo } from 'react'

/**
 * SettingsPanel — 布局参数和网络分析
 *
 * TODO: 从旧 SettingsPanel 迁移，改为订阅 physicsStore + analysisStore
 */
export const SettingsPanel = memo(function SettingsPanel() {
    return (
        <div className="h-full overflow-y-auto bg-black text-white/60 p-3 text-xs">
            Settings (placeholder)
        </div>
    )
})

export default SettingsPanel
