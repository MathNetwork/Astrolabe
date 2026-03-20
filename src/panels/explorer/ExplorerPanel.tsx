'use client'

/**
 * ExplorerPanel — 左侧资源管理器
 *
 * 两个可折叠区块：FUNCTORS（已加载插件列表）和 FILES（项目文件树）。
 * 点击插件卡片弹出详情 Modal。
 */
import { memo, useState, useEffect, useCallback } from 'react'
import { ChevronRightIcon, ChevronDownIcon, FolderIcon, DocumentIcon, XMarkIcon, InformationCircleIcon } from '@heroicons/react/24/outline'
import { useDataStore, type FunctorInfo, type FileEntry } from '@/stores/dataStore'
import { API_BASE } from '@/lib/apiBase'

export const ExplorerPanel = memo(function ExplorerPanel() {
    const [pluginsOpen, setPluginsOpen] = useState(true)
    const [filesOpen, setFilesOpen] = useState(true)
    const [selectedFunctor, setSelectedFunctor] = useState<FunctorInfo | null>(null)
    const [selectedFile, setSelectedFile] = useState<FileEntry | null>(null)
    const plugins = useDataStore(s => s.functors)
    const projectFiles = useDataStore(s => s.projectFiles)

    return (
        <div className="h-full bg-[#0d0d12] flex flex-col overflow-y-auto">
            {/* FUNCTORS */}
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
                        {functors.length === 0 ? (
                            <div className="px-2 py-3 text-sm text-white/30">No functors loaded</div>
                        ) : (
                            functors.map(p => (
                                <FunctorCard key={p.name} plugin={p} onClick={() => setSelectedFunctor(p)} />
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* 分隔线 */}
            <div className="border-t border-white/5" />

            {/* FILES */}
            <div>
                <div className="flex items-center">
                    <button
                        onClick={() => setFilesOpen(o => !o)}
                        className="flex-1 flex items-center gap-1.5 px-3 py-2.5 text-xs text-white/50 uppercase tracking-wider hover:text-white/70 hover:bg-white/5 transition-colors"
                    >
                        {filesOpen
                            ? <ChevronDownIcon className="w-3.5 h-3.5" />
                            : <ChevronRightIcon className="w-3.5 h-3.5" />
                        }
                        Files
                    </button>
                    <div className="relative group pr-2">
                        <InformationCircleIcon className="w-3.5 h-3.5 text-white/25 hover:text-white/50 cursor-help" />
                        <div className="absolute right-0 top-6 w-48 px-2 py-1.5 text-[11px] text-white/70 bg-black/90 border border-white/10 rounded shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">
                            Files are read-only. Use AI agent to modify content via prompts.
                        </div>
                    </div>
                </div>
                {filesOpen && (
                    <div className="px-1 pb-2">
                        {projectFiles.length === 0 ? (
                            <div className="px-2 py-3 text-sm text-white/30">No project open</div>
                        ) : (
                            projectFiles.map(f => <FileTreeNode key={f.name} entry={f} depth={0} onFileClick={setSelectedFile} />)
                        )}
                    </div>
                )}
            </div>

            {/* Functor Modal */}
            {selectedFunctor && (
                <FunctorModal plugin={selectedFunctor} onClose={() => setSelectedFunctor(null)} />
            )}

            {/* File Preview Modal */}
            {selectedFile && (
                <FilePreviewModal entry={selectedFile} onClose={() => setSelectedFile(null)} />
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

function FunctorCard({ plugin, onClick }: { plugin: FunctorInfo; onClick: () => void }) {
    const hasEndpoints = functor.analysis_endpoints.length > 0
    const hasSkills = functor.skills.length > 0
    const type = hasEndpoints ? 'analysis' : hasSkills ? 'skill' : 'import'
    const badgeClass = BADGE_COLORS[type] || BADGE_COLORS.import

    return (
        <button
            onClick={onClick}
            className="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-white/[0.06] transition-colors mb-1 group"
        >
            <span className="text-sm font-medium text-white/80 group-hover:text-white truncate">
                {functor.name}
            </span>
            <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 shrink-0 ml-2">
                installed
            </span>
        </button>
    )
}

// ── Functor Modal ──

function FunctorModal({ plugin, onClose }: { plugin: FunctorInfo; onClose: () => void }) {
    const hasEndpoints = functor.analysis_endpoints.length > 0
    const hasSkills = functor.skills.length > 0
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
                            <h2 className="text-lg font-semibold text-white">{functor.name}</h2>
                            <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded ${badgeClass}`}>
                                {type}
                            </span>
                        </div>
                        <div className="text-sm text-white/30 mt-1">v{functor.version}</div>
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
                        {functor.description || 'No description'}
                    </p>

                    <div className="flex items-center gap-4 text-sm text-white/35">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span>Installed</span>
                        </div>
                        {functor.author && <span>Author: {functor.author}</span>}
                        {functor.updated_at && <span>Updated: {functor.updated_at}</span>}
                    </div>

                    {hasEndpoints && <EndpointsList endpoints={functor.analysis_endpoints} />}

                    {hasSkills && (
                        <div>
                            <div className="text-xs text-white/35 uppercase tracking-wider mb-2">
                                Skills ({functor.skills.length})
                            </div>
                            <div className="space-y-1">
                                {functor.skills.map(s => (
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

// ── Endpoints List (collapsible, grouped by active/inactive) ──

function EndpointsList({ endpoints }: { endpoints: FunctorInfo['analysis_endpoints'] }) {
    const active = endpoints.filter(ep => ep.type === 'size' || ep.type === 'color')
    const inactive = endpoints.filter(ep => ep.type !== 'size' && ep.type !== 'color')
    const [showActive, setShowActive] = useState(true)
    const [showInactive, setShowInactive] = useState(false)

    return (
        <div className="space-y-2">
            {/* Active */}
            <div>
                <button
                    onClick={() => setShowActive(o => !o)}
                    className="flex items-center gap-1.5 text-xs text-white/35 uppercase tracking-wider hover:text-white/50 transition-colors w-full"
                >
                    {showActive ? <ChevronDownIcon className="w-3 h-3" /> : <ChevronRightIcon className="w-3 h-3" />}
                    Active ({active.length})
                </button>
                {showActive && (
                    <div className="space-y-1 mt-1.5">
                        {active.map(ep => (
                            <div key={ep.key} className="flex items-center justify-between px-3 py-1.5 rounded bg-white/[0.03]">
                                <div className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    <span className="text-sm text-white/60">{ep.label || ep.key}</span>
                                </div>
                                <span className="text-xs text-white/25 font-mono">{ep.type}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Inactive */}
            {inactive.length > 0 && (
                <div>
                    <button
                        onClick={() => setShowInactive(o => !o)}
                        className="flex items-center gap-1.5 text-xs text-white/25 uppercase tracking-wider hover:text-white/40 transition-colors w-full"
                    >
                        {showInactive ? <ChevronDownIcon className="w-3 h-3" /> : <ChevronRightIcon className="w-3 h-3" />}
                        Inactive ({inactive.length})
                    </button>
                    {showInactive && (
                        <div className="space-y-1 mt-1.5">
                            {inactive.map(ep => (
                                <div key={ep.key} className="flex items-center justify-between px-3 py-1.5 rounded bg-white/[0.02]">
                                    <div className="flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-white/15" />
                                        <span className="text-sm text-white/35">{ep.label || ep.key}</span>
                                    </div>
                                    <span className="text-xs text-white/15 font-mono">{ep.type}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

// ── File Tree ──

function FileTreeNode({ entry, depth, onFileClick }: { entry: FileEntry; depth: number; onFileClick?: (f: FileEntry) => void }) {
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
                    <FileTreeNode key={c.name} entry={c} depth={depth + 1} onFileClick={onFileClick} />
                ))}
            </div>
        )
    }

    return (
        <button
            onClick={() => onFileClick?.(entry)}
            className="w-full flex items-center gap-2 py-1.5 text-sm text-white/50 hover:text-white/70 hover:bg-white/5 transition-colors rounded cursor-pointer"
            style={{ paddingLeft: `${depth * 14 + 24}px` }}
        >
            <DocumentIcon className="w-4 h-4 shrink-0 text-white/25" />
            <span className="truncate">{entry.name}</span>
        </button>
    )
}


// ── File Preview Modal ──

function FilePreviewModal({ entry, onClose }: { entry: FileEntry; onClose: () => void }) {
    const [content, setContent] = useState<string | null>(null)
    const [search, setSearch] = useState('')
    const [loading, setLoading] = useState(true)

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose()
    }, [onClose])

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [handleKeyDown])

    // Fetch file content
    useEffect(() => {
        if (!entry.path) return
        setLoading(true)
        // Extract relative path within .astrolabe/
        const astrolabeIdx = entry.path.indexOf('.astrolabe/')
        if (astrolabeIdx === -1) { setLoading(false); return }
        const projectPath = entry.path.substring(0, astrolabeIdx)
        const relativePath = entry.path.substring(astrolabeIdx + '.astrolabe/'.length)

        fetch(`${API_BASE}/api/project/file-content?path=${encodeURIComponent(projectPath)}&file=${encodeURIComponent(relativePath)}`)
            .then(r => r.ok ? r.json() : null)
            .then(data => { setContent(data?.content ?? 'Failed to load'); setLoading(false) })
            .catch(() => { setContent('Failed to load'); setLoading(false) })
    }, [entry.path])

    // Highlight search matches
    const renderContent = () => {
        if (loading) return <span className="text-white/30">Loading...</span>
        if (!content) return <span className="text-white/30">Empty file</span>
        if (!search) return content

        const parts = content.split(new RegExp(`(${search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'))
        return parts.map((part, i) =>
            part.toLowerCase() === search.toLowerCase()
                ? <mark key={i} className="bg-yellow-500/40 text-white rounded-sm px-0.5">{part}</mark>
                : part
        )
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div
                className="relative bg-[#16161e] border border-white/10 rounded-lg shadow-2xl w-[600px] max-h-[80vh] flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 shrink-0">
                    <div className="flex items-center gap-2">
                        <DocumentIcon className="w-4 h-4 text-white/40" />
                        <span className="text-sm font-medium text-white">{entry.name}</span>
                        <span className="text-xs text-white/25">Read-only</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-white/30 hover:text-white/70 hover:bg-white/10 rounded transition-colors"
                    >
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Search bar */}
                <div className="px-5 py-2 border-b border-white/5 shrink-0">
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search in file..."
                        className="w-full bg-white/5 border border-white/10 rounded px-3 py-1.5 text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-white/20"
                    />
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-5">
                    <pre className="text-sm text-white/60 font-mono whitespace-pre-wrap break-words leading-relaxed">
                        {renderContent()}
                    </pre>
                </div>
            </div>
        </div>
    )
}
