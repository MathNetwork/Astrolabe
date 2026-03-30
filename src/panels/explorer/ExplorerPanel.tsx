'use client'

/**
 * ExplorerPanel — left sidebar with Plugins + Files
 */
import { memo, useState, useEffect, useCallback } from 'react'
import { ChevronRightIcon, ChevronDownIcon, FolderIcon, DocumentIcon, XMarkIcon, PuzzlePieceIcon, InformationCircleIcon } from '@heroicons/react/24/outline'
import { useDataStore, type FileEntry } from '@/stores/dataStore'
import { usePluginStore } from '@/plugins/registry'
import { API_BASE } from '@/lib/apiBase'
import { getSortFill } from '@/lib/sortColors'

export const ExplorerPanel = memo(function ExplorerPanel() {
    const [pluginsOpen, setPluginsOpen] = useState(true)
    const [filesOpen, setFilesOpen] = useState(true)
    const [selectedFile, setSelectedFile] = useState<FileEntry | null>(null)
    const projectFiles = useDataStore(s => s.projectFiles)

    return (
        <div className="h-full bg-[#0d0d12] flex flex-col overflow-y-auto">
            {/* PLUGINS */}
            <div>
                <button
                    onClick={() => setPluginsOpen(o => !o)}
                    className="w-full flex items-center gap-1.5 px-3 py-2.5 text-xs text-white/50 uppercase tracking-wider hover:text-white/70 hover:bg-white/5 transition-colors"
                >
                    {pluginsOpen ? <ChevronDownIcon className="w-3 h-3" /> : <ChevronRightIcon className="w-3 h-3" />}
                    Plugins
                </button>
                {pluginsOpen && <PluginList />}
            </div>

            <div className="border-t border-white/5" />

            {/* FILES */}
            <div>
                <button
                    onClick={() => setFilesOpen(o => !o)}
                    className="w-full flex items-center gap-1.5 px-3 py-2.5 text-xs text-white/50 uppercase tracking-wider hover:text-white/70 hover:bg-white/5 transition-colors"
                >
                    {filesOpen ? <ChevronDownIcon className="w-3 h-3" /> : <ChevronRightIcon className="w-3 h-3" />}
                    Files
                </button>
                {filesOpen && (
                    <div className="pb-2">
                        {projectFiles.length === 0 ? (
                            <div className="px-2 py-3 text-sm text-white/30">No project open</div>
                        ) : (
                            projectFiles.map(entry => (
                                <FileTreeNode key={entry.name} entry={entry} depth={0} onFileClick={setSelectedFile} />
                            ))
                        )}
                    </div>
                )}
            </div>

            {selectedFile && (
                <FilePreviewModal entry={selectedFile} onClose={() => setSelectedFile(null)} />
            )}
        </div>
    )
})

// ── Plugin List ──

function PluginList() {
    const plugins = usePluginStore(s => s.plugins)
    const enabled = usePluginStore(s => s.enabled)
    const toggle = usePluginStore(s => s.toggle)
    const [infoId, setInfoId] = useState<string | null>(null)

    if (plugins.length === 0) {
        return <div className="px-3 py-2 text-xs text-white/20">No plugins installed</div>
    }

    return (
        <div className="pb-2">
            {plugins.map(p => (
                <div key={p.id} className="flex items-center gap-1 px-3 py-1.5 hover:bg-white/5 transition-colors">
                    <PuzzlePieceIcon className={`w-4 h-4 shrink-0 ${enabled.has(p.id) ? 'text-green-400' : 'text-white/20'}`} />
                    <button onClick={() => toggle(p.id)} className="flex-1 text-left">
                        <div className={`text-xs ${enabled.has(p.id) ? 'text-white/80' : 'text-white/40'}`}>{p.name}</div>
                        <div className="text-[10px] text-white/20">{p.description}</div>
                    </button>
                    <button onClick={() => setInfoId(infoId === p.id ? null : p.id)} className="p-0.5 text-white/15 hover:text-white/40" title="Info">
                        <InformationCircleIcon className="w-3.5 h-3.5" />
                    </button>
                    <div className={`w-6 h-3 rounded-full transition-colors cursor-pointer ${enabled.has(p.id) ? 'bg-green-500' : 'bg-white/10'}`} onClick={() => toggle(p.id)}>
                        <div className={`w-3 h-3 rounded-full bg-white transition-transform ${enabled.has(p.id) ? 'translate-x-3' : ''}`} />
                    </div>
                </div>
            ))}
            {infoId && <PluginInfoPanel pluginId={infoId} onClose={() => setInfoId(null)} />}
        </div>
    )
}

