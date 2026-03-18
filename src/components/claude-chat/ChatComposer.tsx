'use client'

import { memo, useState, useCallback, useMemo } from 'react'
import { useClaudeChatStore } from '@/stores/claudeChatStore'
import { useSelectObjStore } from '@/stores/selectObjStore'
import { useSelectMorStore } from '@/stores/selectMorStore'
import { useDataStore } from '@/stores/dataStore'
import { buildContext } from '@/lib/buildContext'
import { matchSkills, type Skill } from '@/lib/skills'

export const ChatComposer = memo(function ChatComposer() {
    const [input, setInput] = useState('')
    const isStreaming = useClaudeChatStore(s => s.isStreaming)
    const sendPrompt = useClaudeChatStore(s => s.sendPrompt)

    const selectedObjHash = useSelectObjStore(s => s.selectedHash)
    const selectedMorHash = useSelectMorStore(s => s.selectedHash)
    const objects = useDataStore(s => s.objects)
    const morphisms = useDataStore(s => s.morphisms)

    // Slash command 匹配
    const matchedSkills = useMemo(() => matchSkills(input), [input])
    const showSkills = input.startsWith('/') && matchedSkills.length > 0

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

    const handleSend = useCallback(() => {
        const text = input.trim()
        if (!text || isStreaming) return

        // 构建上下文
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

        const prompt = buildContext(selectedObj, selectedMor, text)
        const projectPath = new URLSearchParams(window.location.search).get('path') || ''
        // prompt 含上下文发给 Claude，text 是用户原始输入显示在聊天框
        sendPrompt(prompt, projectPath, text)
        setInput('')
    }, [input, isStreaming, sendPrompt, selectedObjHash, selectedMorHash, objects, morphisms])

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
            <div className="flex gap-2">
                <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask Claude..."
                    disabled={isStreaming}
                    rows={1}
                    className="flex-1 bg-white/5 text-white/80 text-xs rounded px-3 py-2 resize-none
                        placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-white/20
                        disabled:opacity-50"
                />
                <button
                    onClick={handleSend}
                    disabled={isStreaming || !input.trim()}
                    className="px-3 py-2 bg-white/10 rounded text-xs text-white/60
                        hover:bg-white/15 hover:text-white/80 disabled:opacity-30 transition-colors"
                >
                    ↑
                </button>
            </div>
        </div>
    )
})
