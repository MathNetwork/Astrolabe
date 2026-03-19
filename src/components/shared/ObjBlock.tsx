'use client'

/**
 * ObjBlock — 块级 obj 引用
 *
 * 用法: <div class="objblock" data-show="statement,proof">hash</div>
 * 显示: sort 颜色边框 + 编号/名称 + 指定字段（statement/proof/intuition/notes）
 * proof 字段可折叠
 * 点击: selectObjStore.select(hash)
 */
import { memo, useState, useCallback } from 'react'
import { useSelectObjStore } from '@/stores/selectObjStore'
import { useDataStore } from '@/stores/dataStore'
import { getNodeKindVisual } from '@/lib/sortConfig'
import MarkdownRenderer from '@/components/MarkdownRenderer'

const VALID_SHOW_FIELDS = new Set(['statement', 'proof', 'intuition', 'notes'])

export function parseShowFields(dataShow: string | undefined): string[] {
    if (!dataShow || !dataShow.trim()) return ['statement']
    const fields = dataShow.split(',').map(s => s.trim()).filter(s => VALID_SHOW_FIELDS.has(s))
    return fields.length > 0 ? fields : ['statement']
}

export const ObjBlock = memo(function ObjBlock({ id, showFields }: { id?: string; showFields?: string[] }) {
    const node = useDataStore(s => id ? s.objectMap.get(id) : undefined)
    const nodeLabel = useDataStore(s => id ? s.getNodeLabel(id) : undefined)
    const select = useSelectObjStore(s => s.select)

    const handleClick = useCallback(() => {
        if (id) select(id)
    }, [id, select])
    if (!node) return <div className="text-white/30 text-sm italic">Node not found: {id}</div>

    const { color } = getNodeKindVisual(node.sort)
    const sortLabel = (node.sort || '').charAt(0).toUpperCase() + (node.sort || '').slice(1)
    const displayTitle = nodeLabel || sortLabel

    return (
        <div
            style={{ borderLeft: `3px solid ${color}`, background: `${color}11` }}
            className="rounded-r-md my-4 px-5 py-4 cursor-pointer"
            onClick={handleClick}
            title="Click to select node"
        >
            <div className="mb-2">
                <span style={{ color }} className="font-semibold">{displayTitle}</span>
                {node.name && <span style={{ color }} className="ml-1">({node.name}).</span>}
            </div>
            {(showFields || ['statement']).map(field => {
                const value = (node as any)[field]
                if (!value) return null
                if (field === 'proof') {
                    return <ProofCollapsible key={field} source={value} color={color} />
                }
                return (
                    <div key={field} className="rendered-math-content">
                        <MarkdownRenderer content={value} />
                    </div>
                )
            })}
        </div>
    )
})

function ProofCollapsible({ source, color }: { source: string; color: string }) {
    const [open, setOpen] = useState(false)
    return (
        <div style={{ borderTop: `1px solid ${color}33` }} className="mt-3 pt-2">
            <div
                style={{ color: `${color}cc` }}
                className="cursor-pointer text-sm font-semibold select-none"
                onClick={(e) => { e.stopPropagation(); setOpen(o => !o) }}
            >
                {open ? 'Proof ▾' : 'Proof ▸'}
            </div>
            {open && (
                <div className="mt-2 text-[0.92em] opacity-90">
                    <MarkdownRenderer content={source} />
                </div>
            )}
        </div>
    )
}
