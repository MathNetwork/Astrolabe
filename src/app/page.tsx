'use client'

import '@/lib/errorSuppression'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircleIcon, XCircleIcon, ArrowPathIcon } from '@heroicons/react/24/outline'
import ParticleBackground from '@/components/ParticleBackground'

interface RecentProject {
  path: string
  name: string
  lastOpened: string
}

interface ClaudeStatus {
  installed: boolean
  authenticated: boolean
  binary_path: string | null
  version: string | null
  account_email: string | null
  missing_git: boolean
}

// 预配置的项目
// 本地开发用本地路径，部署时用 NEXT_PUBLIC_PROJECT_PATH 环境变量
const DEFAULT_PROJECT_PATH = process.env.NEXT_PUBLIC_PROJECT_PATH || '/Users/moqian/GMTNet'

const FEATURED_PROJECTS = [
  {
    path: DEFAULT_PROJECT_PATH,
    name: 'GMTNet',
    description: 'Geometric Measure Theory — Pitts min-max theorem and regularity of minimal hypersurfaces',
    stats: '175 objects · 208 morphisms · 9 chapters',
  },
]

// ── EnvironmentStatus ──

function EnvironmentStatus() {
  const [claudeStatus, setClaudeStatus] = useState<ClaudeStatus | null>(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    checkClaudeStatus()
  }, [])

  const checkClaudeStatus = async () => {
    setChecking(true)
    try {
      const { invoke } = await import('@tauri-apps/api/core')
      const status = await invoke<ClaudeStatus>('check_claude_status')
      setClaudeStatus(status)
    } catch {
      setClaudeStatus(null)
    }
    setChecking(false)
  }

  const claudeDetail = () => {
    if (checking) return 'Checking...'
    if (!claudeStatus) return 'Not available'
    if (!claudeStatus.installed) return 'Not installed'
    if (!claudeStatus.authenticated) return 'Not authenticated'
    // 清理版本号：取第一个数字版本部分（如 "2.1.78 (Claude Code)" → "2.1.78"）
    const version = claudeStatus.version?.match(/[\d.]+/)?.[0] ?? claudeStatus.version
    // 清理邮箱：去掉引号和逗号
    const email = claudeStatus.account_email?.replace(/[",]/g, '').trim()
    return [version, email].filter(Boolean).join(' · ')
  }

  const isReady = claudeStatus?.installed && claudeStatus?.authenticated

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-white/[0.03] border border-white/5">
      {checking ? (
        <ArrowPathIcon className="w-3 h-3 text-white/30 animate-spin" />
      ) : isReady ? (
        <CheckCircleIcon className="w-3 h-3 text-green-400/70" />
      ) : (
        <XCircleIcon className="w-3 h-3 text-red-400/70" />
      )}
      <span className="text-xs text-white/40">Claude Code</span>
      <span className="text-xs text-white/25">{claudeDetail()}</span>
    </div>
  )
}

// ── Home ──

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
      <div className="h-screen bg-[#0a0a0f] text-white relative flex items-center justify-center">
        <ParticleBackground particleCount={260} mouseRadius={250} />
        <div className="relative z-10 flex flex-col items-center">
          <h1 className="text-4xl font-bold tracking-[0.15em] text-white/90 mb-2">ASTROLABE</h1>
          <p className="text-sm text-white/40 mb-10">Navigate your knowledge network</p>

          <div className="mb-6"><EnvironmentStatus /></div>

          <div className="flex gap-3 mb-8">
            <button onClick={openFolder}
              className="px-5 py-2 rounded border border-white/20 text-sm text-white/70 hover:text-white hover:border-white/50 hover:bg-white/[0.05] transition-all">
              Open Project
            </button>
            <button onClick={openFolder}
              className="px-5 py-2 rounded border border-white/20 text-sm text-white/70 hover:text-white hover:border-white/50 hover:bg-white/[0.05] transition-all">
              New Project
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
    <div className="min-h-screen bg-[#0a0a0f] text-white relative">
      <ParticleBackground particleCount={260} mouseRadius={250} />
      <div className="max-w-3xl mx-auto px-8 py-20 relative z-10">
        <h1 className="text-4xl font-bold tracking-[0.15em] text-white/90 mb-2">ASTROLABE</h1>
        <p className="text-sm text-white/40 mb-16">Navigate your knowledge network</p>

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
