/**
 * Obj 编号系统
 *
 * 扫描 MDX 内容中的 objblock，按 kind 分别计数，
 * 生成 "Theorem 1.1", "Definition 1.2" 等编号。
 */

export type ObjInfo = { sort: string; name: string }

/**
 * 扫描文档内容，为每个 objblock 分配编号。
 *
 * @param content - MDX 文档内容
 * @param chapter - 章节号（从文件名提取）
 * @param nodes - 所有已知 obj { id: { kind, name } }
 * @returns Map<nodeId, label>，如 "Theorem 1.1"
 */
export function buildObjNumbering(
    content: string,
    chapter: number,
    nodes: Record<string, ObjInfo>,
    skipIds?: Set<string>,
): Map<string, string> {
    const result = new Map<string, string>()
    if (!content) return result

    // 匹配 <div class="objblock">nodeId</div>
    const regex = /class="objblock"[^>]*>([a-f0-9]+)</g
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

        const kind = node.sort || 'unknown'
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
 * 文件名格式：NN-name.mdx
 * 00-index → -1（跳过）
 * 01-introduction → 0 (Introduction)
 * 02-nontechnical → 1 (Chapter 1)
 * 03-preliminaries → 2 (Chapter 2)
 * ...
 * 08-regularity → 7 (Chapter 7)
 */
function chapterFromFilename(filename: string): number {
    const m = filename.match(/^(\d+)/)
    if (!m) return -1
    const n = parseInt(m[1], 10)
    if (n <= 1) return -1  // skip 00-index and 01-introduction
    return n - 1  // 02 → Ch1, 03 → Ch2, ..., 08 → Ch7
}

/**
 * 扫描所有文档，构建全局编号表。
 * 每个节点只在首次出现的文档中获得编号。
 */
export function buildGlobalObjNumbering(
    docs: DocEntry[],
    nodes: Record<string, ObjInfo>,
): Map<string, string> {
    const global = new Map<string, string>()
    if (docs.length === 0) return global

    // 按文件名排序确保顺序稳定
    const sorted = [...docs].sort((a, b) => a.filename.localeCompare(b.filename))

    const assigned = new Set<string>()

    for (const doc of sorted) {
        const chapter = chapterFromFilename(doc.filename)
        if (chapter < 0) continue

        const local = buildObjNumbering(doc.content, chapter, nodes, assigned)
        for (const [id, label] of local) {
            global.set(id, label)
            assigned.add(id)
        }
    }

    return global
}
