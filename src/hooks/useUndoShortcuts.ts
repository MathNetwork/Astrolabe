/**
 * useUndoShortcuts — 全局 Cmd+Z / Cmd+Shift+Z 快捷键
 *
 * 按最近修改的 store 回退。逻辑：
 * 所有 temporal store 共享一个全局 undo 栈。
 * Cmd+Z 回退最近一次任意 store 的变化。
 */
import { useEffect } from 'react'
import { useSelectObjStore } from '@/stores/selectObjStore'
import { useSelectMorStore } from '@/stores/selectMorStore'
import { useViewStore } from '@/stores/viewStore'
import { usePhysicsStore } from '@/stores/physicsStore'

export function useUndoShortcuts() {
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            // Cmd+Z (Mac) or Ctrl+Z (Windows/Linux)
            if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault()
                // Undo 最近修改的 store
                // 简单策略：依次尝试所有 temporal store
                const stores = [
                    useSelectObjStore.temporal.getState(),
                    useSelectMorStore.temporal.getState(),
                    useViewStore.temporal.getState(),
                    usePhysicsStore.temporal.getState(),
                ]
                for (const s of stores) {
                    if (s.pastStates.length > 0) {
                        s.undo()
                        return
                    }
                }
            }

            // Cmd+Shift+Z (redo)
            if ((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) {
                e.preventDefault()
                const stores = [
                    useSelectObjStore.temporal.getState(),
                    useSelectMorStore.temporal.getState(),
                    useViewStore.temporal.getState(),
                    usePhysicsStore.temporal.getState(),
                ]
                for (const s of stores) {
                    if (s.futureStates.length > 0) {
                        s.redo()
                        return
                    }
                }
            }
        }

        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [])
}
