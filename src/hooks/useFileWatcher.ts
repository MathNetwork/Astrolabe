/**
 * useFileWatcher — poll astrolabe.json + .lean file mtimes for external changes.
 *
 * astrolabe.json: 2-second poll, triggers dataStore refresh.
 * .lean files: 5-second poll, triggers /sync-lean via PTY (30s cooldown).
 */
import { useEffect, useRef } from 'react'
import { useDataStore } from '@/stores/dataStore'
import { useViewStore } from '@/stores/viewStore'
import { useHighlightStore } from '@/stores/highlightStore'
import { API_BASE } from '@/lib/apiBase'

const STORE_POLL_INTERVAL = 2000
const LEAN_POLL_INTERVAL = 5000
const LEAN_SYNC_COOLDOWN = 30000

export function useFileWatcher(projectPath: string | null) {
    const lastMtimeRef = useRef<number>(0)
    const lastLeanMtimeRef = useRef<number | null>(null)
    const lastSyncTimeRef = useRef<number>(0)

    // astrolabe.json mtime watcher
    useEffect(() => {
        if (!projectPath) return

        const poll = async () => {
            try {
                const r = await fetch(`${API_BASE}/api/astrolabe/mtime?path=${encodeURIComponent(projectPath)}`)
                if (!r.ok) return
                const { mtime } = await r.json()
                if (lastMtimeRef.current !== 0 && mtime !== lastMtimeRef.current) {
                    useDataStore.getState().triggerRefresh()
                }
                lastMtimeRef.current = mtime
            } catch {}
        }

        poll()
        const id = setInterval(poll, STORE_POLL_INTERVAL)
        return () => clearInterval(id)
    }, [projectPath])

    // .lean file mtime watcher — auto-sync on change
    useEffect(() => {
        if (!projectPath) return

        const pollLean = async () => {
            try {
                const r = await fetch(`${API_BASE}/api/astrolabe/lean_mtime?path=${encodeURIComponent(projectPath)}`)
                if (!r.ok) return
                const { mtime } = await r.json()
                if (mtime == null) return  // no lean project

                if (lastLeanMtimeRef.current !== null && mtime !== lastLeanMtimeRef.current) {
                    const now = Date.now()
                    if (now - lastSyncTimeRef.current > LEAN_SYNC_COOLDOWN) {
                        lastSyncTimeRef.current = now
                        const sessionId = useViewStore.getState().ptySessionId
                        if (sessionId) {
                            try {
                                const { invoke } = await import('@tauri-apps/api/core')
                                await invoke('pty_write', { sessionId, data: '/sync-lean\n' })
                                useHighlightStore.getState().setStatusText('Auto-syncing Lean state...')
                                setTimeout(() => useHighlightStore.getState().setStatusText(null), 10000)
                            } catch { /* Tauri not available */ }
                        }
                    }
                }
                lastLeanMtimeRef.current = mtime
            } catch {}
        }

        pollLean()
        const id = setInterval(pollLean, LEAN_POLL_INTERVAL)
        return () => clearInterval(id)
    }, [projectPath])
}
