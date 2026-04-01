/**
 * buildContext — 构建 Claude 上下文
 *
 * 把选中的节点/边信息注入到 prompt 前面，
 * 让 Claude 知道用户当前在看什么。
 *
 * 纯函数，零副作用。
 */

interface ObjContext {
    id: string
    name: string
    sort: string
    statement?: string
    proof?: string
    intuition?: string
    notes?: string
}

interface MorContext {
    id: string
    source: string
    target: string
    notes?: string
    sourceName?: string
    targetName?: string
}

export function buildContext(
    selectedObj: ObjContext | null,
    selectedMor: MorContext | null,
    userPrompt: string,
): string {
    const parts: string[] = []

    if (selectedObj) {
        parts.push(`[Selected node: ${selectedObj.name} (${selectedObj.sort})]`)
        if (selectedObj.statement) {
            parts.push(`[Statement: ${selectedObj.statement}]`)
        }
        if (selectedObj.proof) {
            parts.push(`[Proof: ${selectedObj.proof}]`)
        }
        if (selectedObj.intuition) {
            parts.push(`[Intuition: ${selectedObj.intuition}]`)
        }
        if (selectedObj.notes) {
            parts.push(`[Notes: ${selectedObj.notes}]`)
        }
    }

    if (selectedMor) {
        const src = selectedMor.sourceName || selectedMor.source
        const tgt = selectedMor.targetName || selectedMor.target
        parts.push(`[Selected edge: ${src} → ${tgt}]`)
        if (selectedMor.notes) {
            parts.push(`[Edge notes: ${selectedMor.notes}]`)
        }
    }

    if (parts.length > 0) {
        return parts.join('\n') + '\n\n' + userPrompt
    }
    return userPrompt
}
