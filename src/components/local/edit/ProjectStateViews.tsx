// @ts-nocheck

export function TauriRequiredView() {
    return (
        <div className="min-h-screen bg-black flex items-center justify-center">
            <div className="text-center">
                <h1 className="text-2xl font-mono text-white mb-4">NetMath</h1>
                <p className="text-white/60 text-sm">Please run this application in Tauri desktop mode</p>
            </div>
        </div>
    )
}

export function NoProjectSelectedView({ onHome }: any) {
    return (
        <div className="min-h-screen bg-black flex items-center justify-center">
            <div className="text-center">
                <h1 className="text-2xl font-mono text-white mb-4">No Project Selected</h1>
                <button
                    onClick={onHome}
                    className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                >
                    Go to Home
                </button>
            </div>
        </div>
    )
}
