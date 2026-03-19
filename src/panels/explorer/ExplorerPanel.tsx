'use client'

/**
 * ExplorerPanel — 左侧资源管理器
 *
 * 两个可折叠区块：PLUGINS（已加载插件列表）和 FILES（项目文件树）。
 */
import { memo, useState } from 'react'
import { ChevronRightIcon, ChevronDownIcon } from '@heroicons/react/24/outline'
import { useDataStore, type PluginInfo } from '@/stores/dataStore'

export const ExplorerPanel = memo(function ExplorerPanel() {
    const [pluginsOpen, setPluginsOpen] = useState(true)
    const [filesOpen, setFilesOpen] = useState(true)
    const plugins = useDataStore(s => s.plugins)

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
                    <div className="px-1">
                        {plugins.length === 0 ? (
                            <div className="px-2 py-2 text-[11px] text-white/20">No plugins loaded</div>
                        ) : (
                            plugins.map(p => <PluginRow key={p.name} plugin={p} />)
                        )}
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

function PluginRow({ plugin }: { plugin: PluginInfo }) {
    const [openPlugin, setOpenPlugin] = useState(false)
    const hasEndpoints = plugin.analysis_endpoints.length > 0
    const hasSkills = plugin.skills.length > 0
    const type = hasEndpoints ? 'analysis' : hasSkills ? 'skill' : 'import'

    return (
        <div className="mb-0.5">
            <button
                onClick={() => setOpenPlugin(o => !o)}
                className="w-full flex items-center gap-1.5 px-2 py-1 rounded text-[11px] text-white/50 hover:text-white/70 hover:bg-white/5 transition-colors"
            >
                {openPlugin
                    ? <ChevronDownIcon className="w-2.5 h-2.5 shrink-0" />
                    : <ChevronRightIcon className="w-2.5 h-2.5 shrink-0" />
                }
                <span className="truncate">{plugin.name}</span>
                <span className="ml-auto text-[9px] text-white/20 uppercase shrink-0">{type}</span>
            </button>
            {openPlugin && (
                <div className="pl-6 pr-2 py-1 space-y-1">
                    {hasEndpoints && (
                        <div>
                            <div className="text-[9px] text-white/25 uppercase mb-0.5">Endpoints</div>
                            {plugin.analysis_endpoints.map(ep => (
                                <div key={ep.key} className="text-[10px] text-white/35 truncate">{ep.label || ep.key}</div>
                            ))}
                        </div>
                    )}
                    {hasSkills && (
                        <div>
                            <div className="text-[9px] text-white/25 uppercase mb-0.5">Skills</div>
                            {plugin.skills.map(s => (
                                <div key={s.id} className="text-[10px] text-white/35 truncate">{s.command}</div>
                            ))}
                        </div>
                    )}
                    {!hasEndpoints && !hasSkills && (
                        <div className="text-[10px] text-white/20">v{plugin.version}</div>
                    )}
                </div>
            )}
        </div>
    )
}
