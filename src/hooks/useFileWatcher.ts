/**
 * useFileWatcher — placeholder for future file watching
 *
 * Currently disabled due to Tauri plugin-fs watch/unwatch race condition
 * during React HMR. Data refresh is handled by refreshTrigger in dataStore.
 */
export function useFileWatcher(_projectPath: string | null) {
    // no-op
}
