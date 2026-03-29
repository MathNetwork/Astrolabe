/**
 * useFileWatcher — watch astrolabe.json for external changes
 *
 * Uses @tauri-apps/plugin-fs watch API.
 * Debounces rapid changes and triggers dataStore refresh.
 */
import { useEffect, useRef } from 'react'
import { useDataStore } from '@/stores/dataStore'

export function useFileWatcher(projectPath: string | null) {
    const triggerRefresh = useDataStore(s => s.triggerRefresh)
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const unwatchRef = useRef<(() => void) | null>(null)
    const mountedRef = useRef(true)

    useEffect(() => {
        mountedRef.current = true
        if (!projectPath) return

        const watchPath = `${projectPath}/.astrolabe/astrolabe.json`

        const debouncedRefresh = () => {
            if (timerRef.current) clearTimeout(timerRef.current)
            timerRef.current = setTimeout(() => {
                if (mountedRef.current) triggerRefresh()
            }, 300)
        }

        ;(async () => {
            try {
                if (!(window as any).__TAURI_INTERNALS__) return
                const { watch } = await import('@tauri-apps/plugin-fs')
                if (!mountedRef.current) return
                const unwatch = await watch(watchPath, () => {
                    debouncedRefresh()
                }, { recursive: false })
                if (mountedRef.current) {
                    unwatchRef.current = unwatch
                } else {
                    // Already unmounted, clean up immediately
                    try { unwatch() } catch {}
                }
            } catch {
                // Not in Tauri environment
            }
        })()

        return () => {
            mountedRef.current = false
            if (timerRef.current) clearTimeout(timerRef.current)
            if (unwatchRef.current) {
                try { unwatchRef.current() } catch {}
                unwatchRef.current = null
            }
        }
    }, [projectPath, triggerRefresh])
}
