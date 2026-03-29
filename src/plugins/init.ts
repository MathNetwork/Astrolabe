import { usePluginStore } from './registry'
import { skeletonPlugin } from './skeleton'

/** Register all built-in plugins. Call once at app startup. */
export function initPlugins() {
    const { register } = usePluginStore.getState()
    register(skeletonPlugin)
}
