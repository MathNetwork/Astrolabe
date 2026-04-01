/**
 * parseClaudeActions — 从 Claude 回复中提取可操作内容
 *
 * 检测 JSON 代码块，判断是否为 entry CRUD 操作。
 * 纯函数，零副作用。
 */

export interface ClaudeAction {
    type: 'create-entry' | 'update-entry' | 'delete-entry'
    data: Record<string, any>
    raw: string
}

/**
 * 从 markdown 内容中提取 ```json ``` 代码块，
 * 判断是否为可操作的 entry 数据。
 */
export function parseClaudeActions(content: string): ClaudeAction[] {
    const actions: ClaudeAction[] = []

    // 匹配 ```json ... ``` 代码块
    const jsonBlockRegex = /```json\s*\n([\s\S]*?)\n```/g
    let match

    while ((match = jsonBlockRegex.exec(content)) !== null) {
        const raw = match[1].trim()
        try {
            const data = JSON.parse(raw)
            if (typeof data !== 'object' || data === null) continue

            // ── delete-entry ──
            if (data.action === 'delete-entry' && data.id) {
                actions.push({ type: 'delete-entry', data, raw })
                continue
            }
            // legacy: delete-obj / delete-mor / delete-node / delete-edge
            if (/^delete-(obj|mor|node|edge)$/.test(data.action) && data.id) {
                actions.push({ type: 'delete-entry', data, raw })
                continue
            }

            // ── update-entry ──
            if (data.action === 'update-entry' && data.id && data.updates) {
                actions.push({ type: 'update-entry', data, raw })
                continue
            }

            // ── create-entry（新格式：ref + record） ──
            if (Array.isArray(data.ref) && data.ref.length > 0 && data.record && !data.id) {
                actions.push({ type: 'create-entry', data, raw })
                continue
            }

            // ── legacy: name+sort+statement 无 id → create-entry (atom) ──
            if (data.name && data.sort && data.statement && !data.id) {
                const { name, sort, statement, proof, intuition, notes, ...rest } = data
                const record = { name, sort, statement, ...(proof ? { proof } : {}), ...(intuition ? { intuition } : {}), ...(notes ? { notes } : {}), ...rest }
                actions.push({
                    type: 'create-entry',
                    data: { ref: ['__self__'], record },
                    raw,
                })
                continue
            }

            // ── legacy: source+target 无 id → create-entry (edge) ──
            if (data.source && data.target && !data.id) {
                const { source, target, ...rest } = data
                actions.push({
                    type: 'create-entry',
                    data: { ref: [source, target], record: rest },
                    raw,
                })
                continue
            }

            // ── legacy: id+name+sort → update-entry (edit-obj) ──
            if (data.id && data.name && data.sort) {
                const { id, ...updates } = data
                actions.push({
                    type: 'update-entry',
                    data: { action: 'update-entry', id, updates },
                    raw,
                })
                continue
            }

            // ── legacy: id+source+target → update-entry (edit-mor) ──
            if (data.id && data.source && data.target) {
                const { id, source, target, ...updates } = data
                actions.push({
                    type: 'update-entry',
                    data: { action: 'update-entry', id, updates },
                    raw,
                })
                continue
            }
        } catch {
            // JSON 解析失败，跳过
        }
    }

    return actions
}
