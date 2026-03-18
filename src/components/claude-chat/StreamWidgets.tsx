'use client'

/**
 * StreamWidgets — 流式消息的可视化组件
 *
 * ThinkingWidget: 折叠的思考过程
 * ToolWidget: 工具调用显示（Read/Edit/Bash/Glob/Grep 等）
 */
import { memo, useState } from 'react'
import {
    ChevronRightIcon,
    ChevronDownIcon,
    DocumentIcon,
    PencilSquareIcon,
    CommandLineIcon,
    MagnifyingGlassIcon,
    WrenchIcon,
    CheckIcon,
    DocumentArrowDownIcon,
} from '@heroicons/react/24/outline'
import { useClaudeChatStore, type ContentBlock } from '@/stores/claudeChatStore'

// ── ThinkingWidget ──

export const ThinkingWidget = memo(function ThinkingWidget({
    thinking,
}: {
    thinking: string
    signature?: string
}) {
    const [expanded, setExpanded] = useState(false)
    const trimmed = thinking.trim()

    return (
        <div className="my-1.5 overflow-hidden rounded-lg border border-white/10 bg-white/5">
            <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="flex w-full items-center justify-between px-3 py-2 transition-colors hover:bg-white/5"
            >
                <div className="flex items-center gap-2">
                    <span className="text-white/30 text-sm italic">Thinking...</span>
                </div>
                {expanded
                    ? <ChevronDownIcon className="w-3.5 h-3.5 text-white/30" />
                    : <ChevronRightIcon className="w-3.5 h-3.5 text-white/30" />
                }
            </button>
            {expanded && (
                <div className="border-t border-white/10 px-3 pt-2 pb-3">
                    <pre className="whitespace-pre-wrap rounded-lg bg-white/5 p-3 font-mono text-white/40 text-xs italic">
                        {trimmed}
                    </pre>
                </div>
            )}
        </div>
    )
})

// ── ToolWidget ──

export const ToolWidget = memo(function ToolWidget({
    toolUse,
    toolResult,
}: {
    toolUse: ContentBlock
    toolResult?: ContentBlock
}) {
    const name = toolUse.name?.toLowerCase() || ''
    const isStreaming = useClaudeChatStore(s => s.isStreaming)

    // 状态图标
    const StatusIcon = () => {
        if (!toolResult) {
            if (!isStreaming) return <span className="w-3.5 h-3.5 rounded-full border border-white/20" />
            return <span className="w-3.5 h-3.5 rounded-full border border-white/20 animate-pulse" />
        }
        if (toolResult.is_error) return <span className="text-red-400 text-sm">!</span>
        return <CheckIcon className="w-3.5 h-3.5 text-green-400" />
    }

    if (name === 'read') return <ReadWidget input={toolUse.input} result={toolResult} StatusIcon={StatusIcon} />
    if (name === 'edit' || name === 'multiedit') return <EditWidget input={toolUse.input} result={toolResult} StatusIcon={StatusIcon} />
    if (name === 'write') return <WriteWidget input={toolUse.input} result={toolResult} StatusIcon={StatusIcon} />
    if (name === 'bash') return <BashWidget input={toolUse.input} result={toolResult} StatusIcon={StatusIcon} />
    if (name === 'glob') return <GlobWidget input={toolUse.input} result={toolResult} StatusIcon={StatusIcon} />
    if (name === 'grep') return <GrepWidget input={toolUse.input} result={toolResult} StatusIcon={StatusIcon} />

    return <GenericWidget name={toolUse.name || 'unknown'} input={toolUse.input} result={toolResult} StatusIcon={StatusIcon} />
})

// ── Read Widget ──

function ReadWidget({ input, result, StatusIcon }: { input: any; result?: ContentBlock; StatusIcon: React.FC }) {
    return (
        <div className="my-1.5 flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm">
            <StatusIcon />
            <DocumentIcon className="w-3.5 h-3.5 text-white/30" />
            <span className="min-w-0 truncate text-white/40">
                {result ? 'Read' : 'Reading'}{' '}
                <code className="rounded bg-white/10 px-1 text-xs">{input?.file_path}</code>
            </span>
        </div>
    )
}

// ── Edit Widget ──

function EditWidget({ input, result, StatusIcon }: { input: any; result?: ContentBlock; StatusIcon: React.FC }) {
    const [expanded, setExpanded] = useState(false)

    return (
        <div className="my-1.5 rounded-lg border border-white/10 bg-white/5 text-sm">
            <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2"
                onClick={() => setExpanded(!expanded)}
            >
                <StatusIcon />
                <PencilSquareIcon className="w-3.5 h-3.5 text-white/30" />
                <span className="min-w-0 truncate text-white/40">
                    {result ? 'Edited' : 'Editing'}{' '}
                    <code className="rounded bg-white/10 px-1 text-xs">{input?.file_path}</code>
                </span>
                {input?.old_string && (
                    expanded
                        ? <ChevronDownIcon className="ml-auto w-3.5 h-3.5 text-white/30" />
                        : <ChevronRightIcon className="ml-auto w-3.5 h-3.5 text-white/30" />
                )}
            </button>
            {expanded && input?.old_string && (
                <div className="border-t border-white/10 px-3 py-2 font-mono text-xs">
                    <div className="text-red-400/70">- {truncate(input.old_string, 200)}</div>
                    <div className="text-green-400/70">+ {truncate(input.new_string, 200)}</div>
                </div>
            )}
        </div>
    )
}

