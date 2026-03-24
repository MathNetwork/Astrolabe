/**
 * Astrolabe API Client
 *
 * Python backend API client (signature-only, no Lean)
 * Backend runs at http://127.0.0.1:8765
 */

import type { NodeMeta, EdgeMeta } from "@/types/obj";

const API_BASE = "http://127.0.0.1:8765";

// ============================================
// Tauri HTTP Client Wrapper
// ============================================

function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

let cachedTauriFetch: typeof fetch | null = null;
let tauriFetchInitialized = false;
let warnedTauriHttpPermission = false;

async function initTauriFetch(): Promise<typeof fetch | null> {
  if (tauriFetchInitialized) {
    return cachedTauriFetch;
  }
  tauriFetchInitialized = true;

  if (!isTauri()) {
    return null;
  }

  try {
    const module = await import("@tauri-apps/plugin-http");
    cachedTauriFetch = module.fetch as typeof fetch;
    console.log("[API] Tauri HTTP module loaded successfully");
    return cachedTauriFetch;
  } catch (error) {
    console.warn("[API] Tauri HTTP module not available:", error);
    return null;
  }
}

async function tauriFetch(
  input: string | URL,
  init?: RequestInit
): Promise<Response> {
  const tauriHttp = await initTauriFetch();
  if (tauriHttp) {
    try {
      return await tauriHttp(input, init);
    } catch (error) {
      if (!warnedTauriHttpPermission) {
        warnedTauriHttpPermission = true;
        console.warn("[API] Tauri HTTP request failed, falling back to standard fetch:", error);
      }
    }
  }
  return fetch(input, init);
}

// ============================================
// File Reading API
// ============================================

export interface FileContent {
  content: string;
  startLine: number;
  endLine: number;
  totalLines: number;
}

export async function readFile(
  filePath: string,
  line: number = 1,
  context: number = 20
): Promise<FileContent> {
  const res = await tauriFetch(
    `${API_BASE}/api/file?path=${encodeURIComponent(filePath)}&line=${line}&context=${context}`
  );

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || `Failed to read file: ${res.status}`);
  }

  return res.json();
}

export async function readFullFile(filePath: string): Promise<FileContent> {
  const res = await tauriFetch(
    `${API_BASE}/api/file?path=${encodeURIComponent(filePath)}&line=1&context=100000`
  );

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || `Failed to read file: ${res.status}`);
  }

  return res.json();
}

// ============================================
// Node/Edge Meta API (kept for custom node styling)
// ============================================

interface UpdateMetaResponse {
  status: string;
  nodeId: string;
  updated: string[];
}

export async function updateNodeMeta(
  path: string,
  nodeId: string,
  meta: Partial<NodeMeta>
): Promise<UpdateMetaResponse> {
  const res = await tauriFetch(
    `${API_BASE}/api/project/node/${encodeURIComponent(nodeId)}/meta?path=${encodeURIComponent(path)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(meta),
    }
  );

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || `Failed to update meta: ${res.status}`);
  }

  return res.json();
}

export async function updateEdgeMeta(
  path: string,
  edgeId: string,
  meta: Partial<EdgeMeta>
): Promise<{ status: string; edgeId: string; updated: string[] }> {
  const res = await tauriFetch(
    `${API_BASE}/api/project/edge/${encodeURIComponent(edgeId)}/meta?path=${encodeURIComponent(path)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(meta),
    }
  );

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || `Failed to update edge meta: ${res.status}`);
  }

  return res.json();
}

// ============================================
// Health Check
// ============================================

export async function healthCheck(): Promise<{ status: string; version: string }> {
  const res = await tauriFetch(`${API_BASE}/api/health`);

  if (!res.ok) {
    throw new Error(`Backend not available: ${res.status}`);
  }

  return res.json();
}

// ============================================
// Project Status (simplified - just check path exists)
// ============================================

export interface ProjectStatus {
  exists: boolean;
  isSignatureProject: boolean;
  message: string;
}

