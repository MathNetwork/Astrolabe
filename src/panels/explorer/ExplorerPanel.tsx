'use client'

/**
 * ExplorerPanel — 左侧资源管理器
 *
 * 两个可折叠区块：PLUGINS 和 FILES。
 */
import { memo, useState } from 'react'
import { ChevronRightIcon, ChevronDownIcon } from '@heroicons/react/24/outline'

export const ExplorerPanel = memo(function ExplorerPanel() {
    const [pluginsOpen, setPluginsOpen] = useState(true)
    const [filesOpen, setFilesOpen] = useState(true)

    return (
        <div className="h-full bg-[#0d0d12] flex flex-col overflow-y-auto">
            {/* PLUGINS */}
            <div>
                <button
                    onClick={() => setPluginsOpen(o => !o)}
                    className="w-full flex items-center gap-1 px-3 py-1.5 text-[10px] text-white/40 uppercase tracking-wider hover:text-white/60 hover:bg-white/5 transition-colors"
                >
                    {pluginsOpen
                        ? <ChevronDownIcon className="w-3 h-3" />
                        : <ChevronRightIcon className="w-3 h-3" />
                    }
                    Plugins
                </button>
                {pluginsOpen && (
                    <div className="px-3 py-2 text-[11px] text-white/20">
                        No plugins loaded
                    </div>
                )}
            </div>

            {/* 分隔线 */}
            <div className="border-t border-white/5" />

            {/* FILES */}
            <div>
                <button
                    onClick={() => setFilesOpen(o => !o)}
                    className="w-full flex items-center gap-1 px-3 py-1.5 text-[10px] text-white/40 uppercase tracking-wider hover:text-white/60 hover:bg-white/5 transition-colors"
                >
                    {filesOpen
                        ? <ChevronDownIcon className="w-3 h-3" />
                        : <ChevronRightIcon className="w-3 h-3" />
                    }
                    Files
                </button>
                {filesOpen && (
                    <div className="px-3 py-2 text-[11px] text-white/20">
                        No project open
                    </div>
                )}
            </div>
        </div>
    )
})
