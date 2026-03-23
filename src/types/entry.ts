/**
 * AstrolabeEntry — the universal data type.
 *
 * Every entry in astrolabe.json has:
 * - ref: ordered hash list (length >= 1)
 * - record: arbitrary key-value metadata
 */
export interface AstrolabeEntry {
  ref: string[]
  record: Record<string, string>
}

export function degree(entry: AstrolabeEntry): number {
  return entry.ref.length - 1
}

export function isAtom(entry: AstrolabeEntry): boolean {
  return entry.ref.length === 1
}

export function profile(entry: AstrolabeEntry): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const h of entry.ref) {
    counts[h] = (counts[h] || 0) + 1
  }
  return counts
}
