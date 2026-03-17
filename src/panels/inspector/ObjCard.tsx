'use client'

/**
 * ObjCard — 单个 obj 卡片
 *
 * 展示一个 knowledge object 的摘要：
 *   - sort 颜色条（左边框）
 *   - 编号或 sort 标签（如 "Theorem 3.2"）
 *   - name
 *   - statement 预览（MarkdownRenderer，max-height + 渐变淡出）
 *
 * 纯展示组件，选中/点击逻辑由 CardStack 处理。
 */
import { memo, forwardRef } from 'react'
import { getNodeKindVisual } from '../../../assets/nodeKindConfig'
import MarkdownRenderer from '@/components/MarkdownRenderer'

interface ObjCardProps {
    obj: {
        id: string
        name: string
        sort: string
        statement?: string
    }
    displayTitle: string
    isSelected: boolean
    onClick: () => void
}

export const ObjCard = memo(forwardRef<HTMLDivElement, ObjCardProps>(
    function ObjCard({ obj, displayTitle, isSelected, onClick }, ref) {
        const { color } = getNodeKindVisual(obj.sort)

        return (
            <div
                ref={ref}
                onClick={onClick}
                style={{ borderLeft: `3px solid ${color}` }}
                className={`rounded-r-md px-3 py-2 cursor-pointer transition-colors ${
                    isSelected
                        ? 'bg-white/10 ring-1 ring-white/20'
                        : 'bg-white/[0.02] hover:bg-white/5'
                }`}
            >
                <div className="flex items-center gap-2 mb-1">
                    <span style={{ color }} className="text-[10px] font-semibold uppercase tracking-wider">
                        {displayTitle}
                    </span>
                </div>
                {obj.name && (
                    <div className="text-sm font-medium text-white/80 truncate" title={obj.name}>
                        {obj.name}
                    </div>
                )}
                {obj.statement && (
                    <div className="max-h-24 overflow-hidden relative">
                        <MarkdownRenderer
                            content={obj.statement}
                            className="text-xs text-white/50 leading-relaxed"
                        />
                        <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
                    </div>
                )}
            </div>
        )
    }
))
