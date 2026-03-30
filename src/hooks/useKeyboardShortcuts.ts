/**
 * useKeyboardShortcuts — 全局快捷键
 *
 * 快捷键：
 *   Cmd+Z          — undo（最近修改的 temporal store）
 *   Cmd+Shift+Z    — redo
 *   Escape         — 取消选中（清除 selectObjStore + selectMorStore）
 *   Cmd+1/2/3      — 切换 Read/Network/Detail 视图（写入 viewStore.activeTab）
 */
import { useEffect } from 'react'
import { useSelectObjStore } from '@/stores/selectObjStore'
import { useSelectMorStore } from '@/stores/selectMorStore'
import { useViewStore } from '@/stores/viewStore'
import { usePhysicsStore } from '@/stores/physicsStore'

const VIEW_TABS = ['read', 'network', 'detail'] as const

export function useKeyboardShortcuts() {
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            const meta = e.metaKey || e.ctrlKey

            // Cmd+Z — undo
            if (meta && e.key === 'z' && !e.shiftKey) {
                e.preventDefault()
                const stores = [
                    useSelectObjStore.temporal.getState(),
                    useSelectMorStore.temporal.getState(),
                    useViewStore.temporal.getState(),
                    usePhysicsStore.temporal.getState(),
                ]
                for (const s of stores) {
                    if (s.pastStates.length > 0) { s.undo(); return }
                }
            }

            // Cmd+Shift+Z — redo
            if (meta && e.key === 'z' && e.shiftKey) {
                e.preventDefault()
                const stores = [
                    useSelectObjStore.temporal.getState(),
                    useSelectMorStore.temporal.getState(),
                    useViewStore.temporal.getState(),
                    usePhysicsStore.temporal.getState(),
                ]
                for (const s of stores) {
                    if (s.futureStates.length > 0) { s.redo(); return }
                }
            }

            // Escape — 取消选中
            if (e.key === 'Escape') {
                useSelectObjStore.getState().select(null)
                useSelectMorStore.getState().select(null)
            }

            // Cmd+1/2/3 — 切换视图
            if (meta && e.key >= '1' && e.key <= '3') {
                e.preventDefault()
                const idx = parseInt(e.key) - 1
                const tab = VIEW_TABS[idx]
                if (tab) {
                    useViewStore.getState().setActiveTab(tab)
                }
            }
        }

        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [])
}
