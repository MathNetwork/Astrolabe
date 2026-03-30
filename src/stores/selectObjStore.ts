import { create } from 'zustand'

interface SelectObjState {
  selectedHash: string | null
  select: (hash: string | null) => void
}

export const useSelectObjStore = create<SelectObjState>((set) => ({
  selectedHash: null,
  select: (hash) => set({ selectedHash: hash }),
}))
