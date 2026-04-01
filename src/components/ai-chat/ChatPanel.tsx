'use client'

/**
 * ChatPanel — embedded terminal for Claude Code CLI
 *
 * Uses xterm.js to render a terminal connected to the local Claude Code
 * process via Tauri IPC. The panel shell (collapse/expand) is preserved
 * in the editor layout.
 */
import { memo, useRef, useEffect, useState } from 'react'

export const ChatPanel = memo(function ChatPanel() {
    const containerRef = useRef<HTMLDivElement>(null)
    const termRef = useRef<any>(null)
    const fitRef = useRef<any>(null)
    const [ready, setReady] = useState(false)

    // Initialize xterm
    useEffect(() => {
        if (!containerRef.current) return
        let cancelled = false

        ;(async () => {
            const { Terminal } = await import('xterm')
            const { FitAddon } = await import('@xterm/addon-fit')

            if (cancelled || !containerRef.current) return

            const term = new Terminal({
                fontSize: 13,
                fontFamily: 'Menlo, Monaco, "Courier New", monospace',
                theme: {
                    background: '#0a0a0f',
                    foreground: '#d4d4d8',
                    cursor: '#d4d4d8',
                    selectionBackground: '#264f78',
                },
                cursorBlink: true,
                scrollback: 5000,
                convertEol: true,
            })

            const fit = new FitAddon()
            term.loadAddon(fit)
            term.open(containerRef.current)
            fit.fit()

            termRef.current = term
            fitRef.current = fit
            setReady(true)

            // Connect to Tauri Claude CLI process
            try {
                const { listen } = await import('@tauri-apps/api/event')
                const { invoke } = await import('@tauri-apps/api/core')

                // Listen for Claude output
                const unlisten = await listen<{ tab_id: string; data: string }>('claude-output', (event) => {
                    if (event.payload.tab_id !== 'terminal') return
                    try {
                        const parsed = JSON.parse(event.payload.data)
                        if (parsed.type === 'assistant' && parsed.message?.content) {
                            for (const block of parsed.message.content) {
                                if (block.type === 'text' && block.text) {
                                    term.writeln(block.text)
                                } else if (block.type === 'tool_use') {
                                    term.writeln(`\x1b[36m⚡ ${block.name}\x1b[0m`)
                                }
                            }
                        } else if (parsed.type === 'result') {
                            term.writeln('\x1b[32m✓ Done\x1b[0m')
                        }
                    } catch {
                        term.writeln(event.payload.data)
                    }
                })

                const unlisten2 = await listen<{ tab_id: string; data: string }>('claude-error', (event) => {
                    if (event.payload.tab_id !== 'terminal') return
                    term.writeln(`\x1b[31m${event.payload.data}\x1b[0m`)
                })

                const unlisten3 = await listen<{ tab_id: string }>('claude-complete', (event) => {
                    if (event.payload.tab_id !== 'terminal') return
                    term.write('\r\n\x1b[90m❯\x1b[0m ')
                })

                // Handle user input
                let inputBuffer = ''
                term.onData((data) => {
                    if (data === '\r') {
                        term.writeln('')
                        if (inputBuffer.trim()) {
                            const projectPath = new URLSearchParams(window.location.search).get('path') || ''
                            invoke('execute_claude_code', {
                                projectPath,
                                prompt: inputBuffer.trim(),
                                tabId: 'terminal',
                            }).catch((e: any) => term.writeln(`\x1b[31mError: ${e}\x1b[0m`))
                        }
                        inputBuffer = ''
                        term.write('\x1b[90m❯\x1b[0m ')
                    } else if (data === '\x7f') {
                        if (inputBuffer.length > 0) {
                            inputBuffer = inputBuffer.slice(0, -1)
                            term.write('\b \b')
                        }
                    } else if (data >= ' ') {
                        inputBuffer += data
                        term.write(data)
                    }
                })

                term.writeln('\x1b[90mClaude Code Terminal\x1b[0m')
                term.write('\x1b[90m❯\x1b[0m ')

                return () => { unlisten(); unlisten2(); unlisten3() }
            } catch {
                term.writeln('\x1b[33mClaude Code requires Tauri desktop app\x1b[0m')
            }
        })()

        return () => {
            cancelled = true
            termRef.current?.dispose()
            termRef.current = null
        }
    }, [])

    // Resize on container change
    useEffect(() => {
        if (!containerRef.current || !fitRef.current) return
        const ro = new ResizeObserver(() => { try { fitRef.current?.fit() } catch {} })
        ro.observe(containerRef.current)
        return () => ro.disconnect()
    }, [ready])

    return (
        <div className="h-full flex flex-col bg-[#0a0a0f]">
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 shrink-0">
                <span className="text-xs text-white/50">Claude Code</span>
            </div>
            <div ref={containerRef} className="flex-1 overflow-hidden" />
        </div>
    )
})
