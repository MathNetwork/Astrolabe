import { create } from 'zustand'

export type LayoutMode = 'single' | 'split-right' | 'split-left' | 'split-bottom' | 'split-top' | 'three-equal'
export type ViewTab = 'read' | 'network' | 'detail'

interface ViewState {
  layoutMode: LayoutMode
  showLabels: boolean
  activeTab: ViewTab
  setLayoutMode: (mode: LayoutMode) => void
  toggleLabels: () => void
  setActiveTab: (tab: ViewTab) => void
}

export const useViewStore = create<ViewState>((set) => ({
  layoutMode: 'single',
  showLabels: false,
  activeTab: 'read',
  setLayoutMode: (mode) => set({ layoutMode: mode }),
  toggleLabels: () => set((s) => ({ showLabels: !s.showLabels })),
  setActiveTab: (tab) => set({ activeTab: tab }),
}))
