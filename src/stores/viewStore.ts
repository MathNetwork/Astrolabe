/**
 * viewStore — 视图状态
 *
 * 两层解耦：
 *   - layoutMode: slot 的空间排列（single / split-right）
 *   - view 绑定在 WorkspacePanel 内部管理（slots 状态）
 *
 * 支持 undo/redo（temporal 中间件）。
 */
import { create } from 'zustand'
import { temporal } from 'zundo'

/** slot 的空间排列方式 */
export type LayoutMode =
    | 'single'        // 一个 slot，tab 切换
    | 'split-right'   // 左大(slot1) + 右上(slot2) + 右下(slot3)
    | 'split-bottom'  // 上大(slot1) + 下左(slot2) + 下右(slot3)
    | 'three-equal'   // 三列均分(slot1 | slot2 | slot3)

interface ViewState {
  layoutMode: LayoutMode
  showLabels: boolean
  showBridges: boolean

  setLayoutMode: (mode: LayoutMode) => void
  toggleLabels: () => void
  toggleBridges: () => void
}

export const useViewStore = create<ViewState>()(
    temporal(
        (set) => ({
            layoutMode: 'single',
            showLabels: false,
            showBridges: false,

            setLayoutMode: (mode) => set({ layoutMode: mode }),
            toggleLabels: () => set((s) => ({ showLabels: !s.showLabels })),
            toggleBridges: () => set((s) => ({ showBridges: !s.showBridges })),
        })
    )
)
