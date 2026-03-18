'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface RecentProject {
  path: string
  name: string
  lastOpened: string
}

// 预配置的项目（部署时可以从 API 获取）
const FEATURED_PROJECTS = [
  {
    path: '/Users/moqian/GMTNet',
    name: 'GMTNet',
    description: 'Geometric Measure Theory — Pitts min-max theorem and regularity of minimal hypersurfaces',
    stats: '175 objects · 208 morphisms · 9 chapters',
  },
]

export default function Home() {
  const router = useRouter()
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([])
  const [isTauri, setIsTauri] = useState(false)

  useEffect(() => {
    setIsTauri(!!(window as any).__TAURI_INTERNALS__)
    const stored = localStorage.getItem('recentProjects')
    if (stored) {
      try { setRecentProjects(JSON.parse(stored)) } catch {}
    }
  }, [])

  const openProject = (path: string) => {
    const name = path.split('/').pop() || 'Project'
    const proj: RecentProject = { path, name, lastOpened: new Date().toISOString() }
    const updated = [proj, ...recentProjects.filter(p => p.path !== path)].slice(0, 10)
    setRecentProjects(updated)
    localStorage.setItem('recentProjects', JSON.stringify(updated))
    router.push(`/local/edit?path=${encodeURIComponent(path)}`)
  }

  const openFolder = async () => {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog')
      const selected = await open({ directory: true, multiple: false })
      if (selected) openProject(selected as string)
    } catch {}
  }

  const removeRecent = (e: React.MouseEvent, path: string) => {
    e.stopPropagation()
    const updated = recentProjects.filter(p => p.path !== path)
    setRecentProjects(updated)
    localStorage.setItem('recentProjects', JSON.stringify(updated))
  }

  // ── Tauri 桌面模式：文件选择器 ──
  if (isTauri) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white">
        <div className="max-w-3xl mx-auto px-8 py-20">
          <h1 className="text-4xl font-bold tracking-[0.15em] text-white/90 mb-2">NETMATH</h1>
          <p className="text-sm text-white/40 mb-12">Math Knowledge Network</p>

          <div className="grid grid-cols-2 gap-4 mb-10">
            <button onClick={openFolder}
              className="p-6 rounded-lg bg-white/[0.03] border border-white/10 hover:border-white/20 hover:bg-white/[0.05] transition-all text-center">
              <div className="text-lg text-white/80">Open Project</div>
            </button>
            <button onClick={openFolder}
              className="p-6 rounded-lg bg-white/[0.03] border border-white/10 hover:border-white/20 hover:bg-white/[0.05] transition-all text-center">
              <div className="text-lg text-white/80">New Project</div>
            </button>
          </div>

          {recentProjects.length > 0 && (
            <div>
              <h2 className="text-xs text-white/30 uppercase tracking-wider mb-3">Recent</h2>
              <div className="space-y-1">
                {recentProjects.map(project => (
                  <div key={project.path}
                    onClick={() => openProject(project.path)}
                    className="flex items-center justify-between px-4 py-2 rounded text-sm text-white/50 hover:text-white/80 hover:bg-white/5 transition-colors cursor-pointer group">
                    <div>
                      <span>{project.name}</span>
                      <span className="text-white/20 ml-2 text-xs font-mono">{project.path}</span>
                    </div>
                    <button onClick={(e) => removeRecent(e, project.path)}
                      className="text-white/20 hover:text-white/50 opacity-0 group-hover:opacity-100 transition-opacity text-xs">
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── 浏览器模式：项目展示页 ──
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <div className="max-w-3xl mx-auto px-8 py-20">
        <h1 className="text-4xl font-bold tracking-[0.15em] text-white/90 mb-2">NETMATH</h1>
        <p className="text-sm text-white/40 mb-16">Math Knowledge Network</p>

        {/* Featured Projects */}
        <div className="space-y-3 mb-16">
          {FEATURED_PROJECTS.map(project => (
            <button
              key={project.path}
              onClick={() => openProject(project.path)}
              className="w-full text-left p-6 rounded-lg bg-white/[0.03] border border-white/10 hover:border-white/20 hover:bg-white/[0.05] transition-all group"
            >
              <div className="text-lg font-medium text-white/90 group-hover:text-white transition-colors">
                {project.name}
              </div>
              <p className="text-sm text-white/40 mt-1">
                {project.description}
              </p>
              <div className="text-xs text-white/20 mt-3 font-mono">
                {project.stats}
              </div>
            </button>
          ))}
        </div>

        {/* Open by path (advanced) */}
        <button
          onClick={() => { const p = prompt('Enter project path:'); if (p) openProject(p) }}
          className="text-xs text-white/15 hover:text-white/40 transition-colors"
        >
          Open project by path...
        </button>
      </div>
    </div>
  )
}
