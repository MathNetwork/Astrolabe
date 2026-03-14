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
    skipIds?: Set<string>,
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
        if (skipIds?.has(id)) continue

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

export type DocEntry = { filename: string; content: string }

/**
 * 从文件名提取章节号。
 * 00-index → -1（跳过），01-intro → 0，02-xxx → 1 ...
 */
function chapterFromFilename(filename: string): number {
    const m = filename.match(/^(\d+)/)
    return m ? parseInt(m[1], 10) - 1 : -1
}

/**
 * 扫描所有文档，构建全局编号表。
 * 每个节点只在首次出现的文档中获得编号。
 */
export function buildGlobalNodeNumbering(
    docs: DocEntry[],
    nodes: Record<string, NodeInfo>,
): Map<string, string> {
    const global = new Map<string, string>()
    if (docs.length === 0) return global

    // 按文件名排序确保顺序稳定
    const sorted = [...docs].sort((a, b) => a.filename.localeCompare(b.filename))

    const assigned = new Set<string>()

    for (const doc of sorted) {
        const chapter = chapterFromFilename(doc.filename)
        if (chapter < 0) continue

        const local = buildNodeNumbering(doc.content, chapter, nodes, assigned)
        for (const [id, label] of local) {
            global.set(id, label)
            assigned.add(id)
        }
    }

    return global
}
