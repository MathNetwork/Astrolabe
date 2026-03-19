'use client'

/**
 * ExplorerPanel — 左侧资源管理器
 *
 * 两个可折叠区块：PLUGINS（已加载插件列表）和 FILES（项目文件树）。
 * 点击插件卡片弹出详情 Modal。
 */
import { memo, useState, useEffect, useCallback } from 'react'
import { ChevronRightIcon, ChevronDownIcon, FolderIcon, DocumentIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { useDataStore, type PluginInfo, type FileEntry } from '@/stores/dataStore'

export const ExplorerPanel = memo(function ExplorerPanel() {
    const [pluginsOpen, setPluginsOpen] = useState(true)
    const [filesOpen, setFilesOpen] = useState(true)
    const [selectedPlugin, setSelectedPlugin] = useState<PluginInfo | null>(null)
    const plugins = useDataStore(s => s.plugins)
    const projectFiles = useDataStore(s => s.projectFiles)

    return (
        <div className="h-full bg-[#0d0d12] flex flex-col overflow-y-auto">
            {/* PLUGINS */}
            <div>
                <button
                    onClick={() => setPluginsOpen(o => !o)}
                    className="w-full flex items-center gap-1.5 px-3 py-2.5 text-xs text-white/50 uppercase tracking-wider hover:text-white/70 hover:bg-white/5 transition-colors"
                >
                    {pluginsOpen
                        ? <ChevronDownIcon className="w-3.5 h-3.5" />
                        : <ChevronRightIcon className="w-3.5 h-3.5" />
                    }
                    Plugins
                </button>
                {pluginsOpen && (
                    <div className="px-2 pb-2">
                        {plugins.length === 0 ? (
                            <div className="px-2 py-3 text-sm text-white/30">No plugins loaded</div>
                        ) : (
                            plugins.map(p => (
                                <PluginCard key={p.name} plugin={p} onClick={() => setSelectedPlugin(p)} />
                            ))
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
                    className="w-full flex items-center gap-1.5 px-3 py-2.5 text-xs text-white/50 uppercase tracking-wider hover:text-white/70 hover:bg-white/5 transition-colors"
                >
                    {filesOpen
                        ? <ChevronDownIcon className="w-3.5 h-3.5" />
                        : <ChevronRightIcon className="w-3.5 h-3.5" />
                    }
                    Files
                </button>
                {filesOpen && (
                    <div className="px-1 pb-2">
                        {projectFiles.length === 0 ? (
                            <div className="px-2 py-3 text-sm text-white/30">No project open</div>
                        ) : (
                            projectFiles.map(f => <FileTreeNode key={f.name} entry={f} depth={0} />)
                        )}
                    </div>
                )}
            </div>

            {/* Plugin Modal */}
            {selectedPlugin && (
                <PluginModal plugin={selectedPlugin} onClose={() => setSelectedPlugin(null)} />
            )}
        </div>
    )
})

// ── Plugin Card ──

const BADGE_COLORS: Record<string, string> = {
    analysis: 'bg-blue-500/20 text-blue-400',
    import:   'bg-emerald-500/20 text-emerald-400',
    skill:    'bg-amber-500/20 text-amber-400',
}

function PluginCard({ plugin, onClick }: { plugin: PluginInfo; onClick: () => void }) {
    const hasEndpoints = plugin.analysis_endpoints.length > 0
    const hasSkills = plugin.skills.length > 0
    const type = hasEndpoints ? 'analysis' : hasSkills ? 'skill' : 'import'
    const badgeClass = BADGE_COLORS[type] || BADGE_COLORS.import

    return (
        <button
            onClick={onClick}
            className="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-white/[0.06] transition-colors mb-1 group"
        >
            <span className="text-sm font-medium text-white/80 group-hover:text-white truncate">
                {plugin.name}
            </span>
            <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded ${badgeClass} shrink-0 ml-2`}>
                {type}
            </span>
        </button>
    )
}

// ── Plugin Modal ──

function PluginModal({ plugin, onClose }: { plugin: PluginInfo; onClose: () => void }) {
    const hasEndpoints = plugin.analysis_endpoints.length > 0
    const hasSkills = plugin.skills.length > 0
    const type = hasEndpoints ? 'analysis' : hasSkills ? 'skill' : 'import'
    const badgeClass = BADGE_COLORS[type] || BADGE_COLORS.import

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose()
    }, [onClose])

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [handleKeyDown])

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div
                className="relative bg-[#16161e] border border-white/10 rounded-lg shadow-2xl w-[440px] max-h-[80vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-start justify-between p-5 border-b border-white/5">
                    <div>
                        <div className="flex items-center gap-2.5">
                            <h2 className="text-lg font-semibold text-white">{plugin.name}</h2>
                            <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded ${badgeClass}`}>
                                {type}
                            </span>
                        </div>
                        <div className="text-sm text-white/30 mt-1">v{plugin.version}</div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-white/30 hover:text-white/70 hover:bg-white/10 rounded transition-colors"
                    >
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-5 space-y-4">
                    <p className="text-sm text-white/60 leading-relaxed">
                        {plugin.description || 'No description'}
                    </p>

                    <div className="flex items-center gap-4 text-sm text-white/35">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span>Installed</span>
                        </div>
                        {plugin.author && <span>Author: {plugin.author}</span>}
                        {plugin.updated_at && <span>Updated: {plugin.updated_at}</span>}
                    </div>

                    {hasEndpoints && (
                        <div>
                            <div className="text-xs text-white/35 uppercase tracking-wider mb-2">
                                Endpoints ({plugin.analysis_endpoints.length})
                            </div>
                            <div className="space-y-1">
                                {plugin.analysis_endpoints.map(ep => (
                                    <div key={ep.key} className="flex items-center justify-between px-3 py-1.5 rounded bg-white/[0.03]">
                                        <span className="text-sm text-white/60">{ep.label || ep.key}</span>
                                        <span className="text-xs text-white/25 font-mono">{ep.type}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {hasSkills && (
                        <div>
                            <div className="text-xs text-white/35 uppercase tracking-wider mb-2">
                                Skills ({plugin.skills.length})
                            </div>
                            <div className="space-y-1">
                                {plugin.skills.map(s => (
                                    <div key={s.id} className="flex items-center justify-between px-3 py-1.5 rounded bg-white/[0.03]">
                                        <span className="text-sm text-white/60 font-mono">{s.command}</span>
                                        <span className="text-xs text-white/30 truncate ml-2">{s.description}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {!hasEndpoints && !hasSkills && (
                        <div className="text-sm text-white/30">No endpoints or skills registered</div>
                    )}
                </div>
            </div>
        </div>
    )
}

// ── File Tree ──

function FileTreeNode({ entry, depth }: { entry: FileEntry; depth: number }) {
    const [open, setOpen] = useState(false)
    const isDir = entry.type === 'directory'
    const pl = `${depth * 14 + 10}px`

    if (isDir) {
        return (
            <div>
                <button
                    onClick={() => setOpen(o => !o)}
                    className="w-full flex items-center gap-2 py-1.5 text-sm text-white/60 hover:text-white/80 hover:bg-white/5 transition-colors rounded"
                    style={{ paddingLeft: pl }}
                >
                    {open
                        ? <ChevronDownIcon className="w-3.5 h-3.5 shrink-0" />
                        : <ChevronRightIcon className="w-3.5 h-3.5 shrink-0" />
                    }
                    <FolderIcon className="w-4 h-4 shrink-0 text-white/40" />
                    <span className="truncate">{entry.name}</span>
                </button>
                {open && entry.children?.map(c => (
                    <FileTreeNode key={c.name} entry={c} depth={depth + 1} />
                ))}
            </div>
        )
    }

    return (
        <div
            className="flex items-center gap-2 py-1.5 text-sm text-white/50 hover:text-white/70 hover:bg-white/5 transition-colors rounded cursor-default"
            style={{ paddingLeft: `${depth * 14 + 24}px` }}
        >
            <DocumentIcon className="w-4 h-4 shrink-0 text-white/25" />
            <span className="truncate">{entry.name}</span>
        </div>
    )
}
