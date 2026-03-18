'use client'

/**
 * NetworkSettings — 网络图设置 overlay
 *
 * 嵌在 NetworkView 内部，点击 ⚙ 展开。
 * 订阅：physicsStore, viewStore, analysisStore
 */
import { memo } from 'react'
import { usePhysicsStore } from '@/stores/physicsStore'
import { useViewStore, type SizeMappingMode, type ColorMappingMode, type ClusterMode } from '@/stores/viewStore'
import { useAnalysisStore } from '@/stores/analysisStore'

const SIZE_OPTIONS: { value: SizeMappingMode; label: string }[] = [
    { value: 'default', label: 'Uniform' },
    { value: 'pagerank', label: 'PageRank' },
    { value: 'indegree', label: 'In-Degree' },
    { value: 'betweenness', label: 'Betweenness' },
    { value: 'depth', label: 'Depth' },
    { value: 'katz', label: 'Katz' },
    { value: 'hub', label: 'Hub' },
    { value: 'authority', label: 'Authority' },
]

const COLOR_OPTIONS: { value: ColorMappingMode; label: string }[] = [
    { value: 'sort', label: 'Sort' },
    { value: 'community', label: 'Community' },
    { value: 'layer', label: 'Layer' },
    { value: 'spectral', label: 'Spectral' },
    { value: 'curvature', label: 'Curvature' },
    { value: 'anomaly', label: 'Anomaly' },
]

const CLUSTER_OPTIONS: { value: ClusterMode; label: string }[] = [
    { value: 'none', label: 'None' },
    { value: 'community', label: 'Community' },
    { value: 'layer', label: 'Layer' },
    { value: 'spectral', label: 'Spectral' },
    { value: 'curvature', label: 'Curvature' },
    { value: 'anomaly', label: 'Anomaly' },
]

export const NetworkSettings = memo(function NetworkSettings() {
    const gravity = usePhysicsStore(s => s.gravity)
    const repulsion = usePhysicsStore(s => s.repulsion)
    const linkDistance = usePhysicsStore(s => s.linkDistance)
    const friction = usePhysicsStore(s => s.friction)
    const setGravity = usePhysicsStore(s => s.setGravity)
    const setRepulsion = usePhysicsStore(s => s.setRepulsion)
    const setLinkDistance = usePhysicsStore(s => s.setLinkDistance)
    const setFriction = usePhysicsStore(s => s.setFriction)

    const sizeMappingMode = useViewStore(s => s.sizeMappingMode)
    const colorMappingMode = useViewStore(s => s.colorMappingMode)
    const setSizeMappingMode = useViewStore(s => s.setSizeMappingMode)
    const setColorMappingMode = useViewStore(s => s.setColorMappingMode)
    const clusterMode = useViewStore(s => s.clusterMode)
    const clusterStrength = useViewStore(s => s.clusterStrength)
    const setClusterMode = useViewStore(s => s.setClusterMode)
    const setClusterStrength = useViewStore(s => s.setClusterStrength)

    const analysisData = useAnalysisStore(s => s.data)
    const analysisLoading = useAnalysisStore(s => s.loading)
    const hasAnalysis = Object.keys(analysisData).length > 0

    return (
        <div className="p-3 space-y-3 text-xs">
            {/* Physics */}
            <Section label="Physics">
                <Slider label="Gravity" value={gravity} min={0} max={100} step={1} onChange={setGravity} />
                <Slider label="Repulsion" value={repulsion} min={10} max={500} step={5} onChange={setRepulsion} />
                <Slider label="Link Distance" value={linkDistance} min={5} max={100} step={1} onChange={setLinkDistance} />
                <Slider label="Friction" value={friction} min={0} max={100} step={1} onChange={setFriction} />
            </Section>

            {analysisLoading && <div className="text-[10px] text-white/20">Loading analysis...</div>}

            {/* Node Size */}
            <Section label="Size">
                <OptionList options={SIZE_OPTIONS} value={sizeMappingMode} onChange={setSizeMappingMode}
                    disableWhen={(v) => v !== 'default' && !hasAnalysis} />
            </Section>

            {/* Node Color */}
            <Section label="Color">
                <OptionList options={COLOR_OPTIONS} value={colorMappingMode} onChange={setColorMappingMode}
                    disableWhen={(v) => v !== 'sort' && !hasAnalysis} />
            </Section>

            {/* Clustering */}
            <Section label="Clustering">
                <OptionList options={CLUSTER_OPTIONS} value={clusterMode}
                    onChange={(v) => { setClusterMode(v as ClusterMode); if (v !== 'none' && clusterStrength === 0) setClusterStrength(3) }}
                    disableWhen={(v) => v !== 'none' && !hasAnalysis} />
                {clusterMode !== 'none' && (
                    <div className="mt-2">
                        <Slider label="Strength" value={clusterStrength} min={0} max={10} step={0.5} onChange={setClusterStrength} />
                    </div>
                )}
            </Section>
        </div>
    )
})

function Section({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <div className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5">{label}</div>
            {children}
        </div>
    )
}

function Slider({ label, value, min, max, step, onChange }: {
    label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void
}) {
    return (
        <div className="mb-1.5">
            <div className="flex justify-between text-white/40 mb-0.5">
                <span>{label}</span>
                <span className="font-mono text-white/20">{value}</span>
            </div>
            <input type="range" min={min} max={max} step={step} value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                className="w-full h-1 appearance-none bg-white/10 rounded cursor-pointer
                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2
                    [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white/50" />
        </div>
    )
}

function OptionList<T extends string>({ options, value, onChange, disableWhen }: {
    options: { value: T; label: string }[]
    value: T
    onChange: (v: T) => void
    disableWhen?: (v: T) => boolean
}) {
    return (
        <div className="space-y-0.5">
            {options.map(opt => (
                <button key={opt.value}
                    onClick={() => onChange(opt.value)}
                    disabled={disableWhen?.(opt.value)}
                    className={`w-full text-left px-2 py-0.5 rounded transition-colors text-[11px] ${
                        value === opt.value ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60 hover:bg-white/5 disabled:text-white/15'
                    }`}>
                    {opt.label}
                </button>
            ))}
        </div>
    )
}
