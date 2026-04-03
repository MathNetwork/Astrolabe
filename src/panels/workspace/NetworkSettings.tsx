'use client'

import { memo } from 'react'
import { usePhysicsStore } from '@/stores/physicsStore'
import { useViewStore } from '@/stores/viewStore'
import { usePluginStore } from '@/plugins/registry'

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
    const aiFollowMode = useViewStore(s => s.aiFollowMode)
    const toggleAiFollow = useViewStore(s => s.toggleAiFollow)
    const ActiveSettingsPanel = usePluginStore(s => s.getActiveSettingsPanel())

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

            <div className="flex items-center justify-between">
                <span className="text-white/30">AI Follow</span>
                <button onClick={toggleAiFollow} className={`text-xs px-2 py-0.5 rounded ${aiFollowMode ? 'bg-green-500/20 text-green-400' : 'text-white/30'}`}>
                    {aiFollowMode ? 'ON' : 'OFF'}
                </button>
            </div>

            {ActiveSettingsPanel && <ActiveSettingsPanel />}
        </div>
    )
})

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
