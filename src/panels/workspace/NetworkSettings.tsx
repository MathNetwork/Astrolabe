'use client'

import { memo } from 'react'
import { usePhysicsStore } from '@/stores/physicsStore'
import { useViewStore } from '@/stores/viewStore'
import { usePluginStore } from '@/plugins/registry'

const SOURCE_OPTIONS = ['all', 'tex', 'lean', 'bib']
const SIZE_OPTIONS = ['uniform', 'degree', 'in-degree', 'out-degree', 'pagerank', 'betweenness', 'katz', 'hub', 'authority', 'depth', 'reachability']
const COLOR_OPTIONS = ['sort', 'community', 'layer', 'pagerank', 'depth', 'spectral', 'curvature']
const CLUSTER_OPTIONS = ['none', 'louvain', 'sort', 'source', 'stage', 'spectral', 'curvature']

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
    const networkActive = usePluginStore(s => s.isModeActive('mathnetwork'))

    return (
        <div className="p-3 space-y-3 text-xs">
            <Slider label="Gravity" value={gravity} min={0} max={100} step={1} onChange={setGravity} />
            <Slider label="Repulsion" value={repulsion} min={10} max={500} step={5} onChange={setRepulsion} />
            <Slider label="Link Dist" value={linkDistance} min={5} max={100} step={1} onChange={setLinkDistance} />
            <Slider label="Friction" value={friction} min={0} max={100} step={1} onChange={setFriction} />

            <div className="flex items-center justify-between">
                <span className="text-white/30">Labels</span>
                <button onClick={toggleLabels} className={`text-xs px-2 py-0.5 rounded ${showLabels ? 'bg-white/10 text-white' : 'text-white/30'}`}>
                    {showLabels ? 'ON' : 'OFF'}
                </button>
            </div>

            {networkActive && <NetworkAnalysisSettings />}
        </div>
    )
})

function NetworkAnalysisSettings() {
    const sourceFilter = usePluginStore(s => (s as any).mnSource || 'all')
    const mergeProofs = usePluginStore(s => (s as any).mnMergeProofs || false)
    const sizeBy = usePluginStore(s => (s as any).mnSizeBy || 'uniform')
    const colorBy = usePluginStore(s => (s as any).mnColorBy || 'sort')
    const cluster = usePluginStore(s => (s as any).mnCluster || 'none')
    const clusterStrength = usePluginStore(s => (s as any).mnClusterStrength ?? 30)

    const set = (key: string, value: any) => {
        usePluginStore.setState({ [key]: value } as any)
        if (!(window as any).__pluginStore) (window as any).__pluginStore = {}
        ;(window as any).__pluginStore[key] = value
        // Source/merge changes the node set → full reload; others → style only
        if (key === 'mnSource' || key === 'mnMergeProofs') {
            window.dispatchEvent(new CustomEvent('mn-source-changed'))
        } else {
            window.dispatchEvent(new CustomEvent('mn-settings-changed'))
        }
    }

    return <>
        <div className="border-t border-white/5 pt-2 mt-1" />
        <Row label="Source">
            <Pills options={SOURCE_OPTIONS} value={sourceFilter} onChange={v => set('mnSource', v)} />
        </Row>
        <div className="flex items-center justify-between">
            <span className="text-xs text-white/25">Merge proofs</span>
            <button onClick={() => set('mnMergeProofs', !mergeProofs)} className={`text-[11px] px-2 py-0.5 rounded ${mergeProofs ? 'bg-white/10 text-white' : 'text-white/30'}`}>
                {mergeProofs ? 'ON' : 'OFF'}
            </button>
        </div>
        <Row label="Size">
            <Pills options={SIZE_OPTIONS} value={sizeBy} onChange={v => set('mnSizeBy', v)} />
        </Row>
        <Row label="Color">
            <Pills options={COLOR_OPTIONS} value={colorBy} onChange={v => set('mnColorBy', v)} />
        </Row>
        <Row label="Cluster">
            <Pills options={CLUSTER_OPTIONS} value={cluster} onChange={v => set('mnCluster', v)} />
        </Row>
        {cluster !== 'none' && (
            <Slider label="Tightness" value={clusterStrength} min={0} max={100} step={1}
                onChange={v => set('mnClusterStrength', v)} />
        )}
    </>
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <div className="text-xs text-white/25 mb-1">{label}</div>
            {children}
        </div>
    )
}

function Pills({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
    return (
        <div className="flex flex-wrap gap-0.5">
            {options.map(o => (
                <button
                    key={o}
                    onClick={() => onChange(o === value ? options[0] : o)}
                    className={`px-1.5 py-0.5 rounded text-[11px] transition-colors ${
                        o === value ? 'bg-white/15 text-white/90' : 'text-white/25 hover:text-white/50 hover:bg-white/5'
                    }`}
                >
                    {o}
                </button>
            ))}
        </div>
    )
}

function Slider({ label, value, min, max, step, onChange }: {
    label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void
}) {
    return (
        <div>
            <div className="flex justify-between text-white/30 mb-0.5">
                <span className="text-xs">{label}</span>
                <span className="font-mono text-[11px] text-white/15">{value}</span>
            </div>
            <input type="range" min={min} max={max} step={step} value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                className="w-full h-0.5 appearance-none bg-white/10 rounded cursor-pointer
                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2
                    [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white/40" />
        </div>
    )
}
