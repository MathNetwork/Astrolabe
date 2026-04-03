'use client'

/**
 * ChatPanel — embedded PTY terminal for Astrolabe Code CLI
 *
 * PTY session persists across layout switches (stored in zustand).
 * Only killed when the project changes or window closes.
 */
import { memo, useRef, useEffect, useState, useCallback } from 'react'
import { useViewStore } from '../../stores/viewStore'
import { useDataStore } from '../../stores/dataStore'
import { useSelectObjStore } from '../../stores/selectObjStore'
import { useHighlightStore } from '../../stores/highlightStore'
import { extractLastValidHash } from '../../lib/hashExtractor'

export const ChatPanel = memo(function ChatPanel() {
    const containerRef = useRef<HTMLDivElement>(null)
    const termRef = useRef<any>(null)
    const fitRef = useRef<any>(null)
    const [ready, setReady] = useState(false)

    // PTY session id lives in zustand so it survives unmount/remount
    const ptySessionId = useViewStore(s => s.ptySessionId)
    const setPtySessionId = useViewStore(s => s.setPtySessionId)
    const sessionRef = useRef<string | null>(ptySessionId)

    // Keep ref in sync with store
    useEffect(() => { sessionRef.current = ptySessionId }, [ptySessionId])

    // AI Follow Mode: tail buffer + debounced select + active node timeout
    const tailBufferRef = useRef('')
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const activeNodeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
            })

            const fit = new FitAddon()
            term.loadAddon(fit)
            term.open(containerRef.current)
            fit.fit()

            termRef.current = term
            fitRef.current = fit
            setReady(true)

            try {
                const { listen } = await import('@tauri-apps/api/event')
                const { invoke } = await import('@tauri-apps/api/core')

                const projectPath = new URLSearchParams(window.location.search).get('path') || ''

                // Wait for container to have real dimensions before spawning.
                // CSS layout may not be complete on first render.
                await new Promise<void>(resolve => {
                    const check = () => {
                        fit.fit()
                        if (term.cols > 20 && containerRef.current && containerRef.current.clientWidth > 100) {
                            resolve()
                        } else {
                            requestAnimationFrame(check)
                        }
                    }
                    requestAnimationFrame(check)
                })

                // Reattach to existing PTY or spawn new one
                let sid = sessionRef.current
                if (!sid) {
                    sid = await invoke<string>('pty_spawn', {
                        projectPath,
                        rows: term.rows,
                        cols: term.cols,
                    })
                    sessionRef.current = sid
                    setPtySessionId(sid)
                } else {
                    // Reattaching — send resize to sync dimensions
                    await invoke('pty_resize', {
                        sessionId: sid,
                        rows: term.rows,
                        cols: term.cols,
                    }).catch(() => {
                        // Session gone — spawn fresh
                        sessionRef.current = null
                        setPtySessionId(null)
                    })
                    // If session died while we were unmounted, spawn new
                    if (!sessionRef.current) {
                        sid = await invoke<string>('pty_spawn', {
                            projectPath,
                            rows: term.rows,
                            cols: term.cols,
                        })
                        sessionRef.current = sid
                        setPtySessionId(sid)
                    }
                }

                // PTY output → xterm + AI Follow hash extraction
                const unlisten1 = await listen<{ session_id: string; data: number[] }>('pty-output', (event) => {
                    if (event.payload.session_id !== sessionRef.current) return
                    term.write(new Uint8Array(event.payload.data))

                    // AI Follow Mode: extract hashes from PTY output
                    const text = new TextDecoder().decode(new Uint8Array(event.payload.data))
                    tailBufferRef.current += text
                    if (tailBufferRef.current.length > 200)
                        tailBufferRef.current = tailBufferRef.current.slice(-24)

                    const { aiFollowMode } = useViewStore.getState()
                    if (aiFollowMode) {
                        const hash = extractLastValidHash(
                            tailBufferRef.current,
                            (h) => useDataStore.getState().objectMap.has(h),
                        )
                        if (hash) {
                            // 300ms debounce for fly-to
                            if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
                            debounceTimerRef.current = setTimeout(() => {
                                useSelectObjStore.getState().select(hash)
                            }, 300)

                            // Active node + status text (immediate, no debounce)
                            useHighlightStore.getState().setActiveNode(hash)
                            useHighlightStore.getState().setStatusText(`Working on entry ${hash}...`)

                            // 5s timeout to clear active node + status
                            if (activeNodeTimerRef.current) clearTimeout(activeNodeTimerRef.current)
                            activeNodeTimerRef.current = setTimeout(() => {
                                useHighlightStore.getState().setActiveNode(null)
                                useHighlightStore.getState().setStatusText(null)
                            }, 5000)
                        }
                    }
                })

                // PTY exit
                const unlisten2 = await listen<{ session_id: string }>('pty-exit', (event) => {
                    if (event.payload.session_id !== sessionRef.current) return
                    term.write('\r\n\x1b[90m[Process exited — press Enter to restart]\x1b[0m\r\n')
                    sessionRef.current = null
                    setPtySessionId(null)
                })

                // xterm input → PTY, auto-respawn on Enter after exit
                term.onData(async (data) => {
                    if (sessionRef.current) {
                        invoke('pty_write', { sessionId: sessionRef.current, data })
                    } else if (data === '\r' || data === '\n') {
                        term.write('\r\n\x1b[90mRestarting...\x1b[0m\r\n')
                        try {
                            if (fitRef.current) fitRef.current.fit()
                            const newId = await invoke<string>('pty_spawn', {
                                projectPath,
                                rows: term.rows,
                                cols: term.cols,
                            })
                            sessionRef.current = newId
                            setPtySessionId(newId)
                        } catch (e) {
                            term.write(`\x1b[31mFailed to restart: ${e}\x1b[0m\r\n`)
                        }
                    }
                })

                // xterm resize → PTY
                term.onResize(({ rows, cols }) => {
                    if (sessionRef.current) {
                        invoke('pty_resize', { sessionId: sessionRef.current, rows, cols })
                    }
                })

                // Delayed re-fit after CSS settles
                setTimeout(() => {
                    try {
                        fit.fit()
                        if (sessionRef.current) {
                            invoke('pty_resize', {
                                sessionId: sessionRef.current,
                                rows: term.rows,
                                cols: term.cols,
                            })
                        }
                    } catch {}
                }, 200)

                return () => {
                    unlisten1()
                    unlisten2()
                    // Do NOT kill PTY on unmount — it persists in the store
                }
            } catch (e) {
                term.writeln(`\x1b[33mFailed to start Astrolabe Code: ${e}\x1b[0m`)
            }
        })()

        return () => {
            cancelled = true
            // Dispose xterm UI only, keep PTY alive
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

    // Drag-and-drop
    useEffect(() => {
        const el = containerRef.current
        if (!el) return

        const onDragOver = (e: DragEvent) => { e.preventDefault(); e.stopPropagation() }
        const onDrop = async (e: DragEvent) => {
            e.preventDefault()
            e.stopPropagation()
            const files = e.dataTransfer?.files
            if (!files?.length || !sessionRef.current) return

            try {
                const { invoke } = await import('@tauri-apps/api/core')
                const projectPath = new URLSearchParams(window.location.search).get('path') || ''

                const paths: string[] = []
                for (const file of Array.from(files)) {
                    const buffer = await file.arrayBuffer()
                    const bytes = Array.from(new Uint8Array(buffer))
                    const savedPath = await invoke<string>('save_upload', {
                        projectPath,
                        fileName: file.name,
                        data: bytes,
                    })
                    paths.push(savedPath)
                }
                await invoke('pty_write', { sessionId: sessionRef.current, data: paths.join(' ') + ' ' })
                if (containerRef.current) {
                    containerRef.current.style.outline = '2px solid #ff9800'
                    setTimeout(() => {
                        if (containerRef.current) containerRef.current.style.outline = ''
                    }, 500)
                }
            } catch (err) {
                termRef.current?.writeln(`\x1b[31mDrop failed: ${err}\x1b[0m`)
            }
        }

        el.addEventListener('dragover', onDragOver)
        el.addEventListener('drop', onDrop)
        return () => {
            el.removeEventListener('dragover', onDragOver)
            el.removeEventListener('drop', onDrop)
        }
    }, [ready])

    return (
        <div ref={containerRef} className="h-full overflow-hidden bg-[#0a0a0f]" />
    )
})
