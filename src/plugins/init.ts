import { usePluginStore } from './registry'
import { mathNetworkPlugin } from './mathnetwork'

/** Register all built-in plugins. Call once at app startup. */
export function initPlugins() {
    const { register } = usePluginStore.getState()
    register(mathNetworkPlugin)
}
