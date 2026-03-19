'use client'

/**
 * ExplorerPanel — 左侧资源管理器
 *
 * 当前为空容器，未来展示项目文件树、sort 过滤、搜索等。
 */
import { memo } from 'react'

export const ExplorerPanel = memo(function ExplorerPanel() {
    return (
        <div className="h-full bg-[#0d0d12] flex flex-col">
            <div className="px-3 py-2 text-[10px] text-white/30 uppercase tracking-wider border-b border-white/5">
                Explorer
            </div>
            <div className="flex-1" />
        </div>
    )
})
