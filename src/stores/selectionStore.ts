/**
 * selectionStore — 全局选中状态
 *
 * 存储当前选中的 hash（obj 或 mor），作为全局广播器。
 * 所有 Panel 订阅此 store，各自决定如何响应：
 *   - CardStack: 滚动到选中的 obj 卡片
 *   - NetworkView: 高亮选中的节点/边
 *   - ReadView: 可能高亮相关的 noderef
 *   - DetailView: 显示选中 obj/mor 的详细信息
 *
 * 约束：同一时刻只能选中 obj 或 mor，不能同时。
 * 选中 obj 自动清除 mor，反之亦然。
 *
 * hash 来自 knowledge.json 中 obj/mor 的 id 字段（12 位十六进制）。
 */
import { create } from 'zustand'

interface SelectionState {
  /** 当前选中的 obj hash（节点），null 表示未选中 */
  selectedObjHash: string | null
  /** 当前选中的 mor hash（边），null 表示未选中 */
  selectedMorHash: string | null
  /** 3D 图谱跳转目标（选中后相机飞向此 obj），null 表示不跳转 */
  focusObjHash: string | null

  /** 选中一个 obj，同时清除 mor 选中 */
  selectObj: (hash: string | null) => void
  /** 选中一个 mor，同时清除 obj 选中 */
  selectMor: (hash: string | null) => void
  /** 设置 3D 跳转目标（不影响选中状态） */
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
