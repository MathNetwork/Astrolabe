/**
 * parseClaudeActions — 从 Claude 回复中提取可操作内容
 *
 * 检测 JSON 代码块，判断是否为 obj（add-node）或 mor（add-edge）。
 * 纯函数，零副作用。
 */

export interface ClaudeAction {
    type: 'add-node' | 'add-edge'
    data: Record<string, any>
    raw: string  // 原始 JSON 字符串
}

/**
 * 从 markdown 内容中提取 ```json ``` 代码块，
 * 判断是否为可操作的 obj/mor 数据。
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

            // 检测是否为 obj（有 name + sort + statement）
            if (data.name && data.sort && data.statement) {
                actions.push({ type: 'add-node', data, raw })
                continue
            }

            // 检测是否为 mor（有 source + target）
            if (data.source && data.target) {
                actions.push({ type: 'add-edge', data, raw })
                continue
            }
        } catch {
            // JSON 解析失败，跳过
        }
    }

    return actions
}
