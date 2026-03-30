/**
 * selectMorStore — mor（边）选中状态
 *
 * 写入者：
 *   - NetworkView:  点击 3D 边
 *
 * 读取者：
 *   - NetworkView:  高亮选中的边
 *   - DetailView:   显示 mor 详情
 *
 * 支持 undo/redo（temporal 中间件）。
 */
import { create } from 'zustand'
import { temporal } from 'zundo'

interface SelectMorState {
  selectedHash: string | null
  select: (hash: string | null) => void
}

export const useSelectMorStore = create<SelectMorState>()(
    temporal(
        (set) => ({
            selectedHash: null,
            select: (hash) => set({ selectedHash: hash }),
        })
    )
)
