'use client'

/**
 * NetworkSettings — physics + labels + skeleton analysis controls
 */
import { memo } from 'react'
import { usePhysicsStore } from '@/stores/physicsStore'
import { useViewStore } from '@/stores/viewStore'
import { usePluginStore } from '@/plugins/registry'

const SIZE_OPTIONS = [
    { value: 'uniform', label: 'Uniform' },
    { value: 'degree', label: 'Degree' },
    { value: 'in-degree', label: 'In-degree' },
    { value: 'out-degree', label: 'Out-degree' },
    { value: 'pagerank', label: 'PageRank' },
    { value: 'betweenness', label: 'Betweenness' },
    { value: 'depth', label: 'DAG Depth' },
    { value: 'reachability', label: 'Reachability' },
]

const COLOR_OPTIONS = [
    { value: 'sort', label: 'By Sort' },
    { value: 'community', label: 'By Community' },
    { value: 'pagerank', label: 'By PageRank' },
    { value: 'depth', label: 'By Depth' },
]

const CLUSTER_OPTIONS = [
    { value: 'none', label: 'None' },
    { value: 'cluster-louvain', label: 'Louvain' },
    { value: 'cluster-sort', label: 'By Sort' },
    { value: 'cluster-stage', label: 'By Stage' },
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
    const showLabels = useViewStore(s => s.showLabels)
    const toggleLabels = useViewStore(s => s.toggleLabels)
    const skeletonActive = usePluginStore(s => s.isModeActive('skeleton'))

    return (
        <div className="p-3 space-y-3 text-xs">
            <Section label="Physics">
                <Slider label="Gravity" value={gravity} min={0} max={100} step={1} onChange={setGravity} />
                <Slider label="Repulsion" value={repulsion} min={10} max={500} step={5} onChange={setRepulsion} />
                <Slider label="Link Distance" value={linkDistance} min={5} max={100} step={1} onChange={setLinkDistance} />
                <Slider label="Friction" value={friction} min={0} max={100} step={1} onChange={setFriction} />
            </Section>
            <Section label="Labels">
                <button
                    onClick={toggleLabels}
                    className={`w-full text-left px-2 py-0.5 rounded transition-colors text-[11px] ${
                        showLabels ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60 hover:bg-white/5'
                    }`}
                >
                    {showLabels ? 'Visible' : 'Hidden'}
                </button>
            </Section>

            {skeletonActive && (
                <SkeletonSettings />
            )}
        </div>
    )
})

function SkeletonSettings() {
    const sizeBy = usePluginStore(s => (s as any).skeletonSizeBy || 'uniform')
    const colorBy = usePluginStore(s => (s as any).skeletonColorBy || 'sort')
    const cluster = usePluginStore(s => (s as any).skeletonCluster || 'none')

    const set = (key: string, value: string) => {
        usePluginStore.setState({ [key]: value } as any)
    }

    return <>
        <Section label="Size by">
            <Dropdown options={SIZE_OPTIONS} value={sizeBy} onChange={v => set('skeletonSizeBy', v)} />
        </Section>
        <Section label="Color by">
            <Dropdown options={COLOR_OPTIONS} value={colorBy} onChange={v => set('skeletonColorBy', v)} />
        </Section>
        <Section label="Cluster">
            <Dropdown options={CLUSTER_OPTIONS} value={cluster} onChange={v => set('skeletonCluster', v)} />
        </Section>
    </>
}

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

function Dropdown({ options, value, onChange }: {
    options: { value: string; label: string }[]; value: string; onChange: (v: string) => void
}) {
    return (
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-[11px] text-white/70 focus:outline-none focus:border-white/20 cursor-pointer"
        >
            {options.map(o => (
                <option key={o.value} value={o.value} className="bg-[#0a0a0f]">{o.label}</option>
            ))}
        </select>
    )
}
