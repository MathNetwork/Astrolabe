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

    // 选中 obj 的边
    const incoming = selectedObjHash ? morphisms.filter(m => m.target === selectedObjHash) : []
    const outgoing = selectedObjHash ? morphisms.filter(m => m.source === selectedObjHash) : []


    // 选中的 mor 的详细数据
    const selectedMorData = selectedMorHash ? morphisms.find(m => m.id === selectedMorHash) : null

    return (
        <div className="h-full flex flex-col">
            {/* 上：Obj 详情 */}
            <div className="overflow-y-auto p-3 space-y-3 shrink-0 max-h-[50%]">
                {selectedObj && <ObjDetail obj={selectedObj} label={getNodeLabel(selectedObj.id)} />}
            </div>

            {/* 下：Edges/Neighbors (左) + Edge Metadata (右) */}
            {selectedObj && (incoming.length > 0 || outgoing.length > 0) && (
                <div className="flex-1 min-h-0 flex border-t border-white/5">
                    {/* 左：Edges */}
                    <div className="w-1/2 overflow-y-auto p-3 border-r border-white/5">
                        <EdgesList
                            incoming={incoming}
                            outgoing={outgoing}
                            objects={objects}
                            selectedMorHash={selectedMorHash}
                        />
                    </div>

                    {/* 右：选中 edge 的 metadata */}
                    <div className="w-1/2 overflow-y-auto p-3">
                        {selectedMorData ? (
                            <MorDetail mor={selectedMorData} objects={objects} />
                        ) : (
                            <div className="h-full flex items-center justify-center text-white/15 text-xs">
                                Click an edge to see details
                            </div>
                        )}
                    </div>
                </div>
            )}
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

/** Edges 列表（Incoming / Outgoing） */
function EdgesList({ incoming, outgoing, objects, selectedMorHash }: {
    incoming: { id: string; source: string; target: string; notes?: string }[]
    outgoing: { id: string; source: string; target: string; notes?: string }[]
    objects: { id: string; name: string; sort: string }[]
    selectedMorHash: string | null
}) {
    const selectMor = useSelectMorStore(s => s.select)
    const selectObj = useSelectObjStore(s => s.select)

    const renderEdge = (mor: { id: string; source: string; target: string; notes?: string }, direction: 'in' | 'out') => {
        const otherHash = direction === 'in' ? mor.source : mor.target
        const otherObj = objects.find(o => o.id === otherHash)
        const otherName = otherObj?.name || otherHash.slice(0, 8)
        const { color } = getNodeKindVisual(otherObj?.sort)
        const isSelected = selectedMorHash === mor.id

        return (
            <div
                key={mor.id}
                className={`flex items-center gap-2 px-2 py-1 rounded text-xs transition-colors ${
                    isSelected ? 'bg-white/10' : ''
                }`}
            >
                {/* 箭头：点击跳转到另一端节点 */}
                <button
                    className="text-white/30 hover:text-white/70 text-[10px] w-4 cursor-pointer transition-colors"
                    onClick={() => selectObj(otherHash)}
                    title={`Jump to ${otherName}`}
                >
                    {direction === 'in' ? '←' : '→'}
                </button>
                {/* 文字：点击选中这条 edge，右侧显示 metadata */}
                <button
                    className="truncate cursor-pointer hover:underline transition-colors"
                    style={{ color }}
                    onClick={() => selectMor(isSelected ? null : mor.id)}
                    title={`Show edge details`}
                >
                    {otherName}
                </button>
            </div>
        )
    }

    return (
        <div>
            {incoming.length > 0 && (
                <div>
                    <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">
                        Incoming ({incoming.length})
                    </div>
                    {incoming.map(m => renderEdge(m, 'in'))}
                </div>
            )}
            {outgoing.length > 0 && (
                <div className={incoming.length > 0 ? 'mt-2' : ''}>
                    <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">
                        Outgoing ({outgoing.length})
                    </div>
                    {outgoing.map(m => renderEdge(m, 'out'))}
                </div>
            )}
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
