/**
 * selectObjStore — obj（节点）选中状态
 *
 * 纯选中状态，不含渲染行为（相机跳转等由 NetworkView 自行处理）。
 *
 * 订阅者各自决定如何响应：
 *   - CardStack:    滚动到选中 obj 的卡片
 *   - NetworkView:  高亮节点 + 飞相机（NetworkView 内部逻辑）
 *   - DetailView:   显示 obj 详情
 *
 * 与 selectMorStore 完全独立。
 */
import { create } from 'zustand'

interface SelectObjState {
  /** 当前选中的 obj hash，null 表示未选中 */
  selectedHash: string | null

  select: (hash: string | null) => void
}

export const useSelectObjStore = create<SelectObjState>((set) => ({
  selectedHash: null,

  select: (hash) => set({ selectedHash: hash }),
}))
