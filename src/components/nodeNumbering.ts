/**
 * 节点编号系统
 *
 * 扫描 MDX 内容中的 nodeblock，按 kind 分别计数，
 * 生成 "Theorem 1.1", "Definition 1.2" 等编号。
 */

export type NodeInfo = { kind: string; name: string }

/**
 * 扫描文档内容，为每个 nodeblock 分配编号。
 *
 * @param content - MDX 文档内容
 * @param chapter - 章节号（从文件名提取）
 * @param nodes - 所有已知节点 { id: { kind, name } }
 * @returns Map<nodeId, label>，如 "Theorem 1.1"
 */
export function buildNodeNumbering(
    content: string,
    chapter: number,
    nodes: Record<string, NodeInfo>,
): Map<string, string> {
    const result = new Map<string, string>()
    if (!content) return result

    // 匹配 <div class="nodeblock">nodeId</div>
    const regex = /class="nodeblock"[^>]*>([a-f0-9]+)</g
    const kindCounters = new Map<string, number>()
    const seen = new Set<string>()

    let match
    while ((match = regex.exec(content)) !== null) {
        const id = match[1].trim()
        if (seen.has(id)) continue
        seen.add(id)

        const node = nodes[id]
        if (!node) continue

        const kind = node.kind
        const count = (kindCounters.get(kind) || 0) + 1
        kindCounters.set(kind, count)

        const kindDisplay = kind.charAt(0).toUpperCase() + kind.slice(1).replace('_', ' ')
        result.set(id, `${kindDisplay} ${chapter}.${count}`)
    }

    return result
}
