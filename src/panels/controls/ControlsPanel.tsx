'use client'

/**
 * ControlsPanel — 左栏设置面板
 *
 * 订阅：physicsStore, viewStore, analysisStore
 * 不关心：selectObjStore, selectMorStore, dataStore
 */
import { memo, useCallback } from 'react'
import { usePhysicsStore } from '@/stores/physicsStore'
import { useViewStore, type SizeMappingMode, type ColorMappingMode } from '@/stores/viewStore'
import { useAnalysisStore } from '@/stores/analysisStore'
import { fetchAnalysis } from '@/hooks/useProjectLoader'

// ── Size / Color mapping options ──

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
    { value: 'sort', label: 'Sort (default)' },
    { value: 'community', label: 'Community' },
    { value: 'layer', label: 'Layer' },
    { value: 'spectral', label: 'Spectral' },
    { value: 'curvature', label: 'Curvature' },
    { value: 'anomaly', label: 'Anomaly' },
]

// ── Main Component ──

export const ControlsPanel = memo(function ControlsPanel() {
    const gravity = usePhysicsStore(s => s.gravity)
    const repulsion = usePhysicsStore(s => s.repulsion)
    const linkDistance = usePhysicsStore(s => s.linkDistance)
    const damping = usePhysicsStore(s => s.damping)
    const setGravity = usePhysicsStore(s => s.setGravity)
    const setRepulsion = usePhysicsStore(s => s.setRepulsion)
    const setLinkDistance = usePhysicsStore(s => s.setLinkDistance)
    const setDamping = usePhysicsStore(s => s.setDamping)

    const sizeMappingMode = useViewStore(s => s.sizeMappingMode)
    const colorMappingMode = useViewStore(s => s.colorMappingMode)
    const setSizeMappingMode = useViewStore(s => s.setSizeMappingMode)
    const setColorMappingMode = useViewStore(s => s.setColorMappingMode)

    const analysisData = useAnalysisStore(s => s.data)
    const analysisLoading = useAnalysisStore(s => s.loading)
    const setAnalysisData = useAnalysisStore(s => s.setData)
    const setAnalysisLoading = useAnalysisStore(s => s.setLoading)

    const handleRerunAnalysis = useCallback(() => {
        setAnalysisLoading(true)
        const projectPath = new URLSearchParams(window.location.search).get('path') || ''
        fetchAnalysis(projectPath).then(data => {
            setAnalysisData(data)
            setAnalysisLoading(false)
        })
    }, [setAnalysisData, setAnalysisLoading])

    const hasAnalysis = Object.keys(analysisData).length > 0

    return (
        <div className="h-full overflow-y-auto p-3 space-y-4 text-xs">
            {/* ── Physics ── */}
            <Section label="Physics">
                <Slider label="Gravity" value={gravity} min={-100} max={0} step={1}
                    onChange={setGravity} />
                <Slider label="Repulsion" value={repulsion} min={10} max={500} step={5}
                    onChange={setRepulsion} />
                <Slider label="Link Distance" value={linkDistance} min={5} max={100} step={1}
                    onChange={setLinkDistance} />
                <Slider label="Damping" value={damping} min={0.1} max={0.99} step={0.01}
                    onChange={setDamping} />
            </Section>

            {/* ── Analysis ── */}
            <Section label="Analysis">
                {hasAnalysis ? (
                    <div>
                        <div className="text-[10px] text-white/30 mb-1">
                            {Object.keys(analysisData).length} metrics available
                        </div>
                        <button
                            onClick={handleRerunAnalysis}
                            disabled={analysisLoading}
                            className="w-full px-2 py-1.5 rounded bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/60 disabled:text-white/20 transition-colors"
                        >
                            {analysisLoading ? 'Running...' : '↻ Re-run'}
                        </button>
                    </div>
                ) : (
                    <div className="text-[10px] text-white/20">
                        {analysisLoading ? 'Loading analysis...' : 'Analysis loads automatically'}
                    </div>
                )}
            </Section>

            {/* ── By Size ── */}
            <Section label="Node Size">
                <div className="space-y-0.5">
                    {SIZE_OPTIONS.map(opt => (
                        <button
                            key={opt.value}
                            onClick={() => setSizeMappingMode(opt.value)}
                            disabled={opt.value !== 'default' && !hasAnalysis}
                            className={`w-full text-left px-2 py-1 rounded transition-colors ${
                                sizeMappingMode === opt.value
                                    ? 'bg-white/10 text-white'
                                    : 'text-white/40 hover:text-white/60 hover:bg-white/5 disabled:text-white/15 disabled:hover:bg-transparent'
                            }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </Section>

            {/* ── By Color ── */}
            <Section label="Node Color">
                <div className="space-y-0.5">
                    {COLOR_OPTIONS.map(opt => (
                        <button
                            key={opt.value}
                            onClick={() => setColorMappingMode(opt.value)}
                            disabled={opt.value !== 'sort' && !hasAnalysis}
                            className={`w-full text-left px-2 py-1 rounded transition-colors ${
                                colorMappingMode === opt.value
                                    ? 'bg-white/10 text-white'
                                    : 'text-white/40 hover:text-white/60 hover:bg-white/5 disabled:text-white/15 disabled:hover:bg-transparent'
                            }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </Section>
        </div>
    )
})

// ── Sub-components ──

function Section({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <div className="text-[10px] text-white/40 uppercase tracking-wider mb-2">{label}</div>
            {children}
        </div>
    )
}

function Slider({ label, value, min, max, step, onChange }: {
    label: string
    value: number
    min: number
    max: number
    step: number
    onChange: (v: number) => void
}) {
    return (
        <div className="mb-2">
            <div className="flex justify-between text-white/40 mb-0.5">
                <span>{label}</span>
                <span className="font-mono text-white/25">{value}</span>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                className="w-full h-1 appearance-none bg-white/10 rounded cursor-pointer
                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5
                    [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white/50 [&::-webkit-slider-thumb]:hover:bg-white/70"
            />
        </div>
    )
}
