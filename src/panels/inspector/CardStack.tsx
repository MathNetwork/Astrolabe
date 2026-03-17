'use client'

/**
 * CardStack — 布局容器
 *
 * 订阅 dataStore.objects 获取 id 列表，订阅 selectObjStore 做滚动。
 * ObjCard 是自治组件，自己查数据。
 */
import { memo, useRef, useEffect, useCallback } from 'react'
import { useSelectObjStore } from '@/stores/selectObjStore'
import { useDataStore } from '@/stores/dataStore'
import { ObjCard } from '@/components/shared/ObjCard'

export const CardStack = memo(function CardStack() {
    const selectedHash = useSelectObjStore(s => s.selectedHash)
    const select = useSelectObjStore(s => s.select)
    const objects = useDataStore(s => s.objects)

    const scrollRef = useRef<HTMLDivElement>(null)
    const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map())

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
            {objects.map(obj => (
                <ObjCard
                    key={obj.id}
                    ref={(el) => setCardRef(obj.id, el)}
                    id={obj.id}
                    compact
                    isSelected={selectedHash === obj.id}
                    onClick={() => select(obj.id)}
                />
            ))}
        </div>
    )
})
