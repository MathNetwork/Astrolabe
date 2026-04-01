import { create } from 'zustand'

export type LayoutMode = 'single' | 'split-right' | 'split-left' | 'split-bottom' | 'split-top' | 'three-equal'
export type ViewTab = 'read' | 'network' | 'detail'

interface ViewState {
  layoutMode: LayoutMode
  showLabels: boolean
  activeTab: ViewTab
  fontSize: number  // global font size multiplier (10-20, default 14)
  numberMap: Map<string, string>  // hash → number string (e.g. "3.4")
  setLayoutMode: (mode: LayoutMode) => void
  toggleLabels: () => void
  setActiveTab: (tab: ViewTab) => void
  setFontSize: (size: number) => void
  increaseFontSize: () => void
  decreaseFontSize: () => void
  setNumberMap: (map: Map<string, string>) => void
  getNumber: (hash: string) => string | undefined
}

export const useViewStore = create<ViewState>((set, get) => ({
  layoutMode: 'single',
  showLabels: false,
  activeTab: 'read',
  fontSize: 14,
  numberMap: new Map(),
  setLayoutMode: (mode) => set({ layoutMode: mode }),
  toggleLabels: () => set((s) => ({ showLabels: !s.showLabels })),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setFontSize: (size) => set({ fontSize: Math.max(10, Math.min(24, size)) }),
  increaseFontSize: () => set((s) => ({ fontSize: Math.min(24, s.fontSize + 1) })),
  decreaseFontSize: () => set((s) => ({ fontSize: Math.max(10, s.fontSize - 1) })),
  setNumberMap: (map) => set({ numberMap: map }),
  getNumber: (hash) => get().numberMap.get(hash),
}))
