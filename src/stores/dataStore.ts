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
  notes?: string
  strict?: boolean
  [key: string]: unknown
}

export interface SortConfig {
  [sort: string]: { color: string }
}

interface DataState {
  objects: KnowledgeObject[]
  morphisms: KnowledgeMorphism[]
  nodeNumbering: Map<string, string>
  sortConfig: SortConfig | null  // 项目自定义 sort，null = 用默认

  setObjects: (objects: KnowledgeObject[]) => void
  setMorphisms: (morphisms: KnowledgeMorphism[]) => void
  setNodeNumbering: (numbering: Map<string, string>) => void
  setSortConfig: (config: SortConfig | null) => void
  getNodeLabel: (id: string) => string | undefined
  getObjectById: (id: string) => KnowledgeObject | undefined
}

export const useDataStore = create<DataState>((set, get) => ({
  objects: [],
  morphisms: [],
  nodeNumbering: new Map(),
  sortConfig: null,

  setObjects: (objects) => set({ objects }),
  setMorphisms: (morphisms) => set({ morphisms }),
  setNodeNumbering: (numbering) => set({ nodeNumbering: numbering }),
  setSortConfig: (config) => set({ sortConfig: config }),
  getNodeLabel: (id) => get().nodeNumbering.get(id),
  getObjectById: (id) => get().objects.find(o => o.id === id),
}))
