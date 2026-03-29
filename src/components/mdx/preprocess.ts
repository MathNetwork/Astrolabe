/** Convert LaTeX macros to HTML tags before Markdown rendering.
 *
 * Supported:
 *   \entryref{hash}{text (may contain $math{braces}$)}  → inline entry link
 *   \entryblock{hash}                                    → entry block
 *   \entryblock{hash}{collapsible}                       → collapsible entry block
 *   \entryblock{hash}{ ...children... }                  → nested block
 */
export function preprocess(content: string): string {
    let result = processEntryRefs(content)
    result = processEntryBlocks(result)
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

function processEntryRefs(input: string): string {
    let result = ''
    let i = 0
    const tag = '\\entryref{'

    while (i < input.length) {
        const idx = input.indexOf(tag, i)
        if (idx === -1) { result += input.slice(i); break }

        result += input.slice(i, idx)

        // Parse first arg: hash
        const hashStart = idx + tag.length
        const hashEnd = findMatchingBrace(input, hashStart - 1)
        if (hashEnd === -1) { result += input.slice(idx); break }
        const hash = input.slice(hashStart, hashEnd)

        // Parse second arg: text (with brace matching)
        const textBrace = hashEnd + 1
        if (textBrace >= input.length || input[textBrace] !== '{') {
            result += input.slice(idx, hashEnd + 1)
            i = hashEnd + 1
            continue
        }
        const textEnd = findMatchingBrace(input, textBrace)
        if (textEnd === -1) { result += input.slice(idx); break }
        const text = input.slice(textBrace + 1, textEnd)

        result += `<span data-entry="${hash}">${text}</span>`
        i = textEnd + 1
    }

    return result
}

function processEntryBlocks(input: string): string {
    let result = ''
    let i = 0
    const tag = '\\entryblock{'

    while (i < input.length) {
        const idx = input.indexOf(tag, i)
        if (idx === -1) { result += input.slice(i); break }

        result += input.slice(i, idx)

        // Parse first arg: hash
        const hashStart = idx + tag.length
        const hashEnd = findMatchingBrace(input, hashStart - 1)
        if (hashEnd === -1) { result += input.slice(idx); break }
        const hash = input.slice(hashStart, hashEnd)

        // Check for second arg
        let afterHash = hashEnd + 1
        while (afterHash < input.length && ' \n\r'.includes(input[afterHash])) afterHash++

        if (afterHash >= input.length || input[afterHash] !== '{') {
            result += `<div data-entry="${hash}"></div>`
            i = hashEnd + 1
        } else {
            const bodyEnd = findMatchingBrace(input, afterHash)
            if (bodyEnd === -1) { result += input.slice(idx); break }
            const body = input.slice(afterHash + 1, bodyEnd).trim()

            if (body === 'collapsible') {
                result += `<div data-entry="${hash}" data-collapsible="true"></div>`
            } else {
                result += `<div data-entry="${hash}">\n${processEntryBlocks(body)}\n</div>`
            }
            i = bodyEnd + 1
        }
    }

    return result
}
