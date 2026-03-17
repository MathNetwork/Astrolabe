'use client'

/**
 * DetailView — 节点/边详情 + 连接工具
 *
 * 职责：
 *   - 显示选中 obj 的完整信息（sort, name, statement, proof, intuition, notes）
 *   - 显示选中 mor 的信息（source → target, notes）
 *   - 未来：edges/neighbors 连接工具
 *
 * 订阅：selectObjStore, selectMorStore, dataStore
 */
import { memo, useState } from 'react'
import { useSelectObjStore } from '@/stores/selectObjStore'
import { useSelectMorStore } from '@/stores/selectMorStore'
import { useDataStore } from '@/stores/dataStore'
import { getNodeKindVisual } from '../../../assets/nodeKindConfig'
import MarkdownRenderer from '@/components/MarkdownRenderer'

export const DetailView = memo(function DetailView() {
    const selectedObjHash = useSelectObjStore(s => s.selectedHash)
    const selectedMorHash = useSelectMorStore(s => s.selectedHash)
    const objects = useDataStore(s => s.objects)
    const morphisms = useDataStore(s => s.morphisms)
    const getNodeLabel = useDataStore(s => s.getNodeLabel)

    const selectedObj = selectedObjHash ? objects.find(o => o.id === selectedObjHash) : null
    const selectedMor = selectedMorHash ? morphisms.find(m => m.id === selectedMorHash) : null

    // 无选中：空状态
    if (!selectedObj && !selectedMor) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="text-center text-white/20">
                    <div className="text-3xl mb-2">◇</div>
                    <div className="text-xs">Select a node or edge</div>
                </div>
            </div>
        )
    }

    return (
        <div className="h-full overflow-y-auto p-3 space-y-3">
            {/* Obj 详情 */}
            {selectedObj && <ObjDetail obj={selectedObj} label={getNodeLabel(selectedObj.id)} />}

            {/* Mor 详情 */}
            {selectedMor && <MorDetail mor={selectedMor} objects={objects} />}
        </div>
    )
})

/** Obj 详情卡片 */
function ObjDetail({ obj, label }: {
    obj: { id: string; name: string; sort: string; statement?: string; proof?: string; intuition?: string; notes?: string }
    label?: string
}) {
    const { color } = getNodeKindVisual(obj.sort)
    const sortDisplay = obj.sort ? obj.sort.charAt(0).toUpperCase() + obj.sort.slice(1) : ''
    const displayTitle = label || sortDisplay

    return (
        <div style={{ borderLeft: `3px solid ${color}`, background: `${color}11` }} className="rounded-r-md px-4 py-3">
            {/* Header */}
            <span style={{ color }} className="text-[10px] font-semibold uppercase tracking-wider">{displayTitle}</span>
            {obj.name && <div className="text-sm font-medium text-white/90 mt-1">{obj.name}</div>}
            <div className="text-[10px] text-white/25 mt-0.5 font-mono">{obj.id}</div>

            {/* Statement */}
            {obj.statement && (
                <Section label="Statement">
                    <MarkdownRenderer content={obj.statement} className="text-sm text-white/70 leading-relaxed" />
                </Section>
            )}

            {/* Proof (collapsible) */}
            {obj.proof && <ProofSection proof={obj.proof} color={color} />}

            {/* Intuition */}
            {obj.intuition && (
                <Section label="Intuition">
                    <MarkdownRenderer content={obj.intuition} className="text-sm text-white/60 leading-relaxed italic" />
                </Section>
            )}

            {/* Notes */}
            {obj.notes && (
                <Section label="Notes">
                    <div className="text-xs text-white/40">{obj.notes}</div>
                </Section>
            )}
        </div>
    )
}

/** Mor 详情卡片 */
function MorDetail({ mor, objects }: {
    mor: { id: string; source: string; target: string; notes?: string }
    objects: { id: string; name: string; sort: string }[]
}) {
    const sourceObj = objects.find(o => o.id === mor.source)
    const targetObj = objects.find(o => o.id === mor.target)

    return (
        <div className="border-l-2 border-white/20 rounded-r-md px-4 py-3 bg-white/[0.03]">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Morphism</div>
            <div className="text-sm text-white/70 mt-1">
                <span className="text-white/90">{sourceObj?.name || mor.source}</span>
                <span className="mx-2 text-white/30">→</span>
                <span className="text-white/90">{targetObj?.name || mor.target}</span>
            </div>
            <div className="text-[10px] text-white/25 mt-0.5 font-mono">{mor.id}</div>
            {mor.notes && (
                <Section label="Notes">
                    <div className="text-xs text-white/40">{mor.notes}</div>
                </Section>
            )}
        </div>
    )
}

/** 通用 section 标签 */
function Section({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="mt-3">
            <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">{label}</div>
            {children}
        </div>
    )
}

/** 可折叠的 proof */
function ProofSection({ proof, color }: { proof: string; color: string }) {
    const [open, setOpen] = useState(false)
    return (
        <div style={{ borderTop: `1px solid ${color}33` }} className="mt-3 pt-2">
            <div
                style={{ color: `${color}cc` }}
                className="cursor-pointer text-[10px] font-semibold uppercase tracking-wider select-none"
                onClick={() => setOpen(o => !o)}
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
