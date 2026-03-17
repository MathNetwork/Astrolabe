import { create } from 'zustand'

type ViewMode = 'read' | 'network' | 'detail'

interface ViewState {
  viewMode: ViewMode
  layoutPreset: string
  showLabels: boolean
  showBridges: boolean

  setViewMode: (mode: ViewMode) => void
  setLayoutPreset: (preset: string) => void
  toggleLabels: () => void
  toggleBridges: () => void
}

export const useViewStore = create<ViewState>((set) => ({
  viewMode: 'read',
  layoutPreset: 'read',
  showLabels: false,
  showBridges: false,

  setViewMode: (mode) => set({ viewMode: mode }),
  setLayoutPreset: (preset) => set({ layoutPreset: preset }),
  toggleLabels: () => set((s) => ({ showLabels: !s.showLabels })),
  toggleBridges: () => set((s) => ({ showBridges: !s.showBridges })),
}))
