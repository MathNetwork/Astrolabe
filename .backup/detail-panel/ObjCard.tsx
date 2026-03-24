'use client'

/**
 * ObjCard — 自治 obj 展示卡片
 *
 * 接收 id，自己从 dataStore 取数据 + 编号。
 *
 * 两种模式：
 *   - compact=true: CardStack 预览（statement 截断 + 渐变淡出）
 *   - compact=false: DetailView 完整显示（statement + proof 折叠 + intuition + notes）
 */
import { memo, forwardRef, useState } from 'react'
import { useDataStore } from '@/stores/dataStore'
import { getNodeKindVisual } from '@/lib/sortConfig'
import MarkdownRenderer from '@/components/MarkdownRenderer'

export interface ObjCardProps {
    id: string
    isSelected?: boolean
    compact?: boolean
    onClick?: () => void
}

export const ObjCard = memo(forwardRef<HTMLDivElement, ObjCardProps>(
    function ObjCard({ id, isSelected, compact = false, onClick }, ref) {
        const obj = useDataStore(s => s.objects.find(o => o.id === id))
        const nodeLabel = useDataStore(s => s.getObjLabel(id))

        if (!obj) return null

        const { color } = getNodeKindVisual(obj.sort)
        const sortDisplay = obj.sort ? obj.sort.charAt(0).toUpperCase() + obj.sort.slice(1) : ''
        const displayTitle = nodeLabel || sortDisplay

        return (
            <div
                ref={ref}
                onClick={onClick}
                style={{ borderLeft: `3px solid ${color}`, background: `${color}11` }}
                className={`rounded-r-md px-4 py-3 ${onClick ? 'cursor-pointer' : ''} transition-colors ${
                    isSelected ? 'ring-1 ring-white/20' : ''
                }`}
            >
                {/* Header */}
                <span style={{ color }} className="text-[10px] font-semibold uppercase tracking-wider">
                    {displayTitle}
                </span>
                {obj.name && (
                    <div className="text-sm font-medium text-white/90 mt-1">{obj.name}</div>
                )}
                {!compact && (
                    <div className="text-[10px] text-white/25 mt-0.5 font-mono">{obj.id}</div>
                )}

                {/* Statement */}
                {obj.statement && compact && (
                    <div className="max-h-24 overflow-hidden relative mt-1">
                        <MarkdownRenderer
                            content={obj.statement}
                            className="text-xs text-white/50 leading-relaxed"
                        />
                        <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
                    </div>
                )}

                {obj.statement && !compact && (
                    <Section label="Statement">
                        <MarkdownRenderer content={obj.statement} className="text-sm text-white/70 leading-relaxed" />
                    </Section>
                )}

                {/* Proof (full mode only, collapsible) */}
                {obj.proof && !compact && <ProofSection proof={obj.proof} color={color} />}

                {/* Intuition (full mode only) */}
                {obj.intuition && !compact && (
                    <Section label="Intuition">
                        <MarkdownRenderer content={obj.intuition} className="text-sm text-white/60 leading-relaxed italic" />
                    </Section>
                )}

                {/* Notes (full mode only) */}
                {obj.notes && !compact && (
                    <Section label="Notes">
                        <div className="text-xs text-white/40">{obj.notes}</div>
                    </Section>
                )}
            </div>
        )
    }
))

function Section({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="mt-3">
            <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">{label}</div>
            {children}
        </div>
    )
}

function ProofSection({ proof, color }: { proof: string; color: string }) {
    const [open, setOpen] = useState(false)
    return (
        <div style={{ borderTop: `1px solid ${color}33` }} className="mt-3 pt-2">
            <div
                style={{ color: `${color}cc` }}
                className="cursor-pointer text-[10px] font-semibold uppercase tracking-wider select-none"
                onClick={(e) => { e.stopPropagation(); setOpen(o => !o) }}
            >
                {open ? 'Proof ▾' : 'Proof ▸'}
            </div>
            {open && (
                <div className="mt-2">
                    <MarkdownRenderer content={proof} className="text-sm text-white/60 leading-relaxed" />
                </div>
            )}
        </div>
    )
}
