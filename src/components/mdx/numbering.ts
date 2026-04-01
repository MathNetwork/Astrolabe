/**
 * Entry numbering — build a per-document number map from MDX source.
 *
 * Scans for \entryblock{hash} occurrences and ## section headings.
 * Numbers are formatted as <section>.<counter> with unified counting
 * (Definition 2.1, Theorem 2.2, Lemma 2.3 — counter does not reset per sort).
 *
 * Counter resets at each new ## section. Entries before the first ## get section 0.
 * Duplicate hashes keep the number from their first occurrence.
 */
export function buildNumberMap(mdx: string): Map<string, string> {
    const map = new Map<string, string>()
    let section = 0
    let counter = 0

    const lines = mdx.split('\n')
    for (const line of lines) {
        // Detect ## section headings (only top-level ##, not ### or deeper)
        if (/^##\s+[^#]/.test(line)) {
            section++
            counter = 0
            continue
        }

        // Scan for \entryblock{hash} on this line (may be multiple)
        const re = /\\entryblock\{([^}]+)\}/g
        let match
        while ((match = re.exec(line)) !== null) {
            const hash = match[1]
            if (!map.has(hash)) {
                counter++
                map.set(hash, `${section}.${counter}`)
            }
        }
    }

    return map
}
