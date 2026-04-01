import { usePluginStore } from './registry'
import { leanNetsPlugin } from './leannets'

/** Register all built-in plugins. Call once at app startup. */
export function initPlugins() {
    const { register } = usePluginStore.getState()
    register(leanNetsPlugin)
}
