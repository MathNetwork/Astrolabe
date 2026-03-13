import { useEffect, useRef } from 'react'
import { updateViewport, type UiPreferences } from '@/lib/api'

/**
 * Persists UI preferences (layout, panels, pinned cards) to the backend
 * via the viewport API's ui_preferences field.
 *
 * Saves are debounced at 500ms to avoid excessive API calls.
 */
export function useUiPreferencesPersistence({
    projectPath,
    viewportLoaded,
    preferences,
}: {
    projectPath: string
    viewportLoaded: boolean
    preferences: UiPreferences
}) {
    const initializedRef = useRef(false)
    const timeoutRef = useRef<NodeJS.Timeout | null>(null)

    useEffect(() => {
        if (!projectPath || !viewportLoaded) return

        // Skip the first render (initial restore) to avoid writing defaults back
        if (!initializedRef.current) {
            initializedRef.current = true
            return
        }

        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
        }

        timeoutRef.current = setTimeout(() => {
            updateViewport(projectPath, { ui_preferences: preferences }).catch((err) => {
                console.error('[ui-prefs] Failed to save UI preferences:', err)
            })
        }, 500)

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current)
        }
    }, [
        projectPath,
        viewportLoaded,
        preferences.layoutPreset,
        preferences.mainViewTab,
        preferences.searchPanelOpen,
        preferences.rightPanelOpen,
        // Serialize pinnedCardIds to avoid reference equality issues
        // eslint-disable-next-line react-hooks/exhaustive-deps
        JSON.stringify(preferences.pinnedCardIds),
    ])

    // Reset when project changes
    useEffect(() => {
        initializedRef.current = false
    }, [projectPath])
}