// ── Write Widget ──

function WriteWidget({ input, result, StatusIcon }: { input: any; result?: ContentBlock; StatusIcon: React.FC }) {
    return (
        <div className="my-1.5 flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm">
            <StatusIcon />
            <DocumentArrowDownIcon className="w-3.5 h-3.5 text-white/30" />
            <span className="min-w-0 truncate text-white/40">
                {result ? 'Wrote' : 'Writing'}{' '}
                <code className="rounded bg-white/10 px-1 text-xs">{input?.file_path}</code>
            </span>
        </div>
    )
}

// ── Bash Widget ──

function BashWidget({ input, result, StatusIcon }: { input: any; result?: ContentBlock; StatusIcon: React.FC }) {
    const [expanded, setExpanded] = useState(false)
    const command = input?.command || input?.description || ''
    const resultContent = typeof result?.content === 'string' ? result.content : ''

    return (
        <div className="my-1.5 rounded-lg border border-white/10 bg-[#1a1a2e] text-sm">
            <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2"
                onClick={() => setExpanded(!expanded)}
            >
                <StatusIcon />
                <CommandLineIcon className="w-3.5 h-3.5 text-green-400/70" />
                <code className="min-w-0 truncate text-green-300/70 text-xs">
                    $ {truncate(command, 80)}
                </code>
                {result && (
                    expanded
                        ? <ChevronDownIcon className="ml-auto w-3.5 h-3.5 text-white/30" />
                        : <ChevronRightIcon className="ml-auto w-3.5 h-3.5 text-white/30" />
                )}
            </button>
            {expanded && resultContent && (
                <div className="max-h-40 overflow-auto border-t border-white/10 px-3 py-2">
                    <pre className="whitespace-pre-wrap font-mono text-white/40 text-xs">
                        {truncate(resultContent, 2000)}
                    </pre>
                </div>
            )}
        </div>
    )
}

// ── Glob Widget ──

function GlobWidget({ input, result, StatusIcon }: { input: any; result?: ContentBlock; StatusIcon: React.FC }) {
    return (
        <div className="my-1.5 flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm">
            <StatusIcon />
            <MagnifyingGlassIcon className="w-3.5 h-3.5 text-white/30" />
            <span className="min-w-0 truncate text-white/40">
                {result ? 'Searched' : 'Searching'}{' '}
                <code className="rounded bg-white/10 px-1 text-xs">{input?.pattern}</code>
            </span>
        </div>
    )
}

// ── Grep Widget ──

function GrepWidget({ input, result, StatusIcon }: { input: any; result?: ContentBlock; StatusIcon: React.FC }) {
    return (
        <div className="my-1.5 flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm">
            <StatusIcon />
            <MagnifyingGlassIcon className="w-3.5 h-3.5 text-white/30" />
            <span className="min-w-0 truncate text-white/40">
                {result ? 'Grepped' : 'Grepping'}{' '}
                <code className="rounded bg-white/10 px-1 text-xs">{input?.pattern}</code>
            </span>
        </div>
    )
}

// ── Generic Widget ──

function GenericWidget({ name, input, result, StatusIcon }: { name: string; input: any; result?: ContentBlock; StatusIcon: React.FC }) {
    const [expanded, setExpanded] = useState(false)

    return (
        <div className="my-1.5 rounded-lg border border-white/10 bg-white/5 text-sm">
            <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2"
                onClick={() => setExpanded(!expanded)}
            >
                <StatusIcon />
                <WrenchIcon className="w-3.5 h-3.5 text-white/30" />
                <span className="text-white/40">
                    {result ? 'Ran' : 'Running'} <code className="text-xs">{name}</code>
                </span>
                {expanded
                    ? <ChevronDownIcon className="ml-auto w-3.5 h-3.5 text-white/30" />
                    : <ChevronRightIcon className="ml-auto w-3.5 h-3.5 text-white/30" />
                }
            </button>
            {expanded && input && (
                <div className="max-h-32 overflow-auto border-t border-white/10 px-3 py-2">
                    <pre className="whitespace-pre-wrap font-mono text-white/40 text-xs">
                        {JSON.stringify(input, null, 2)}
                    </pre>
                </div>
            )}
        </div>
    )
}

// ── Helper ──

function truncate(str: string, max: number): string {
    if (!str) return ''
    return str.length > max ? `${str.slice(0, max)}...` : str
}
