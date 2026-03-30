import { create } from 'zustand'

interface PhysicsState {
  gravity: number
  repulsion: number
  linkDistance: number
  friction: number
  setGravity: (v: number) => void
  setRepulsion: (v: number) => void
  setLinkDistance: (v: number) => void
  setFriction: (v: number) => void
}

export const usePhysicsStore = create<PhysicsState>((set) => ({
  gravity: 50,
  repulsion: 100,
  linkDistance: 30,
  friction: 40,
  setGravity: (v) => set({ gravity: v }),
  setRepulsion: (v) => set({ repulsion: v }),
  setLinkDistance: (v) => set({ linkDistance: v }),
  setFriction: (v) => set({ friction: v }),
}))
