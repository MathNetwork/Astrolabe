'use client'

import { memo, useState, useCallback, useMemo, useRef } from 'react'
import { XMarkIcon, PhotoIcon } from '@heroicons/react/24/outline'
import { useClaudeChatStore, type Attachment } from '@/stores/claudeChatStore'
import { useSelectObjStore } from '@/stores/selectObjStore'
import { useSelectMorStore } from '@/stores/selectMorStore'
import { useDataStore } from '@/stores/dataStore'
import { buildContext } from '@/lib/buildContext'
import { matchSkills, type Skill } from '@/lib/skills'
import { fileToDataUrl, generateImageFilename } from '@/lib/imageUtils'

export const ChatComposer = memo(function ChatComposer() {
    const [input, setInput] = useState('')
    const [attachments, setAttachments] = useState<Attachment[]>([])
    const [isDragOver, setIsDragOver] = useState(false)
    const isStreaming = useClaudeChatStore(s => s.isStreaming)
    const sendPrompt = useClaudeChatStore(s => s.sendPrompt)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const selectedObjHash = useSelectObjStore(s => s.selectedHash)
    const selectedMorHash = useSelectMorStore(s => s.selectedHash)
    const objects = useDataStore(s => s.objects)
    const morphisms = useDataStore(s => s.morphisms)

    // Slash command 匹配
    const matchedSkills = useMemo(() => matchSkills(input), [input])
    const showSkills = input.startsWith('/') && matchedSkills.length > 0

    // ── 图片处理 ──

    const processFiles = useCallback(async (files: FileList | File[]) => {
        const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'))
        if (imageFiles.length === 0) return

        const newAttachments: Attachment[] = []
        for (const file of imageFiles) {
            const dataUrl = await fileToDataUrl(file)
            const filename = generateImageFilename(file.name, file.type)
            newAttachments.push({
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                filename,
                dataUrl,
                mimeType: file.type,
            })
        }
        setAttachments(prev => [...prev, ...newAttachments])
    }, [])

    const handlePaste = useCallback(async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
        const files = e.clipboardData?.files
        if (files && files.length > 0) {
            const hasImages = Array.from(files).some(f => f.type.startsWith('image/'))
            if (hasImages) {
                e.preventDefault()
                await processFiles(files)
            }
        }
    }, [processFiles])

    const handleDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragOver(false)
        const files = e.dataTransfer?.files
        if (files) await processFiles(files)
    }, [processFiles])

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragOver(true)
    }, [])

    const handleDragLeave = useCallback(() => {
        setIsDragOver(false)
    }, [])

    const removeAttachment = useCallback((id: string) => {
        setAttachments(prev => prev.filter(a => a.id !== id))
    }, [])

    // ── 保存图片到项目目录 ──

    const saveAttachments = useCallback(async (projectPath: string): Promise<string[]> => {
        if (attachments.length === 0) return []

        const savedPaths: string[] = []
        try {
            const { mkdir, writeFile } = await import('@tauri-apps/plugin-fs')
            const attachDir = `${projectPath}/.netmath/attachments`
            await mkdir(attachDir, { recursive: true }).catch(() => {})

            for (const att of attachments) {
                const filePath = `${attachDir}/${att.filename}`
                // data URL → Uint8Array
                const base64 = att.dataUrl.split(',')[1]
                const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0))
                await writeFile(filePath, bytes)
                savedPaths.push(filePath)
            }
        } catch {
            // 非 Tauri 环境，返回空
        }
        return savedPaths
    }, [attachments])

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

        // 保存附件并构建提示
        let promptText = text
        if (attachments.length > 0) {
            const savedPaths = await saveAttachments(projectPath)
            if (savedPaths.length > 0) {
                const attachInfo = savedPaths.map(p => `[Attached image: ${p}]`).join('\n')
                promptText = promptText ? `${attachInfo}\n\n${promptText}` : attachInfo
            }
        }

        const prompt = buildContext(selectedObj, selectedMor, promptText)
        const displayText = attachments.length > 0
            ? `${attachments.map(a => `[${a.filename}]`).join(' ')}${text ? ' ' + text : ''}`
            : text
        sendPrompt(prompt, projectPath, displayText)
        setInput('')
        setAttachments([])
    }, [input, attachments, isStreaming, sendPrompt, selectedObjHash, selectedMorHash, objects, morphisms, saveAttachments])

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }, [handleSend])

    return (
        <div
            className={`border-t border-white/10 p-2 ${isDragOver ? 'bg-white/5' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
        >
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

            {/* 拖拽提示 */}
            {isDragOver && (
                <div className="flex items-center justify-center gap-2 mb-2 py-3 rounded border border-dashed border-white/30 text-white/40 text-sm">
                    <PhotoIcon className="w-5 h-5" />
                    Drop image here
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
                <button
                    onClick={handleSend}
                    disabled={isStreaming || (!input.trim() && attachments.length === 0)}
                    className="px-3 py-2 bg-white/10 rounded text-sm text-white/60
                        hover:bg-white/15 hover:text-white/80 disabled:opacity-30 transition-colors"
                >
                    ↑
                </button>
            </div>
        </div>
    )
})
