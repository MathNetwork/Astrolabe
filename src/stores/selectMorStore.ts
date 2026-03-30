import { create } from 'zustand'

interface SelectMorState {
  selectedHash: string | null
  select: (hash: string | null) => void
}

export const useSelectMorStore = create<SelectMorState>((set) => ({
  selectedHash: null,
  select: (hash) => set({ selectedHash: hash }),
}))
