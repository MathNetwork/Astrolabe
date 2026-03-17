'use client'

/**
 * CardStack — obj 卡片堆叠浏览器
 *
 * 职责：
 *   - 所有 obj 都有对应的卡片（纵向堆叠）
 *   - 每张卡片显示 sort 颜色 + name + statement（MarkdownRenderer）
 *   - 选中的 obj 滚动到视觉中心并高亮
 *   - 点击卡片 → 写入 selectObjStore.select(hash)
 *   - 编号显示从 dataStore.nodeNumbering 读取
 *
 * 订阅：selectObjStore.selectedHash, dataStore.objects, dataStore.nodeNumbering
 * 写入：selectObjStore（点击卡片时）
 */
import { memo, useRef, useEffect, useCallback } from 'react'
import { useSelectObjStore } from '@/stores/selectObjStore'
import { useDataStore } from '@/stores/dataStore'
import { getNodeKindVisual } from '../../../assets/nodeKindConfig'
import MarkdownRenderer from '@/components/MarkdownRenderer'

export const CardStack = memo(function CardStack() {
    const selectedHash = useSelectObjStore(s => s.selectedHash)
    const select = useSelectObjStore(s => s.select)
    const objects = useDataStore(s => s.objects)
    const getNodeLabel = useDataStore(s => s.getNodeLabel)

    const scrollRef = useRef<HTMLDivElement>(null)
    const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map())

    // 选中变化时滚动到对应卡片
    useEffect(() => {
        if (!selectedHash) return
        const el = cardRefs.current.get(selectedHash)
        const container = scrollRef.current
        if (!el || !container) return

        requestAnimationFrame(() => {
            const cardTop = el.offsetTop
            const cardHeight = el.offsetHeight
            const containerHeight = container.clientHeight
            container.scrollTo({
                top: cardTop - containerHeight / 2 + cardHeight / 2,
                behavior: 'smooth',
            })
        })
    }, [selectedHash])

    const setCardRef = useCallback((id: string, el: HTMLDivElement | null) => {
        if (el) cardRefs.current.set(id, el)
        else cardRefs.current.delete(id)
    }, [])

    if (objects.length === 0) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="text-white/20 text-xs text-center px-4">
                    No objects loaded
                </div>
            </div>
        )
    }

    return (
        <div ref={scrollRef} className="h-full overflow-y-auto p-2 space-y-2">
            {objects.map(obj => {
                const { color } = getNodeKindVisual(obj.sort)
                const label = getNodeLabel(obj.id)
                const isSelected = selectedHash === obj.id
                const sortDisplay = obj.sort ? obj.sort.charAt(0).toUpperCase() + obj.sort.slice(1) : ''
                const displayTitle = label || sortDisplay

                return (
                    <div
                        key={obj.id}
                        ref={(el) => setCardRef(obj.id, el)}
                        onClick={() => select(obj.id)}
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
                            <div className="mt-1">
                                <div className="max-h-24 overflow-hidden relative">
                                <MarkdownRenderer
                                    content={obj.statement}
                                    className="text-xs text-white/50 leading-relaxed"
                                />
                                <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
                            </div>
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
    )
})
