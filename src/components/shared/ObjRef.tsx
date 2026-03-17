'use client'

/**
 * ObjRef — 内联 obj 引用链接
 *
 * 用法: <objref id="hash">可选文本</objref>
 * 显示: 自定义文本 > 编号 > 节点名 > hash
 * 点击: selectObjStore.select(hash)
 * 颜色: 根据 obj.sort 着色
 */
import { memo, useCallback } from 'react'
import { useSelectObjStore } from '@/stores/selectObjStore'
import { useDataStore } from '@/stores/dataStore'
import { getNodeKindVisual } from '../../../assets/nodeKindConfig'

export const ObjRef = memo(function ObjRef({ id, children }: { id?: string; children?: React.ReactNode }) {
    const objects = useDataStore(s => s.objects)
    const nodeLabel = useDataStore(s => id ? s.getNodeLabel(id) : undefined)
    const select = useSelectObjStore(s => s.select)

    const node = id ? objects.find(n => n.id === id) : null
    const displayName = children || nodeLabel || node?.name || id || '???'
    const color = getNodeKindVisual(node?.sort).color

    const handleClick = useCallback(() => {
        if (id) select(id)
    }, [id, select])

    return (
        <button
            onClick={handleClick}
            className="font-medium underline underline-offset-2 transition-colors cursor-pointer"
            style={{ color, textDecorationColor: `${color}66` }}
        >
            {displayName}
        </button>
    )
})
