import { loadStore } from '@/lib/server/store'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const projectPath = searchParams.get('path')
  if (!projectPath) return Response.json({ detail: 'path required' }, { status: 400 })

  const store = loadStore(projectPath)
  const degree = searchParams.get('degree')
  if (degree !== null) {
    const d = Number(degree)
    const filtered: typeof store = {}
    for (const [h, e] of Object.entries(store)) if (e.ref.length - 1 === d) filtered[h] = e
    return Response.json(filtered)
  }
  return Response.json(store)
}
