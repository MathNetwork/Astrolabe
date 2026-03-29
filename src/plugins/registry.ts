import { create } from 'zustand'
import type { AstrolabePlugin } from './types'

interface PluginState {
    plugins: AstrolabePlugin[]
    enabled: Set<string>
    register: (plugin: AstrolabePlugin) => void
    toggle: (id: string) => void
    isEnabled: (id: string) => boolean
}

export const usePluginStore = create<PluginState>((set, get) => ({
    plugins: [],
    enabled: new Set(),

    register: (plugin) => set(s => {
        if (s.plugins.some(p => p.id === plugin.id)) return s
        return { plugins: [...s.plugins, plugin] }
    }),

    toggle: (id) => set(s => {
        const next = new Set(s.enabled)
        next.has(id) ? next.delete(id) : next.add(id)
        return { enabled: next }
    }),

    isEnabled: (id) => get().enabled.has(id),
}))
