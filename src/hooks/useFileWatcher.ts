/**
 * useFileWatcher — watch astrolabe.json for external changes
 *
 * Uses @tauri-apps/plugin-fs watch API.
 * Debounces rapid changes (e.g. VSCode save writing multiple times).
 * Triggers data reload on change.
 */
import { useEffect, useRef } from 'react'
import { useDataStore } from '@/stores/dataStore'
import { API_BASE } from '@/lib/apiBase'

export function useFileWatcher(projectPath: string | null) {
    const setObjects = useDataStore(s => s.setObjects)
    const setMorphisms = useDataStore(s => s.setMorphisms)
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const unwatchRef = useRef<(() => void) | null>(null)

    useEffect(() => {
        if (!projectPath) return

        const watchPath = `${projectPath}/.astrolabe/astrolabe.json`

        const reload = () => {
            fetch(`${API_BASE}/api/astrolabe/graph?path=${encodeURIComponent(projectPath)}`)
                .then(r => r.json())
                .then(graph => {
                    setObjects(graph.nodes || [])
                    setMorphisms(graph.edges || [])
                })
                .catch(() => {})
        }

        const debouncedReload = () => {
            if (timerRef.current) clearTimeout(timerRef.current)
            timerRef.current = setTimeout(reload, 300)
        }

        ;(async () => {
            try {
                const { watch } = await import('@tauri-apps/plugin-fs')
                const unwatch = await watch(watchPath, (event) => {
                    // Any modification event triggers reload
                    if (event.type && typeof event.type === 'object' && 'modify' in event.type) {
                        debouncedReload()
                    }
                    // Also handle create/remove (file replaced)
                    if (event.type && typeof event.type === 'object' &&
                        ('create' in event.type || 'remove' in event.type)) {
                        debouncedReload()
                    }
                }, { recursive: false })
                unwatchRef.current = unwatch
            } catch {
                // Not in Tauri environment or watch not available
            }
        })()

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current)
            setTimeout(() => {
                try { unwatchRef.current?.() } catch { /* cleanup race */ }
            }, 0)
        }
    }, [projectPath, setObjects, setMorphisms])
}