function PluginInfoPanel({ pluginId, onClose }: { pluginId: string; onClose: () => void }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div className="relative bg-[#16161e] border border-white/10 rounded-lg shadow-2xl w-[500px] max-h-[70vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-3 right-3 text-white/30 hover:text-white/60">
                    <XMarkIcon className="w-5 h-5" />
                </button>
                {pluginId === 'mathnetwork' ? <MathNetworkInfo /> : <div className="text-white/40 text-sm">No info available.</div>}
            </div>
        </div>
    )
}

function MathNetworkInfo() {
    return (
        <div className="space-y-4 text-sm text-white/70">
            <h2 className="text-lg font-semibold text-white/90">MathNetwork Plugin</h2>

            <div>
                <h3 className="text-xs uppercase text-white/40 mb-1">How it works</h3>
                <p>Parses <code className="text-cyan-400 text-xs">astrolabe.json</code> and transforms it into a directed network:</p>
                <ul className="list-disc list-inside mt-1 space-y-0.5 text-white/60">
                    <li><strong>Atoms</strong> (degree 0, ref = [self]) become <strong>nodes</strong></li>
                    <li><strong>Degree-1 entries</strong> (ref = [A, B]) become <strong>directed edges</strong> from A → B</li>
                    <li>Higher-degree entries are ignored in this view</li>
                </ul>
            </div>

            <div>
                <h3 className="text-xs uppercase text-white/40 mb-1">Record Convention</h3>
                <p>Each entry's <code className="text-cyan-400 text-xs">record</code> is a JSON string with:</p>
                <ul className="list-disc list-inside mt-1 space-y-0.5 text-white/60">
                    <li><strong>sort</strong> — type of entry (definition, theorem, lemma, proof, lean-theorem, ...)</li>
                    <li><strong>title</strong> — display name</li>
                    <li><strong>notes</strong> — content text (may contain LaTeX)</li>
                    <li><strong>content</strong> — source code (for Lean entries)</li>
                    <li><strong>state</strong> — proof status: proven / sorry</li>
                </ul>
                <p className="mt-1">For edges, the sort is automatically derived as <code className="text-cyan-400 text-xs">(sort_A, sort_B)</code>.</p>
            </div>

            <div>
                <h3 className="text-xs uppercase text-white/40 mb-1">Analysis</h3>
                <ul className="list-disc list-inside space-y-0.5 text-white/60">
                    <li><strong>Size</strong> — control node radius by: degree, PageRank, betweenness, Katz, HITS, DAG depth, reachability</li>
                    <li><strong>Color</strong> — control node color by: sort, community detection, layer depth, gradient metrics</li>
                    <li><strong>Cluster</strong> — group nodes by: Louvain communities, sort, topological stage, spectral clustering</li>
                    <li><strong>Tightness</strong> — how strongly cluster members attract each other</li>
                </ul>
            </div>

            <div>
                <h3 className="text-xs uppercase text-white/40 mb-1">Color propagation</h3>
                <p>The chosen color mode propagates to all UI: network nodes, entry blocks in ReadView, entry links, and the detail panel.</p>
            </div>
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

    useEffect(() => {
        if (!entry.path) return
        setLoading(true)
        const projectPath = new URLSearchParams(window.location.search).get('path') || ''
        const relativePath = entry.path.replace(projectPath + '/', '')

        fetch(`${API_BASE}/api/project/file-content?path=${encodeURIComponent(projectPath)}&file=${encodeURIComponent(relativePath)}`)
            .then(r => r.ok ? r.json() : null)
            .then(data => { setContent(data?.content ?? 'Failed to load'); setLoading(false) })
            .catch(() => { setContent('Failed to load'); setLoading(false) })
    }, [entry.path])

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
                <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 shrink-0">
                    <div className="flex items-center gap-2">
                        <DocumentIcon className="w-4 h-4 text-white/40" />
                        <span className="text-sm font-medium text-white">{entry.name}</span>
                    </div>
                    <button onClick={onClose} className="p-1.5 text-white/30 hover:text-white/70 hover:bg-white/10 rounded transition-colors">
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>
                <div className="px-5 py-2 border-b border-white/5 shrink-0">
                    <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search in file..."
                        className="w-full bg-white/5 border border-white/10 rounded px-3 py-1.5 text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-white/20" />
                </div>
                <div className="flex-1 overflow-y-auto p-5">
                    <pre className="text-sm text-white/60 font-mono whitespace-pre-wrap break-words leading-relaxed">
                        {renderContent()}
                    </pre>
                </div>
            </div>
        </div>
    )
}