export async function checkProjectStatus(path: string): Promise<ProjectStatus> {
  const res = await tauriFetch(
    `${API_BASE}/api/project/status?path=${encodeURIComponent(path)}`
  );

  if (!res.ok) {
    return {
      exists: true,
      isSignatureProject: true,
      message: "Unable to check project status",
    };
  }

  return res.json();
}

// ============================================
// Create Project
// ============================================

export async function createProject(path: string): Promise<{ status: string; path: string; type: string }> {
  const res = await tauriFetch(`${API_BASE}/api/project/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Failed to create project');
  }

  return res.json();
}

// ============================================
// Viewport API (camera state persistence)
// ============================================

export interface FilterOptionsData {
  hideTechnical: boolean;
  hideOrphaned: boolean;
  transitiveReduction: boolean;
}

export interface PhysicsSettingsData {
  repulsionStrength?: number;
  springLength?: number;
  springStrength?: number;
  centerStrength?: number;
  damping?: number;
  clusteringEnabled?: boolean;
  clusteringStrength?: number;
  clusterSeparation?: number;
  clusteringDepth?: number;
  adaptiveSpringEnabled?: boolean;
  adaptiveSpringMode?: string;
  adaptiveSpringScale?: number;
}

export interface UiPreferences {
  layoutPreset?: string;
  mainViewTab?: string;
  searchPanelOpen?: boolean;
  rightPanelOpen?: boolean;
  pinnedCardIds?: string[];
  themeMode?: string;
}

export interface ViewportData {
  camera_position: [number, number, number];
  camera_target: [number, number, number];
  zoom: number;
  selected_obj_id?: string;
  selected_mor_id?: string;
  filter_options?: FilterOptionsData;
  physics_settings?: PhysicsSettingsData;
  ui_preferences?: UiPreferences;
}

export async function getViewport(path: string): Promise<ViewportData> {
  const res = await tauriFetch(
    `${API_BASE}/api/canvas/viewport?path=${encodeURIComponent(path)}`
  );

  if (!res.ok) {
    return {
      camera_position: [0, 0, 20],
      camera_target: [0, 0, 0],
      zoom: 1.0,
      filter_options: {
        hideTechnical: false,
        hideOrphaned: false,
        transitiveReduction: true,
      },
    };
  }

  return res.json();
}

export async function updateViewport(
  path: string,
  updates: Partial<ViewportData>
): Promise<{ status: string; viewport: ViewportData }> {
  const res = await tauriFetch(`${API_BASE}/api/canvas/viewport`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, ...updates }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || `Failed to update viewport: ${res.status}`);
  }

  return res.json();
}

// ============================================
// Macros API (custom LaTeX macros)
// ============================================

export type MacrosData = Record<string, string>;

export async function getMacros(path: string): Promise<MacrosData> {
  const res = await tauriFetch(
    `${API_BASE}/api/project/macros?path=${encodeURIComponent(path)}`
  );

  if (!res.ok) {
    return {};
  }

  const data = await res.json();
  return data.macros || {};
}

export async function updateMacros(
  path: string,
  macros: MacrosData
): Promise<{ status: string; macros: MacrosData }> {
  const res = await tauriFetch(`${API_BASE}/api/project/macros`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, macros }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || `Failed to update macros: ${res.status}`);
  }

  return res.json();
}

// ============================================
// Legacy API object (for backward compatibility)
// ============================================

export const api = {
  getProject: async (_path: string) => {
    console.warn("getProject not applicable for knowledge-only projects");
    return { obj: [], mor: [], stats: {} };
  },
  refreshFile: async (_projectPath: string, _filePath: string) => {
    console.warn("refreshFile not implemented");
  },
  subscribeToFileChanges: (
    _projectPath: string,
    _callback: (filePath: string) => void
  ) => {
    console.warn("subscribeToFileChanges not implemented");
    return () => {};
  },
  saveState: async (_projectPath: string, _state: unknown) => {
    console.warn("saveState not implemented");
  },
  loadState: async (_projectPath: string) => {
    console.warn("loadState not implemented");
    return null;
  },
};


