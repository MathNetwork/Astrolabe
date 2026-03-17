'use client'

/**
 * InspectorPanel — 右栏：纯容器
 *
 * 职责：
 *   - 容纳 CardStack（未来可能加上下分割和其他工具）
 *   - 本身不订阅任何 store
 *
 * 进度：完成（容器逻辑简单，不需要更多内容）
 */
import { memo } from 'react'
import { CardStack } from './CardStack'

export const InspectorPanel = memo(function InspectorPanel() {
    return (
        <div className="h-full bg-black">
            <CardStack />
        </div>
    )
})
