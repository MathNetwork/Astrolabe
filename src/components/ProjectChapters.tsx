'use client'

import { useEffect, useState } from 'react'
import { API_BASE } from '@/lib/apiBase'

interface DocFile { name: string; title: string }

/** Live chapter list for the current project, derived from the docs in the
 *  store (the same source the sidebar uses) — so it never goes stale when a
 *  chapter is added, removed, or renamed. Rendered wherever the `\chapters`
 *  macro appears. */
export function ProjectChapters() {
  const [files, setFiles] = useState<DocFile[]>([])

  useEffect(() => {
    const path = typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('path')
      : null
    if (!path) return
    let alive = true
    fetch(`${API_BASE}/api/docs/list?path=${encodeURIComponent(path)}`)
      .then((r) => (r.ok ? r.json() : { files: [] }))
      .then((data) => { if (alive) setFiles(data.files || []) })
      .catch(() => {})
    return () => { alive = false }
  }, [])

  // Drop the index page itself; keep the ordered chapter docs.
  const chapters = files.filter((f) => !/(^|\/)(00-index|index|_index)\.mdx?$/.test(f.name))
  if (chapters.length === 0) return null

  return (
    <ul className="my-4 space-y-1.5">
      {chapters.map((f) => (
        <li key={f.name} className="text-[14px] text-white/70">{f.title}</li>
      ))}
    </ul>
  )
}
