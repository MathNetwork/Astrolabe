/**
 * Lean CLI Bridge — typed interface to Lean CLI via Tauri IPC.
 *
 * Each function calls `invoke("astrolabe_command", {cmd, vaultPath})`
 * and parses the JSON response into typed data.
 */
import type { Entry, GraphData, ValidateResult } from '@/types/astrolabe'

async function invokeCliCommand(cmd: string, vaultPath: string): Promise<string> {
  const { invoke } = await import('@tauri-apps/api/core')
  return invoke<string>('astrolabe_command', { cmd, vaultPath })
}

function parseJson<T>(raw: string, cmd: string): T {
  try {
    return JSON.parse(raw) as T
  } catch (e) {
    throw new Error(`Failed to parse Lean CLI '${cmd}' output: ${e}`)
  }
}

export const leanBridge = {
  async graph(vaultPath: string): Promise<GraphData> {
    const raw = await invokeCliCommand('graph', vaultPath)
    return parseJson<GraphData>(raw, 'graph')
  },

  async entries(vaultPath: string): Promise<Entry[]> {
    const raw = await invokeCliCommand('entries', vaultPath)
    return parseJson<Entry[]>(raw, 'entries')
  },

  async validate(vaultPath: string): Promise<ValidateResult> {
    const raw = await invokeCliCommand('validate', vaultPath)
    return parseJson<ValidateResult>(raw, 'validate')
  },
}
