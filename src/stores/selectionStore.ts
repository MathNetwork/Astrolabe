import { create } from 'zustand'

interface SelectionState {
  // 当前选中的 hash（同一时刻只能选 obj 或 mor，不能同时）
  selectedObjHash: string | null
  selectedMorHash: string | null

  // 3D 跳转目标
  focusObjHash: string | null

  selectObj: (hash: string | null) => void
  selectMor: (hash: string | null) => void
  focusObj: (hash: string | null) => void
}

export const useSelectionStore = create<SelectionState>((set) => ({
  selectedObjHash: null,
  selectedMorHash: null,
  focusObjHash: null,

  selectObj: (hash) => set({ selectedObjHash: hash, selectedMorHash: null }),
  selectMor: (hash) => set({ selectedMorHash: hash, selectedObjHash: null }),
  focusObj: (hash) => set({ focusObjHash: hash }),
}))
