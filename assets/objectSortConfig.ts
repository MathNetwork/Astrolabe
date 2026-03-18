/**
 * Object sort → color mapping (fallback defaults)
 *
 * Projects define their own sorts in .netmath/sorts.json.
 * This file provides fallback colors for when no project config exists.
 *
 * At runtime, project sorts override these defaults via setCustomSortConfig().
 */

export interface ObjectSortVisual {
  color: string
}

/** Fallback sort colors (used when project has no sorts.json) */
export const OBJECT_SORT_CONFIG: Record<string, ObjectSortVisual> = {
  // Math sorts (default)
  definition:  { color: '#5B8FB9' },
  theorem:     { color: '#D4A843' },
  lemma:       { color: '#3AAFA9' },
  proposition: { color: '#B8963E' },
  corollary:   { color: '#9B72CF' },
  example:     { color: '#2ECC71' },
  axiom:       { color: '#4A90D9' },
  remark:      { color: '#7B68AE' },
  conjecture:  { color: '#D4A843' },
  reference:   { color: '#708090' },
}

/** Default color for unknown sorts */
export const OBJECT_SORT_DEFAULT: ObjectSortVisual = {
  color: '#A1A1AA',
}

/**
 * Dynamic custom sort override from project's sorts.json.
 * Set by useProjectLoader when a project has .netmath/sorts.json.
 */
let customSortConfig: Record<string, ObjectSortVisual> | null = null

/** Override default sorts with project-specific config */
export function setCustomSortConfig(config: Record<string, { color: string }> | null) {
  if (!config) { customSortConfig = null; return }
  customSortConfig = {}
  for (const [sort, { color }] of Object.entries(config)) {
    customSortConfig[sort] = { color }
  }
}

/** Get the visual config for a given sort (custom → default → fallback) */
export function getObjectSort(kind: string | undefined): ObjectSortVisual {
  if (!kind) return OBJECT_SORT_DEFAULT
  return customSortConfig?.[kind] || OBJECT_SORT_CONFIG[kind] || OBJECT_SORT_DEFAULT
}

/** Get all available sorts (custom merged with defaults) */
export function getAllSorts(): Record<string, ObjectSortVisual> {
  return { ...OBJECT_SORT_CONFIG, ...customSortConfig }
}

// Backward-compatible re-exports
export const getNodeKindVisual = getObjectSort
export type NodeKindVisual = ObjectSortVisual
