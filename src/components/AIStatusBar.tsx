'use client'

import { useHighlightStore } from '@/stores/highlightStore'

/** AI work indicator — shows current operation at bottom of NetworkView. */
export function AIStatusBar() {
    const statusText = useHighlightStore(s => s.statusText)

    return (
        <div
            className="absolute bottom-3 left-0 right-0 flex justify-center pointer-events-none"
            style={{ opacity: statusText ? 1 : 0, transition: 'opacity 0.3s ease' }}
        >
            <span className="text-[11px] text-white/40 bg-black/50 backdrop-blur-sm px-3 py-1 rounded-full font-mono">
                {statusText}
            </span>
        </div>
    )
}
