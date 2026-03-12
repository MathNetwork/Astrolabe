/**
 * useLspIndex Hook - DEPRECATED
 *
 * LSP functionality has been removed (knowledge-only tool).
 * This file is kept as a stub for any remaining imports.
 */

export interface NamespaceLocation {
  name: string;
  file_path: string;
  line_number: number;
  is_explicit: boolean | null;
}

export function useLspIndex(_projectPath: string, _graphLoading: boolean, _needsInit: boolean) {
    return {
        namespaceIndex: new Map<string, NamespaceLocation>(),
        lspBuilding: false,
        lspStatus: null as string | null,
        handleBuildLsp: async () => {},
    }
}
