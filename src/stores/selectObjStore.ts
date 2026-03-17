/**
 * selectObjStore — obj（节点）选中状态
 *
 * 存储当前选中的 obj hash。所有需要响应 obj 选中的 Panel 订阅此 store：
 *   - CardStack: 滚动到选中 obj 的卡片
 *   - NetworkView: 高亮选中的节点
 *   - DetailView: 显示 obj 详情
 *
 * 与 selectMorStore 完全独立，互不影响。
 */
import { create } from 'zustand'

interface SelectObjState {
  /** 当前选中的 obj hash，null 表示未选中 */
  selectedHash: string | null
  /** 3D 跳转目标（相机飞向此 obj），null 表示不跳转 */
  focusHash: string | null

  select: (hash: string | null) => void
  focus: (hash: string | null) => void
}

export const useSelectObjStore = create<SelectObjState>((set) => ({
  selectedHash: null,
  focusHash: null,

  select: (hash) => set({ selectedHash: hash }),
  focus: (hash) => set({ focusHash: hash }),
}))
