import { create } from 'zustand'

/**
 * Read-view CONTENT state — which doc is open, and its scroll position.
 *
 * Deliberately separate from viewStore (container/layout state): switching
 * panes or layout must not disturb what you're reading. Keeping this in a store
 * (not component state) means ReadView can unmount/remount as panels reshuffle
 * without losing the open doc or jumping back to the index.
 */
interface ReadState {
    selectedDoc: string | null
    scrollTop: number
    sidebarOpen: boolean
    setSelectedDoc: (path: string | null) => void
    setScrollTop: (top: number) => void
    setSidebarOpen: (open: boolean) => void
}

export const useReadStore = create<ReadState>((set) => ({
    selectedDoc: null,
    scrollTop: 0,
    sidebarOpen: true,
    setSelectedDoc: (path) => set({ selectedDoc: path, scrollTop: 0 }),
    setScrollTop: (top) => set({ scrollTop: top }),
    setSidebarOpen: (open) => set({ sidebarOpen: open }),
}))
