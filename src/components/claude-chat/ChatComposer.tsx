'use client'

import { memo, useState, useCallback, useMemo, useEffect } from 'react'
import { XMarkIcon, PhotoIcon, StopCircleIcon } from '@heroicons/react/24/outline'
import { useClaudeChatStore, type Attachment } from '@/stores/claudeChatStore'
import { useSelectObjStore } from '@/stores/selectObjStore'
import { useSelectMorStore } from '@/stores/selectMorStore'
import { useDataStore } from '@/stores/dataStore'
import { buildContext } from '@/lib/buildContext'
import { matchSkills, type Skill } from '@/lib/skills'
import { generateImageFilename } from '@/lib/imageUtils'

const IMAGE_EXTS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp']

// 暴露拖拽状态给 InspectorPanel 渲染全屏遮罩
let dragOverListener: ((v: boolean) => void) | null = null
export function onDragOverChange(fn: (v: boolean) => void) { dragOverListener = fn; return () => { dragOverListener = null } }

export const ChatComposer = memo(function ChatComposer() {
    const [input, setInput] = useState('')
    const [attachments, setAttachments] = useState<Attachment[]>([])
    const [isDragOver, setIsDragOver] = useState(false)
    const isStreaming = useClaudeChatStore(s => s.isStreaming)
    const sendPrompt = useClaudeChatStore(s => s.sendPrompt)

    const selectedObjHash = useSelectObjStore(s => s.selectedHash)
    const selectedMorHash = useSelectMorStore(s => s.selectedHash)
    const objects = useDataStore(s => s.objects)
    const morphisms = useDataStore(s => s.morphisms)

    // Slash command 匹配
    const matchedSkills = useMemo(() => matchSkills(input), [input])
    const showSkills = input.startsWith('/') && matchedSkills.length > 0

    // ── Tauri 原生拖放（OS 文件拖入窗口） ──

    useEffect(() => {
        let unlisten: (() => void) | undefined
        let cancelled = false

        ;(async () => {
            try {
                const { getCurrentWebview } = await import('@tauri-apps/api/webview')
                const webview = getCurrentWebview()

                const fn = await webview.onDragDropEvent(async (event) => {
                    if (cancelled) return
                    const { type } = event.payload

                    if (type === 'enter') {
                        setIsDragOver(true)
                        dragOverListener?.(true)
                    } else if (type === 'leave') {
                        setIsDragOver(false)
                        dragOverListener?.(false)
                    } else if (type === 'drop') {
                        setIsDragOver(false)
                        dragOverListener?.(false)
                        const paths = (event.payload as { type: string; paths: string[] }).paths
                        if (paths?.length > 0) {
                            await handleFilePaths(paths)
                        }
                    }
                })

                if (cancelled) { fn(); return }
                unlisten = fn
            } catch {
                // 非 Tauri 环境
            }
        })()

        return () => {
            cancelled = true
            unlisten?.()
        }
    }, [])

    // 处理文件路径（Tauri 拖放给的是路径）
    const handleFilePaths = async (paths: string[]) => {
        const imagePaths = paths.filter(p => IMAGE_EXTS.some(ext => p.toLowerCase().endsWith(ext)))
        if (imagePaths.length === 0) return

        const newAttachments: Attachment[] = []
        try {
            const { readFile } = await import('@tauri-apps/plugin-fs')

            for (const filePath of imagePaths) {
                const bytes = await readFile(filePath)
                const filename = filePath.split('/').pop() || `image-${Date.now()}.png`
                const ext = filename.split('.').pop()?.toLowerCase() || 'png'
                const mimeType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg'
                    : ext === 'webp' ? 'image/webp'
                    : ext === 'gif' ? 'image/gif'
                    : ext === 'svg' ? 'image/svg+xml'
                    : 'image/png'

                // bytes → data URL
                const base64 = btoa(String.fromCharCode(...bytes))
                const dataUrl = `data:${mimeType};base64,${base64}`

                newAttachments.push({
                    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                    filename,
                    dataUrl,
                    mimeType,
                    filePath,  // 已有路径，发送时不需要再保存
                })
            }
        } catch (e) {
            console.error('Failed to read dropped files:', e)
        }

        if (newAttachments.length > 0) {
            setAttachments(prev => [...prev, ...newAttachments])
        }
    }

    // ── 剪贴板粘贴（Cmd+V 截图） ──

    const handlePaste = useCallback(async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
        const files = e.clipboardData?.files
        if (!files || files.length === 0) return

        const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'))
        if (imageFiles.length === 0) return

        e.preventDefault()

        const projectPath = new URLSearchParams(window.location.search).get('path') || ''
        const newAttachments: Attachment[] = []

        for (const file of imageFiles) {
            const filename = generateImageFilename(file.name, file.type)

            try {
                // 保存到磁盘
                const { mkdir, writeFile } = await import('@tauri-apps/plugin-fs')
                const attachDir = `${projectPath}/.netmath/attachments`
                await mkdir(attachDir, { recursive: true }).catch(() => {})
                const filePath = `${attachDir}/${filename}`
                const buffer = await file.arrayBuffer()
                await writeFile(filePath, new Uint8Array(buffer))

                // 生成预览 data URL
                const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)))
                const dataUrl = `data:${file.type};base64,${base64}`

                newAttachments.push({
                    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                    filename,
                    dataUrl,
                    mimeType: file.type,
                    filePath,
                })
            } catch {
                // 非 Tauri 环境：用 FileReader 做预览
                const dataUrl = await new Promise<string>((resolve) => {
                    const reader = new FileReader()
                    reader.onload = () => resolve(reader.result as string)
                    reader.readAsDataURL(file)
                })
                newAttachments.push({
                    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                    filename,
                    dataUrl,
                    mimeType: file.type,
                })
            }
        }

        if (newAttachments.length > 0) {
            setAttachments(prev => [...prev, ...newAttachments])
        }
    }, [])

    const removeAttachment = useCallback((id: string) => {
        setAttachments(prev => prev.filter(a => a.id !== id))
    }, [])

    // ── 发送 ──

    const selectSkill = useCallback((skill: Skill) => {
        setInput('')
        const selectedObj = selectedObjHash ? objects.find(o => o.id === selectedObjHash) || null : null
        const selectedMor = selectedMorHash ? (() => {
            const m = morphisms.find(m => m.id === selectedMorHash)
            if (!m) return null
            return { ...m, sourceName: objects.find(o => o.id === m.source)?.name, targetName: objects.find(o => o.id === m.target)?.name }
        })() : null
        const prompt = buildContext(selectedObj, selectedMor, skill.prompt)
        const projectPath = new URLSearchParams(window.location.search).get('path') || ''
        sendPrompt(prompt, projectPath, skill.command)
    }, [selectedObjHash, selectedMorHash, objects, morphisms, sendPrompt])

    const handleSend = useCallback(async () => {
        const text = input.trim()
        if ((!text && attachments.length === 0) || isStreaming) return

        const selectedObj = selectedObjHash ? objects.find(o => o.id === selectedObjHash) || null : null
        const selectedMor = selectedMorHash ? (() => {
            const m = morphisms.find(m => m.id === selectedMorHash)
            if (!m) return null
            return {
                ...m,
                sourceName: objects.find(o => o.id === m.source)?.name,
                targetName: objects.find(o => o.id === m.target)?.name,
            }
        })() : null

        const projectPath = new URLSearchParams(window.location.search).get('path') || ''

        // 构建附件信息
        let promptText = text
        if (attachments.length > 0) {
            const attachInfo = attachments
                .map(a => `[Attached image: ${a.filePath || a.filename}]`)
                .join('\n')
            promptText = promptText ? `${attachInfo}\n\n${promptText}` : attachInfo
        }

        const prompt = buildContext(selectedObj, selectedMor, promptText)
        const displayText = attachments.length > 0
            ? `${attachments.map(a => `[${a.filename}]`).join(' ')}${text ? ' ' + text : ''}`
            : text
        sendPrompt(prompt, projectPath, displayText)
        setInput('')
        setAttachments([])
    }, [input, attachments, isStreaming, sendPrompt, selectedObjHash, selectedMorHash, objects, morphisms])

    const handleStop = useCallback(async () => {
        try {
            const { invoke } = await import('@tauri-apps/api/core')
            await invoke('cancel_claude_execution', { tabId: 'main' })
        } catch {}
    }, [])

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }, [handleSend])

    return (
        <div className="border-t border-white/10 p-2">
            {/* Slash command picker */}
            {showSkills && (
                <div className="mb-1 space-y-0.5">
                    {matchedSkills.map(skill => (
                        <button
                            key={skill.id}
                            onClick={() => selectSkill(skill)}
                            className="w-full text-left px-2 py-1 rounded text-[11px] text-white/50 hover:text-white/80 hover:bg-white/5 transition-colors"
                        >
                            <span className="text-white/70 font-mono">{skill.command}</span>
                            <span className="ml-2 text-white/30">{skill.description}</span>
                        </button>
                    ))}
                </div>
            )}

            {/* 附件预览 */}
            {attachments.length > 0 && (
                <div className="flex gap-2 mb-2 flex-wrap">
                    {attachments.map(att => (
                        <div key={att.id} className="relative group">
                            <img
                                src={att.dataUrl}
                                alt={att.filename}
                                className="h-16 rounded border border-white/10 object-cover"
                            />
                            <button
                                onClick={() => removeAttachment(att.id)}
                                className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500/80 flex items-center justify-center
                                    opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <XMarkIcon className="w-3 h-3 text-white" />
                            </button>
                            <div className="text-[9px] text-white/30 mt-0.5 truncate max-w-[80px]">
                                {att.filename}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="flex gap-2">
                <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onPaste={handlePaste}
                    placeholder={attachments.length > 0 ? 'Add a message...' : 'Ask Claude...'}
                    disabled={isStreaming}
                    rows={1}
                    className="flex-1 bg-white/5 text-white/80 text-sm rounded px-3 py-2 resize-none
                        placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-white/20
                        disabled:opacity-50"
                />
                {isStreaming ? (
                    <button
                        onClick={handleStop}
                        className="px-3 py-2 bg-red-500/20 rounded text-sm text-red-400
                            hover:bg-red-500/30 transition-colors"
                        title="Stop"
                    >
                        <StopCircleIcon className="w-4 h-4" />
                    </button>
                ) : (
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() && attachments.length === 0}
                        className="px-3 py-2 bg-white/10 rounded text-sm text-white/60
                            hover:bg-white/15 hover:text-white/80 disabled:opacity-30 transition-colors"
                    >
                        ↑
                    </button>
                )}
            </div>
        </div>
    )
})
