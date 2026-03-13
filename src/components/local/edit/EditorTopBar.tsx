// @ts-nocheck
import { useEffect } from 'react'
import {
    HomeIcon,
    Cog6ToothIcon,
    RectangleGroupIcon,
    SunIcon,
    MoonIcon,
} from '@heroicons/react/24/outline'
import { useStore } from '@/lib/store'

const THEME_ICONS = {
    dark: MoonIcon,
    light: SunIcon,
    warm: SunIcon,
}
const THEME_LABELS = {
    dark: 'Dark',
    light: 'Light',
    warm: 'Warm',
}

export function EditorTopBar({
    projectName,
    searchPanelOpen,
    rightPanelOpen,
    onHome,
    onToggleSearchPanel,
    onToggleRightPanel,
}: any) {
    const themeMode = useStore(s => s.themeMode)
    const cycleTheme = useStore(s => s.cycleTheme)

    // Sync theme class to <html>
    useEffect(() => {
        const html = document.documentElement
        html.classList.remove('theme-light', 'theme-warm')
        if (themeMode === 'light') html.classList.add('theme-light')
        else if (themeMode === 'warm') html.classList.add('theme-warm')
    }, [themeMode])

    const ThemeIcon = THEME_ICONS[themeMode]

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
            <div className="flex items-center gap-1">
                {/* Theme toggle */}
                <button
                    onClick={cycleTheme}
                    className={`p-1.5 rounded transition-colors flex items-center gap-1 ${
                        themeMode !== 'dark'
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-white/5 text-white/40 hover:text-white'
                    }`}
                    title={`Theme: ${THEME_LABELS[themeMode]} (click to cycle)`}
                >
                    <ThemeIcon className="w-4 h-4" />
                    {themeMode !== 'dark' && (
                        <span className="text-[9px] uppercase tracking-wider">{THEME_LABELS[themeMode]}</span>
                    )}
                </button>
                {/* Inspector toggle */}
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
