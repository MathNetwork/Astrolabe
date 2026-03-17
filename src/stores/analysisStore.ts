/**
 * analysisStore — 网络分析数据
 *
 * 存储 pagerank、社区检测、谱聚类等分析结果。
 * 由分析 API 调用后写入。
 *
 * 订阅者：
 *   - NetworkView: 用分析结果控制节点大小/颜色
 *   - ControlsPanel: 显示分析结果、切换映射模式
 */
import { create } from 'zustand'

interface AnalysisState {
  data: Record<string, unknown>
  loading: boolean

  setData: (data: Record<string, unknown>) => void
  setLoading: (loading: boolean) => void
}

export const useAnalysisStore = create<AnalysisState>((set) => ({
  data: {},
  loading: false,

  setData: (data) => set({ data }),
  setLoading: (loading) => set({ loading }),
}))
