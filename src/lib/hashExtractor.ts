/**
 * hashExtractor — extract valid Astrolabe 12-char hex hashes from text.
 *
 * Pure function. No React, no store imports.
 * Used by ChatPanel to detect entry hashes in PTY output.
 */

const ANSI_RE = /\x1b\[[0-9;]*[A-Za-z]/g
const HASH_RE = /\b[0-9a-f]{12}\b/g

/**
 * Extract the last valid 12-char hex hash from text.
 * Strips ANSI escape codes before matching.
 * Returns null if no valid hash found.
 */
export function extractLastValidHash(
    text: string,
    isValid: (hash: string) => boolean,
): string | null {
    const clean = text.replace(ANSI_RE, '')
    const matches = clean.match(HASH_RE)
    if (!matches) return null
    for (let i = matches.length - 1; i >= 0; i--) {
        if (isValid(matches[i])) return matches[i]
    }
    return null
}
