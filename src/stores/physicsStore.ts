/**
 * physicsStore — 3D 力导向图的物理参数
 *
 * 订阅者：
 *   - NetworkView: 控制节点布局的物理引擎参数
 *   - ControlsPanel: UI 滑块调整参数
 *
 * 支持 undo/redo（temporal 中间件）。
 */
import { create } from 'zustand'
import { temporal } from 'zundo'

interface PhysicsState {
  gravity: number
  repulsion: number
  linkDistance: number
  damping: number

  setGravity: (v: number) => void
  setRepulsion: (v: number) => void
  setLinkDistance: (v: number) => void
  setDamping: (v: number) => void
}

export const usePhysicsStore = create<PhysicsState>()(
    temporal(
        (set) => ({
            gravity: -50,
            repulsion: 100,
            linkDistance: 30,
            damping: 0.9,

            setGravity: (v) => set({ gravity: v }),
            setRepulsion: (v) => set({ repulsion: v }),
            setLinkDistance: (v) => set({ linkDistance: v }),
            setDamping: (v) => set({ damping: v }),
        })
    )
)
