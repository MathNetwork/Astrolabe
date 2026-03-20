/**
 * Astrolabe Category Types
 * Unified Obj and Mor type definitions
 *
 * Data sources:
 * - Lean files (source of truth): id, name, sort, filePath, lineNumber, content, status, references
 * - .astrolabe/meta.json (user edited): meta
 */

// ============================================
// 基础枚举类型
// ============================================

export type ObjSort = string;  // Free-form: presets (theorem, lemma, definition, ...) or any custom sort

/** @deprecated Use ObjSort instead */
export type NodeKind = ObjSort;

export type ProofStatus =
  | "proven"  // Found in Lean, no sorry
  | "sorry"   // Found in Lean, has sorry
  | "error"   // Has errors
  | "stated"  // Types that don't require proof (definition, axiom, etc.)
  | "loading" // Awaiting diagnostic verification (cached status)
  | "unknown"; // Referenced but not defined

// ============================================
// ObjMeta type (from .astrolabe/meta.json)
// ============================================

export interface ObjMeta {
  // Display
  label?: string;
  size?: number;
  shape?: string;
  effect?: string;

  // Position
  position?: [number, number, number];
  pinned?: boolean;

  // Content
  notes?: string;
  tags?: string[];
}

/** @deprecated Use ObjMeta instead */
export type NodeMeta = ObjMeta;

// ============================================
// Obj type (matches Python Obj.to_dict() output)
// ============================================

export interface Obj {
  // === From Lean (source of truth, read-only) ===
  id: string;
  name: string;
  sort: ObjSort;
  filePath: string;
  lineNumber: number;
  status: ProofStatus;
  references: string[];

  // === Statistics fields (calculated) ===
  dependsOnCount: number;
  usedByCount: number;
  depth: number;

  // === Default styles (obtained from theme based on sort) ===
  defaultColor: string;
  defaultSize: number;
  defaultShape: string;

  // === From .astrolabe/meta.json (user editable) ===
  meta: ObjMeta;
}

/** @deprecated Use Obj instead */
export type Node = Obj;

// ============================================
// MorMeta type (from .astrolabe/meta.json)
// ============================================

export interface MorMeta {
  style?: string;  // 'solid' | 'dashed' | 'polyline'
  effect?: string;
  notes?: string;
}

/** @deprecated Use MorMeta instead */
export type EdgeMeta = MorMeta;

// ============================================
// Mor type (matches Python Mor.to_dict() output)
// ============================================

export interface Mor {
  id: string;
  source: string;
  target: string;
  fromLean: boolean;
  visible?: boolean;

  // === Default styles (obtained from theme based on fromLean) ===
  defaultColor: string;
  defaultWidth: number;
  defaultStyle: string;  // 'solid' | 'dashed' | 'polyline'

  meta: MorMeta;
}

/** @deprecated Use Mor instead */
export type Edge = Mor;

// ============================================
// API 请求/响应类型
// ============================================

export interface NodeMetaUpdate {
  label?: string;
  size?: number;
  shape?: string;
  effect?: string;
  position?: [number, number, number];
  pinned?: boolean;
  notes?: string;
  tags?: string[];
}

export interface ProjectStats {
  total_nodes: number;
  total_edges: number;
  by_kind: Record<string, number>;
  by_status: Record<string, number>;
}

export interface ProjectData {
  path: string;
  nodes: Obj[];
  edges: Mor[];
  stats?: ProjectStats;
}

export interface ProjectStatus {
  exists: boolean;
  isKnowledgeProject: boolean;
  message: string;
}
