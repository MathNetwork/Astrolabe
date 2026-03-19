import { create } from 'zustand'

export interface KnowledgeObject {
  id: string
  name: string
  sort: string
  status: string
  statement?: string
  proof?: string
  intuition?: string
  notes?: string
  [key: string]: unknown
}

export interface KnowledgeMorphism {
  id: string
  source: string
  target: string
  sort?: string
  notes?: string
  strict?: boolean
  [key: string]: unknown
}

interface DataState {
  objects: KnowledgeObject[]
  morphisms: KnowledgeMorphism[]
  objectMap: Map<string, KnowledgeObject>
  nodeNumbering: Map<string, string>

  refreshTrigger: number

  setObjects: (objects: KnowledgeObject[]) => void
  setMorphisms: (morphisms: KnowledgeMorphism[]) => void
  setNodeNumbering: (numbering: Map<string, string>) => void
  triggerRefresh: () => void
  getNodeLabel: (id: string) => string | undefined
  getObjectById: (id: string) => KnowledgeObject | undefined
}

export const useDataStore = create<DataState>((set, get) => ({
  objects: [],
  morphisms: [],
  objectMap: new Map(),
  nodeNumbering: new Map(),
  refreshTrigger: 0,

  setObjects: (objects) => {
    const objectMap = new Map(objects.map(o => [o.id, o]))
    set({ objects, objectMap })
  },
  setMorphisms: (morphisms) => set({ morphisms }),
  setNodeNumbering: (numbering) => set({ nodeNumbering: numbering }),
  triggerRefresh: () => set((s) => ({ refreshTrigger: s.refreshTrigger + 1 })),
  getNodeLabel: (id) => get().nodeNumbering.get(id),
  getObjectById: (id) => get().objectMap.get(id),
}))
