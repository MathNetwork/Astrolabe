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

export interface FileEntry {
  name: string
  type: 'file' | 'directory'
  path: string
  size?: number
  children?: FileEntry[]
}

export interface FunctorInfo {
  name: string
  version: string
  description: string
  signature: string  // mathematical definition, e.g. "F: E → A(Σ)"
  author: string
  updated_at: string
  icon: string
  skills: { id: string; name: string; command: string; description: string }[]
  analysis_endpoints: { key: string; url: string; label: string; type: string }[]
}

interface DataState {
  objects: KnowledgeObject[]
  morphisms: KnowledgeMorphism[]
  objectMap: Map<string, KnowledgeObject>
  objNumbering: Map<string, string>
  functors: FunctorInfo[]
  projectFiles: FileEntry[]

  refreshTrigger: number

  setObjects: (objects: KnowledgeObject[]) => void
  setMorphisms: (morphisms: KnowledgeMorphism[]) => void
  setObjNumbering: (numbering: Map<string, string>) => void
  setFunctors: (functors: FunctorInfo[]) => void
  setProjectFiles: (files: FileEntry[]) => void
  triggerRefresh: () => void
  getObjLabel: (id: string) => string | undefined
  getObjectById: (id: string) => KnowledgeObject | undefined
}

export const useDataStore = create<DataState>((set, get) => ({
  objects: [],
  morphisms: [],
  objectMap: new Map(),
  objNumbering: new Map(),
  functors: [],
  projectFiles: [],
  refreshTrigger: 0,

  setObjects: (objects) => {
    const objectMap = new Map(objects.map(o => [o.id, o]))
    set({ objects, objectMap })
  },
  setMorphisms: (morphisms) => set({ morphisms }),
  setObjNumbering: (numbering) => set({ objNumbering: numbering }),
  setFunctors: (functors) => set({ functors }),
  setProjectFiles: (files) => set({ projectFiles: files }),
  triggerRefresh: () => set((s) => ({ refreshTrigger: s.refreshTrigger + 1 })),
  getObjLabel: (id) => get().objNumbering.get(id),
  getObjectById: (id) => get().objectMap.get(id),
}))
