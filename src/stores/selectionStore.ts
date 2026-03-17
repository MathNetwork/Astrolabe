import { create } from 'zustand'

interface SelectionState {
  selectedNodeId: string | null
  selectedEdgeId: string | null
  focusNodeId: string | null

  selectNode: (id: string | null) => void
  selectEdge: (id: string | null) => void
  focusNode: (id: string | null) => void
}

export const useSelectionStore = create<SelectionState>((set) => ({
  selectedNodeId: null,
  selectedEdgeId: null,
  focusNodeId: null,

  selectNode: (id) => set({ selectedNodeId: id, selectedEdgeId: null }),
  selectEdge: (id) => set({ selectedEdgeId: id, selectedNodeId: null }),
  focusNode: (id) => set({ focusNodeId: id }),
}))
