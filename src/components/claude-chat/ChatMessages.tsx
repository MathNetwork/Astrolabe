'use client'

/**
 * ChatMessages — 流式消息渲染
 *
 * 订阅 streamMessages，按消息类型分派渲染。
 * 使用纯函数 filterDisplayMessages / buildToolResultMap 处理数据。
 */
import { memo, useRef, useEffect, useMemo, useState, type FC } from 'react'
import { useClaudeChatStore, type ClaudeStreamMessage, type ContentBlock } from '@/stores/claudeChatStore'
import { filterDisplayMessages, buildToolResultMap } from '@/lib/claudeStreamUtils'
import MarkdownRenderer from '@/components/MarkdownRenderer'
import { ThinkingWidget, ToolWidget } from './StreamWidgets'
import { ToolWidgets } from './ToolWidgets'

// ── StreamingIndicator ──

const StreamingIndicator: FC = memo(() => {
    const [elapsed, setElapsed] = useState(0)
    const startRef = useRef(Date.now())

    useEffect(() => {
        startRef.current = Date.now()
        setElapsed(0)
        const timer = setInterval(() => {
            setElapsed(Math.floor((Date.now() - startRef.current) / 1000))
        }, 1000)
        return () => clearInterval(timer)
    }, [])

    return (
        <div className="flex items-center gap-1.5 px-1 py-1.5 text-white/30">
            <div className="flex gap-0.5">
                <span className="w-1.5 h-1.5 animate-bounce rounded-full bg-white/30" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 animate-bounce rounded-full bg-white/30" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 animate-bounce rounded-full bg-white/30" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-sm">
                Thinking...
                {elapsed >= 3 && (
                    <span className="ml-1 text-white/20 text-xs">{elapsed}s</span>
                )}
            </span>
        </div>
    )
})

// ── ChatMessages (main) ──

export const ChatMessages = memo(function ChatMessages() {
    const streamMessages = useClaudeChatStore(s => s.streamMessages)
    const isStreaming = useClaudeChatStore(s => s.isStreaming)
    const scrollRef = useRef<HTMLDivElement>(null)
    const shouldAutoScrollRef = useRef(true)
    const userHasScrolledRef = useRef(false)

    const toolResultMap = useMemo(() => buildToolResultMap(streamMessages), [streamMessages])
    const displayMessages = useMemo(() => filterDisplayMessages(streamMessages), [streamMessages])

    // Auto-scroll
    useEffect(() => {
        if (shouldAutoScrollRef.current && scrollRef.current) {
            scrollRef.current.scrollTo({
                top: scrollRef.current.scrollHeight,
                behavior: 'smooth',
            })
        }
    }, [displayMessages])

    useEffect(() => {
        if (!isStreaming) {
            shouldAutoScrollRef.current = true
            userHasScrolledRef.current = false
        }
    }, [isStreaming])

    const handleScroll = () => {
        if (!scrollRef.current) return
        const el = scrollRef.current
        const isAtBottom = Math.abs(el.scrollHeight - el.scrollTop - el.clientHeight) < 50
        if (!isAtBottom) {
            userHasScrolledRef.current = true
            shouldAutoScrollRef.current = false
        } else if (userHasScrolledRef.current) {
            shouldAutoScrollRef.current = true
            userHasScrolledRef.current = false
        }
    }

    return (
        <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-3 space-y-1">
            {displayMessages.length === 0 && !isStreaming && (
                <div className="text-center text-white/20 text-sm py-8">
                    Ask Claude about your signature
                </div>
            )}
            {displayMessages.map((msg, i) => (
                <MessageBubble key={i} message={msg} toolResultMap={toolResultMap} />
            ))}
            {isStreaming && <StreamingIndicator />}
        </div>
    )
})

// ── MessageBubble ──

const MessageBubble: FC<{
    message: ClaudeStreamMessage
    toolResultMap: Map<string, ContentBlock>
}> = memo(({ message, toolResultMap }) => {
    if (message.type === 'user') return <UserMessage message={message} />
    if (message.type === 'assistant') return <AssistantMessage message={message} toolResultMap={toolResultMap} />
    if (message.type === 'result') return <ResultMessage message={message} />
    return null
})

// ── UserMessage ──

const UserMessage: FC<{ message: ClaudeStreamMessage }> = ({ message }) => {
    const rawContent = message.message?.content
    const textContent = Array.isArray(rawContent)
        ? rawContent.filter(b => b.type === 'text').map(b => b.text).join('\n')
        : ''

    if (!textContent) return null

    return (
        <div className="ml-8 py-1">
            <div className="rounded-lg px-3 py-2 text-sm bg-white/10 text-white/80">
                <div className="whitespace-pre-wrap">{textContent}</div>
            </div>
        </div>
    )
}

// ── AssistantMessage ──

const AssistantMessage: FC<{
    message: ClaudeStreamMessage
    toolResultMap: Map<string, ContentBlock>
}> = ({ message, toolResultMap }) => {
    const content = message.message?.content
    if (!Array.isArray(content) || content.length === 0) return null

    const hasRenderable = content.some(
        block =>
            (block.type === 'text' && block.text) ||
            (block.type === 'thinking' && block.thinking) ||
            (block.type === 'tool_use' && block.id)
    )
    if (!hasRenderable) return null

    // 收集所有 text blocks 合并为一段（用于 ToolWidgets 解析 JSON）
    const fullText = content
        .filter(b => b.type === 'text' && b.text)
        .map(b => b.text)
        .join('')

    return (
        <div className="mr-4 py-1">
            <div className="text-sm text-white/70">
                {content.map((block, idx) => {
                    if (block.type === 'thinking' && block.thinking) {
                        return <ThinkingWidget key={idx} thinking={block.thinking} signature={block.signature} />
                    }
                    if (block.type === 'text' && block.text) {
                        return <MarkdownRenderer key={idx} content={block.text} className="text-sm" />
                    }
                    if (block.type === 'tool_use' && block.id) {
                        const result = toolResultMap.get(block.id)
                        return <ToolWidget key={idx} toolUse={block} toolResult={result} />
                    }
                    return null
                })}
                {fullText && <ToolWidgets content={fullText} />}
            </div>
        </div>
    )
}

// ── ResultMessage ──

const ResultMessage: FC<{ message: ClaudeStreamMessage }> = ({ message }) => {
    const isError = message.is_error
    const resultText = message.result

    if (!resultText) return null

    return (
        <div className="mr-4 py-1">
            <div className="text-sm">
                {isError ? (
                    <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-red-400/80">
                        {resultText}
                    </div>
                ) : (
                    <MarkdownRenderer content={resultText} className="text-sm text-white/70" />
                )}
            </div>
            {message.cost_usd != null && (
                <div className="mt-1 text-right text-white/20 text-xs">
                    ${message.cost_usd.toFixed(4)}
                </div>
            )}
        </div>
    )
}
