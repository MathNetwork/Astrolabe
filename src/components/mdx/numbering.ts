/**
 * Entry numbering — build a per-document number map from MDX source.
 *
 * Section number is passed in (typically extracted from the filename prefix,
 * e.g. "02-canonical-factorization.mdx" → section 2). Defaults to 0.
 *
 * Numbers are formatted as <section>.<counter> with unified counting
 * (Definition 2.1, Theorem 2.2, Lemma 2.3 — counter does not reset per sort).
 *
 * Proof entries are excluded from numbering when entries data is available.
 * Duplicate hashes keep the number from their first occurrence.
 */
export function buildNumberMap(
    mdx: string,
    section: number = 0,
    entries?: Record<string, { record: string }>,
): Map<string, string> {
    const map = new Map<string, string>()
    let counter = 0

    const lines = mdx.split('\n')
    for (const line of lines) {
        const re = /\\entryblock\{([^}]+)\}/g
        let match
        while ((match = re.exec(line)) !== null) {
            const hash = match[1]
            if (map.has(hash)) continue

            // Skip proofs if entries data is available
            if (entries?.[hash]) {
                try {
                    const parsed = JSON.parse(entries[hash].record)
                    if (parsed.sort === 'proof') continue
                } catch {}
            }

            counter++
            map.set(hash, `${section}.${counter}`)
        }
    }

    return map
}

/** Extract section number from a filename like "02-canonical-factorization.mdx" → 2. */
export function sectionFromFilename(filename: string): number {
    const match = filename.match(/^(\d+)-/)
    return match ? parseInt(match[1], 10) : 0
}
