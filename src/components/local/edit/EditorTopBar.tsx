// @ts-nocheck
import {
    HomeIcon,
    Cog6ToothIcon,
    RectangleGroupIcon,
} from '@heroicons/react/24/outline'
export function EditorTopBar({
    projectName,
    searchPanelOpen,
    rightPanelOpen,
    onHome,
    onToggleSearchPanel,
    onToggleRightPanel,
}: any) {
    return (
        <div className="h-10 border-b bg-black/90 flex items-center justify-between px-3" style={{ borderColor: 'rgba(252, 175, 69, 0.5)' }}>
            <div className="flex items-center gap-2">
                <button
                    onClick={onHome}
                    className="p-1.5 hover:bg-white/10 rounded transition-colors"
                    title="Home"
                >
                    <HomeIcon className="w-4 h-4 text-white/60 hover:text-white" />
                </button>
                <span className="text-sm font-mono text-white/60 ml-2">{projectName}</span>
                <div className="w-px h-4 bg-white/20 mx-2" />
                <button
                    onClick={onToggleSearchPanel}
                    className={`p-1.5 rounded transition-colors ${
                        searchPanelOpen ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-white/40 hover:text-white'
                    }`}
                    title="Settings Panel"
                >
                    <Cog6ToothIcon className="w-4 h-4" />
                </button>
            </div>
            <div className="flex items-center">
                <button
                    onClick={onToggleRightPanel}
                    className={`p-1.5 rounded transition-colors ${
                        rightPanelOpen ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-white/40 hover:text-white'
                    }`}
                    title="Inspector Panel"
                >
                    <RectangleGroupIcon className="w-4 h-4" />
                </button>
            </div>
        </div>
    )
}
