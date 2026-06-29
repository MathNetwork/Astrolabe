import { usePluginStore } from './registry'
import { leanNetsPlugin } from './leannets'

/** Register all built-in plugins. Call once at app startup. */
export function initPlugins() {
    const { register, setMode } = usePluginStore.getState()
    register(leanNetsPlugin)
    // Default to the LeanNets NETWORK (1-skeleton) view, not the plain entry graph.
    setMode(leanNetsPlugin.id, true)
}
