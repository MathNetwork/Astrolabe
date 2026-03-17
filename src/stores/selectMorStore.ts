/**
 * selectMorStore — mor（边）选中状态
 *
 * 存储当前选中的 mor hash。所有需要响应 mor 选中的 Panel 订阅此 store：
 *   - NetworkView: 高亮选中的边
 *   - DetailView: 显示 mor 详情（source/target/notes）
 *
 * 与 selectObjStore 完全独立，互不影响。
 */
import { create } from 'zustand'

interface SelectMorState {
  /** 当前选中的 mor hash，null 表示未选中 */
  selectedHash: string | null

  select: (hash: string | null) => void
}

export const useSelectMorStore = create<SelectMorState>((set) => ({
  selectedHash: null,

  select: (hash) => set({ selectedHash: hash }),
}))
