import { create } from 'zustand'

export type LayoutMode = 'single' | 'split-right' | 'split-left' | 'split-bottom' | 'split-top' | 'three-equal'
export type ViewTab = 'read' | 'network' | 'detail'

interface ViewState {
  layoutMode: LayoutMode
  showLabels: boolean
  activeTab: ViewTab
  fontSize: number  // global font size multiplier (10-20, default 14)
  setLayoutMode: (mode: LayoutMode) => void
  toggleLabels: () => void
  setActiveTab: (tab: ViewTab) => void
  setFontSize: (size: number) => void
  increaseFontSize: () => void
  decreaseFontSize: () => void
}

export const useViewStore = create<ViewState>((set) => ({
  layoutMode: 'single',
  showLabels: false,
  activeTab: 'read',
  fontSize: 14,
  setLayoutMode: (mode) => set({ layoutMode: mode }),
  toggleLabels: () => set((s) => ({ showLabels: !s.showLabels })),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setFontSize: (size) => set({ fontSize: Math.max(10, Math.min(24, size)) }),
  increaseFontSize: () => set((s) => ({ fontSize: Math.min(24, s.fontSize + 1) })),
  decreaseFontSize: () => set((s) => ({ fontSize: Math.max(10, s.fontSize - 1) })),
}))
