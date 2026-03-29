/** Convert LaTeX macros to HTML tags before Markdown rendering.
 *
 * Supported:
 *   \entryref{hash}{text}                → inline entry link
 *   \entryblock{hash}                    → entry block
 *   \entryblock{hash}{collapsible}       → collapsible entry block
 *   \entryblock{hash}{                   → nested block (match braces)
 *     \entryblock{child}{collapsible}
 *   }
 */
export function preprocess(content: string): string {
    // First pass: \entryref (simple, no nesting)
    let result = content.replace(
        /\\entryref\{([^}]+)\}\{([^}]+)\}/g,
        '<span data-entry="$1">$2</span>'
    )

    // Second pass: \entryblock (may nest, need brace matching)
    result = processEntryBlocks(result)

    return result
}

function processEntryBlocks(input: string): string {
    let result = ''
    let i = 0

    while (i < input.length) {
        const idx = input.indexOf('\\entryblock{', i)
        if (idx === -1) {
            result += input.slice(i)
            break
        }

        // Copy text before the match
        result += input.slice(i, idx)

        // Parse \entryblock{hash}
        const hashStart = idx + '\\entryblock{'.length
        const hashEnd = input.indexOf('}', hashStart)
        if (hashEnd === -1) { result += input.slice(idx); break }
        const hash = input.slice(hashStart, hashEnd)

        // Check what follows the closing }
        let afterHash = hashEnd + 1

        // Skip whitespace/newlines
        while (afterHash < input.length && (input[afterHash] === ' ' || input[afterHash] === '\n' || input[afterHash] === '\r')) {
            afterHash++
        }

        if (afterHash >= input.length || input[afterHash] !== '{') {
            // No second arg: \entryblock{hash} → simple block
            result += `<div data-entry="${hash}"></div>`
            i = hashEnd + 1
        } else {
            // Has second arg: \entryblock{hash}{ ... }
            const bodyStart = afterHash + 1
            const bodyEnd = findMatchingBrace(input, afterHash)
            if (bodyEnd === -1) { result += input.slice(idx); break }
            const body = input.slice(bodyStart, bodyEnd).trim()

            if (body === 'collapsible') {
                // \entryblock{hash}{collapsible}
                result += `<div data-entry="${hash}" data-collapsible="true"></div>`
            } else {
                // \entryblock{hash}{ ...children... }
                // Recursively process children
                const processedBody = processEntryBlocks(body)
                result += `<div data-entry="${hash}">\n${processedBody}\n</div>`
            }
            i = bodyEnd + 1
        }
    }

    return result
}

/** Find the index of the closing } that matches the { at position pos. */
function findMatchingBrace(input: string, pos: number): number {
    if (input[pos] !== '{') return -1
    let depth = 1
    for (let i = pos + 1; i < input.length; i++) {
        if (input[i] === '{') depth++
        else if (input[i] === '}') {
            depth--
            if (depth === 0) return i
        }
    }
    return -1
}
