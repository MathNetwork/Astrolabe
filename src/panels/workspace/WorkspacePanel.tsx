'use client'

/**
 * WorkspacePanel — 中栏：主工作区
 *
 * 职责：
 *   - 根据 viewStore.viewMode 决定显示 ReadView / NetworkView / DetailView
 *   - 管理视图切换动画/布局
 *
 * 订阅：viewStore.viewMode
 * 不关心：selectObjStore, selectMorStore, dataStore（由子 View 各自订阅）
 *
 * 进度：空壳，待 Phase 3-5 逐步填充子 View
 */
import { memo } from 'react'
import { useViewStore } from '@/stores/viewStore'

export const WorkspacePanel = memo(function WorkspacePanel() {
    const viewMode = useViewStore(s => s.viewMode)
    return <div className="h-full bg-[#0a0a0f]" />
})
