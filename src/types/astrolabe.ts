/**
 * Astrolabe types — matches Lean CLI JSON output schema exactly.
 *
 * Source of truth: `astrolabe_cli graph <vault_dir>`
 */

// ── Core ──

export interface Entry {
  hash: string
  ref: string[]
  record: string
  degree: number
  isSelfReferencing: boolean
}

// ── Network ──

export interface NetworkEdge {
  hash: string
  source: string
  target: string
  record: string
  degree: number
}

export interface NetworkData {
  nodes: Entry[]
  edges: NetworkEdge[]
  nodeCount: number
  edgeCount: number
}

// ── Homology ──

export interface BettiNumber {
  k: number
  beta: number
}

export interface HomologyData {
  betti: BettiNumber[]
  euler: number
}

// ── Info ──

export interface InfoData {
  totalEntries: number
  selfReferencing: number
  degreeDistribution: Record<string, number>
  validCount: number
  invalidCount: number
}

// ── Graph (combined output of `graph` command) ──

export interface GraphData {
  entries: Entry[]
  network: NetworkData
  homology: HomologyData
  info: InfoData
}

// ── Validate ──

export interface ValidateEntry {
  hash: string
  expected: string
  valid: boolean
  record: string
}

export interface ValidateResult {
  total: number
  pass: number
  fail: number
  entries: ValidateEntry[]
}
