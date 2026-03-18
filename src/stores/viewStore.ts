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
    | 'split-left'    // 右大(slot1) + 左上(slot2) + 左下(slot3)
    | 'split-bottom'  // 上大(slot1) + 下左(slot2) + 下右(slot3)
    | 'split-top'     // 下大(slot1) + 上左(slot2) + 上右(slot3)
    | 'three-equal'   // 三列均分(slot1 | slot2 | slot3)

/** 节点大小映射模式 */
export type SizeMappingMode = 'default' | 'pagerank' | 'indegree' | 'betweenness' | 'depth' | 'katz' | 'hub' | 'authority'

/** 节点颜色映射模式 */
export type ColorMappingMode = 'sort' | 'community' | 'layer' | 'spectral' | 'curvature' | 'anomaly'

/** 聚类布局模式 */
export type ClusterMode = 'none' | 'community' | 'layer' | 'spectral' | 'curvature' | 'anomaly'

/** 当前激活的视图标签 */
export type ViewTab = 'read' | 'network' | 'detail'

interface ViewState {
  layoutMode: LayoutMode
  showLabels: boolean
  showBridges: boolean
  sizeMappingMode: SizeMappingMode
  colorMappingMode: ColorMappingMode
  clusterMode: ClusterMode
  clusterStrength: number
  activeTab: ViewTab

  setLayoutMode: (mode: LayoutMode) => void
  toggleLabels: () => void
  toggleBridges: () => void
  setSizeMappingMode: (mode: SizeMappingMode) => void
  setColorMappingMode: (mode: ColorMappingMode) => void
  setClusterMode: (mode: ClusterMode) => void
  setClusterStrength: (v: number) => void
  setActiveTab: (tab: ViewTab) => void
}

export const useViewStore = create<ViewState>()(
    temporal(
        (set) => ({
            layoutMode: 'single',
            showLabels: false,
            showBridges: false,
            sizeMappingMode: 'default',
            colorMappingMode: 'sort',
            clusterMode: 'none',
            clusterStrength: 0,
            activeTab: 'read',

            setLayoutMode: (mode) => set({ layoutMode: mode }),
            toggleLabels: () => set((s) => ({ showLabels: !s.showLabels })),
            toggleBridges: () => set((s) => ({ showBridges: !s.showBridges })),
            setSizeMappingMode: (mode) => set({ sizeMappingMode: mode }),
            setColorMappingMode: (mode) => set({ colorMappingMode: mode }),
            setClusterMode: (mode) => set({ clusterMode: mode }),
            setClusterStrength: (v) => set({ clusterStrength: v }),
            setActiveTab: (tab) => set({ activeTab: tab }),
        })
    )
)
