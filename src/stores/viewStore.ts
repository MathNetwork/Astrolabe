/**
 * viewStore — 视图状态
 *
 * 订阅者：
 *   - WorkspacePanel: 决定显示哪个 View
 *   - ControlsPanel: 视图切换按钮
 *
 * 支持 undo/redo（temporal 中间件）。
 */
import { create } from 'zustand'
import { temporal } from 'zundo'

type ViewMode = 'read' | 'network' | 'detail' | 'single'

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

export const useViewStore = create<ViewState>()(
    temporal(
        (set) => ({
            viewMode: 'read',
            layoutPreset: 'read',
            showLabels: false,
            showBridges: false,

            setViewMode: (mode) => set({ viewMode: mode }),
            setLayoutPreset: (preset) => set({ layoutPreset: preset }),
            toggleLabels: () => set((s) => ({ showLabels: !s.showLabels })),
            toggleBridges: () => set((s) => ({ showBridges: !s.showBridges })),
        })
    )
)
