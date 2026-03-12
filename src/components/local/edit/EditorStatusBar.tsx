// @ts-nocheck
export function EditorStatusBar({ projectName, selectedNode }: any) {
    return (
        <div className="h-6 border-t border-white/10 bg-black flex items-center justify-between px-2 text-xs text-white/70 shrink-0">
            <div className="flex items-center gap-3">
                <span className="text-white/60">{projectName}</span>
            </div>

            <div className="flex items-center gap-3 text-white/60">
            </div>
        </div>
    )
}
