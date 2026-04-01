/**
 * useFileWatcher — poll astrolabe.json mtime for external changes.
 *
 * Checks the file's mtime every 2 seconds via /api/astrolabe/mtime.
 * When mtime changes, triggers dataStore refresh so all views update.
 */
import { useEffect, useRef } from 'react'
import { useDataStore } from '@/stores/dataStore'
import { API_BASE } from '@/lib/apiBase'

const POLL_INTERVAL = 2000

export function useFileWatcher(projectPath: string | null) {
    const lastMtimeRef = useRef<number>(0)

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
        const id = setInterval(poll, POLL_INTERVAL)
        return () => clearInterval(id)
    }, [projectPath])
}
