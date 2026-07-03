/**
 * API base URL.
 *
 * Same-origin by default: the API is served by Next.js Route Handlers under
 * /api/* (see src/app/api). Override with NEXT_PUBLIC_API_BASE only to point at
 * a separate backend.
 */
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || ''
