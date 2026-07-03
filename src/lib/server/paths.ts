import path from 'node:path'

/**
 * Resolve a project/file path from the API query string.
 *
 * Local dev passes absolute paths (used as-is). In production the project data
 * is bundled into the deployment and addressed by a path relative to the app
 * root, so relative paths are resolved against process.cwd().
 */
export function resolveFs(p: string): string {
  return path.isAbsolute(p) ? p : path.join(process.cwd(), p)
}
