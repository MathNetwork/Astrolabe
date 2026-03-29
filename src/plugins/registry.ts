import { create } from 'zustand'
import type { AstrolabePlugin } from './types'

interface PluginState {
    plugins: AstrolabePlugin[]
    enabled: Set<string>
    activeMode: Record<string, boolean>  // plugin id → mode active
    register: (plugin: AstrolabePlugin) => void
    toggle: (id: string) => void
    isEnabled: (id: string) => boolean
    setMode: (id: string, active: boolean) => void
    isModeActive: (id: string) => boolean
}

export const usePluginStore = create<PluginState>((set, get) => ({
    plugins: [],
    enabled: new Set(),
    activeMode: {},

    register: (plugin) => set(s => {
        if (s.plugins.some(p => p.id === plugin.id)) return s
        return { plugins: [...s.plugins, plugin] }
    }),

    toggle: (id) => set(s => {
        const next = new Set(s.enabled)
        next.has(id) ? next.delete(id) : next.add(id)
        // Deactivate mode when plugin is disabled
        if (!next.has(id)) {
            const modes = { ...s.activeMode }
            delete modes[id]
            return { enabled: next, activeMode: modes }
        }
        return { enabled: next }
    }),

    isEnabled: (id) => get().enabled.has(id),

    setMode: (id, active) => set(s => ({
        activeMode: { ...s.activeMode, [id]: active }
    })),

    isModeActive: (id) => get().enabled.has(id) && (get().activeMode[id] ?? false),
}))
