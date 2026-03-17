'use client'

/**
 * DetailView — 节点/边详情 + 连接工具
 *
 * 进度：空壳，待 Phase 5 填充
 */
import { memo } from 'react'

export const DetailView = memo(function DetailView() {
    return (
        <div className="h-full flex items-center justify-center border border-white/5 rounded">
            <div className="text-center text-white/15">
                <div className="text-2xl mb-1">🔍</div>
                <div className="text-xs">DetailView</div>
                <div className="text-[10px] text-white/10 mt-0.5">选中节点详情 + edges/neighbors</div>
            </div>
        </div>
    )
})
