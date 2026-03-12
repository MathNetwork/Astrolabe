/**
 * useProject Hook
 *
 * Simplified for knowledge-only projects.
 * Knowledge data is loaded via canvasStore, not here.
 */

import { useState, useEffect, useCallback } from "react";
import type { Node, Edge, NodeMeta } from "@/types/node";
import { updateNodeMeta, checkProjectStatus, type ProjectStatus } from "@/lib/api";

// ============================================
// Types
// ============================================

interface ProjectStats {
  total_nodes: number;
  total_edges: number;
  by_kind: Record<string, number>;
  by_status: Record<string, number>;
}

interface UseProjectResult {
  nodes: Node[];
  edges: Edge[];
  stats: ProjectStats | null;
  loading: boolean;
  error: string | null;
  projectStatus: ProjectStatus | null;
  reload: () => Promise<void>;
  updateMeta: (nodeId: string, meta: Partial<NodeMeta>) => Promise<void>;
  recheckStatus: () => Promise<ProjectStatus | null | undefined>;
}

// ============================================
// Hook
// ============================================

export function useProject(projectPath: string | null): UseProjectResult {
  const [nodes] = useState<Node[]>([]);
  const [edges] = useState<Edge[]>([]);
  const [stats] = useState<ProjectStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projectStatus, setProjectStatus] = useState<ProjectStatus | null>(null);

  const checkStatus = useCallback(async () => {
    if (!projectPath) return;
    try {
      const status = await checkProjectStatus(projectPath);
      setProjectStatus(status);
      return status;
    } catch (e) {
      console.error("[useProject] Check status failed:", e);
      return null;
    }
  }, [projectPath]);

  const load = useCallback(async () => {
    if (!projectPath) return;
    setLoading(true);
    setError(null);
    try {
      await checkStatus();
      // Knowledge data is loaded via canvasStore
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown error";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [projectPath, checkStatus]);

  useEffect(() => {
    load();
  }, [load]);

  const updateMeta = useCallback(
    async (nodeId: string, meta: Partial<NodeMeta>) => {
      if (!projectPath) return;
      try {
        await updateNodeMeta(projectPath, nodeId, meta);
      } catch (e) {
        const message = e instanceof Error ? e.message : "Unknown error";
        console.error("[useProject] Update meta failed:", message);
        throw e;
      }
    },
    [projectPath]
  );

  return {
    nodes,
    edges,
    stats,
    loading,
    error,
    projectStatus,
    reload: load,
    updateMeta,
    recheckStatus: checkStatus,
  };
}
