'use client'

/**
 * ReadView — MDX 阅读器
 *
 * 进度：空壳，待 Phase 3 填充
 */
import { memo } from 'react'

export const ReadView = memo(function ReadView() {
    return (
        <div className="h-full flex items-center justify-center border border-white/5 rounded">
            <div className="text-center text-white/15">
                <div className="text-2xl mb-1">📖</div>
                <div className="text-xs">ReadView</div>
                <div className="text-[10px] text-white/10 mt-0.5">MDX 文档阅读器</div>
            </div>
        </div>
    )
})
